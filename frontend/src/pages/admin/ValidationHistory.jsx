import { useEffect, useState } from 'react'
import { supabase, isSupabaseConfigured } from '../../lib/supabase'
import { localDB } from '../../context/AuthContext'
import {
  History, Search, Download, Trash2, RefreshCw,
  CheckCircle, XCircle, Mail, Calendar, Filter, MessageSquare
} from 'lucide-react'
import toast from 'react-hot-toast'

// ── Colour config per status ──────────────────────────────────────────────────
const STATUS_CFG = {
  all:     { label:'All',     bg:'bg-navy-600',  text:'text-white',      card:'bg-navy-50 border-navy-300 text-navy-800',   dot:'bg-navy-500'  },
  valid:   { label:'Valid',   bg:'bg-green-600', text:'text-white',      card:'bg-green-50 border-green-300 text-green-800', dot:'bg-green-500' },
  invalid: { label:'Invalid', bg:'bg-red-600',   text:'text-white',      card:'bg-red-50 border-red-300 text-red-800',       dot:'bg-red-500'   },
}

// ── Row highlight per status ──────────────────────────────────────────────────
function rowStyle(status) {
  const s = String(status).toLowerCase()
  if (s === 'valid')   return { background:'#f0fdf4', borderLeft:'3px solid #16a34a' }
  if (s === 'invalid') return { background:'#fff5f5', borderLeft:'3px solid #dc2626' }
  return {}
}

