CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TYPE "UserRole" AS ENUM ('USER', 'ADMIN');
CREATE TYPE "ArtifactType" AS ENUM ('BUG', 'USER_STORY', 'TASK', 'FRONT_BACK_SPLIT', 'DAILY', 'JIRA_COMMENT', 'QUESTIONS', 'CHECKLIST', 'REQUIREMENTS_REVIEW', 'GOST34', 'UNKNOWN');
CREATE TYPE "ArtifactStatus" AS ENUM ('GENERATED', 'SAVED', 'FAILED');
CREATE TYPE "Language" AS ENUM ('RU', 'EN');
CREATE TYPE "Tone" AS ENUM ('SIMPLE', 'FORMAL', 'JIRA_READY', 'GOST_FORMAL');
CREATE TYPE "DetailLevel" AS ENUM ('SHORT', 'MEDIUM', 'DETAILED');

CREATE TABLE "User" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "telegramId" BIGINT NOT NULL,
  "username" TEXT,
  "firstName" TEXT,
  "lastName" TEXT,
  "telegramLanguageCode" TEXT,
  "role" "UserRole" NOT NULL DEFAULT 'USER',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "lastSeenAt" TIMESTAMP(3),

  CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "UserSettings" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL,
  "language" "Language" NOT NULL DEFAULT 'RU',
  "tone" "Tone" NOT NULL DEFAULT 'SIMPLE',
  "detailLevel" "DetailLevel" NOT NULL DEFAULT 'MEDIUM',
  "defaultProjectContextId" UUID,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "UserSettings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProjectContext" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "key" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "context" TEXT NOT NULL,
  "isDefault" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ProjectContext_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Artifact" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL,
  "projectContextId" UUID NOT NULL,
  "type" "ArtifactType" NOT NULL DEFAULT 'UNKNOWN',
  "inputText" TEXT NOT NULL,
  "outputText" TEXT NOT NULL,
  "status" "ArtifactStatus" NOT NULL DEFAULT 'GENERATED',
  "qualityScore" INTEGER,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "Artifact_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "User_telegramId_key" ON "User"("telegramId");
CREATE INDEX "User_telegramId_idx" ON "User"("telegramId");
CREATE INDEX "User_role_idx" ON "User"("role");
CREATE INDEX "User_createdAt_idx" ON "User"("createdAt");

CREATE UNIQUE INDEX "UserSettings_userId_key" ON "UserSettings"("userId");
CREATE INDEX "UserSettings_defaultProjectContextId_idx" ON "UserSettings"("defaultProjectContextId");

CREATE UNIQUE INDEX "ProjectContext_key_key" ON "ProjectContext"("key");
CREATE INDEX "ProjectContext_isDefault_idx" ON "ProjectContext"("isDefault");

CREATE INDEX "Artifact_userId_createdAt_idx" ON "Artifact"("userId", "createdAt");
CREATE INDEX "Artifact_projectContextId_idx" ON "Artifact"("projectContextId");
CREATE INDEX "Artifact_type_idx" ON "Artifact"("type");
CREATE INDEX "Artifact_status_idx" ON "Artifact"("status");

ALTER TABLE "UserSettings" ADD CONSTRAINT "UserSettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserSettings" ADD CONSTRAINT "UserSettings_defaultProjectContextId_fkey" FOREIGN KEY ("defaultProjectContextId") REFERENCES "ProjectContext"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Artifact" ADD CONSTRAINT "Artifact_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Artifact" ADD CONSTRAINT "Artifact_projectContextId_fkey" FOREIGN KEY ("projectContextId") REFERENCES "ProjectContext"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
