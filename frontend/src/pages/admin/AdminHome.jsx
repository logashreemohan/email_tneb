import { useEffect, useState } from 'react'
import { supabase, isSupabaseConfigured } from '../../lib/supabase'
import { localDB } from '../../context/AuthContext'
import { Mail, CheckCircle, XCircle, Clock, TrendingUp, Upload, BarChart3, Database, Globe, FileText, History } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export default function AdminHome() {
  const [stats, setStats]     = useState({ total: 0, valid: 0, invalid: 0, today: 0 })
  const [recent, setRecent]   = useState([])
  const [loading, setLoading] = useState(true)
  const navigate              = useNavigate()

  useEffect(() => { fetchStats() }, [])

  const fetchStats = async () => {
    try {
      let all = []
      if (isSupabaseConfigured) {
        const { data } = await supabase
          .from('email_reports').select('*').order('created_at', { ascending: false })
        all = data || []
      } else {
        all = localDB.getReports()
      }
      const today = new Date().toISOString().split('T')[0]
      setStats({
        total:   all.length,
        valid:   all.filter(r => r.status === 'valid').length,
        invalid: all.filter(r => r.status === 'invalid').length,
        today:   all.filter(r => r.created_at?.startsWith(today)).length,
      })
      setRecent(all.slice(0, 5))
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  const cards = [
    { label: 'Total Validated', value: stats.total,   icon: Mail,        color: 'bg-navy-100 text-navy-700 border-navy-200',  bar: 'bg-navy-600'  },
    { label: 'Valid Emails',    value: stats.valid,    icon: CheckCircle, color: 'bg-green-100 text-green-700 border-green-200', bar: 'bg-green-500' },
    { label: 'Invalid Emails',  value: stats.invalid,  icon: XCircle,     color: 'bg-red-100 text-red-700 border-red-200',       bar: 'bg-red-500'   },
    { label: 'Checked Today',   value: stats.today,    icon: Clock,       color: 'bg-gold-100 text-gold-700 border-gold-200',    bar: 'bg-gold-500'  },
  ]

  return (
    <div className="space-y-6 animate-fade-in">

      {/* Page title */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-navy-900">Dashboard Overview</h1>
          <p className="text-navy-400 text-sm mt-0.5">Welcome back, Admin — here's your validation summary</p>
        </div>
        {!isSupabaseConfigured && (
          <div className="flex items-center gap-2 text-xs text-gold-700 bg-gold-50 border border-gold-200 rounded-xl px-3 py-2">
            <Database className="w-3.5 h-3.5" />
            Demo mode — data in localStorage
          </div>
        )}
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {cards.map(c => (
          <div key={c.label} className="card border-t-4 border-t-gold-400 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${c.color}`}>
                <c.icon className="w-5 h-5" />
              </div>
              <TrendingUp className="w-4 h-4 text-slate-300" />
            </div>
            {loading
              ? <div className="h-8 bg-slate-100 rounded animate-pulse" />
              : <p className="text-3xl font-extrabold text-navy-900">{c.value.toLocaleString()}</p>
            }
            <p className="text-navy-400 text-sm mt-1">{c.label}</p>
            <div className="mt-3 h-1 bg-slate-100 rounded-full overflow-hidden">
              <div className={`h-1 ${c.bar} rounded-full`}
                style={{ width: stats.total ? `${Math.min((c.value / stats.total) * 100, 100)}%` : '0%' }} />
            </div>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div onClick={() => navigate('/admin/bulk')}
          className="card border-l-4 border-l-navy-600 hover:shadow-lg cursor-pointer transition-all group">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-navy-100 border border-navy-200 rounded-xl flex items-center justify-center group-hover:bg-navy-600 group-hover:border-navy-600 transition-all">
              <Upload className="w-6 h-6 text-navy-600 group-hover:text-white transition-colors" />
            </div>
            <div>
              <h3 className="font-bold text-navy-800">Bulk Email Validator</h3>
              <p className="text-navy-400 text-sm">Upload & verify emails</p>
            </div>
            <ChevronRightIcon />
          </div>
        </div>

        <div onClick={() => navigate('/admin/webchecker')}
          className="card border-l-4 border-l-indigo-500 hover:shadow-lg cursor-pointer transition-all group">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-indigo-100 border border-indigo-200 rounded-xl flex items-center justify-center group-hover:bg-indigo-500 group-hover:border-indigo-500 transition-all">
              <Globe className="w-6 h-6 text-indigo-600 group-hover:text-white transition-colors" />
            </div>
            <div>
              <h3 className="font-bold text-navy-800">Web Spell Check</h3>
              <p className="text-navy-400 text-sm">Scan website spelling</p>
            </div>
            <ChevronRightIcon />
          </div>
        </div>

        <div onClick={() => navigate('/admin/docgen')}
          className="card border-l-4 border-l-purple-500 hover:shadow-lg cursor-pointer transition-all group">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-purple-100 border border-purple-200 rounded-xl flex items-center justify-center group-hover:bg-purple-500 group-hover:border-purple-500 transition-all">
              <FileText className="w-6 h-6 text-purple-600 group-hover:text-white transition-colors" />
            </div>
            <div>
              <h3 className="font-bold text-navy-800">Doc Generator</h3>
              <p className="text-navy-400 text-sm">AI document assistant</p>
            </div>
            <ChevronRightIcon />
          </div>
        </div>

        <div onClick={() => navigate('/admin/analytics')}
          className="card border-l-4 border-l-gold-500 hover:shadow-lg cursor-pointer transition-all group">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gold-100 border border-gold-200 rounded-xl flex items-center justify-center group-hover:bg-gold-500 group-hover:border-gold-500 transition-all">
              <BarChart3 className="w-6 h-6 text-gold-600 group-hover:text-white transition-colors" />
            </div>
            <div>
              <h3 className="font-bold text-navy-800">Analytics & Reports</h3>
              <p className="text-navy-400 text-sm">Insights and trends</p>
            </div>
            <ChevronRightIcon />
          </div>
        </div>
        
        <div onClick={() => navigate('/admin/history')}
          className="card border-l-4 border-l-green-500 hover:shadow-lg cursor-pointer transition-all group">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-green-100 border border-green-200 rounded-xl flex items-center justify-center group-hover:bg-green-500 group-hover:border-green-500 transition-all">
              <History className="w-6 h-6 text-green-600 group-hover:text-white transition-colors" />
            </div>
            <div>
              <h3 className="font-bold text-navy-800">Admin History</h3>
              <p className="text-navy-400 text-sm">Review past actions</p>
            </div>
            <ChevronRightIcon />
          </div>
        </div>
      </div>

      {/* Recent table */}
      <div className="card">
        <div className="flex items-center justify-between mb-5">
          <h3 className="section-title"><Clock className="w-5 h-5 text-navy-500" /> Recent Validations</h3>
          <button onClick={() => navigate('/admin/history')}
            className="text-xs text-navy-600 hover:text-navy-800 font-semibold border border-navy-200 rounded-lg px-3 py-1.5 hover:bg-navy-50 transition-all">
            View All →
          </button>
        </div>
        {loading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => <div key={i} className="h-10 bg-slate-100 rounded-xl animate-pulse" />)}
          </div>
        ) : recent.length === 0 ? (
          <div className="text-center py-12">
            <Mail className="w-10 h-10 mx-auto mb-3 text-slate-200" />
            <p className="text-navy-400 text-sm">No validations yet. Upload a file to get started.</p>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Email Address</th>
                <th>Status</th>
                <th>Date & Time</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((r, i) => (
                <tr key={r.id || i}>
                  <td className="font-mono text-xs">{r.email}</td>
                  <td>{r.status === 'valid'
                    ? <span className="badge-valid">✓ Valid</span>
                    : <span className="badge-invalid">✗ Invalid</span>}
                  </td>
                  <td className="text-navy-400 text-xs">{new Date(r.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

function ChevronRightIcon() {
  return <svg className="w-4 h-4 text-slate-300 ml-auto shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
}
