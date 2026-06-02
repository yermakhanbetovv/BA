CREATE TYPE "BotSessionMode" AS ENUM ('IDLE', 'WAITING_BUG', 'WAITING_STORY', 'WAITING_TASK', 'WAITING_SPLIT', 'WAITING_DAILY', 'WAITING_COMMENT', 'WAITING_QUESTIONS', 'WAITING_CHECKLIST', 'WAITING_REVIEW', 'WAITING_GOST');

CREATE TABLE "BotSession" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL,
  "mode" "BotSessionMode" NOT NULL DEFAULT 'IDLE',
  "lastInputText" TEXT,
  "lastArtifactId" UUID,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "BotSession_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BotSession_userId_key" ON "BotSession"("userId");
CREATE INDEX "BotSession_mode_idx" ON "BotSession"("mode");
CREATE INDEX "BotSession_lastArtifactId_idx" ON "BotSession"("lastArtifactId");

ALTER TABLE "BotSession" ADD CONSTRAINT "BotSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BotSession" ADD CONSTRAINT "BotSession_lastArtifactId_fkey" FOREIGN KEY ("lastArtifactId") REFERENCES "Artifact"("id") ON DELETE SET NULL ON UPDATE CASCADE;
