import { useState, useRef } from 'react'
import {
  Globe, Search, Loader2, AlertTriangle, CheckCircle,
  XCircle, RefreshCw, Download, BookOpen, Lightbulb, Info
} from 'lucide-react'
import toast from 'react-hot-toast'

const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? '' : 'http://localhost:5000')
const LT_API  = 'https://api.languagetool.org/v2/check'

// ── Category colours & labels ─────────────────────────────────────────────────
const CAT_META = {
  TYPOS:          { label: 'Spelling',    color: '#ef4444', bg: '#fef2f2', border: '#fecaca' },
  GRAMMAR:        { label: 'Grammar',     color: '#f59e0b', bg: '#fffbeb', border: '#fde68a' },
  PUNCTUATION:    { label: 'Punctuation', color: '#8b5cf6', bg: '#f5f3ff', border: '#ddd6fe' },
  STYLE:          { label: 'Style',       color: '#3b82f6', bg: '#eff6ff', border: '#bfdbfe' },
  CONFUSED_WORDS: { label: 'Word Choice', color: '#10b981', bg: '#f0fdf4', border: '#bbf7d0' },
  CASING:         { label: 'Casing',      color: '#6366f1', bg: '#eef2ff', border: '#c7d2fe' },
  default:        { label: 'Other',       color: '#64748b', bg: '#f8fafc', border: '#e2e8f0' },
}

function getCat(issue) {
  const id = issue.rule?.category?.id || 'default'
  return CAT_META[id] || CAT_META.default
}

// ── Highlight text with error markers ─────────────────────────────────────────
function buildHighlightedText(text, issues) {
  if (!issues.length) return [{ text, type: 'ok' }]

  // Sort by offset ascending, remove overlapping
  const sorted = [...issues]
    .sort((a, b) => a.offset - b.offset)
    .reduce((acc, cur) => {
      const last = acc[acc.length - 1]
      if (last && cur.offset < last._end) return acc
      cur._end = cur.offset + cur.length
      return [...acc, cur]
    }, [])

  const parts = []
  let cursor = 0
  for (const issue of sorted) {
    const start = Math.max(issue.offset, 0)
    const end   = Math.min(start + issue.length, text.length)
    if (start > cursor) parts.push({ text: text.slice(cursor, start), type: 'ok' })
    if (start < end)    parts.push({ text: text.slice(start, end), type: 'error', issue })
    cursor = end
  }
  if (cursor < text.length) parts.push({ text: text.slice(cursor), type: 'ok' })
  return parts
}

