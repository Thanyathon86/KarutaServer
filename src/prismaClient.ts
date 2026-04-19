/**
 * prismaClient.ts
 * ─────────────────────────────────────────────────────────────
 * Prisma 7 Client — ใช้ PrismaPg adapter ต่อ PostgreSQL
 * Singleton: import ไฟล์นี้ทุกที่ที่ต้องใช้ DB
 * ─────────────────────────────────────────────────────────────
 */

import 'dotenv/config'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../generated/prisma/client'

const connectionString = process.env.DATABASE_URL as string

const adapter = new PrismaPg({ connectionString })
const prisma = new PrismaClient({ adapter })

export default prisma
