# BA Copilot Bot

Production-oriented NestJS backend for a Telegram bot that helps a business analyst turn raw notes into Jira-ready and documentation-ready work artifacts.

The bot is focused on FinTech and auto-loan analysis contexts: credit pipeline, client module, admin panel, financial consultant, banks, customer documents, BMG, biometrics, eGov, Jira, GOST 34, and frontend/backend task splitting.

There is no frontend, Telegram Mini App, web UI, JWT auth, or Jira integration in this stage.

## Stack

- Node.js 20+
- NestJS
- TypeScript
- PostgreSQL
- Prisma
- grammY
- Google Gemini API
- Zod
- Jest
- ESLint

## Features

- Telegram user upsert by Telegram ID.
- User settings: language, tone, detail level, default project context.
- Project contexts seeded into PostgreSQL.
- Bot session with active generation mode and last artifact tracking.
- Intent detection for free text.
- AI generation for BA artifacts.
- Artifact history and full artifact opening.
- Inline actions after generation: shorten, formalize, simplify, add acceptance criteria, checklist, front/back split, regenerate.
- Safe long-message splitting for Telegram.

## Commands

- `/start` - create/update user, settings, project context, bot session.
- `/help` - commands and examples.
- `/bug` - create Bug Report.
- `/story` - create User Story.
- `/task` - create Task.
- `/split` - split into Frontend / Backend.
- `/daily` - create Daily Update.
- `/comment` - create Jira Comment.
- `/questions` - generate clarification questions.
- `/checklist` - create testing checklist.
- `/review` - review requirement quality.
- `/gost` - create GOST 34 TZ fragment.
- `/project` - select project context.
- `/settings` - view and update settings.
- `/history` - show latest 10 artifacts.

You can also send plain text without a command. The bot detects intent and either generates immediately or asks you to choose the artifact type.

## Examples

```text
/bug в админке документы пустые, фк не видит имя файла
/story нужно отображать код продукта для всех банков
/daily завел 2 бага, жду фидбек, параллельно тз
/split переименовать код в ID в системе и добавить код продукта
```

## Structure

```text
apps/backend/
  prisma/
    migrations/
    schema.prisma
    seed.ts
  src/
    common/
    config/
    modules/
      ai/
      artifacts/
      bot/
      bot-sessions/
      health/
      project-contexts/
      settings/
      users/
    prisma/
    app.module.ts
    main.ts
```

## Environment

Copy the example env file to the repository root:

```bash
cp .env.example .env
```

Required and optional variables:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/ba_copilot?schema=public
TELEGRAM_BOT_TOKEN=
TELEGRAM_BOT_ENABLED=false
GEMINI_API_KEY=your_google_api_key
GEMINI_MODEL=gemini-2.0-flash
GEMINI_FALLBACK_MODEL=gemini-2.5-flash-lite
APP_PORT=3000
NODE_ENV=development
LOG_LEVEL=info
CORS_ORIGIN=
```

`GEMINI_API_KEY` may be empty. The backend still starts. If a user requests AI generation without a configured key, the bot replies:

```text
AI-генерация недоступна: не настроен GEMINI_API_KEY.
```

To run the bot in Telegram:

```env
TELEGRAM_BOT_ENABLED=true
TELEGRAM_BOT_TOKEN=<your-telegram-bot-token>
GEMINI_API_KEY=<your-google-api-key>
GEMINI_MODEL=gemini-2.0-flash
GEMINI_FALLBACK_MODEL=gemini-2.5-flash-lite
```

Secrets are read from env only and are not logged.

## Database

Models:

- `User`
- `UserSettings`
- `ProjectContext`
- `Artifact`
- `BotSession`

Seeded project contexts:

- `personal`
- `allur_finance`
- `nurbank_auto`
- `toolbox`

Run Prisma. The scripts load the root `.env` file explicitly:

```bash
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
```

## Run Locally

```bash
npm install
docker compose up -d postgres
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
npm run backend:dev
```

Health:

```bash
curl http://localhost:3000/health
curl http://localhost:3000/health/readiness
```

## Checks

```bash
npm run lint -w apps/backend
npm run backend:test
npm run backend:build
npm run backend:typecheck
DATABASE_URL='postgresql://postgres:postgres@localhost:5432/ba_copilot?schema=public' npx prisma validate --schema apps/backend/prisma/schema.prisma
```
