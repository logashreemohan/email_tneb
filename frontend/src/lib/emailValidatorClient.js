// ─── Advanced client-side email validator ────────────────────────────────────
// Catches every known edge case with precise, specific error messages.

// ── Disposable domains ────────────────────────────────────────────────────────
const DISPOSABLE_DOMAINS = new Set([
  'mailinator.com','guerrillamail.com','tempmail.com','throwaway.email',
  'yopmail.com','sharklasers.com','trashmail.com','10minutemail.com',
  'getairmail.com','fakeinbox.com','spamgourmet.com','maildrop.cc',
  'getnada.com','dispostable.com','tempinbox.com','throwam.com',
  'spam4.me','mytemp.email','tempr.email','discard.email',
  'mailnull.com','safetymail.info','speed.1s.fr','spamgob.com',
])

// ── Typo corrections ──────────────────────────────────────────────────────────
const TYPO_CORRECTIONS = {
  'gamil.com':    'gmail.com',
  'gmal.com':     'gmail.com',
  'gmial.com':    'gmail.com',
  'gmail.co':     'gmail.com',
  'gnail.com':    'gmail.com',
  'yahooo.com':   'yahoo.com',
  'yhoo.com':     'yahoo.com',
  'yaho.com':     'yahoo.com',
  'hotmial.com':  'hotmail.com',
  'hotmil.com':   'hotmail.com',
  'outloook.com': 'outlook.com',
  'outlok.com':   'outlook.com',
  'iclud.com':    'icloud.com',
}

// ── Full RFC-5321 regex (accurate, not too strict) ────────────────────────────
// Allows all valid local-part characters, proper domain with min 2-char TLD
const RFC_REGEX =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/

// ── Individual checks (each returns null=pass or string=fail reason) ──────────

function checkAtSymbol(raw) {
  const count = (raw.match(/@/g) || []).length
  if (count === 0) return 'Missing @ symbol — every email must contain exactly one @'
  if (count > 1)   return `Double @ symbol found — "${raw}" contains ${count} @ signs (only one is allowed)`
  return null
}

function checkNoSpaces(raw) {
  if (/\s/.test(raw))
    return `Spaces are not allowed in email addresses — found space in "${raw}"`
  return null
}

function checkSplit(raw) {
  const parts = raw.split('@')
  if (parts.length !== 2) return 'Could not split email into username and domain'
  if (!parts[0]) return 'Username part is empty — nothing before the @'
  if (!parts[1]) return 'Domain part is empty — nothing after the @'
  return null
}

function checkUsername(username) {
  if (username.length > 64)
    return `Username "${username}" is too long (${username.length} chars, max is 64)`
  if (username.startsWith('.'))
    return `Username "${username}" cannot start with a dot`
  if (username.endsWith('.'))
    return `Username "${username}" cannot end with a dot`
  if (username.includes('..'))
    return `Username "${username}" contains consecutive dots (..)`
  // Disallow invalid characters
  if (/[^a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]/.test(username))
    return `Username "${username}" contains invalid characters — only letters, numbers and . ! # % & ' * + / = ? ^ _ \` { | } ~ - are allowed`
  return null
}

function checkDomain(domain) {
  if (!domain) return 'Domain is empty'

  // Leading/trailing dot
  if (domain.startsWith('.'))
    return `Domain "${domain}" cannot start with a dot — e.g. ".com" is not a valid domain`
  if (domain.endsWith('.'))
    return `Domain "${domain}" cannot end with a dot`

  // Double dots in domain
  if (domain.includes('..'))
    return `Domain "${domain}" contains consecutive dots (..) which is invalid`

  // Must have at least one dot
  if (!domain.includes('.'))
    return `Domain "${domain}" is missing a dot separator (e.g. "gmail.com")`

  const parts = domain.split('.')
  const tld   = parts[parts.length - 1]

  // TLD too short
  if (tld.length < 2)
    return `TLD ".${tld}" is too short — top-level domains must be at least 2 characters (e.g. .com, .in, .org)`

  // TLD must be letters only
  if (!/^[a-zA-Z]+$/.test(tld))
    return `TLD ".${tld}" contains numbers or symbols — TLDs must be letters only (e.g. .com, .net)`

  // Each domain label check
  for (const label of parts) {
    if (label.length === 0)
      return `Domain "${domain}" has an empty label (caused by consecutive dots)`
    if (label.length > 63)
      return `Domain label "${label}" exceeds the 63-character limit`
    if (label.startsWith('-') || label.endsWith('-'))
      return `Domain label "${label}" cannot start or end with a hyphen`
    if (!/^[a-zA-Z0-9-]+$/.test(label))
      return `Domain label "${label}" contains invalid characters — only letters, numbers and hyphens are allowed`
  }

  // Overall domain length
  if (domain.length > 253)
    return `Domain "${domain}" exceeds the 253-character limit`

  return null
}

