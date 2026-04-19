# KarutaServer — คู่มือติดตั้ง

## โครงสร้าง

```
KarutaServer/
├── prisma/
│   └── schema.prisma       ← โครงสร้าง DB (User, GameSession, CardResult)
├── src/
│   ├── index.ts            ← จุดเริ่มต้น Express server
│   ├── prismaClient.ts     ← Singleton Prisma Client
│   ├── middleware/
│   │   └── auth.ts         ← JWT middleware
│   └── routes/
│       ├── auth.ts         ← POST /auth/register, POST /auth/login
│       └── stats.ts        ← POST /stats/session, GET /stats/:userId
├── .env                    ← ตั้งค่า DB + JWT secret
├── package.json
└── tsconfig.json
```

---

## ขั้นตอนที่ 1 — สร้าง Database ใน pgAdmin 4

1. เปิด pgAdmin 4
2. คลิกขวาที่ **Databases** → **Create** → **Database...**
3. ตั้งชื่อว่า `karuta_db` → Save

---

## ขั้นตอนที่ 2 — แก้ไฟล์ `.env`

เปิดไฟล์ `.env` แล้วแก้ให้ตรงกับ pgAdmin ของคุณ:

```
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/karuta_db"
JWT_SECRET="karuta_secret_change_me"
PORT=3000
```

> แทน `YOUR_PASSWORD` ด้วยรหัสผ่าน PostgreSQL ของคุณ

---

## ขั้นตอนที่ 3 — ติดตั้ง dependencies

เปิด Terminal แล้ว `cd` เข้า folder `KarutaServer`:

```bash
npm install
```

---

## ขั้นตอนที่ 4 — Migrate Database (สร้างตาราง)

```bash
npx prisma migrate dev --name init
```

คำสั่งนี้จะ:
- สร้างตาราง `User`, `GameSession`, `CardResult` ใน `karuta_db`
- Generate `PrismaClient` ให้อัตโนมัติ

ถ้าต้องการดู DB แบบ GUI:
```bash
npx prisma studio
```

---

## ขั้นตอนที่ 5 — รัน Server

```bash
npm run dev
```

เห็นข้อความนี้ = สำเร็จ ✅
```
🎴 KarutaServer listening on http://localhost:3000
```

---

## API Endpoints

| Method | Path | ใช้ทำอะไร |
|--------|------|-----------|
| POST | `/auth/register` | สมัครสมาชิก |
| POST | `/auth/login` | เข้าสู่ระบบ |
| POST | `/stats/session` | บันทึกผลเกม (ต้องมี token) |
| GET | `/stats/:userId` | ดูสถิติรวม (ต้องมี token) |
| GET | `/stats/:userId/weak` | ดู 5 ไพ่ที่แย่ที่สุด (ต้องมี token) |

### ตัวอย่าง Register

```json
POST /auth/register
{
  "email": "player@karuta.com",
  "password": "123456",
  "displayName": "สมชาย"
}
```

### ตัวอย่าง Login

```json
POST /auth/login
{
  "email": "player@karuta.com",
  "password": "123456"
}
```

Response จะได้ `token` ไว้ใช้กับ routes อื่น

---

## เชื่อมกับ KarutaApp

เปิดไฟล์ `KarutaApp/app/components/backend/apiService.ts`  
แก้ `BASE_URL` ให้ตรงกับ device ที่ใช้:

```ts
// Android Emulator
const BASE_URL = 'http://10.0.2.2:3000'

// Expo Go (อุปกรณ์จริง — แทน xxx ด้วย IP เครื่องคุณ)
const BASE_URL = 'http://192.168.xxx.xxx:3000'

// iOS Simulator
const BASE_URL = 'http://localhost:3000'
```

ดู IP เครื่องได้จาก CMD: `ipconfig`

---

## Architecture

```
KarutaApp (React Native)
        ↕  HTTP fetch
KarutaServer (Express.js :3000)
        ↕  Prisma Client
PostgreSQL (pgAdmin 4 :5432)
```