export default function ValidationHistory() {
  const [viewTab, setViewTab]   = useState('emails') // 'emails' | 'ai'

  // Email State
  const [records, setRecords]   = useState([])
  const [filtered, setFiltered] = useState([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')
  const [filter, setFilter]     = useState('all')
  const [sortCol, setSortCol]   = useState('created_at')
  const [sortDir, setSortDir]   = useState('desc')

  // AI Chat State
  const [chatRecords, setChatRecords] = useState([])
  const [chatSearch, setChatSearch]   = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const [selectedChat, setSelectedChat] = useState(null)

  useEffect(() => { 
    if (viewTab === 'emails') fetchRecords() 
    else fetchChatRecords()
  }, [viewTab])

  useEffect(() => { applyFilter() }, [records, search, filter, sortCol, sortDir])

  const fetchRecords = async () => {
    setLoading(true)
    try {
      if (isSupabaseConfigured) {
        const { data, error } = await supabase
          .from('email_reports').select('*')
          .order('created_at', { ascending: false }).limit(1000)
        if (error) throw error
        setRecords(data || [])
      } else {
        setRecords(localDB.getReports())
      }
    } catch { toast.error('Failed to load history') }
    finally { setLoading(false) }
  }

  const fetchChatRecords = async () => {
    setChatLoading(true)
    try {
      if (isSupabaseConfigured) {
        const { data, error } = await supabase
          .from('ai_chat_logs').select('*')
          .order('created_at', { ascending: false }).limit(1000)
        if (error) throw error
        setChatRecords(data || [])
      } else {
        setChatRecords(localDB.getAiChatLogs())
      }
    } catch { toast.error('Failed to load AI chat history') }
    finally { setChatLoading(false) }
  }

  const applyFilter = () => {
    let data = [...records]

    // Status filter - ensure exact case-insensitive match
    if (filter !== 'all') {
      data = data.filter(r => String(r.status).toLowerCase() === filter)
    }

    // Search - carefully handle the "valid" vs "invalid" substring issue
    if (search.trim()) {
      const q = search.toLowerCase().trim()
      data = data.filter(r => {
        const eml = (r.email || '').toLowerCase()
        const rsn = (r.reason || '').toLowerCase()
        
        // Exact email match or substring match
        if (eml.includes(q)) return true
        
        // If user typed "valid", don't accidentally match "invalid" in the reason
        if (q === 'valid') {
          // Only match if the word is exactly 'valid' and not part of 'invalid'
          return /\bvalid\b/.test(rsn) && !rsn.includes('invalid')
        }
        
        return rsn.includes(q)
      })
    }

    // Sort
    data.sort((a, b) => {
      let av = a[sortCol] || '', bv = b[sortCol] || ''
      if (sortCol === 'created_at') { av = new Date(av); bv = new Date(bv) }
      if (av < bv) return sortDir === 'asc' ? -1 : 1
      if (av > bv) return sortDir === 'asc' ? 1 : -1
      return 0
    })

    setFiltered(data)
  }

  const toggleSort = (col) => {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortCol(col); setSortDir('asc') }
  }

  const deleteRecord = async (id) => {
    if (isSupabaseConfigured) await supabase.from('email_reports').delete().eq('id', id)
    else localDB.deleteReport(id)
    setRecords(prev => prev.filter(r => r.id !== id))
    toast.success('Record deleted')
  }

  const deleteChatRecord = async (id) => {
    if (isSupabaseConfigured) await supabase.from('ai_chat_logs').delete().eq('id', id)
    else localDB.deleteAiChatLog(id)
    setChatRecords(prev => prev.filter(r => r.id !== id))
    toast.success('Chat log deleted')
  }

  const exportCSV = () => {
    if (viewTab === 'emails') {
      const rows = [['#', 'Email', 'Status', 'Reason', 'Date']]
      filtered.forEach((r, i) =>
        rows.push([i + 1, r.email, r.status, r.reason || '', new Date(r.created_at).toLocaleString('en-IN')])
      )
      const csv  = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n')
      const blob = new Blob([csv], { type: 'text/csv' })
      const a    = document.createElement('a')
      a.href     = URL.createObjectURL(blob)
      a.download = `email_history_${filter}_${Date.now()}.csv`
      a.click()
      toast.success(`Exported ${filtered.length} ${filter} records`)
    } else {
      const rows = [['#', 'Prompt', 'Response', 'Date']]
      chatRecords.forEach((r, i) =>
        rows.push([i + 1, r.prompt, r.response || '', new Date(r.created_at).toLocaleString('en-IN')])
      )
      const csv  = rows.map(r => r.map(c => `"${c?.toString().replace(/"/g, '""')}"`).join(',')).join('\n')
      const blob = new Blob([csv], { type: 'text/csv' })
      const a    = document.createElement('a')
      a.href     = URL.createObjectURL(blob)
      a.download = `ai_chat_history_${Date.now()}.csv`
      a.click()
      toast.success(`Exported ${chatRecords.length} chat records`)
    }
  }

  // ── Counts ─────────────────────────────────────────────────────────────────
  const total   = records.length
  const valid   = records.filter(r => String(r.status).toLowerCase() === 'valid').length
  const invalid = records.filter(r => String(r.status).toLowerCase() === 'invalid').length
  const rate    = total ? Math.round((valid / total) * 100) : 0

  const filteredChats = chatRecords.filter(r => 
    (r.prompt || '').toLowerCase().includes(chatSearch.toLowerCase()) || 
    (r.response || '').toLowerCase().includes(chatSearch.toLowerCase())
  )

  const SortIcon = ({ col }) => {
    if (sortCol !== col) return <span className="text-slate-300 ml-1">↕</span>
    return <span className="text-navy-600 ml-1">{sortDir === 'asc' ? '↑' : '↓'}</span>
  }

  return (
    <div className="space-y-6 animate-fade-in">

      {/* ── Header ── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-navy-900 flex items-center gap-2">
            <History className="w-6 h-6 text-navy-600" /> Admin History
          </h1>
          <p className="text-navy-400 text-sm mt-0.5">
            Review past operations and AI generations
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => viewTab === 'emails' ? fetchRecords() : fetchChatRecords()} className="btn-outline gap-2 text-sm py-2 px-3">
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
          <button onClick={exportCSV} className="btn-primary gap-2 text-sm py-2 px-3">
            <Download className="w-4 h-4" /> Export CSV
          </button>
        </div>
      </div>

      {/* View Toggle Tabs */}
      <div className="flex gap-4 border-b border-slate-200">
        <button onClick={() => setViewTab('emails')} className={`pb-3 px-1 text-sm font-bold flex items-center gap-2 transition-colors border-b-2 ${viewTab === 'emails' ? 'border-navy-600 text-navy-700' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>
          <Mail className="w-4 h-4" /> Email Validations
        </button>
        <button onClick={() => setViewTab('ai')} className={`pb-3 px-1 text-sm font-bold flex items-center gap-2 transition-colors border-b-2 ${viewTab === 'ai' ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>
          <MessageSquare className="w-4 h-4" /> AI Chat History
        </button>
      </div>

      {viewTab === 'emails' ? (
        <>
          {/* ── Classification cards — click to filter ── */}
          <div className="grid grid-cols-3 gap-4">
            {[
              {
                key: 'all', icon: Mail, count: total,
                label: 'All Emails',
                sub: `${rate}% valid rate`,
                card: 'border-navy-200',
                active: 'border-t-4 border-t-navy-600 bg-navy-50',
                inactive: 'bg-white hover:bg-navy-50',
                num: 'text-navy-800', sub_c: 'text-navy-400',
              },
              {
                key: 'valid', icon: CheckCircle, count: valid,
                label: 'Valid Emails',
                sub: `${total ? ((valid/total)*100).toFixed(1) : 0}% of total`,
                card: 'border-green-200',
                active: 'border-t-4 border-t-green-600 bg-green-50',
                inactive: 'bg-white hover:bg-green-50',
                num: 'text-green-700', sub_c: 'text-green-500',
              },
              {
                key: 'invalid', icon: XCircle, count: invalid,
                label: 'Invalid Emails',
                sub: `${total ? ((invalid/total)*100).toFixed(1) : 0}% of total`,
                card: 'border-red-200',
                active: 'border-t-4 border-t-red-600 bg-red-50',
                inactive: 'bg-white hover:bg-red-50',
                num: 'text-red-700', sub_c: 'text-red-400',
              },
            ].map(c => {
              const isActive = filter === c.key
              return (
                <button key={c.key} onClick={() => setFilter(c.key)}
                  className={`rounded-2xl border p-5 text-left transition-all duration-200 cursor-pointer
                              shadow-sm hover:shadow-md ${c.card}
                              ${isActive ? c.active : c.inactive}`}>
                  <div className="flex items-center justify-between mb-3">
                    <c.icon className={`w-6 h-6 ${isActive ? c.num : 'text-slate-400'}`} />
                    {isActive && (
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-white shadow-sm"
                        style={{ color: c.num.replace('text-','') === 'navy-800' ? '#1e3a8a' : '' }}>
                        Active
                      </span>
                    )}
                  </div>
                  {loading
                    ? <div className="h-9 bg-slate-100 rounded animate-pulse mb-1" />
                    : <p className={`text-4xl font-extrabold ${c.num}`}>{c.count.toLocaleString()}</p>
                  }
                  <p className="font-semibold text-sm mt-1" style={{ color:'#1e3a8a' }}>{c.label}</p>
                  <p className={`text-xs mt-0.5 ${c.sub_c}`}>{c.sub}</p>

                  {/* Progress bar */}
                  {total > 0 && !loading && (
                    <div className="mt-3 bg-slate-200 rounded-full h-1.5 overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${(c.count / total) * 100}%`,
                          background: c.key === 'valid' ? '#16a34a' : c.key === 'invalid' ? '#dc2626' : '#1e3a8a'
                        }} />
                    </div>
                  )}
                </button>
              )
            })}
          </div>

          {/* ── Search + tab strip ── */}
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-52">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input type="text" className="input-field pl-9"
                placeholder="Search by email or reason…"
                value={search} onChange={e => setSearch(e.target.value)} />
            </div>

            {/* Tab pills with counts */}
            <div className="flex items-center gap-1 bg-white border border-blue-100 rounded-xl p-1 shadow-sm">
              {[
                { key:'all',     label:'All',     count: total   },
                { key:'valid',   label:'Valid',   count: valid   },
                { key:'invalid', label:'Invalid', count: invalid },
              ].map(t => (
                <button key={t.key} onClick={() => setFilter(t.key)}
                  className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                    filter === t.key
                      ? t.key === 'valid'   ? 'bg-green-600 text-white shadow-sm'
                      : t.key === 'invalid' ? 'bg-red-600 text-white shadow-sm'
                      :                       'bg-navy-600 text-white shadow-sm'
                      : 'text-navy-500 hover:bg-navy-50'
                  }`}>
                  {t.label}
                  <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${
                    filter === t.key ? 'bg-white/25 text-white' : 'bg-slate-100 text-slate-600'
                  }`}>{t.count}</span>
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1.5 text-xs text-navy-400">
              <Filter className="w-3.5 h-3.5" />
              {filtered.length} shown
            </div>
          </div>

          {/* ── Table ── */}
          <div className="card p-0 overflow-hidden">
            {loading ? (
              <div className="p-6 space-y-3">
                {[...Array(6)].map((_, i) => <div key={i} className="h-10 bg-slate-100 rounded-xl animate-pulse" />)}
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-16">
                <History className="w-10 h-10 mx-auto mb-3 text-slate-200" />
                <p className="text-navy-500 font-semibold">No {filter !== 'all' ? filter : ''} records found</p>
                <p className="text-navy-400 text-sm mt-1">
                  {search ? 'Try a different search term' : `No ${filter} emails in history yet`}
                </p>
              </div>
            ) : (
              <>
                {/* Status legend */}
                <div className="flex items-center gap-4 px-5 py-3 bg-slate-50 border-b border-slate-100 text-xs font-medium text-navy-500">
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-sm bg-green-100 border-l-2 border-green-500 inline-block" />
                    Valid rows
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-sm bg-red-50 border-l-2 border-red-500 inline-block" />
                    Invalid rows
                  </span>
                  <span className="ml-auto">{filtered.length} of {total} records</span>
                </div>

                <div className="overflow-x-auto">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th className="w-10">#</th>
                        <th onClick={() => toggleSort('email')} className="cursor-pointer select-none">
                          Email Address <SortIcon col="email" />
                        </th>
                        <th onClick={() => toggleSort('status')} className="cursor-pointer select-none">
                          Status <SortIcon col="status" />
                        </th>
                        <th>Reason</th>
                        <th onClick={() => toggleSort('created_at')} className="cursor-pointer select-none">
                          Date & Time <SortIcon col="created_at" />
                        </th>
                        <th className="w-10"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((r, i) => {
                        const isRowValid = String(r.status).toLowerCase() === 'valid'
                        return (
                          <tr key={r.id ? `${r.id}-${i}` : i} style={rowStyle(r.status)}>
                            <td className="text-navy-300 text-xs">{i + 1}</td>
                            <td>
                              <span className="font-mono text-xs font-semibold text-navy-800">
                                {r.email}
                              </span>
                            </td>
                            <td>
                              {isRowValid ? (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold
                                                 bg-green-100 text-green-700 border border-green-200">
                                  <CheckCircle className="w-3 h-3" /> Valid
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold
                                                 bg-red-100 text-red-700 border border-red-200">
                                  <XCircle className="w-3 h-3" /> Invalid
                                </span>
                              )}
                            </td>
                            <td className="text-navy-500 text-xs max-w-xs">
                              {r.reason || <span className="text-slate-300 italic">—</span>}
                            </td>
                            <td className="text-navy-400 text-xs whitespace-nowrap">
                              <div className="flex items-center gap-1">
                                <Calendar className="w-3 h-3 text-slate-300" />
                                {new Date(r.created_at).toLocaleString('en-IN', {
                                  day:'2-digit', month:'short', year:'numeric',
                                  hour:'2-digit', minute:'2-digit'
                                })}
                              </div>
                            </td>
                            <td>
                              <button onClick={() => deleteRecord(r.id)}
                                className="p-1.5 rounded-lg text-slate-300 hover:text-red-500
                                           hover:bg-red-50 transition-all">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Footer summary */}
                <div className="flex items-center justify-between px-5 py-3 bg-slate-50 border-t border-slate-100 text-xs text-navy-400">
                  <span>Showing {filtered.length} of {total} records</span>
                  <div className="flex items-center gap-4">
                    <span className="text-green-600 font-semibold">
                      ✓ {filter === 'valid' ? filtered.length : filter === 'all' ? valid : 0} valid
                    </span>
                    <span className="text-red-600 font-semibold">
                      ✗ {filter === 'invalid' ? filtered.length : filter === 'all' ? invalid : 0} invalid
                    </span>
                  </div>
                </div>
              </>
            )}
          </div>
        </>
      ) : (
        <>
          {/* AI Chat History Tab */}
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-52">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input type="text" className="input-field pl-9"
                placeholder="Search prompt or response…"
                value={chatSearch} onChange={e => setChatSearch(e.target.value)} />
            </div>
          </div>
          
          <div className="card p-0 overflow-hidden">
            {chatLoading ? (
              <div className="p-6 space-y-3">
                {[...Array(6)].map((_, i) => <div key={i} className="h-10 bg-slate-100 rounded-xl animate-pulse" />)}
              </div>
            ) : filteredChats.length === 0 ? (
              <div className="text-center py-16">
                <MessageSquare className="w-10 h-10 mx-auto mb-3 text-slate-200" />
                <p className="text-navy-500 font-semibold">No chat records found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th className="w-10">#</th>
                      <th className="w-1/3">Prompt</th>
                      <th className="w-1/3">Response</th>
                      <th>Date & Time</th>
                      <th className="w-10"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredChats.map((r, i) => (
                      <tr key={r.id ? `${r.id}-${i}` : i} 
                          onClick={() => setSelectedChat(r)}
                          className="cursor-pointer hover:bg-slate-50 transition-colors">
                        <td className="text-navy-300 text-xs">{i + 1}</td>
                        <td className="text-navy-800 text-xs truncate max-w-[200px]">
                          {r.prompt}
                        </td>
                        <td className="text-navy-500 text-xs truncate max-w-[250px]">
                          {r.response || <span className="text-slate-300 italic">—</span>}
                        </td>
                        <td className="text-navy-400 text-xs whitespace-nowrap">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-slate-300" />
                            {new Date(r.created_at).toLocaleString('en-IN', {
                              day:'2-digit', month:'short', year:'numeric',
                              hour:'2-digit', minute:'2-digit'
                            })}
                          </div>
                        </td>
                        <td onClick={e => e.stopPropagation()}>
                          <button onClick={() => deleteChatRecord(r.id)}
                            className="p-1.5 rounded-lg text-slate-300 hover:text-red-500
                                       hover:bg-red-50 transition-all">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
      
      {/* ── Chat Modal ── */}
      {selectedChat && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in" onClick={() => setSelectedChat(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden animate-slide-up" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-navy-800 flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-indigo-600" /> Full Chat Log
              </h3>
              <button onClick={() => setSelectedChat(null)} className="p-1.5 text-slate-400 hover:text-slate-600 bg-white rounded-md shadow-sm border border-slate-200 transition-colors">
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-6 flex-1 custom-scrollbar">
              <div>
                <span className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2 block flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-slate-600">U</span>
                  User Prompt
                </span>
                <div className="bg-slate-100 text-slate-800 p-4.5 rounded-xl text-[15px] whitespace-pre-wrap font-medium shadow-inner border border-slate-200/60 leading-relaxed">
                  {selectedChat.prompt}
                </div>
              </div>
              
              <div>
                <span className="text-xs font-bold uppercase tracking-widest text-indigo-400 mb-2 block flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
                    <MessageSquare className="w-3.5 h-3.5" />
                  </span>
                  AI Response
                </span>
                <div className="bg-indigo-50 border border-indigo-100/80 text-indigo-900 p-4.5 rounded-xl text-[15px] whitespace-pre-wrap leading-relaxed shadow-sm">
                  {selectedChat.response || <span className="italic text-indigo-400">No response recorded</span>}
                </div>
              </div>
            </div>
            
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-between items-center text-xs text-slate-500 font-medium">
              <span>Record ID: {selectedChat.id || 'N/A'}</span>
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                {new Date(selectedChat.created_at).toLocaleString('en-IN', {
                  day:'2-digit', month:'long', year:'numeric',
                  hour:'2-digit', minute:'2-digit'
                })}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
