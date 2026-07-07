import { useNavigate } from 'react-router-dom'
import { Home } from 'lucide-react'

export default function NotFound() {
  const navigate = useNavigate()
  return (
    <div className="min-h-screen bg-navy-pattern flex flex-col items-center justify-center text-center p-6">
      <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mb-6 border-4 border-gold-400 shadow-2xl">
        <img
          src="https://upload.wikimedia.org/wikipedia/en/e/e9/Tamil_Nadu_Electricity_Board_%28emblem%29.jpg"
          alt="TNEB" className="w-16 h-16 object-contain rounded-full"
          onError={e => { e.target.src='/tneb-logo.png' }}
        />
      </div>
      <h1 className="text-7xl font-extrabold text-white mb-3">404</h1>
      <p className="text-blue-200 mb-8">This page does not exist in the TNEB system.</p>
      <button onClick={() => navigate('/login')}
        className="btn-gold flex items-center gap-2 mx-auto">
        <Home className="w-4 h-4" /> Return to Login
      </button>
    </div>
  )
}
