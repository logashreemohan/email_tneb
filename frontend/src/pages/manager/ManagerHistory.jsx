import { useEffect, useState } from 'react'
import { supabase, isSupabaseConfigured } from '../../lib/supabase'
import { localDB, useAuth } from '../../context/AuthContext'
import {
  History, Search, RefreshCw, Download,
  CheckCircle, XCircle, Mail, Calendar, Filter
} from 'lucide-react'
import toast from 'react-hot-toast'

function rowStyle(status) {
  if (status === 'valid')   return { background:'#f0fdf4', borderLeft:'3px solid #16a34a' }
  if (status === 'invalid') return { background:'#fff5f5', borderLeft:'3px solid #dc2626' }
  return {}
}

export default function ManagerHistory() {
  const { user }                = useAuth()
  const [records, setRecords]   = useState([])
  const [filtered, setFiltered] = useState([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')
  const [filter, setFilter]     = useState('all')
  const [sortCol, setSortCol]   = useState('created_at')
  const [sortDir, setSortDir]   = useState('desc')

  useEffect(() => { fetchRecords() }, [])
  useEffect(() => { applyFilter() }, [records, search, filter, sortCol, sortDir])

  const fetchRecords = async () => {
    setLoading(true)
    try {
      if (isSupabaseConfigured) {
        const { data, error } = await supabase
          .from('email_reports').select('*').eq('checked_by', user?.id)
          .order('created_at', { ascending: false }).limit(500)
        if (error) throw error
        setRecords(data || [])
      } else {
        setRecords(localDB.getMyReports(user?.id))
      }
    } catch { toast.error('Failed to load history') }
    finally { setLoading(false) }
  }

  const applyFilter = () => {
    let data = [...records]
    if (filter !== 'all') data = data.filter(r => r.status === filter)
    if (search.trim()) {
      const q = search.toLowerCase()
      data = data.filter(r =>
        r.email?.toLowerCase().includes(q) ||
        r.reason?.toLowerCase().includes(q)
      )
    }
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

  const exportCSV = () => {
    const rows = [['#', 'Email', 'Status', 'Reason', 'Date']]
    filtered.forEach((r, i) =>
      rows.push([i + 1, r.email, r.status, r.reason || '', new Date(r.created_at).toLocaleString('en-IN')])
    )
    const csv  = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const a    = document.createElement('a')
    a.href     = URL.createObjectURL(blob)
    a.download = `my_email_history_${filter}_${Date.now()}.csv`
    a.click()
    toast.success(`Exported ${filtered.length} records`)
  }

  const total   = records.length
  const valid   = records.filter(r => r.status === 'valid').length
  const invalid = records.filter(r => r.status === 'invalid').length
  const rate    = total ? Math.round((valid / total) * 100) : 0

  const SortIcon = ({ col }) =>
    sortCol !== col
      ? <span className="text-slate-300 ml-1">↕</span>
      : <span className="text-navy-600 ml-1">{sortDir === 'asc' ? '↑' : '↓'}</span>

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl">

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-navy-900 flex items-center gap-2">
            <History className="w-6 h-6 text-navy-600" /> My Validation History
          </h1>
          <p className="text-navy-400 text-sm mt-0.5">
            {total} emails checked by you · {rate}% success rate
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchRecords} className="btn-outline text-sm py-2 px-3 gap-2">
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
          <button onClick={exportCSV} className="btn-primary text-sm py-2 px-3 gap-2">
            <Download className="w-4 h-4" /> Export CSV
          </button>
        </div>
      </div>

      {/* Classification cards */}
      <div className="grid grid-cols-3 gap-4">
        {[
          {
            key:'all',     icon:Mail,         count:total,   label:'All Emails',
            sub:`${rate}% valid`,
            active:'border-t-4 border-t-navy-600 bg-navy-50',
            inactive:'bg-white hover:bg-navy-50', num:'text-navy-800',
            bar:'#1e3a8a', border:'border-navy-200',
          },
          {
            key:'valid',   icon:CheckCircle,  count:valid,   label:'Valid',
            sub:`${total ? ((valid/total)*100).toFixed(1) : 0}% of total`,
            active:'border-t-4 border-t-green-600 bg-green-50',
            inactive:'bg-white hover:bg-green-50', num:'text-green-700',
            bar:'#16a34a', border:'border-green-200',
          },
          {
            key:'invalid', icon:XCircle,      count:invalid, label:'Invalid',
            sub:`${total ? ((invalid/total)*100).toFixed(1) : 0}% of total`,
            active:'border-t-4 border-t-red-600 bg-red-50',
            inactive:'bg-white hover:bg-red-50', num:'text-red-700',
            bar:'#dc2626', border:'border-red-200',
          },
        ].map(c => (
          <button key={c.key} onClick={() => setFilter(c.key)}
            className={`rounded-2xl border p-5 text-left cursor-pointer transition-all
                        shadow-sm hover:shadow-md ${c.border}
                        ${filter === c.key ? c.active : c.inactive}`}>
            <c.icon className={`w-5 h-5 mb-3 ${filter === c.key ? c.num : 'text-slate-400'}`} />
            {loading
              ? <div className="h-8 bg-slate-100 rounded animate-pulse mb-1" />
              : <p className={`text-3xl font-extrabold ${c.num}`}>{c.count.toLocaleString()}</p>
            }
            <p className="font-semibold text-sm mt-1 text-navy-700">{c.label}</p>
            <p className="text-xs mt-0.5 text-navy-400">{c.sub}</p>
            {total > 0 && !loading && (
              <div className="mt-3 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                <div className="h-full rounded-full transition-all"
                  style={{ width:`${(c.count/total)*100}%`, background:c.bar }} />
              </div>
            )}
          </button>
        ))}
      </div>

      {/* Search + filter tabs */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input type="text" className="input-field pl-9"
            placeholder="Search by email or reason…"
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="flex items-center gap-1 bg-white border border-blue-100 rounded-xl p-1 shadow-sm">
          {[
            { key:'all',     label:'All',     count:total   },
            { key:'valid',   label:'Valid',   count:valid   },
            { key:'invalid', label:'Invalid', count:invalid },
          ].map(t => (
            <button key={t.key} onClick={() => setFilter(t.key)}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm
                          font-semibold transition-all ${
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
        <span className="text-xs text-navy-400 flex items-center gap-1">
          <Filter className="w-3.5 h-3.5" /> {filtered.length} shown
        </span>
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-3">
            {[...Array(4)].map((_,i) => <div key={i} className="h-10 bg-slate-100 rounded-xl animate-pulse" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-14">
            <History className="w-10 h-10 mx-auto mb-3 text-slate-200" />
            <p className="text-navy-500 font-semibold">
              {search ? 'No results for your search' : `No ${filter !== 'all' ? filter : ''} records yet`}
            </p>
            <p className="text-navy-400 text-sm mt-1">
              {!search && filter === 'all' && 'Validate an email to see history here'}
            </p>
          </div>
        ) : (
          <>
            {/* Legend */}
            <div className="flex items-center gap-4 px-5 py-2.5 bg-slate-50 border-b border-slate-100 text-xs text-navy-500 font-medium">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm bg-green-100 border-l-2 border-green-500 inline-block" /> Valid rows
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm bg-red-50 border-l-2 border-red-500 inline-block" /> Invalid rows
              </span>
              <span className="ml-auto">{filtered.length} records</span>
            </div>

            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th className="w-10">#</th>
                    <th onClick={() => toggleSort('email')} className="cursor-pointer select-none">
                      Email <SortIcon col="email" />
                    </th>
                    <th onClick={() => toggleSort('status')} className="cursor-pointer select-none">
                      Status <SortIcon col="status" />
                    </th>
                    <th>Reason / Details</th>
                    <th onClick={() => toggleSort('created_at')} className="cursor-pointer select-none">
                      Checked On <SortIcon col="created_at" />
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r, i) => (
                    <tr key={r.id || i} style={rowStyle(r.status)}>
                      <td className="text-navy-300 text-xs">{i + 1}</td>
                      <td>
                        <span className="font-mono text-xs font-semibold text-navy-800">{r.email}</span>
                      </td>
                      <td>
                        {r.status === 'valid' ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs
                                           font-bold bg-green-100 text-green-700 border border-green-200">
                            <CheckCircle className="w-3 h-3" /> Valid
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs
                                           font-bold bg-red-100 text-red-700 border border-red-200">
                            <XCircle className="w-3 h-3" /> Invalid
                          </span>
                        )}
                      </td>
                      <td className="text-navy-500 text-xs">
                        {r.reason || <span className="text-slate-300 italic">No issues found</span>}
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
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-5 py-3 bg-slate-50
                            border-t border-slate-100 text-xs text-navy-400">
              <span>Showing {filtered.length} of {total} records</span>
              <div className="flex gap-4">
                <span className="text-green-600 font-semibold flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" />
                  {filter === 'valid' ? filtered.length : filter === 'all' ? valid : 0} valid
                </span>
                <span className="text-red-600 font-semibold flex items-center gap-1">
                  <XCircle className="w-3 h-3" />
                  {filter === 'invalid' ? filtered.length : filter === 'all' ? invalid : 0} invalid
                </span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
