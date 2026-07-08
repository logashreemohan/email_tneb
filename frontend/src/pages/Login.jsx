import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import {
  Mail, Lock, Eye, EyeOff, Loader2, Shield,
  Crown, Users, Zap, ArrowLeft, ChevronRight
} from 'lucide-react'
import toast from 'react-hot-toast'
import ImageCaptcha from '../components/ImageCaptcha'

const TNEB_LOGO =
  'https://upload.wikimedia.org/wikipedia/en/e/e9/Tamil_Nadu_Electricity_Board_%28emblem%29.jpg'

// ─── Shared header used on both screens ──────────────────────────────────────
function Header() {
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center',
      paddingTop:36, paddingBottom:24, paddingLeft:16, paddingRight:16 }}>
      {/* Gold top bar */}
      <div style={{ position:'absolute', top:0, left:0, right:0,
        background:'#f59e0b', padding:'7px 24px',
        display:'flex', alignItems:'center', justifyContent:'center', gap:10 }}>
        <div style={{ width:6, height:6, borderRadius:'50%', background:'#0f1f4a' }} />
        <p style={{ color:'#0f1f4a', fontSize:11, fontWeight:700,
          letterSpacing:'0.09em', textTransform:'uppercase', margin:0 }}>
          Government of Tamil Nadu — Official Portal
        </p>
        <div style={{ width:6, height:6, borderRadius:'50%', background:'#0f1f4a' }} />
      </div>

      {/* Logo */}
      <div style={{ marginTop:32, width:96, height:96, borderRadius:'50%',
        background:'#fff', border:'4px solid #f59e0b', overflow:'hidden',
        boxShadow:'0 0 28px rgba(245,158,11,0.45),0 8px 32px rgba(0,0,0,0.45)',
        display:'flex', alignItems:'center', justifyContent:'center', marginBottom:16 }}>
        <img src={TNEB_LOGO} alt="TNEB"
          style={{ width:88, height:88, objectFit:'contain', borderRadius:'50%' }}
          onError={e => { e.target.src = '/tneb-logo.png' }} />
      </div>

      <h1 style={{ color:'#fff', fontWeight:800, fontSize:26, textAlign:'center',
        lineHeight:1.2, letterSpacing:'-0.01em', margin:0 }}>
        Tamil Nadu Electricity Board
      </h1>
      <p style={{ color:'#fbbf24', fontWeight:600, fontSize:12, marginTop:4,
        letterSpacing:'0.14em', textTransform:'uppercase' }}>
        Email Validation System
      </p>

      {/* Online badge */}
      <div style={{ marginTop:12, display:'flex', alignItems:'center', gap:8,
        background:'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.15)',
        borderRadius:999, padding:'4px 14px' }}>
        <div style={{ width:7, height:7, borderRadius:'50%', background:'#4ade80' }} />
        <span style={{ color:'#86efac', fontSize:11, fontWeight:600, letterSpacing:'0.1em' }}>
          SYSTEM ONLINE
        </span>
      </div>
    </div>
  )
}

