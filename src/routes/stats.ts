/**
 * routes/stats.ts
 * ─────────────────────────────────────────────────────────────
 * POST /stats/session          — บันทึกผลเกม (ต้องล็อกอิน)
 * GET  /stats/:userId          — สถิติรวมทั้งหมด
 * GET  /stats/:userId/sessions — ประวัติเกมทั้งหมด (เรียงล่าสุดก่อน)
 * GET  /stats/:userId/weak     — 5 ไพ่ที่ตอบผิดบ่อยที่สุด
 * ─────────────────────────────────────────────────────────────
 */

import { Router, Request, Response } from 'express'
import prisma from '../prismaClient'
import { verifyToken } from '../middleware/auth'

const router = Router()

// ─── POST /stats/session ─────────────────────────────────────
// Body: {
//   difficulty       : 'easy' | 'normal' | 'hard'
//   memoTimeSec      : number
//   durationMs       : number   ← เวลาเล่นทั้งหมด
//   playerFinalCount : number   ← ไพ่ที่เหลืออยู่ฝั่งเรา
//   cpuFinalCount    : number   ← ไพ่ที่เหลืออยู่ฝั่ง CPU
//   winner           : 'player' | 'cpu'
//   acquiredOT       : number   ← ตบได้จากฝั่ง CPU
//   acquiredYT       : number   ← ตบได้จากฝั่งเรา
//   foulsCount       : number
//   cardResults      : CardResultInput[]
// }
// CardResultInput: {
//   cardId      : number
//   isCorrect   : boolean
//   reactionMs  : number        ← เวลาตอบสนอง (ms)  0 = ไม่ได้ตบ/ฟาล์ว
//   tappedAfter : 'kami' | 'shimo' | 'none'
//   wasDeadCard : boolean
//   gotPenalty  : boolean
// }

router.post('/session', verifyToken, async (req: Request, res: Response) => {
  const userId = (req as any).userId as string

  const {
    difficulty,
    memoTimeSec,
    durationMs,
    playerFinalCount,
    cpuFinalCount,
    winner,
    acquiredOT,
    acquiredYT,
    foulsCount,
    cardResults,
  } = req.body

  // ─── Validate ──────────────────────────────────────────────
  if (
    !difficulty || memoTimeSec == null || durationMs == null ||
    playerFinalCount == null || cpuFinalCount == null ||
    !winner || acquiredOT == null || acquiredYT == null || foulsCount == null ||
    !Array.isArray(cardResults)
  ) {
    return res.status(400).json({ error: 'ข้อมูลไม่ครบถ้วน' })
  }

  // ─── Create GameSession + CardResults (nested) ─────────────
  const session = await prisma.gameSession.create({
    data: {
      userId,
      difficulty,
      memoTimeSec,
      durationMs,
      playerFinalCount,
      cpuFinalCount,
      winner,
      acquiredOT,
      acquiredYT,
      foulsCount,
      cardResults: {
        create: (cardResults as {
          cardId: number
          isCorrect: boolean
          reactionMs: number
          tappedAfter: string
          wasDeadCard: boolean
          gotPenalty: boolean
        }[]).map(cr => ({
          cardId:      cr.cardId,
          isCorrect:   cr.isCorrect,
          reactionMs:  cr.reactionMs,
          tappedAfter: cr.tappedAfter,
          wasDeadCard: cr.wasDeadCard,
          gotPenalty:  cr.gotPenalty,
        })),
      },
    },
    include: { cardResults: true },
  })

  return res.status(201).json(session)
})

// ─── GET /stats/:userId ───────────────────────────────────────
// สถิติรวมทั้งหมด: wins, losses, avg/fastest reaction, acquiring rate, etc.
router.get('/:userId', verifyToken, async (req: Request, res: Response) => {
  const { userId } = req.params

  const sessions = await prisma.gameSession.findMany({
    where:   { userId },
    include: { cardResults: true },
    orderBy: { createdAt: 'desc' },
  })

  if (sessions.length === 0) {
    return res.json({
      totalGames:       0,
      wins:             0,
      losses:           0,
      totalAcquiredOT:  0,
      totalAcquiredYT:  0,
      totalFouls:       0,
      avgReactionMs:    null,
      fastestReactionMs: null,
      fastestCardId:    null,
    })
  }

  const totalGames = sessions.length
  const wins       = sessions.filter(s => s.winner === 'player').length
  const losses     = totalGames - wins

  const totalAcquiredOT = sessions.reduce((s, g) => s + g.acquiredOT, 0)
  const totalAcquiredYT = sessions.reduce((s, g) => s + g.acquiredYT, 0)
  const totalFouls      = sessions.reduce((s, g) => s + g.foulsCount, 0)

  // เวลาตอบสนองจาก CardResult ที่ถูกต้องทั้งหมด
  const allCorrect = sessions
    .flatMap(s => s.cardResults)
    .filter(r => r.isCorrect && r.reactionMs > 0)

  const avgReactionMs =
    allCorrect.length > 0
      ? Math.round(allCorrect.reduce((s, r) => s + r.reactionMs, 0) / allCorrect.length)
      : null

  const fastest = allCorrect.reduce<typeof allCorrect[0] | null>(
    (best, r) => (!best || r.reactionMs < best.reactionMs ? r : best),
    null
  )

  return res.json({
    totalGames,
    wins,
    losses,
    totalAcquiredOT,
    totalAcquiredYT,
    totalFouls,
    avgReactionMs,
    fastestReactionMs: fastest?.reactionMs ?? null,
    fastestCardId:     fastest?.cardId     ?? null,
  })
})

