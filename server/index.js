require('dotenv').config({ override: true })

const express = require('express')
const helmet = require('helmet')
const cors = require('cors')
const cron = require('node-cron')
const { general: generalLimiter, ai: aiLimiter } = require('./middleware/rateLimit')

const authRoutes = require('./routes/auth')
const circleRoutes = require('./routes/circle')
const inviteRoutes = require('./routes/invite')
const logRoutes = require('./routes/log')
const medicationsRoutes = require('./routes/medications')
const statusRoutes = require('./routes/status')
const aiRoutes = require('./routes/ai')
const appointmentsRoutes = require('./routes/appointments')
const documentsRoutes = require('./routes/documents')
const { runWeeklyDigest } = require('./services/digest')

const app = express()
const PORT = process.env.PORT || 3001

// Security headers
app.use(helmet())

// CORS — in production set FRONTEND_URL=https://mycarecircle.loamstrategy.com
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
  'http://localhost:5176',
]
// Add any origins from the environment (comma- or space-separated)
if (process.env.FRONTEND_URL) {
  process.env.FRONTEND_URL.split(/[\s,]+/).forEach((u) => {
    const trimmed = u.trim()
    if (trimmed && !allowedOrigins.includes(trimmed)) allowedOrigins.push(trimmed)
  })
}

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true)
      } else {
        callback(new Error('Not allowed by CORS'))
      }
    },
    credentials: true,
  })
)

// Body parsing
app.use(express.json({ limit: '1mb' }))
app.use(express.urlencoded({ extended: true }))

// Rate limiting
app.use('/api/', generalLimiter)
app.use('/api/v1/ai', aiLimiter)

// Routes
app.use('/api/v1/auth', authRoutes)
app.use('/api/v1/circle', circleRoutes)
app.use('/api/v1/invite', inviteRoutes)   // public invite token lookup + accept
app.use('/api/v1/log', logRoutes)
app.use('/api/v1/medications', medicationsRoutes)
app.use('/api/v1/status', statusRoutes)
app.use('/api/v1/ai', aiRoutes)
app.use('/api/v1/appointments', appointmentsRoutes)
app.use('/api/v1/documents', documentsRoutes)

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', env: process.env.NODE_ENV })
})

// 404
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' })
})

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack)
  res.status(500).json({ error: 'Internal server error' })
})

app.listen(PORT, () => {
  console.log(`My CareCircle server running on http://localhost:${PORT}`)
})

// ── Weekly digest cron ───────────────────────────────────────────────────────
// Fires every Sunday at 08:00 am (server local time).
// Set the TZ environment variable if the server timezone differs from users'.
cron.schedule('0 8 * * 0', async () => {
  try {
    await runWeeklyDigest()
  } catch (err) {
    console.error('[cron] Weekly digest failed:', err.message)
  }
})

console.log('[cron] Weekly digest scheduled — Sundays at 08:00')
