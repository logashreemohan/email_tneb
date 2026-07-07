const express = require('express')
const router  = express.Router()
const axios   = require('axios')
const { validateEmail } = require('../utils/emailValidator')
const { generateReason } = require('../utils/aiAnalyzer')
const Report = require('../models/Report')

/**
 * Verify reCAPTCHA token with Google
 */
async function verifyCaptcha(token) {
  if (!token) return false
  // Allow test key bypass
  if (token === 'test' || process.env.NODE_ENV === 'development') return true
  try {
    const res = await axios.post(
      `https://www.google.com/recaptcha/api/siteverify`,
      null,
      { params: { secret: process.env.RECAPTCHA_SECRET_KEY, response: token } }
    )
    return res.data.success === true
  } catch {
    return false
  }
}

/**
 * POST /api/validate/single
 * Manager: validate a single email
 */
router.post('/single', async (req, res) => {
  const { email, userId } = req.body
  if (!email) return res.status(400).json({ error: 'Email is required' })

  try {
    const result = await validateEmail(email.trim().toLowerCase())
    result.reason = await generateReason(email, result)

    // Save to database
    if (userId) {
      await Report.create({
        email: result.email,
        status: result.status,
        reason: result.reason,
        checked_by: userId,
      })
    }

    res.json(result)
  } catch (err) {
    console.error('Single validate error:', err)
    res.status(500).json({ error: err.message })
  }
})

/**
 * POST /api/validate/bulk
 * Admin: validate many emails with CAPTCHA, streams results via SSE
 */
router.post('/bulk', async (req, res) => {
  const { emails, captchaToken, userId } = req.body

  if (!emails || !Array.isArray(emails) || emails.length === 0) {
    return res.status(400).json({ error: 'No emails provided' })
  }

  // Verify CAPTCHA
  const captchaOk = await verifyCaptcha(captchaToken)
  if (!captchaOk) {
    return res.status(403).json({ error: 'CAPTCHA verification failed' })
  }

  // Set up SSE streaming
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.flushHeaders()

  const send = (data) => res.write(`data: ${JSON.stringify(data)}\n\n`)

  let validCount   = 0
  let invalidCount = 0
  const batchSize  = 5 // process in parallel batches

  for (let i = 0; i < emails.length; i += batchSize) {
    const batch = emails.slice(i, i + batchSize)

    const batchResults = await Promise.allSettled(
      batch.map(async (email) => {
        const clean = email.trim().toLowerCase()
        const result = await validateEmail(clean)
        result.reason = await generateReason(clean, result)
        return result
      })
    )

    for (const settled of batchResults) {
      if (settled.status === 'fulfilled') {
        const r = settled.value
        if (r.status === 'valid') validCount++
        else invalidCount++

        const progress = Math.round(((i + batchSize) / emails.length) * 100)

        send({ type: 'result', result: r, progress: Math.min(progress, 100) })

        // Save to DB (fire and forget)
        if (userId) {
          Report.create({
            email: r.email,
            status: r.status,
            reason: r.reason,
            checked_by: userId,
          }).then(() => {}).catch(() => {})
        }
      }
    }
  }

  send({ type: 'done', valid: validCount, invalid: invalidCount, total: emails.length })
  res.end()
})

module.exports = router
