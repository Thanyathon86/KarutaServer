-- CreateEnum
CREATE TYPE "Difficulty" AS ENUM ('easy', 'normal', 'hard');

-- CreateEnum
CREATE TYPE "Winner" AS ENUM ('player', 'cpu');

-- CreateEnum
CREATE TYPE "TappedAfter" AS ENUM ('kami', 'shimo', 'none');

-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GameSession" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "difficulty" "Difficulty" NOT NULL,
    "memoTimeSec" INTEGER NOT NULL,
    "playerFinalCount" INTEGER NOT NULL,
    "cpuFinalCount" INTEGER NOT NULL,
    "winner" "Winner" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GameSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CardResult" (
    "id" UUID NOT NULL,
    "sessionId" UUID NOT NULL,
    "cardId" INTEGER NOT NULL,
    "isCorrect" BOOLEAN NOT NULL,
    "reactionMs" INTEGER NOT NULL,
    "tappedAfter" "TappedAfter" NOT NULL,
    "wasDeadCard" BOOLEAN NOT NULL,
    "gotPenalty" BOOLEAN NOT NULL,

    CONSTRAINT "CardResult_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- AddForeignKey
ALTER TABLE "GameSession" ADD CONSTRAINT "GameSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CardResult" ADD CONSTRAINT "CardResult_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "GameSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