function checkDisposable(domain) {
  if (DISPOSABLE_DOMAINS.has(domain.toLowerCase()))
    return `"${domain}" is a known disposable/temporary email provider — use a permanent email address`
  return null
}

function checkOverallFormat(email) {
  if (!RFC_REGEX.test(email))
    return `"${email}" does not match standard email format (RFC 5321)`
  return null
}

// ── Main validator ────────────────────────────────────────────────────────────
/**
 * Validates an email address with granular checks and specific error messages.
 * @param {string} rawEmail
 * @returns {{ email, status, checks, reason, suggestion, is_disposable }}
 */
export async function validateEmailClient(rawEmail) {
  const email = rawEmail.trim()   // preserve case for display, lowercase for checks
  const lc    = email.toLowerCase()

  // ── Run every check in order ──────────────────────────────────────────────
  const checks = {
    no_spaces:      true,
    single_at:      true,
    valid_username: true,
    valid_domain:   true,
    valid_tld:      true,
    no_double_dots: true,
    not_disposable: true,
    valid_format:   true,
  }

  let firstFailReason = null

  // 1. No spaces
  const spaceErr = checkNoSpaces(email)
  if (spaceErr) {
    checks.no_spaces = false
    firstFailReason  = spaceErr
  }

  // 2. @ symbol count
  const atErr = checkAtSymbol(lc)
  if (atErr) {
    checks.single_at = false
    if (!firstFailReason) firstFailReason = atErr
  }

  // 3. Split check — only continue if single @
  if (checks.single_at && !spaceErr) {
    const splitErr = checkSplit(lc)
    if (splitErr) {
      checks.single_at = false
      if (!firstFailReason) firstFailReason = splitErr
    } else {
      const [username, domain] = lc.split('@')

      // 4. Username rules
      const usrErr = checkUsername(username)
      if (usrErr) {
        checks.valid_username = false
        if (!firstFailReason) firstFailReason = usrErr
      }

      // 5. Domain rules (includes double-dot, TLD checks)
      const domErr = checkDomain(domain)
      if (domErr) {
        // Classify which sub-check failed
        if (domErr.includes('consecutive dots') || domErr.includes('empty label'))
          checks.no_double_dots = false
        else if (domErr.includes('TLD'))
          checks.valid_tld = false
        else
          checks.valid_domain = false
        if (!firstFailReason) firstFailReason = domErr
      }

      // 6. Disposable
      const dispErr = checkDisposable(domain)
      if (dispErr) {
        checks.not_disposable = false
        if (!firstFailReason) firstFailReason = dispErr
      }
    }
  }

  // 7. Final RFC regex (catches anything remaining)
  const fmtErr = checkOverallFormat(lc)
  if (fmtErr && !firstFailReason) {
    checks.valid_format = false
    firstFailReason     = fmtErr
  }

  const allPassed = Object.values(checks).every(Boolean)
  const status    = allPassed ? 'valid' : 'invalid'

  // Typo suggestion
  const domain     = lc.includes('@') ? lc.split('@')[1] : ''
  const suggestion = TYPO_CORRECTIONS[domain]
    ? `${lc.split('@')[0]}@${TYPO_CORRECTIONS[domain]}`
    : null

  const reason = allPassed
    ? 'Email address is properly formatted with a valid domain and TLD.'
    : firstFailReason

  return {
    email:        lc,
    status,
    checks,
    reason,
    suggestion,
    is_disposable: !checks.not_disposable,
  }
}