// ─── Step 1 — Role selector ───────────────────────────────────────────────────
function RoleSelector({ onSelect }) {
  const roles = [
    {
      type: 'admin',
      icon: Crown,
      title: 'Admin',
      subtitle: 'Bulk validation · Analytics · Full access',
      gradient: 'linear-gradient(135deg,#0a1430,#1e3a8a)',
      badge: { bg:'rgba(245,158,11,0.18)', color:'#fbbf24', border:'rgba(245,158,11,0.4)', label:'ADMIN' },
      glow: 'rgba(30,58,138,0.5)',
    },
    {
      type: 'manager',
      icon: Users,
      title: 'Manager',
      subtitle: 'Single email validation · My history',
      gradient: 'linear-gradient(135deg,#1e3a8a,#2563eb)',
      badge: { bg:'rgba(255,255,255,0.12)', color:'#bfdbfe', border:'rgba(255,255,255,0.25)', label:'MANAGER' },
      glow: 'rgba(37,99,235,0.5)',
    },
  ]

  return (
    <div className="animate-fade-in" style={{ width:'100%', maxWidth:760,
      margin:'0 auto', padding:'0 16px 40px' }}>

      {/* Divider */}
      <div style={{ display:'flex', alignItems:'center', gap:14, marginBottom:28 }}>
        <div style={{ flex:1, height:1, background:'rgba(255,255,255,0.1)' }} />
        <span style={{ color:'rgba(255,255,255,0.4)', fontSize:11, fontWeight:600,
          letterSpacing:'0.12em', textTransform:'uppercase' }}>
          Select your role
        </span>
        <div style={{ flex:1, height:1, background:'rgba(255,255,255,0.1)' }} />
      </div>

      {/* Role cards */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(300px,1fr))', gap:20 }}>
        {roles.map(role => {
          const Icon = role.icon
          return (
            <button key={role.type} onClick={() => onSelect(role.type)}
              style={{
                background: role.gradient,
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: 24, padding: '32px 28px',
                cursor: 'pointer', textAlign: 'left',
                transition: 'all 0.25s',
                boxShadow: `0 8px 32px ${role.glow}`,
              }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = 'translateY(-4px)'
                e.currentTarget.style.boxShadow = `0 16px 48px ${role.glow}`
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = `0 8px 32px ${role.glow}`
              }}>

              {/* Icon + badge row */}
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
                <div style={{ width:56, height:56, borderRadius:16,
                  background:'rgba(255,255,255,0.15)', backdropFilter:'blur(8px)',
                  display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <Icon style={{ width:28, height:28, color:'#fff' }} />
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <span style={{
                    fontSize:11, fontWeight:700, padding:'3px 10px', borderRadius:8,
                    background: role.badge.bg, color: role.badge.color,
                    border: `1px solid ${role.badge.border}`,
                    letterSpacing:'0.06em',
                  }}>{role.badge.label}</span>
                  <ChevronRight style={{ width:18, height:18, color:'rgba(255,255,255,0.5)' }} />
                </div>
              </div>

              {/* Text */}
              <h2 style={{ color:'#fff', fontWeight:800, fontSize:24, margin:'0 0 6px' }}>
                {role.title}
              </h2>
              <p style={{ color:'rgba(255,255,255,0.6)', fontSize:13, margin:0, lineHeight:1.5 }}>
                {role.subtitle}
              </p>

              {/* Bottom CTA */}
              <div style={{ marginTop:24, display:'flex', alignItems:'center', gap:6,
                color:'rgba(255,255,255,0.7)', fontSize:13, fontWeight:600 }}>
                <span>Click to login</span>
                <ChevronRight style={{ width:14, height:14 }} />
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ─── Step 2 — Login form ──────────────────────────────────────────────────────
function LoginForm({ type, onBack }) {
  const isAdmin = type === 'admin'
  const [isSignUp, setIsSignUp]       = useState(false)
  const [email, setEmail]             = useState('')
  const [password, setPassword]       = useState('')
  const [showPw, setShowPw]           = useState(false)
  const [captchaDone, setCaptchaDone] = useState(false)
  const [captchaKey, setCaptchaKey]   = useState(0)
  const [loading, setLoading]         = useState(false)
  const { signIn, signUp }            = useAuth()
  const navigate                      = useNavigate()

  const headerGradient = isAdmin
    ? 'linear-gradient(135deg,#0a1430,#1e3a8a)'
    : 'linear-gradient(135deg,#1e3a8a,#2563eb)'
  const btnActive = isAdmin
    ? 'linear-gradient(135deg,#0f1f4a,#1e3a8a)'
    : 'linear-gradient(135deg,#1e3a8a,#2563eb)'

  const resetCaptcha = () => { setCaptchaDone(false); setCaptchaKey(k => k + 1) }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!captchaDone) { toast.error('Complete CAPTCHA first', { icon:'🔒' }); return }
    if (!email || !password) { toast.error('Enter email and password'); return }
    setLoading(true)
    try {
      if (isSignUp) {
        await signUp(email, password, type)
        toast.success('Registration successful')
      } else {
        const { role } = await signIn(email, password)
        if (role !== type) {
          toast.error(`Wrong panel — use the ${role === 'admin' ? 'Admin' : 'Manager'} panel`)
          resetCaptcha(); setLoading(false); return
        }
        toast.success('Login successful')
      }
      navigate(type === 'admin' ? '/admin' : '/manager')
    } catch (err) {
      toast.error(err.message || (isSignUp ? 'Registration failed' : 'Invalid credentials'))
      resetCaptcha()
    } finally { setLoading(false) }
  }

  return (
    <div className="animate-slide-up" style={{ width:'100%', maxWidth:480,
      margin:'0 auto', padding:'0 16px 40px' }}>
      <div style={{ background:'#fff', borderRadius:28, overflow:'hidden',
        boxShadow:'0 24px 64px rgba(0,0,0,0.35)' }}>

        {/* Coloured header */}
        <div style={{ background:headerGradient, padding:'22px 24px',
          display:'flex', alignItems:'center', gap:14 }}>
          <button onClick={onBack} style={{
            width:36, height:36, borderRadius:10,
            background:'rgba(255,255,255,0.15)', border:'1px solid rgba(255,255,255,0.2)',
            cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center',
            color:'#fff', flexShrink:0, transition:'all 0.2s',
          }}
            onMouseEnter={e => e.currentTarget.style.background='rgba(255,255,255,0.25)'}
            onMouseLeave={e => e.currentTarget.style.background='rgba(255,255,255,0.15)'}>
            <ArrowLeft style={{ width:16, height:16 }} />
          </button>
          <div style={{ flex:1 }}>
            <h2 style={{ color:'#fff', fontWeight:800, fontSize:18,
              margin:0, lineHeight:1.2 }}>
              {isAdmin ? 'Admin Login' : (isSignUp ? 'Manager Registration' : 'Manager Login')}
            </h2>
            <p style={{ color:'rgba(255,255,255,0.6)', fontSize:12, margin:'3px 0 0' }}>
              {isAdmin ? 'Full access · Bulk validation · Analytics' : 'Single validation · My history'}
            </p>
          </div>
          <span style={{
            fontSize:11, fontWeight:700, padding:'3px 10px', borderRadius:8,
            background: isAdmin ? 'rgba(245,158,11,0.2)' : 'rgba(255,255,255,0.12)',
            color: isAdmin ? '#fbbf24' : '#bfdbfe',
            border: `1px solid ${isAdmin ? 'rgba(245,158,11,0.4)' : 'rgba(255,255,255,0.25)'}`,
            letterSpacing:'0.06em',
          }}>
            {isAdmin ? 'ADMIN' : 'MANAGER'}
          </span>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ padding:24, display:'flex',
          flexDirection:'column', gap:18 }}>

          {/* Email */}
          <div>
            <label style={{ display:'block', fontSize:11, fontWeight:700, color:'#1e3a8a',
              marginBottom:6, textTransform:'uppercase', letterSpacing:'0.07em' }}>
              Email Address
            </label>
            <div style={{ position:'relative' }}>
              <Mail style={{ position:'absolute', left:12, top:'50%',
                transform:'translateY(-50%)', width:15, height:15, color:'#94a3b8' }} />
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="Enter your email" autoComplete="email"
                className="input-field" style={{ paddingLeft:36 }} />
            </div>
          </div>

          {/* Password */}
          <div>
            <label style={{ display:'block', fontSize:11, fontWeight:700, color:'#1e3a8a',
              marginBottom:6, textTransform:'uppercase', letterSpacing:'0.07em' }}>
              Password
            </label>
            <div style={{ position:'relative' }}>
              <Lock style={{ position:'absolute', left:12, top:'50%',
                transform:'translateY(-50%)', width:15, height:15, color:'#94a3b8' }} />
              <input type={showPw ? 'text' : 'password'} value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••" autoComplete="current-password"
                className="input-field" style={{ paddingLeft:36, paddingRight:40 }} />
              <button type="button" onClick={() => setShowPw(v => !v)}
                style={{ position:'absolute', right:12, top:'50%',
                  transform:'translateY(-50%)', background:'none', border:'none',
                  cursor:'pointer', color:'#94a3b8', padding:0 }}>
                {showPw ? <EyeOff style={{ width:15, height:15 }} />
                        : <Eye    style={{ width:15, height:15 }} />}
              </button>
            </div>
          </div>

          {/* CAPTCHA */}
          <div>
            <label style={{ display:'block', fontSize:11, fontWeight:700, color:'#1e3a8a',
              marginBottom:6, textTransform:'uppercase', letterSpacing:'0.07em' }}>
              Security Verification
            </label>
            <ImageCaptcha key={captchaKey} onVerified={setCaptchaDone}
              accentColor={isAdmin ? 'navy-admin' : 'navy-manager'} />
          </div>

          {/* Submit */}
          <button type="submit" disabled={loading}
            style={{
              width:'100%', padding:'13px', borderRadius:14,
              fontWeight:700, fontSize:14, border:'none', cursor: loading ? 'wait' : 'pointer',
              display:'flex', alignItems:'center', justifyContent:'center', gap:8,
              transition:'all 0.2s', color:'#fff',
              background: captchaDone && !loading ? btnActive : '#e2e8f0',
              color: captchaDone && !loading ? '#fff' : '#1e3a8a',
              boxShadow: captchaDone && !loading ? '0 4px 20px rgba(30,58,138,0.35)' : 'none',
            }}>
            {loading
              ? <><Loader2 style={{ width:16, height:16, animation:'spin 1s linear infinite' }} /> {isSignUp ? 'Registering…' : 'Authenticating…'}</>
              : !captchaDone
                ? <><Shield style={{ width:16, height:16 }} /> Complete verification to {isSignUp ? 'register' : 'login'}</>
                : <><Shield style={{ width:16, height:16 }} /> {isSignUp ? 'Create Manager Account' : `Login as ${isAdmin ? 'Admin' : 'Manager'}`}</>
            }
          </button>

          {/* Toggle Sign Up / Login for Manager only */}
          {!isAdmin && (
            <div style={{ textAlign:'center', marginTop:4 }}>
              <p style={{ fontSize:12, color:'#64748b' }}>
                {isSignUp ? 'Already have an account?' : 'Need to register?'}
                <button type="button" onClick={() => setIsSignUp(!isSignUp)}
                  style={{ background:'none', border:'none', color:'#2563eb', fontWeight:700, marginLeft:6, cursor:'pointer' }}>
                  {isSignUp ? 'Login here' : 'Sign up here'}
                </button>
              </p>
            </div>
          )}
        </form>
      </div>
    </div>
  )
}

// ─── Main Login Page ──────────────────────────────────────────────────────────
export default function Login() {
  const [selectedRole, setSelectedRole] = useState(null)  // null | 'admin' | 'manager'

  return (
    <div style={{
      minHeight:'100vh', position:'relative', overflowX:'hidden',
      background:`linear-gradient(rgba(10, 20, 48, 0.7), rgba(30, 58, 138, 0.7)), url('https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTs0nH89VtESl4AlR5CY4qLat7VyHhdsrVTM1m7-U0eOg&s=10')`,
      backgroundSize:'cover',
      backgroundPosition:'center',
      display:'flex', flexDirection:'column',
    }}>
      {/* Decorative blobs */}
      <div style={{ position:'absolute', top:-80, left:-80, width:300, height:300,
        borderRadius:'50%', background:'rgba(255,255,255,0.02)', pointerEvents:'none' }} />
      <div style={{ position:'absolute', bottom:-80, right:-80, width:300, height:300,
        borderRadius:'50%', background:'rgba(245,158,11,0.04)', pointerEvents:'none' }} />

      {/* Header (always shown) */}
      <Header />

      {/* Step content */}
      <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center' }}>
        {selectedRole === null
          ? <RoleSelector onSelect={setSelectedRole} />
          : <LoginForm type={selectedRole} onBack={() => setSelectedRole(null)} />
        }
      </div>

      {/* Footer */}
      <div style={{ borderTop:'1px solid rgba(255,255,255,0.08)',
        padding:'10px 24px', textAlign:'center' }}>
        <p style={{ color:'rgba(255,255,255,0.25)', fontSize:11, margin:0 }}>
          © {new Date().getFullYear()} Tamil Nadu Electricity Board · All Rights Reserved ·
          Self-hosted Image CAPTCHA
        </p>
      </div>
    </div>
  )
}
