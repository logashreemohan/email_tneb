const express = require('express')
const router  = express.Router()
const axios   = require('axios')

/**
 * POST /api/webcheck/fetch
 * Body: { url: string }
 * Returns: { text: string, title: string, charCount: number }
 *
 * Fetches the target URL from the server (no CORS), strips HTML,
 * and returns clean readable text ready for LanguageTool.
 */
router.post('/fetch', async (req, res) => {
  let { url } = req.body
  if (!url) return res.status(400).json({ error: 'URL is required' })

  // Auto-prefix protocol
  if (!/^https?:\/\//i.test(url)) url = 'https://' + url

  try {
    const response = await axios.get(url, {
      timeout: 12000,
      maxRedirects: 5,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
          '(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      responseType: 'text',
    })

    const html = response.data || ''

    // ── Strip HTML to readable text ──────────────────────────────────────────
    let text = html
      // Remove noise blocks
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
      .replace(/<nav[\s\S]*?<\/nav>/gi, ' ')
      .replace(/<footer[\s\S]*?<\/footer>/gi, ' ')
      .replace(/<header[\s\S]*?<\/header>/gi, ' ')
      .replace(/<!--[\s\S]*?-->/g, ' ')
      // Block elements → newline
      .replace(/<\/(p|h[1-6]|li|div|br|tr|td|th|article|section)[^>]*>/gi, '\n')
      // Remove all remaining tags
      .replace(/<[^>]+>/g, ' ')
      // Decode common HTML entities
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&apos;/g, "'")
      .replace(/&nbsp;/g, ' ')
      .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
      .replace(/&[a-z]+;/gi, ' ')
      // Collapse whitespace
      .replace(/[ \t]+/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim()

    // Extract title
    const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)
    const title = titleMatch
      ? titleMatch[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
      : url

    // Limit to 5000 chars for LanguageTool free tier
    const limited = text.slice(0, 5000)

    if (limited.length < 20) {
      return res.status(422).json({ error: 'Could not extract readable text from this page.' })
    }

    res.json({ text: limited, title, charCount: limited.length })

  } catch (err) {
    const status = err.response?.status
    if (status === 403 || status === 401) {
      return res.status(422).json({ error: `Access denied by ${url} (HTTP ${status}). Try a different URL.` })
    }
    if (status === 404) {
      return res.status(422).json({ error: `Page not found (404): ${url}` })
    }
    if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND') {
      return res.status(422).json({ error: `Cannot connect to "${url}". Check the URL and try again.` })
    }
    if (err.code === 'ETIMEDOUT' || err.code === 'ECONNABORTED') {
      return res.status(422).json({ error: `Request timed out for "${url}". The site may be too slow.` })
    }
    console.error('webcheck fetch error:', err.message)
    res.status(500).json({ error: `Failed to fetch: ${err.message}` })
  }
})

module.exports = router