// ── Main component ────────────────────────────────────────────────────────────
export default function WebChecker() {
  const [url, setUrl]             = useState('')
  const [pageText, setPageText]   = useState('')
  const [issues, setIssues]       = useState([])
  const [loading, setLoading]     = useState(false)
  const [step, setStep]           = useState('')   // 'fetching' | 'checking' | ''
  const [activeIssue, setActive]  = useState(null)
  const [filterCat, setFilterCat] = useState('ALL')
  const abortRef                  = useRef(false)

  // ── 1. Fetch website text via our backend (no CORS issues) ──────────────
  const fetchWebsite = async (targetUrl) => {
    const res  = await fetch(`${API_URL}/api/webcheck/fetch`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ url: targetUrl }),
      signal:  AbortSignal.timeout(20000),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Failed to fetch website')
    return { text: data.text, title: data.title }
  }

  // ── 2. Check grammar via LanguageTool (direct — no CORS on this API) ─────
  const checkGrammar = async (text) => {
    const body = new URLSearchParams({ text, language: 'en-US', enabledOnly: 'false' })
    const res  = await fetch(LT_API, {
      method:  'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
      signal:  AbortSignal.timeout(20000),
    })
    if (!res.ok) throw new Error(`Grammar check failed (${res.status})`)
    const data = await res.json()
    
    // Smart Filter: Ignore Names and Abbreviations flagged as typos
    const filteredMatches = (data.matches || []).filter(match => {
      if (match.rule?.category?.id === 'TYPOS' || match.rule?.issueType === 'misspelling') {
        const word = text.slice(match.offset, match.offset + match.length)
        // Ignore UPPERCASE (Abbreviations, Acronyms) e.g., TNEB, HTML, URL
        if (word === word.toUpperCase() && /[A-Z]/.test(word)) return false
        // Ignore Title Case (Names, Proper Nouns) e.g., Logashree, Chennai, Tamil
        if (/^[A-Z][a-z]+$/.test(word)) return false
      }
      return true
    })
    
    return filteredMatches
  }

  // ── Main handler ──────────────────────────────────────────────────────────
  const handleCheck = async (e) => {
    e.preventDefault()
    let target = url.trim()
    if (!target) return toast.error('Enter a website URL')
    if (!/^https?:\/\//i.test(target)) target = 'https://' + target

    setLoading(true); setIssues([]); setPageText(''); setActive(null); abortRef.current = false

    try {
      setStep('fetching')
      toast('Fetching website content…', { icon: '🌐' })
      const { text, title } = await fetchWebsite(target)
      setPageText(text)
      if (title) toast.success(`Fetched: ${title.slice(0, 50)}`, { duration: 2500 })

      setStep('checking')
      toast('Checking spelling & grammar…', { icon: '📝' })
      const matches = await checkGrammar(text)
      setIssues(matches)

      if (matches.length === 0) {
        toast.success('No spelling or grammar issues found!')
      } else {
        toast.error(`Found ${matches.length} issue${matches.length !== 1 ? 's' : ''}`, { duration: 3000 })
      }
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoading(false); setStep('')
    }
  }

  // ── Derived data ──────────────────────────────────────────────────────────
  const categories = ['ALL', ...new Set(
    issues.map(i => i.rule?.category?.id || 'default')
  )]
  const filtered = filterCat === 'ALL'
    ? issues
    : issues.filter(i => (i.rule?.category?.id || 'default') === filterCat)

  const highlightParts = pageText ? buildHighlightedText(pageText, issues) : []

  const countByType = {
    spelling:   issues.filter(i => (i.rule?.category?.id||'') === 'TYPOS').length,
    grammar:    issues.filter(i => (i.rule?.category?.id||'') === 'GRAMMAR').length,
    other:      issues.filter(i => !['TYPOS','GRAMMAR'].includes(i.rule?.category?.id||'')).length,
  }

  // ── Export report ─────────────────────────────────────────────────────────
  const exportReport = () => {
    const lines = [
      `TNEB Website Spell & Grammar Check Report`,
      `URL: ${url}`,
      `Date: ${new Date().toLocaleString()}`,
      `Total Issues: ${issues.length}`,
      '',
      ...issues.map((iss, i) => [
        `${i+1}. [${getCat(iss).label}] ${iss.message}`,
        `   Context: …${iss.context.text}…`,
        `   Suggestions: ${iss.replacements?.slice(0,3).map(r=>r.value).join(', ') || 'none'}`,
        '',
      ].join('\n')),
    ].join('\n')
    const blob = new Blob([lines], { type: 'text/plain' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob); a.download = 'grammar_report.txt'; a.click()
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 animate-fade-in max-w-6xl">

      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-navy-900 flex items-center gap-2 mb-1">
          <Globe className="w-6 h-6 text-navy-600" /> Website Spell & Grammar Checker
        </h1>
        <p className="text-navy-400 text-sm">
          Enter any website URL · fetches content · highlights every spelling and grammar mistake
        </p>
      </div>

      {/* URL input card */}
      <div className="card border-t-4" style={{ borderTopColor:'#1e3a8a' }}>
        <form onSubmit={handleCheck} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              className="input-field pl-9"
              placeholder="https://example.com  or  example.com"
              value={url}
              onChange={e => setUrl(e.target.value)}
              disabled={loading}
            />
          </div>
          <button type="submit" disabled={loading} className="btn-primary shrink-0">
            {loading
              ? <><Loader2 className="w-4 h-4 animate-spin" />
                  {step === 'fetching' ? 'Fetching…' : 'Checking…'}</>
              : <><Search className="w-4 h-4" /> Check Website</>
            }
          </button>
          {pageText && !loading && (
            <button type="button" onClick={() => { setUrl(''); setPageText(''); setIssues([]); setActive(null) }}
              className="btn-outline shrink-0">
              <RefreshCw className="w-4 h-4" /> Clear
            </button>
          )}
        </form>

        {/* Info note */}
        <div className="mt-4 flex items-start gap-2 text-xs text-navy-400 bg-blue-50 border border-blue-100 rounded-xl p-3">
          <Info className="w-3.5 h-3.5 shrink-0 mt-0.5 text-blue-400" />
          <span>
            Uses <strong>LanguageTool</strong> (free public API) for grammar/spelling analysis.
            Text is limited to 5,000 characters from the page.
            Works best on English-language websites.
          </span>
        </div>
      </div>

      {/* Loading skeleton */}
      {loading && (
        <div className="card text-center py-12">
          <div className="relative w-16 h-16 mx-auto mb-4">
            <div className="absolute inset-0 border-4 rounded-full" style={{ borderColor:'#dbeafe' }} />
            <div className="absolute inset-0 border-4 border-transparent rounded-full animate-spin"
              style={{ borderTopColor:'#1e3a8a' }} />
            <Globe className="absolute inset-0 m-auto w-6 h-6" style={{ color:'#1e3a8a' }} />
          </div>
          <p className="font-semibold text-navy-700">
            {step === 'fetching' ? 'Fetching website content…' : 'Analysing text for errors…'}
          </p>
          <p className="text-navy-400 text-sm mt-1">
            {step === 'fetching' ? 'Extracting readable text from the page' : 'Running LanguageTool grammar engine'}
          </p>
        </div>
      )}

      {/* Summary cards */}
      {!loading && pageText && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Issues',   value: issues.length,        color:'#1e3a8a', bg:'#eff6ff', border:'#bfdbfe' },
            { label: 'Spelling',       value: countByType.spelling,  color:'#ef4444', bg:'#fef2f2', border:'#fecaca' },
            { label: 'Grammar',        value: countByType.grammar,   color:'#f59e0b', bg:'#fffbeb', border:'#fde68a' },
            { label: 'Other',          value: countByType.other,     color:'#8b5cf6', bg:'#f5f3ff', border:'#ddd6fe' },
          ].map(s => (
            <div key={s.label} className="rounded-2xl border p-4 text-center"
              style={{ background:s.bg, borderColor:s.border, borderTopWidth:4, borderTopColor:s.color }}>
              <p className="text-3xl font-extrabold" style={{ color:s.color }}>{s.value}</p>
              <p className="text-xs font-semibold uppercase tracking-wide mt-1" style={{ color:s.color+'bb' }}>
                {s.label}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* All-clear banner */}
      {!loading && pageText && issues.length === 0 && (
        <div className="card flex items-center gap-4 border-green-200" style={{ borderTopWidth:4, borderTopColor:'#10b981' }}>
          <div className="w-12 h-12 rounded-2xl bg-green-100 border border-green-200 flex items-center justify-center shrink-0">
            <CheckCircle className="w-6 h-6 text-green-600" />
          </div>
          <div>
            <h3 className="font-bold text-green-700">No issues found!</h3>
            <p className="text-green-600 text-sm">The website text passed all spelling and grammar checks.</p>
          </div>
        </div>
      )}

      {/* Main results layout: highlighted text + issue list */}
      {!loading && issues.length > 0 && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

          {/* ── LEFT: Highlighted text ── */}
          <div className="card p-0 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-blue-50">
              <h3 className="font-bold text-navy-800 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-navy-500" /> Page Text
                <span className="text-xs text-navy-400 font-normal ml-1">
                  ({pageText.length} chars)
                </span>
              </h3>
              <span className="text-xs bg-red-100 text-red-700 border border-red-200 px-2 py-0.5 rounded-full font-semibold">
                {issues.length} issues marked
              </span>
            </div>
            <div className="p-5 max-h-[500px] overflow-y-auto text-sm leading-relaxed whitespace-pre-wrap font-mono"
              style={{ color:'#334155' }}>
              {highlightParts.map((part, i) =>
                part.type === 'ok' ? (
                  <span key={i}>{part.text}</span>
                ) : (
                  <span key={i}
                    onClick={() => setActive(part.issue)}
                    style={{
                      background: activeIssue === part.issue ? '#fef9c3' : getCat(part.issue).bg,
                      borderBottom: `2px solid ${getCat(part.issue).color}`,
                      color: getCat(part.issue).color,
                      fontWeight: 600,
                      cursor: 'pointer',
                      borderRadius: 2,
                      padding: '0 1px',
                      transition: 'background 0.15s',
                    }}
                    title={part.issue.message}
                  >{part.text}</span>
                )
              )}
            </div>
          </div>

          {/* ── RIGHT: Issue list ── */}
          <div className="card p-0 overflow-hidden flex flex-col">
            {/* Header + filter + export */}
            <div className="px-5 py-4 border-b border-blue-50">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-navy-800 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-500" /> Issues
                </h3>
                <button onClick={exportReport} className="btn-outline text-xs py-1.5 px-3 gap-1">
                  <Download className="w-3.5 h-3.5" /> Export
                </button>
              </div>
              {/* Category filter pills */}
              <div className="flex flex-wrap gap-1.5">
                {categories.map(cat => {
                  const meta = cat === 'ALL' ? { label:'All', color:'#1e3a8a', bg:'#eff6ff', border:'#bfdbfe' } : (CAT_META[cat] || CAT_META.default)
                  const active = filterCat === cat
                  return (
                    <button key={cat} onClick={() => setFilterCat(cat)}
                      style={{
                        background: active ? meta.color : meta.bg,
                        color: active ? '#fff' : meta.color,
                        border: `1px solid ${meta.border}`,
                        padding:'3px 10px', borderRadius:999,
                        fontSize:11, fontWeight:600, cursor:'pointer', transition:'all 0.15s',
                      }}>
                      {meta.label}
                      {cat !== 'ALL' && (
                        <span style={{ marginLeft:4, opacity:0.75 }}>
                          ({issues.filter(i=>(i.rule?.category?.id||'default')===cat).length})
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Issue cards */}
            <div className="flex-1 overflow-y-auto max-h-[440px] p-3 space-y-2">
              {filtered.map((iss, i) => {
                const cat  = getCat(iss)
                const suggestions = iss.replacements?.slice(0, 4).map(r => r.value) || []
                const isActive = activeIssue === iss
                return (
                  <div key={i}
                    onClick={() => setActive(isActive ? null : iss)}
                    style={{
                      background: isActive ? cat.bg : '#fff',
                      border: `1px solid ${isActive ? cat.color : '#e2e8f0'}`,
                      borderLeft: `4px solid ${cat.color}`,
                      borderRadius: 12, padding:'10px 12px',
                      cursor:'pointer', transition:'all 0.15s',
                    }}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        {/* Category badge */}
                        <span style={{
                          background: cat.bg, color: cat.color, border:`1px solid ${cat.border}`,
                          fontSize:10, fontWeight:700, padding:'1px 7px', borderRadius:999,
                          textTransform:'uppercase', letterSpacing:'0.06em',
                        }}>{cat.label}</span>
                        {/* Message */}
                        <p className="text-sm font-semibold mt-1.5" style={{ color:'#1e293b' }}>
                          {iss.message}
                        </p>
                        {/* Context snippet */}
                        <p className="text-xs mt-1 font-mono" style={{ color:'#64748b' }}>
                          …{iss.context.text.slice(0, 60)}…
                        </p>
                      </div>
                      <XCircle className="w-4 h-4 shrink-0 mt-0.5" style={{ color: cat.color, opacity:0.6 }} />
                    </div>
                    {/* Suggestions */}
                    {suggestions.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        <span className="text-xs flex items-center gap-1" style={{ color:'#64748b' }}>
                          <Lightbulb className="w-3 h-3" /> Suggest:
                        </span>
                        {suggestions.map((s, si) => (
                          <span key={si} style={{
                            background:'#fff', border:`1px solid ${cat.border}`,
                            color: cat.color, fontSize:11, fontWeight:600,
                            padding:'1px 8px', borderRadius:6,
                          }}>{s}</span>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!loading && !pageText && (
        <div className="card text-center py-14 border-dashed">
          <Globe className="w-12 h-12 mx-auto mb-4 text-slate-200" />
          <p className="font-semibold text-navy-600">Enter a website URL above to start checking</p>
          <p className="text-navy-400 text-sm mt-1">
            Powered by LanguageTool · Checks spelling, grammar, punctuation, style & word choice
          </p>
          <div className="flex flex-wrap justify-center gap-2 mt-4 text-xs">
            {['Spelling Errors','Grammar Mistakes','Punctuation Issues','Word Choice','Casing'].map(t => (
              <span key={t} className="bg-blue-50 border border-blue-100 text-navy-600 px-3 py-1 rounded-full font-medium">
                {t}
              </span>
            ))}
          </div>
        </div>
      )}

    </div>
  )
}
