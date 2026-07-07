import { useState, useEffect, useCallback } from 'react'
import { RefreshCw, CheckCircle, XCircle, Brain, Lightbulb } from 'lucide-react'

// ─── Puzzle bank ─────────────────────────────────────────────────────────────
const PUZZLES = [
  // Math
  { q: 'What is 7 × 8?',                          a: '56',        hint: 'Think 7 × 8 = ?' },
  { q: 'What is 144 ÷ 12?',                        a: '12',        hint: 'Dozen divided by dozen' },
  { q: 'What is 15 + 27?',                         a: '42',        hint: 'Add tens, then units' },
  { q: 'What is 100 − 37?',                        a: '63',        hint: 'Subtract from 100' },
  { q: 'What is 9²?',                              a: '81',        hint: '9 × 9' },
  { q: 'What is 2⁸?',                              a: '256',       hint: '2→4→8→16→32→64→128→256' },
  { q: 'What is 13 × 5?',                          a: '65',        hint: '13 × 5 = (10×5) + (3×5)' },

  // Number sequences
  { q: 'Next number: 2, 4, 8, 16, __?',            a: '32',        hint: 'Each number doubles' },
  { q: 'Next number: 1, 1, 2, 3, 5, 8, __?',       a: '13',        hint: 'Fibonacci sequence' },
  { q: 'Next number: 3, 6, 9, 12, __?',            a: '15',        hint: 'Multiples of 3' },
  { q: 'Next number: 100, 90, 81, 73, __?',        a: '66',        hint: 'Differences: -10,-9,-8,-7…' },
  { q: 'Next number: 1, 4, 9, 16, 25, __?',        a: '36',        hint: 'Perfect squares: 1²,2²,3²…' },
  { q: 'Missing: 5, 10, __, 20, 25',               a: '15',        hint: 'Count by 5s' },

  // Logic / word
  { q: 'If all Bloops are Razzies, and all Razzies are Lazzies, are all Bloops definitely Lazzies?', a: 'yes', hint: 'Transitive logic' },
  { q: 'A rooster lays an egg on top of a barn. Which way does it roll?',  a: 'roosters do not lay eggs', hint: 'Read carefully!' },
  { q: 'What has hands but cannot clap?',          a: 'clock',     hint: 'It tells time' },
  { q: 'What comes once in a minute, twice in a moment, but never in a thousand years?', a: 'm', hint: 'Look at the letters' },
  { q: 'The more you take, the more you leave behind. What am I?', a: 'footsteps', hint: 'Think about walking' },
  { q: 'I speak without a mouth and hear without ears. I have no body but come alive with wind. What am I?', a: 'echo', hint: 'Sound bouncing back' },

  // True / False logic
  { q: 'True or false: A square is always a rectangle.',   a: 'true',  hint: 'A square has 4 right angles and equal sides' },
  { q: 'True or false: All prime numbers are odd.',         a: 'false', hint: 'Think of the smallest prime' },
  { q: 'True or false: 0 is an even number.',              a: 'true',  hint: 'Even means divisible by 2' },

  // Word / lateral
  { q: 'What 3-letter word can be placed before "board", "room", and "work"?', a: 'class',    hint: 'Think school' },
  { q: 'What word becomes shorter when you add two letters to it?',             a: 'short',    hint: 'Read the answer in the question' },
  { q: 'How many months have 28 days?',            a: '12',        hint: 'Every month has at least 28 days' },
  { q: 'A man walks into a room with a match and finds a candle, a lamp, and a fireplace. What does he light first?', a: 'the match', hint: 'What does he need first?' },

  // Pattern / letter
  { q: 'What letter comes next: A, C, E, G, __?',  a: 'i',         hint: 'Skip every other letter' },
  { q: 'What letter comes next: Z, Y, X, W, __?',  a: 'v',         hint: 'Reverse alphabet' },
  { q: 'OTTAWA is to CANADA as PARIS is to __?',   a: 'france',    hint: 'Capital cities' },
  { q: 'Finger is to hand as toe is to __?',        a: 'foot',      hint: 'Same relationship, lower body' },
]

function normalize(str) {
  return str.trim().toLowerCase().replace(/[^a-z0-9]/g, '')
}

