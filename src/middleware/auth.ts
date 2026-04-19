/**
 * middleware/auth.ts
 * ─────────────────────────────────────────────────────────────
 * verifyToken — ตรวจสอบ JWT ก่อนเข้า route ที่ต้องล็อกอิน
 * ─────────────────────────────────────────────────────────────
 *
 * Usage:  router.get('/something', verifyToken, handler)
 * Header: Authorization: Bearer <token>
 */

import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'

interface JwtPayload {
  userId: string
}

export function verifyToken(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers['authorization']
  const token      = authHeader?.split(' ')[1] // "Bearer <token>"

  if (!token) {
    res.status(401).json({ error: 'ไม่พบ token กรุณาล็อกอิน' })
    return
  }

  try {
    const secret  = process.env.JWT_SECRET ?? 'fallback_secret'
    const payload = jwt.verify(token, secret) as JwtPayload
    ;(req as any).userId = payload.userId
    next()
  } catch {
    res.status(401).json({ error: 'Token ไม่ถูกต้องหรือหมดอายุ' })
  }
}
