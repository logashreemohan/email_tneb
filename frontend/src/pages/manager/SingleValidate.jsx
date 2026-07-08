import { useState } from 'react'
import { Mail, Shield, CheckCircle, XCircle, Loader2, AlertTriangle, Lightbulb, Zap } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth, localDB } from '../../context/AuthContext'
import { validateEmailClient } from '../../lib/emailValidatorClient'

const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? '' : 'http://localhost:5000')

const TYPOS = {
  'gamil.com': 'gmail.com', 'gmal.com': 'gmail.com', 'gmial.com': 'gmail.com',
  'yahooo.com': 'yahoo.com', 'yhoo.com': 'yahoo.com',
  'hotmial.com': 'hotmail.com', 'outloook.com': 'outlook.com'
}
const DISPOSABLE = new Set(['mailinator.com','guerrillamail.com','tempmail.com','yopmail.com','10minutemail.com'])

export default function SingleValidate() {
  const { user }              = useAuth()
  const [email, setEmail]     = useState('')
  const [result, setResult]   = useState(null)
  const [loading, setLoading] = useState(false)

  const doValidate = async (raw) => {
    const clean = raw.trim()
    if (!clean) return toast.error('Enter an email address')
    setLoading(true); setResult(null)

    let data = null
    try {
      const res = await fetch(`${API_URL}/api/validate/single`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: clean, userId: user?.id }),
        signal: AbortSignal.timeout(4000),
      })
      if (res.ok) data = await res.json()
    } catch { /* offline */ }

    if (!data) data = await validateEmailClient(clean)

    localDB.saveReport({ ...data, checked_by: user?.id })
    setResult(data)
    setLoading(false)
  }

  const handleSubmit = (e) => { e.preventDefault(); doValidate(email) }

  const domain       = email.split('@')[1]?.toLowerCase()
  const typoSuggest  = domain && TYPOS[domain] ? `${email.split('@')[0]}@${TYPOS[domain]}` : null
  const isDisposable = DISPOSABLE.has(domain)

  const CHECK_LABELS = {
    no_spaces:      'No spaces',
    single_at:      'Single @ symbol',
    valid_username: 'Valid username',
    valid_domain:   'Valid domain',
    valid_tld:      'Valid TLD (≥2 chars)',
    no_double_dots: 'No double dots',
    not_disposable: 'Not disposable',
    valid_format:   'RFC 5321 format',
  }

  return (
    <div className="max-w-2xl space-y-6 animate-fade-in">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-navy-900 flex items-center gap-2 mb-1">
          <Mail className="w-6 h-6 text-navy-600" /> Email Validation
        </h1>
        <p className="text-navy-400 text-sm">Instantly validate any email address with detailed analysis</p>
      </div>

      {/* Input card */}
      <div className="card border-t-4 border-t-navy-600">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-navy-600 mb-1.5 uppercase tracking-wide">
              Email Address to Validate
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  className="input-field pl-9"
                  placeholder="someone@example.com"
                  value={email}
                  onChange={e => { setEmail(e.target.value); setResult(null) }}
                  autoFocus
                />
              </div>
              <button type="submit" disabled={loading} className="btn-primary shrink-0">
                {loading
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Checking…</>
                  : <><Zap className="w-4 h-4" /> Validate</>
                }
              </button>
            </div>
          </div>

          {/* Inline hints */}
          {typoSuggest && (
            <div className="flex items-center gap-2 text-sm text-gold-700 bg-gold-50 border border-gold-200 rounded-xl px-3 py-2">
              <Lightbulb className="w-4 h-4 shrink-0 text-gold-500" />
              Did you mean&nbsp;
              <button type="button" className="font-bold underline text-navy-700"
                onClick={() => setEmail(typoSuggest)}>{typoSuggest}</button>?
            </div>
          )}
          {isDisposable && !typoSuggest && (
            <div className="flex items-center gap-2 text-sm text-orange-700 bg-orange-50 border border-orange-200 rounded-xl px-3 py-2">
              <AlertTriangle className="w-4 h-4 shrink-0" /> Disposable email provider detected
            </div>
          )}
        </form>
      </div>

      {/* Scanning */}
      {loading && (
        <div className="card text-center py-10 border-t-4 border-t-navy-600">
          <div className="relative w-16 h-16 mx-auto mb-4">
            <div className="absolute inset-0 border-4 border-navy-100 rounded-full" />
            <div className="absolute inset-0 border-4 border-transparent border-t-navy-600 rounded-full animate-spin" />
            <Shield className="absolute inset-0 m-auto w-6 h-6 text-navy-600" />
          </div>
          <p className="text-navy-700 font-semibold">Validating email…</p>
          <p className="text-navy-400 text-sm mt-1">Checking format · domain · MX records</p>
        </div>
      )}

      {/* Result */}
      {result && !loading && (
        <div className={`card border-t-4 animate-slide-up ${
          result.status === 'valid' ? 'border-t-green-500' : 'border-t-red-500'
        }`}>
          {/* Status header */}
          <div className="flex items-center gap-4 pb-5 mb-5 border-b border-slate-100">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 ${
              result.status === 'valid' ? 'bg-green-100 border border-green-200' : 'bg-red-100 border border-red-200'
            }`}>
              {result.status === 'valid'
                ? <CheckCircle className="w-7 h-7 text-green-600" />
                : <XCircle className="w-7 h-7 text-red-600" />
              }
            </div>
            <div>
              <p className="font-mono text-navy-800 font-bold text-base break-all">{result.email}</p>
              <span className={result.status === 'valid' ? 'badge-valid' : 'badge-invalid'}>
                {result.status === 'valid' ? '✓ Valid Email Address' : '✗ Invalid Email Address'}
              </span>
            </div>
          </div>

          {/* Reason */}
          {result.reason && (
            <div className="bg-navy-50 border border-navy-100 rounded-xl p-4 mb-4">
              <p className="text-xs font-semibold text-navy-500 uppercase tracking-wide mb-1.5 flex items-center gap-1">
                <Zap className="w-3 h-3 text-gold-500" /> Analysis Result
              </p>
              <p className="text-navy-700 text-sm leading-relaxed">{result.reason}</p>
            </div>
          )}

          {/* Check grid */}
          {result.checks && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {Object.entries(result.checks).map(([key, passed]) => (
                <div key={key} className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium border ${
                  passed
                    ? 'bg-green-50 text-green-700 border-green-200'
                    : 'bg-red-50 text-red-700 border-red-200'
                }`}>
                  {passed ? <CheckCircle className="w-3.5 h-3.5 shrink-0" /> : <XCircle className="w-3.5 h-3.5 shrink-0" />}
                  {CHECK_LABELS[key] || key.replace(/_/g, ' ')}
                </div>
              ))}
            </div>
          )}

          {/* Suggestions */}
          {result.suggestion && (
            <div className="mt-4 flex items-center gap-2 text-sm text-gold-700 bg-gold-50 border border-gold-200 rounded-xl px-3 py-2">
              <Lightbulb className="w-4 h-4 shrink-0 text-gold-500" />
              Did you mean:&nbsp;
              <button className="font-bold underline"
                onClick={() => { setEmail(result.suggestion); setResult(null) }}>
                {result.suggestion}
              </button>?
            </div>
          )}
          {result.is_disposable && (
            <div className="mt-3 flex items-center gap-2 text-sm text-orange-700 bg-orange-50 border border-orange-200 rounded-xl px-3 py-2">
              <AlertTriangle className="w-4 h-4 shrink-0" /> Disposable/temporary email provider detected
            </div>
          )}
        </div>
      )}

      {/* Feature cards */}
      {!result && !loading && (
        <div className="grid grid-cols-2 gap-3">
          {[
            { title: 'Format Check',   desc: 'RFC 5322 regex validation', icon: '📝', color: 'border-navy-200 bg-navy-50' },
            { title: 'Domain Check',   desc: 'TLD and domain structure',  icon: '🌐', color: 'border-blue-200 bg-blue-50' },
            { title: 'Typo Detection', desc: 'Common domain corrections', icon: '💡', color: 'border-gold-200 bg-gold-50' },
            { title: 'Disposable',     desc: 'Blocks temp email domains', icon: '🚫', color: 'border-red-200 bg-red-50'   },
          ].map(f => (
            <div key={f.title} className={`rounded-2xl border p-4 ${f.color}`}>
              <span className="text-2xl">{f.icon}</span>
              <p className="text-sm font-bold text-navy-800 mt-2">{f.title}</p>
              <p className="text-xs text-navy-400 mt-0.5">{f.desc}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
