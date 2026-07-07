import { createContext, useContext, useEffect, useState } from 'react'
import api from '../lib/api'

const AuthContext = createContext({})
export const useAuth = () => useContext(AuthContext)

const STORAGE_KEY = 'emailshield_session'

// ─── Local DB for demo results (Kept as is) ────────────────────────────────────────────────
export const localDB = {
  getReports: () => {
    try { return JSON.parse(localStorage.getItem('emailshield_reports') || '[]') }
    catch { return [] }
  },
  saveReport: (report) => {
    const reports = localDB.getReports()
    const newReport = { ...report, id: Date.now() + Math.random().toString(36).substring(2, 9), created_at: new Date().toISOString() }
    reports.unshift(newReport)
    localStorage.setItem('emailshield_reports', JSON.stringify(reports.slice(0, 1000)))
    return newReport
  },
  deleteReport: (id) => {
    const reports = localDB.getReports().filter(r => r.id !== id)
    localStorage.setItem('emailshield_reports', JSON.stringify(reports))
  },
  getMyReports: (userId) => localDB.getReports().filter(r => r.checked_by === userId),
  
  // AI Chat Logs
  getAiChatLogs: () => {
    try { return JSON.parse(localStorage.getItem('noting_ai_chat_logs') || '[]') }
    catch { return [] }
  },
  saveAiChatLog: (log) => {
    const logs = localDB.getAiChatLogs()
    const newLog = { ...log, id: Date.now() + Math.random().toString(36).substring(2, 9), created_at: new Date().toISOString() }
    logs.unshift(newLog)
    localStorage.setItem('noting_ai_chat_logs', JSON.stringify(logs.slice(0, 1000)))
    return newLog
  },
  deleteAiChatLog: (id) => {
    const logs = localDB.getAiChatLogs().filter(r => r.id !== id)
    localStorage.setItem('noting_ai_chat_logs', JSON.stringify(logs))
  }
}

// ─── Auth Provider ────────────────────────────────────────────────────────────
export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null)
  const [role, setRole]       = useState(null)
  const [loading, setLoading] = useState(true)

  // ── Boot: restore session ──
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null')
      if (saved?.user && saved?.token) {
        setUser(saved.user); 
        setRole(saved.role);
      }
    } catch {}
    setLoading(false)
  }, [])

  // ── Sign In ──
  const signIn = async (email, password) => {
    try {
      const { data } = await api.post('/auth/login', { email, password });
      setUser(data.user)
      setRole(data.role)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
      return data
    } catch (err) {
      throw new Error(err.response?.data?.error || err.message || 'Login failed')
    }
  }

  // ── Sign Out ──
  const signOut = async () => {
    localStorage.removeItem(STORAGE_KEY)
    setUser(null); setRole(null)
  }

  return (
    <AuthContext.Provider value={{ user, role, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}
