const OpenAI = require('openai')

let openai = null

function getOpenAI() {
  if (!openai && process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'your-openai-api-key-here') {
    openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  }
  return openai
}

/**
 * Generate AI reason for invalid email
 * Falls back to rule-based reason if OpenAI not configured
 */
async function generateReason(email, validationResult) {
  // If email is valid, return simple message
  if (validationResult.status === 'valid') {
    return 'Email address is properly formatted and the domain has valid mail server records.'
  }

  // If already has a reason and no OpenAI, return it
  if (!getOpenAI()) {
    return validationResult.reason || buildFallbackReason(email, validationResult.checks)
  }

  try {
    const failedChecks = Object.entries(validationResult.checks)
      .filter(([, v]) => !v)
      .map(([k]) => k.replace(/_/g, ' '))

    const prompt = `Analyze this email address and explain why it's invalid in one clear, user-friendly sentence.
Email: ${email}
Failed checks: ${failedChecks.join(', ')}
Domain: ${email.split('@')[1] || 'unknown'}
Keep the explanation under 20 words. Be specific about the issue.`

    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 60,
      temperature: 0.3,
    })

    return response.choices[0].message.content.trim()
  } catch (err) {
    console.error('OpenAI error:', err.message)
    return validationResult.reason || buildFallbackReason(email, validationResult.checks)
  }
}

/**
 * Rule-based fallback reason when OpenAI is unavailable
 */
function buildFallbackReason(email, checks) {
  if (!checks.has_at_symbol)    return 'Missing @ symbol — not a valid email format'
  if (!checks.format)           return 'Email format is invalid (check for special characters or missing TLD)'
  if (!checks.valid_username)   return 'Username part is invalid (too long, starts/ends with dot, or has double dots)'
  if (!checks.not_disposable)   return `"${email.split('@')[1]}" is a known disposable email provider`
  if (!checks.mx_record)        return `Domain "${email.split('@')[1]}" has no mail server (MX record not found)`
  if (!checks.valid_domain)     return `Domain "${email.split('@')[1]}" does not exist or is unreachable`
  return 'Email address failed validation checks'
}

module.exports = { generateReason }
