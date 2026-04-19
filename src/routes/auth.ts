/**
 * routes/auth.ts
 * ─────────────────────────────────────────────────────────────
 * POST /auth/register  — สมัครสมาชิก
 * POST /auth/login     — เข้าสู่ระบบ
 * ─────────────────────────────────────────────────────────────
 */

import { Router, Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import jwt    from 'jsonwebtoken'
import prisma from '../prismaClient'

const router = Router()

// ─── Register ─────────────────────────────────────────────────
router.post('/register', async (req: Request, res: Response) => {
  const { email, password, displayName } = req.body as {
    email: string
    password: string
    displayName?: string
  }

  // validate
  if (!email || !password) {
    return res.status(400).json({ error: 'กรุณากรอกอีเมลและรหัสผ่าน' })
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร' })
  }

  // ตรวจว่ามี email นี้แล้วหรือยัง
  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    return res.status(409).json({ error: 'อีเมลนี้ถูกใช้งานแล้ว' })
  }

  // hash password
  const passwordHash = await bcrypt.hash(password, 10)

  // สร้าง user ใหม่
  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      displayName: displayName ?? email.split('@')[0],
    },
  })

  // สร้าง JWT
  const token = createToken(user.id)

  return res.status(201).json({
    token,
    user: { id: user.id, email: user.email, displayName: user.displayName },
  })
})

// ─── Login ────────────────────────────────────────────────────
router.post('/login', async (req: Request, res: Response) => {
  const { email, password } = req.body as { email: string; password: string }

  if (!email || !password) {
    return res.status(400).json({ error: 'กรุณากรอกอีเมลและรหัสผ่าน' })
  }

  // หา user
  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) {
    return res.status(401).json({ error: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' })
  }

  // เช็ค password
  const valid = await bcrypt.compare(password, user.passwordHash)
  if (!valid) {
    return res.status(401).json({ error: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' })
  }

  const token = createToken(user.id)

  return res.json({
    token,
    user: { id: user.id, email: user.email, displayName: user.displayName },
  })
})

// ─── Me (verify token & return profile) ──────────────────────
import { verifyToken } from '../middleware/auth'

router.get('/me', verifyToken, async (req: Request, res: Response) => {
  const userId = (req as any).userId as string
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) return res.status(404).json({ error: 'ไม่พบผู้ใช้' })
  return res.json({ id: user.id, email: user.email, displayName: user.displayName })
})

// ─── Helper ───────────────────────────────────────────────────
function createToken(userId: string): string {
  const secret = process.env.JWT_SECRET ?? 'fallback_secret'
  return jwt.sign({ userId }, secret, { expiresIn: '7d' })
}

export default router
