import { useState, useEffect, useRef, useCallback } from 'react'
import { RefreshCw, CheckCircle, XCircle, Eye, EyeOff } from 'lucide-react'

// ─── Random helpers ───────────────────────────────────────────────────────────
const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'   // no I/O/0/1 (ambiguous)

function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min }
function randFloat(min, max) { return Math.random() * (max - min) + min }
function randChar() { return CHARS[randInt(0, CHARS.length - 1)] }

function generateCode(len = 6) {
  return Array.from({ length: len }, randChar).join('')
}

// ─── Canvas renderer ──────────────────────────────────────────────────────────
function drawCaptcha(canvas, code, darkMode = true) {
  const W = canvas.width  = 260
  const H = canvas.height = 90
  const ctx = canvas.getContext('2d')

  // ── Background ──
  const bgGrad = ctx.createLinearGradient(0, 0, W, H)
  if (darkMode) {
    bgGrad.addColorStop(0,   '#0f1f4a')
    bgGrad.addColorStop(0.5, '#1e3a8a')
    bgGrad.addColorStop(1,   '#0a1628')
  } else {
    bgGrad.addColorStop(0,   '#dbeafe')
    bgGrad.addColorStop(0.5, '#eff6ff')
    bgGrad.addColorStop(1,   '#e0f2fe')
  }
  ctx.fillStyle = bgGrad
  ctx.fillRect(0, 0, W, H)

  // ── Background noise dots ──
  for (let i = 0; i < 120; i++) {
    ctx.beginPath()
    ctx.arc(randFloat(0, W), randFloat(0, H), randFloat(0.3, 1.2), 0, Math.PI * 2)
    ctx.fillStyle = darkMode
      ? `rgba(${randInt(100,255)},${randInt(50,200)},${randInt(200,255)},${randFloat(0.15, 0.4)})`
      : `rgba(${randInt(80,180)},${randInt(80,180)},${randInt(200,255)},${randFloat(0.2, 0.5)})`
    ctx.fill()
  }

  // ── Sine-wave interference lines ──
  for (let l = 0; l < 6; l++) {
    ctx.beginPath()
    const amp   = randFloat(4, 12)
    const freq  = randFloat(0.02, 0.05)
    const yBase = randFloat(15, H - 15)
    const hue   = randInt(200, 320)
    ctx.strokeStyle = darkMode
      ? `hsla(${hue},80%,70%,${randFloat(0.15, 0.35)})`
      : `hsla(${hue},60%,45%,${randFloat(0.2, 0.4)})`
    ctx.lineWidth = randFloat(0.5, 1.5)
    ctx.moveTo(0, yBase)
    for (let x = 0; x <= W; x += 2) {
      ctx.lineTo(x, yBase + Math.sin(x * freq + l) * amp)
    }
    ctx.stroke()
  }

  // ── Characters ──
  const charW = W / (code.length + 1)
  const fonts = ['Arial Black', 'Impact', 'Verdana', 'Trebuchet MS', 'Georgia']

  for (let i = 0; i < code.length; i++) {
    ctx.save()

    const x = charW * (i + 0.75) + randFloat(-4, 4)
    const y = H / 2 + randFloat(-6, 6)

    ctx.translate(x, y)
    ctx.rotate(randFloat(-0.35, 0.35))

    // Font
    const size   = randInt(28, 38)
    const font   = fonts[randInt(0, fonts.length - 1)]
    ctx.font     = `900 ${size}px "${font}"`

    // Pick vibrant colour
    const hue    = randInt(0, 360)
    const light  = darkMode ? randInt(65, 95) : randInt(20, 50)
    ctx.fillStyle = `hsl(${hue},90%,${light}%)`

    // Subtle shadow / glow
    ctx.shadowColor   = darkMode ? `hsl(${hue},100%,80%)` : `hsl(${hue},80%,30%)`
    ctx.shadowBlur    = 6
    ctx.shadowOffsetX = 1
    ctx.shadowOffsetY = 1

    // Slight skew per character
    ctx.transform(1, randFloat(-0.15, 0.15), randFloat(-0.1, 0.1), 1, 0, 0)

    ctx.fillText(code[i], 0, size / 3)

    // Thin outline for contrast
    ctx.strokeStyle = darkMode ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.6)'
    ctx.lineWidth   = 0.8
    ctx.strokeText(code[i], 0, size / 3)

    ctx.restore()
  }

  // ── Foreground crossing lines (over text) ──
  for (let l = 0; l < 3; l++) {
    ctx.beginPath()
    ctx.moveTo(randFloat(0, W * 0.3), randFloat(0, H))
    ctx.bezierCurveTo(
      randFloat(W * 0.2, W * 0.5), randFloat(0, H),
      randFloat(W * 0.5, W * 0.8), randFloat(0, H),
      randFloat(W * 0.7, W),       randFloat(0, H)
    )
    const hue       = randInt(180, 300)
    ctx.strokeStyle = darkMode
      ? `hsla(${hue},80%,70%,${randFloat(0.2, 0.4)})`
      : `hsla(${hue},60%,35%,${randFloat(0.25, 0.45)})`
    ctx.lineWidth   = randFloat(1, 2.5)
    ctx.stroke()
  }
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function ImageCaptcha({ onVerified, accentColor = 'purple' }) {
  const canvasRef              = useRef(null)
  const [code, setCode]        = useState('')
  const [input, setInput]      = useState('')
  const [status, setStatus]    = useState('idle')   // idle | wrong | correct
  const [shake, setShake]      = useState(false)
  const [attempts, setAttempts]= useState(0)
  const [masked, setMasked]    = useState(false)    // mask input like password

  const isNavy  = accentColor === 'navy-admin' || accentColor === 'navy-manager'
  const isBlue  = accentColor === 'blue'
  const btnGrad = isNavy
    ? (accentColor === 'navy-admin' ? 'from-[#0f1f4a] to-[#1e3a8a]' : 'from-[#1e3a8a] to-[#2563eb]')
    : isBlue ? 'from-blue-600 to-cyan-600' : 'from-purple-600 to-violet-700'
  const ringCls = isNavy
    ? 'focus:border-blue-700 focus:ring-blue-700/20'
    : isBlue ? 'focus:border-blue-500 focus:ring-blue-500/30' : 'focus:border-purple-500 focus:ring-purple-500/30'
  const badgeCls = isNavy
    ? 'bg-blue-100 border-blue-300 text-blue-800'
    : isBlue ? 'bg-blue-500/20 border-blue-500/30 text-blue-300' : 'bg-purple-500/20 border-purple-500/30 text-purple-300'

  // ── Generate new CAPTCHA ──
  const refresh = useCallback(() => {
    const newCode = generateCode(6)
    setCode(newCode)
    setInput('')
    setStatus('idle')
    setAttempts(0)
  }, [])

  // ── Draw whenever code changes ──
  useEffect(() => {
    if (code && canvasRef.current) {
      const dark = !(accentColor === 'navy-admin' || accentColor === 'navy-manager')
      drawCaptcha(canvasRef.current, code, dark)
    }
  }, [code, accentColor])

  // ── Initial generation ──
  useEffect(() => { refresh() }, [refresh])

  // ── Verify ──
  const verify = () => {
    if (!input.trim()) return
    if (input.trim().toUpperCase() === code.toUpperCase()) {
      setStatus('correct')
      onVerified(true)
    } else {
      setStatus('wrong')
      setShake(true)
      setTimeout(() => setShake(false), 600)
      setAttempts(a => a + 1)
      setInput('')
      // Auto-refresh after 2 failed attempts
      if (attempts >= 1) {
        setTimeout(() => refresh(), 800)
      }
    }
  }

  const handleKey = (e) => { if (e.key === 'Enter') verify() }

  return (
    <div className={`rounded-2xl border p-4 transition-all duration-300 ${
      status === 'correct'
        ? 'border-green-300 bg-green-50'
        : status === 'wrong'
          ? 'border-red-300 bg-red-50'
          : isNavy
            ? 'border-blue-200 bg-blue-50/50'
            : 'border-white/10 bg-white/3'
    }`}>

      {/* Header row */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {status === 'correct'
            ? <CheckCircle className="w-4 h-4 text-green-400" />
            : <span className={`w-4 h-4 rounded border text-xs flex items-center justify-center font-bold ${badgeCls}`}>
                {isBlue ? 'M' : 'A'}
              </span>
          }
          <span className={`text-xs font-semibold ${
            status === 'correct'
              ? 'text-green-600'
              : isNavy ? 'text-navy-700' : 'text-slate-300'
          }`}>
            {status === 'correct' ? 'CAPTCHA verified ✓' : 'Type the characters shown below'}
          </span>
        </div>
        {status !== 'correct' && (
          <button onClick={refresh} title="New CAPTCHA"
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-200 hover:bg-white/10 transition-all">
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Canvas */}
      {status !== 'correct' && (
        <div className="relative mb-3 select-none">
          <canvas
            ref={canvasRef}
            className="w-full rounded-xl border border-white/10"
            style={{ imageRendering: 'crisp-edges', display: 'block' }}
          />
          {/* Overlay label */}
          <div className="absolute bottom-1.5 right-2 text-[10px] text-white/20 font-mono select-none pointer-events-none">
            CAPTCHA
          </div>
        </div>
      )}

      {/* Input + verify */}
      {status !== 'correct' && (
        <>
          <div className={`flex gap-2 ${shake ? 'animate-[shake_0.5s_ease-in-out]' : ''}`}>
            <div className="relative flex-1">
              <input
                type={masked ? 'password' : 'text'}
                value={input}
                onChange={e => { setInput(e.target.value.toUpperCase()); setStatus('idle') }}
                onKeyDown={handleKey}
                placeholder="Enter characters…"
                maxLength={6}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="characters"
                spellCheck={false}
            className={`
                  w-full px-3 py-2.5 pr-9 text-sm font-mono tracking-[0.3em] uppercase
                  border rounded-xl outline-none focus:ring-1 transition-all duration-200
                  ${isNavy
                    ? 'bg-white text-navy-800 placeholder-slate-400 border-blue-200'
                    : 'bg-white/5 text-white placeholder-slate-600 border-white/10'}
                  ${status === 'wrong' ? (isNavy ? 'border-red-400' : 'border-red-500/50') : ''}
                  ${ringCls}
                `}
              />
              <button type="button" onClick={() => setMasked(m => !m)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors">
                {masked ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
            <button
              onClick={verify}
              className={`px-4 py-2.5 text-sm font-semibold text-white rounded-xl
                          bg-gradient-to-r ${btnGrad} hover:opacity-90 active:scale-95
                          transition-all duration-200 whitespace-nowrap`}>
              Verify
            </button>
          </div>

          {/* Feedback */}
          <div className="mt-2 min-h-[18px]">
            {status === 'wrong' && (
              <p className={`flex items-center gap-1.5 text-xs ${isNavy ? 'text-red-600' : 'text-red-400'}`}>
                <XCircle className="w-3.5 h-3.5 shrink-0" />
                Incorrect — {attempts >= 2 ? 'new CAPTCHA generated' : 'try again'}
              </p>
            )}
            {status === 'idle' && attempts === 0 && (
              <p className={`text-xs ${isNavy ? 'text-slate-400' : 'text-slate-600'}`}>
                Not case-sensitive · 6 characters · Click 🔄 for a new image
              </p>
            )}
          </div>
        </>
      )}

      {/* Success */}
      {status === 'correct' && (
        <div className={`flex items-center gap-2 text-sm font-medium ${isNavy ? 'text-green-600' : 'text-green-400'}`}>
          <CheckCircle className="w-4 h-4" />
          Human verified — you may sign in
        </div>
      )}
    </div>
  )
}
