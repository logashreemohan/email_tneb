import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider, useAuth } from './context/AuthContext'
import Login from './pages/Login'
import AdminDashboard from './pages/admin/AdminDashboard'
import ManagerDashboard from './pages/manager/ManagerDashboard'
import NotFound from './pages/NotFound'

// Route guards
function ProtectedRoute({ children, requiredRole }) {
  const { user, role, loading } = useAuth()
  if (loading) return <LoadingScreen />
  if (!user) return <Navigate to="/login" replace />
  if (requiredRole && role !== requiredRole) {
    return <Navigate to={role === 'admin' ? '/admin' : '/manager'} replace />
  }
  return children
}

function PublicRoute({ children }) {
  const { user, role, loading } = useAuth()
  if (loading) return <LoadingScreen />
  if (user && role) {
    return <Navigate to={role === 'admin' ? '/admin' : '/manager'} replace />
  }
  return children
}

function LoadingScreen() {
  return (
    <div style={{ minHeight:'100vh', background:'linear-gradient(135deg,#0a1430,#1e3a8a)',
      display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ textAlign:'center' }}>
        <div style={{ width:56, height:56, border:'4px solid rgba(245,158,11,0.3)',
          borderTopColor:'#f59e0b', borderRadius:'50%', animation:'spin 1s linear infinite',
          margin:'0 auto 16px' }} />
        <p style={{ color:'rgba(255,255,255,0.6)', fontSize:13, fontFamily:'Inter,sans-serif' }}>
          Loading TNEB System…
        </p>
      </div>
    </div>
  )
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={
        <PublicRoute><Login /></PublicRoute>
      } />
      <Route path="/admin/*" element={
        <ProtectedRoute requiredRole="admin"><AdminDashboard /></ProtectedRoute>
      } />
      <Route path="/manager/*" element={
        <ProtectedRoute requiredRole="manager"><ManagerDashboard /></ProtectedRoute>
      } />
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster
          position="top-right"
          toastOptions={{
            style: { background:'#fff', color:'#1e3a8a', border:'1px solid #bfdbfe', borderRadius:12, fontSize:13 },
            success: { iconTheme: { primary:'#16a34a', secondary:'#fff' } },
            error:   { iconTheme: { primary:'#dc2626', secondary:'#fff' } },
          }}
        />
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}
