require('dotenv').config()
const sequelize = require('./config/database');

// Sync database
sequelize.sync({ force: false }).then(() => console.log('SQLite Synced'));

const express     = require('express')
const cors        = require('cors')
const helmet      = require('helmet')
const rateLimit   = require('express-rate-limit')
const validateRouter  = require('./routes/validate')
const webcheckRouter  = require('./routes/webcheck')
const docgenRouter    = require('./routes/docgen')
const documentRouter  = require('./routes/documentRoutes')
const aiRouter        = require('./routes/aiRoutes')
const authRouter      = require('./routes/auth')

const app  = express()
const PORT = process.env.PORT || 5000

// Security middleware
app.use(helmet({ crossOriginResourcePolicy: false }))

// CORS
app.use(cors({
  origin: [
    process.env.FRONTEND_URL || 'http://localhost:5173',
    'http://localhost:5173',
    'http://localhost:4173',
  ],
  credentials: true,
}))

// Rate limiting
app.use('/api/validate', rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: { error: 'Too many requests, please try again later.' }
}))

// Body parsing
app.use(express.json({ limit: '10mb' }))

// Routes
app.use('/api/validate', validateRouter)
app.use('/api/webcheck', webcheckRouter)
app.use('/api/docgen',   docgenRouter)
app.use('/api/documents', documentRouter)
app.use('/api/ai', aiRouter)
app.use('/api/auth', authRouter)

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString(), version: '1.0.0' })
})

// Serve static files from the frontend
const path = require('path')
const frontendDist = path.join(__dirname, '../../frontend/dist')
app.use(express.static(frontendDist))

// Catch-all route to serve React index.html for unknown routes
app.get('*', (req, res) => {
  res.sendFile(path.join(frontendDist, 'index.html'))
})

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack)
  res.status(500).json({ error: 'Internal server error' })
})

app.listen(PORT, () => {
  console.log(`\n🚀 EmailShield Backend running on http://localhost:${PORT}`)
  console.log(`📡 Health check: http://localhost:${PORT}/health`)
  console.log(`🔑 OpenAI: ${process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'your-openai-api-key-here' ? '✅ Configured' : '⚠️  Not configured (using fallback)'}`)
  console.log(`🗄️  SQLite: ✅ Configured`)
})