function randomPuzzle(exclude) {
  const pool = exclude ? PUZZLES.filter(p => p.q !== exclude) : PUZZLES
  return pool[Math.floor(Math.random() * pool.length)]
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function PuzzleCaptcha({ onVerified, accentColor = 'purple' }) {
  const [puzzle, setPuzzle]     = useState(() => randomPuzzle())
  const [answer, setAnswer]     = useState('')
  const [status, setStatus]     = useState('idle')   // idle | wrong | correct
  const [showHint, setShowHint] = useState(false)
  const [shake, setShake]       = useState(false)
  const [attempts, setAttempts] = useState(0)

  const isBlue   = accentColor === 'blue'
  const ring     = isBlue ? 'focus:border-blue-500 focus:ring-blue-500/30'   : 'focus:border-purple-500 focus:ring-purple-500/30'
  const btnGrad  = isBlue ? 'from-blue-600 to-cyan-600'                       : 'from-purple-600 to-violet-700'
  const hintCol  = isBlue ? 'text-blue-400 bg-blue-500/10 border-blue-500/20' : 'text-purple-400 bg-purple-500/10 border-purple-500/20'

  const refresh = useCallback(() => {
    setPuzzle(p => randomPuzzle(p.q))
    setAnswer('')
    setStatus('idle')
    setShowHint(false)
    setAttempts(0)
  }, [])

  const check = () => {
    if (!answer.trim()) return
    const correct = normalize(answer) === normalize(puzzle.a)
    if (correct) {
      setStatus('correct')
      onVerified(true)
    } else {
      setStatus('wrong')
      setShake(true)
      setTimeout(() => setShake(false), 600)
      const next = attempts + 1
      setAttempts(next)
      if (next >= 3) setShowHint(true)
    }
  }

  const handleKey = (e) => { if (e.key === 'Enter') check() }

  // Reset when parent resets
  useEffect(() => {
    if (status === 'correct') return
  }, [status])

  return (
    <div className={`rounded-2xl border p-4 transition-all duration-300 ${
      status === 'correct'
        ? 'border-green-500/40 bg-green-500/5'
        : status === 'wrong'
          ? 'border-red-500/30 bg-red-500/5'
          : 'border-white/10 bg-white/3'
    }`}>

      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {status === 'correct'
            ? <CheckCircle className="w-4 h-4 text-green-400" />
            : <Brain className={`w-4 h-4 ${isBlue ? 'text-blue-400' : 'text-purple-400'} animate-pulse`} />
          }
          <span className={`text-xs font-semibold ${
            status === 'correct' ? 'text-green-400' : 'text-slate-300'
          }`}>
            {status === 'correct' ? 'Puzzle solved ✓' : 'Solve the puzzle to continue'}
          </span>
        </div>
        {status !== 'correct' && (
          <button onClick={refresh} title="New puzzle"
            className="text-slate-500 hover:text-slate-300 transition-colors p-1 rounded-lg hover:bg-white/5">
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Puzzle question */}
      <div className={`rounded-xl p-3 mb-3 border text-sm font-medium leading-relaxed
        ${isBlue ? 'bg-blue-500/10 border-blue-500/20 text-blue-100' : 'bg-purple-500/10 border-purple-500/20 text-purple-100'}`}>
        🧩 {puzzle.q}
      </div>

      {/* Hint */}
      {showHint && status !== 'correct' && (
        <div className={`flex items-center gap-2 rounded-xl px-3 py-2 border text-xs mb-3 ${hintCol}`}>
          <Lightbulb className="w-3.5 h-3.5 shrink-0" />
          Hint: {puzzle.hint}
        </div>
      )}

      {/* Answer input + check */}
      {status !== 'correct' && (
        <div className={`flex gap-2 ${shake ? 'animate-[shake_0.5s_ease-in-out]' : ''}`}>
          <input
            type="text"
            value={answer}
            onChange={e => { setAnswer(e.target.value); setStatus('idle') }}
            onKeyDown={handleKey}
            placeholder="Type your answer…"
            className={`
              flex-1 px-3 py-2 text-sm bg-white/5 border rounded-xl text-white
              placeholder-slate-500 outline-none focus:ring-1 transition-all duration-200
              ${status === 'wrong' ? 'border-red-500/50' : 'border-white/10'}
              ${ring}
            `}
            autoComplete="off"
          />
          <button onClick={check}
            className={`px-4 py-2 text-sm font-semibold text-white rounded-xl
                        bg-gradient-to-r ${btnGrad} hover:opacity-90 active:scale-95
                        transition-all duration-200 whitespace-nowrap`}>
            Check
          </button>
        </div>
      )}

      {/* Wrong feedback */}
      {status === 'wrong' && (
        <div className="flex items-center gap-2 mt-2 text-xs text-red-400">
          <XCircle className="w-3.5 h-3.5 shrink-0" />
          Incorrect — try again
          {attempts < 3 && <span className="text-slate-500">({3 - attempts} attempt{3 - attempts !== 1 ? 's' : ''} before hint)</span>}
        </div>
      )}

      {/* Correct feedback */}
      {status === 'correct' && (
        <div className="flex items-center gap-2 mt-1 text-sm text-green-400 font-medium">
          <CheckCircle className="w-4 h-4" />
          Correct! Verification complete.
        </div>
      )}
    </div>
  )
}
