/**
 * index.ts — KarutaServer entry point
 * ─────────────────────────────────────────────────────────────
 * Express + Prisma + PostgreSQL
 * ─────────────────────────────────────────────────────────────
 */

import express from 'express'
import cors    from 'cors'
import dotenv  from 'dotenv'

import authRouter  from './routes/auth'
import statsRouter from './routes/stats'

dotenv.config()

const app  = express()
const PORT = process.env.PORT ?? 3000

// ─── Middleware ───────────────────────────────────────────────
app.use(cors())
app.use(express.json())

// ─── Routes ───────────────────────────────────────────────────
app.use('/auth',  authRouter)
app.use('/stats', statsRouter)

// ─── Health check ─────────────────────────────────────────────
app.get('/', (_req, res) => {
  res.json({ status: 'KarutaServer running ⚔️' })
})

// ─── Start ────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`🎴 KarutaServer listening on http://localhost:${PORT}`)
})
