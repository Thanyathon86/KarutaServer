-- AlterTable: add new stat columns to GameSession
ALTER TABLE "GameSession"
  ADD COLUMN "durationMs"  INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "acquiredOT"  INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "acquiredYT"  INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "foulsCount"  INTEGER NOT NULL DEFAULT 0;
