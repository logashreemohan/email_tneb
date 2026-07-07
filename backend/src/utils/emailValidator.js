const dns = require('dns').promises

// Disposable email domains list
const DISPOSABLE_DOMAINS = new Set([
  'mailinator.com', 'guerrillamail.com', 'tempmail.com', 'throwaway.email',
  'yopmail.com', 'sharklasers.com', 'trashmail.com', '10minutemail.com',
  'getairmail.com', 'fakeinbox.com', 'spamgourmet.com', 'maildrop.cc',
  'getnada.com', 'dispostable.com', 'tempinbox.com', 'throwam.com',
  'spam4.me', 'mytemp.email', 'tempr.email', 'discard.email'
])

// Common typo corrections
const TYPO_CORRECTIONS = {
  'gamil.com': 'gmail.com',
  'gmal.com': 'gmail.com',
  'gmial.com': 'gmail.com',
  'gmail.co': 'gmail.com',
  'gnail.com': 'gmail.com',
  'yahooo.com': 'yahoo.com',
  'yhoo.com': 'yahoo.com',
  'yaho.com': 'yahoo.com',
  'hotmial.com': 'hotmail.com',
  'hotmil.com': 'hotmail.com',
  'outloook.com': 'outlook.com',
  'outlok.com': 'outlook.com',
  'iclud.com': 'icloud.com',
  'protonmial.com': 'protonmail.com'
}

/**
 * Validate email format using RFC 5322 regex
 */
function validateFormat(email) {
  const regex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/
  return regex.test(email)
}

/**
 * Validate username rules
 */
function validateUsername(username) {
  if (!username || username.length < 1) return false
  if (username.length > 64) return false
  if (username.startsWith('.') || username.endsWith('.')) return false
  if (username.includes('..')) return false
  return true
}

/**
 * Check if domain has MX records
 */
async function checkMXRecord(domain) {
  try {
    const records = await dns.resolveMx(domain)
    return records && records.length > 0
  } catch {
    // Try A record as fallback
    try {
      await dns.resolve(domain)
      return true
    } catch {
      return false
    }
  }
}

/**
 * Full email validation
 * @returns {Promise<{status, checks, reason, suggestion, is_disposable}>}
 */
async function validateEmail(email) {
  const checks = {
    format: false,
    has_at_symbol: false,
    valid_domain: false,
    mx_record: false,
    not_disposable: false,
    valid_username: false,
  }

  // Basic structure
  checks.has_at_symbol = email.includes('@') && email.split('@').length === 2

  if (!checks.has_at_symbol) {
    return {
      email,
      status: 'invalid',
      checks,
      reason: 'Missing @ symbol — not a valid email format',
      suggestion: null,
      is_disposable: false,
    }
  }

  const [username, domain] = email.split('@')

  // Format check
  checks.format = validateFormat(email)
  checks.valid_username = validateUsername(username)

  // Domain checks
  const domainLower = domain.toLowerCase()
  checks.not_disposable = !DISPOSABLE_DOMAINS.has(domainLower)

  // MX record check (with timeout)
  try {
    const hasMx = await Promise.race([
      checkMXRecord(domainLower),
      new Promise(resolve => setTimeout(() => resolve(false), 3000))
    ])
    checks.mx_record = hasMx
    checks.valid_domain = hasMx
  } catch {
    checks.mx_record = false
    checks.valid_domain = false
  }

  // Typo suggestion
  const suggestion = TYPO_CORRECTIONS[domainLower]
    ? `${username}@${TYPO_CORRECTIONS[domainLower]}`
    : null

  const allPassed = Object.values(checks).every(Boolean)
  const status = allPassed ? 'valid' : 'invalid'

  // Build reason (will be enhanced by AI in the route)
  let reason = null
  if (!checks.format)         reason = 'Invalid email format'
  else if (!checks.valid_username) reason = 'Invalid username characters or length'
  else if (!checks.mx_record) reason = `Domain "${domain}" has no mail server records`
  else if (!checks.not_disposable) reason = `"${domain}" is a known disposable/temporary email provider`

  return {
    email,
    status,
    checks,
    reason,
    suggestion,
    is_disposable: !checks.not_disposable,
  }
}

module.exports = { validateEmail, DISPOSABLE_DOMAINS, TYPO_CORRECTIONS }
