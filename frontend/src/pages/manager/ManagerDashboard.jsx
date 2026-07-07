import { useState } from 'react'
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { Mail, History, LogOut, Menu, X, ChevronRight, Zap } from 'lucide-react'
import SingleValidate from './SingleValidate'
import ManagerHistory from './ManagerHistory'

const navItems = [
  { path: '/manager',         label: 'Validate Email', icon: Mail,    exact: true },
  { path: '/manager/history', label: 'My History',     icon: History },
]

export default function ManagerDashboard() {
  const { user, signOut } = useAuth()
  const navigate          = useNavigate()
  const location          = useLocation()
  const [open, setOpen]   = useState(false)

  const isActive = (item) =>
    item.exact ? location.pathname === item.path
               : location.pathname.startsWith(item.path) && item.path !== '/manager'

  return (
    <div className="min-h-screen bg-page flex">
      {open && <div className="fixed inset-0 bg-black/40 z-20 lg:hidden" onClick={() => setOpen(false)} />}

      {/* Sidebar */}
      <aside className={`
        fixed top-0 left-0 h-full min-h-screen w-64 z-30 flex flex-col
        transition-transform duration-300
        ${open ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 lg:static lg:z-auto
      `} style={{ background:'linear-gradient(180deg,#0a1430 0%,#1e3a8a 60%,#0f1f4a 100%)' }}>
        <div className="p-5 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shrink-0 border-2 border-gold-400"
              style={{ boxShadow:'0 0 12px rgba(245,158,11,0.3)' }}>
              <img
                src="https://upload.wikimedia.org/wikipedia/en/e/e9/Tamil_Nadu_Electricity_Board_%28emblem%29.jpg"
                alt="TNEB" className="w-10 h-10 object-contain rounded-full"
                onError={e => { e.target.src='/tneb-logo.png' }}
              />
            </div>
            <div>
              <p className="text-white font-bold text-sm leading-tight">Tamil Nadu</p>
              <p className="text-white font-bold text-sm leading-tight">Electricity Board</p>
              <span className="text-blue-200 text-xs font-semibold">Manager Panel</span>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map(item => (
            <button key={item.path}
              onClick={() => { navigate(item.path); setOpen(false) }}
              className={`sidebar-link w-full ${isActive(item) ? 'active' : ''}`}>
              <item.icon className="w-4 h-4 shrink-0" />
              <span>{item.label}</span>
              {isActive(item) && <ChevronRight className="w-3 h-3 ml-auto opacity-60" />}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-white/10">
          <div className="bg-white/10 rounded-xl p-3 mb-3">
            <p className="text-white/50 text-xs">Signed in as</p>
            <p className="text-white text-sm font-semibold truncate">{user?.email}</p>
            <span className="inline-block mt-1 text-xs bg-blue-500/20 text-blue-200 border border-blue-400/30 px-2 py-0.5 rounded-full font-semibold">
              MANAGER
            </span>
          </div>
          <button onClick={async () => { await signOut(); navigate('/login') }}
            className="sidebar-link w-full text-red-300 hover:text-red-200 hover:bg-red-500/10">
            <LogOut className="w-4 h-4" /><span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col min-w-0">
        <header className="bg-white border-b border-blue-100 px-6 py-3 flex items-center gap-4 shadow-sm">
          <button className="lg:hidden text-navy-600" onClick={() => setOpen(!open)}>
            {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <div className="flex items-center gap-2">
            <img
                src="https://upload.wikimedia.org/wikipedia/en/e/e9/Tamil_Nadu_Electricity_Board_%28emblem%29.jpg"
                alt="TNEB" className="w-8 h-8 object-contain rounded-full hidden sm:block"
                onError={e => { e.target.src='/tneb-logo.png' }}
              />
            <div className="hidden sm:block">
              <p className="text-navy-800 font-bold text-xs leading-tight">Tamil Nadu Electricity Board</p>
              <p className="text-navy-400 text-xs">Email Validation System</p>
            </div>
          </div>
          <div className="flex-1" />
          <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-full px-3 py-1">
            <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
            <span className="text-green-700 text-xs font-semibold">ONLINE</span>
          </div>
          <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-full px-3 py-1">
            <Zap className="w-3 h-3 text-blue-600" />
            <span className="text-blue-700 text-xs font-bold">MANAGER</span>
          </div>
        </header>

        <div className="flex-1 p-6 overflow-auto">
          <Routes>
            <Route index          element={<SingleValidate />} />
            <Route path="history" element={<ManagerHistory />} />
            <Route path="*"       element={<Navigate to="/manager" replace />} />
          </Routes>
        </div>
      </main>
    </div>
  )
}
