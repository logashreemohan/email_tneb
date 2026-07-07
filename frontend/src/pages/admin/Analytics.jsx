import { useEffect, useState } from 'react'
import { supabase, isSupabaseConfigured } from '../../lib/supabase'
import { localDB } from '../../context/AuthContext'
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis,
  Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid, Legend
} from 'recharts'
import { BarChart3, TrendingUp } from 'lucide-react'

const TOOLTIP_STYLE = {
  background: '#fff', border: '1px solid #dbeafe',
  borderRadius: '12px', color: '#1e3a8a', fontSize: 12,
  boxShadow: '0 4px 24px rgba(30,58,138,0.10)'
}

export default function Analytics() {
  const [data, setData]       = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (isSupabaseConfigured) {
      supabase.from('email_reports').select('status,reason,created_at').then(({ data }) => {
        setData(data || []); setLoading(false)
      })
    } else {
      setData(localDB.getReports()); setLoading(false)
    }
  }, [])

  const valid   = data.filter(d => d.status === 'valid').length
  const invalid = data.filter(d => d.status === 'invalid').length
  const total   = data.length
  const rate    = total ? Math.round((valid / total) * 100) : 0

  const pieData = [
    { name: 'Valid',   value: valid   },
    { name: 'Invalid', value: invalid },
  ]

  const byDay = data.reduce((acc, r) => {
    const day = new Date(r.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    if (!acc[day]) acc[day] = { day, valid: 0, invalid: 0 }
    acc[day][r.status]++
    return acc
  }, {})
  const lineData = Object.values(byDay).slice(-14)

  const reasonCount = data.filter(d => d.reason).reduce((acc, d) => {
    acc[d.reason] = (acc[d.reason] || 0) + 1; return acc
  }, {})
  const topReasons = Object.entries(reasonCount)
    .sort(([, a], [, b]) => b - a).slice(0, 5)
    .map(([name, count]) => ({ name: name.slice(0, 32), count }))

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-10 h-10 border-4 border-navy-200 border-t-navy-600 rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-navy-900 flex items-center gap-2">
          <BarChart3 className="w-6 h-6 text-navy-600" /> Analytics & Reports
        </h1>
        <p className="text-navy-400 text-sm mt-0.5">Insights from your email validation data</p>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Checked',  value: total,    accent: 'border-t-navy-600',  text: 'text-navy-800'  },
          { label: 'Valid',          value: valid,    accent: 'border-t-green-500', text: 'text-green-700' },
          { label: 'Invalid',        value: invalid,  accent: 'border-t-red-500',   text: 'text-red-700'   },
          { label: 'Success Rate',   value: `${rate}%`, accent: 'border-t-gold-500', text: 'text-gold-700' },
        ].map(k => (
          <div key={k.label} className={`card border-t-4 ${k.accent} text-center`}>
            <p className={`text-3xl font-extrabold ${k.text}`}>{k.value}</p>
            <p className="text-navy-400 text-xs font-semibold uppercase tracking-wide mt-1">{k.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pie */}
        <div className="card">
          <h3 className="section-title mb-5">Valid vs Invalid</h3>
          {total === 0
            ? <Empty />
            : <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" outerRadius={80} dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}>
                    <Cell fill="#1e3a8a" />
                    <Cell fill="#ef4444" />
                  </Pie>
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
          }
        </div>

        {/* Bar – top reasons */}
        <div className="card">
          <h3 className="section-title mb-5">Top Invalid Reasons</h3>
          {topReasons.length === 0
            ? <Empty text="No invalid emails yet" />
            : <ResponsiveContainer width="100%" height={220}>
                <BarChart data={topReasons} layout="vertical">
                  <XAxis type="number" stroke="#94a3b8" tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" stroke="#94a3b8" tick={{ fontSize: 10 }} width={130} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <Bar dataKey="count" fill="#1e3a8a" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
          }
        </div>

        {/* Line – timeline */}
        <div className="card lg:col-span-2">
          <h3 className="section-title mb-5"><TrendingUp className="w-5 h-5 text-navy-500" /> Validation Timeline (Last 14 days)</h3>
          {lineData.length === 0
            ? <Empty />
            : <ResponsiveContainer width="100%" height={220}>
                <LineChart data={lineData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="day" stroke="#94a3b8" tick={{ fontSize: 11 }} />
                  <YAxis stroke="#94a3b8" tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <Legend />
                  <Line type="monotone" dataKey="valid"   stroke="#1e3a8a" strokeWidth={2.5} dot={false} name="Valid" />
                  <Line type="monotone" dataKey="invalid" stroke="#ef4444" strokeWidth={2.5} dot={false} name="Invalid" />
                </LineChart>
              </ResponsiveContainer>
          }
        </div>
      </div>
    </div>
  )
}

function Empty({ text = 'No data yet' }) {
  return <div className="h-48 flex items-center justify-center text-navy-300 text-sm">{text}</div>
}