// ─── GET /stats/:userId/sessions ─────────────────────────────
// ประวัติเกมทั้งหมด พร้อม summary ต่อ session
router.get('/:userId/sessions', verifyToken, async (req: Request, res: Response) => {
  const { userId } = req.params
  const limit  = Math.min(Number(req.query.limit)  || 20, 100)
  const offset = Number(req.query.offset) || 0

  const [total, sessions] = await Promise.all([
    prisma.gameSession.count({ where: { userId } }),
    prisma.gameSession.findMany({
      where:   { userId },
      include: { cardResults: true },
      orderBy: { createdAt: 'desc' },
      take:    limit,
      skip:    offset,
    }),
  ])

  // คำนวณ summary ต่อ session
  const data = sessions.map(s => {
    const correct = s.cardResults.filter(r => r.isCorrect && r.reactionMs > 0)
    const avgReactionMs =
      correct.length > 0
        ? Math.round(correct.reduce((acc, r) => acc + r.reactionMs, 0) / correct.length)
        : null
    const fastestMs = correct.length > 0
      ? Math.min(...correct.map(r => r.reactionMs))
      : null
    const totalLive = s.cardResults.filter(r => !r.wasDeadCard).length
    const acquiringRate = totalLive > 0
      ? +((s.acquiredOT + s.acquiredYT) / totalLive * 100).toFixed(1)
      : null
    const foulRate = (s.acquiredOT + s.acquiredYT + s.foulsCount) > 0
      ? +(s.foulsCount / (s.acquiredOT + s.acquiredYT + s.foulsCount) * 100).toFixed(1)
      : 0

    return {
      id:               s.id,
      difficulty:       s.difficulty,
      winner:           s.winner,
      durationMs:       s.durationMs,
      memoTimeSec:      s.memoTimeSec,
      playerFinalCount: s.playerFinalCount,
      cpuFinalCount:    s.cpuFinalCount,
      acquiredOT:       s.acquiredOT,
      acquiredYT:       s.acquiredYT,
      foulsCount:       s.foulsCount,
      acquiringRate,
      foulRate,
      avgReactionMs,
      fastestMs,
      createdAt: s.createdAt,
    }
  })

  return res.json({ total, sessions: data })
})

// ─── GET /stats/:userId/cards ─────────────────────────────────
// สถิติรายไพ่: avgReactionMs, acqRate, acqTotal per cardId
router.get('/:userId/cards', verifyToken, async (req: Request, res: Response) => {
  const { userId } = req.params

  const results = await prisma.cardResult.findMany({
    where: {
      session:     { userId },
      wasDeadCard: false,       // ไม่นับไพ่เปล่า
    },
    select: {
      cardId:     true,
      isCorrect:  true,
      reactionMs: true,
    },
  })

  // group by cardId
  const map: Record<number, { total: number; correct: number; rxTimes: number[] }> = {}
  for (const r of results) {
    if (!map[r.cardId]) map[r.cardId] = { total: 0, correct: 0, rxTimes: [] }
    map[r.cardId].total++
    if (r.isCorrect) {
      map[r.cardId].correct++
      if (r.reactionMs > 0) map[r.cardId].rxTimes.push(r.reactionMs)
    }
  }

  const cards = Object.entries(map).map(([cardId, d]) => ({
    cardId:       Number(cardId),
    total:        d.total,
    acqTotal:     d.correct,
    acqRate:      d.total > 0 ? +((d.correct / d.total) * 100).toFixed(1) : null,
    avgReactionMs: d.rxTimes.length > 0
      ? Math.round(d.rxTimes.reduce((s, t) => s + t, 0) / d.rxTimes.length)
      : null,
  }))

  return res.json({ cards })
})

// ─── GET /stats/:userId/weak ──────────────────────────────────
// 5 ไพ่ที่ตอบผิดบ่อยที่สุด
router.get('/:userId/weak', verifyToken, async (req: Request, res: Response) => {
  const { userId } = req.params

  const results = await prisma.cardResult.findMany({
    where: {
      session:    { userId },
      isCorrect:  false,
      wasDeadCard: false,
    },
    select: { cardId: true },
  })

  const countMap: Record<number, number> = {}
  for (const r of results) {
    countMap[r.cardId] = (countMap[r.cardId] ?? 0) + 1
  }

  const weakCards = Object.entries(countMap)
    .sort((a, b) => Number(b[1]) - Number(a[1]))
    .slice(0, 5)
    .map(([cardId, count]) => ({ cardId: Number(cardId), missCount: Number(count) }))

  return res.json({ weakCards })
})

export default router
