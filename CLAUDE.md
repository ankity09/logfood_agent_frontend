# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

LogFood Agent Frontend is a full-stack Databricks App for managing sales use-case pipelines, meeting notes, and AI-powered chat. Built with React SPA frontend, Express backend, Databricks Lakebase (Postgres) database, and Claude Haiku 4.5 AI integration.

## Commands

```bash
npm run dev         # Start frontend dev server (Vite, port 3000)
npm run dev:server  # Start backend Express server (port 8000)
npm run build       # Compile TypeScript + build Vite to dist/
npm run lint        # Run ESLint
npm start           # Run backend in production
```

For local development, run both servers in separate terminals.

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                   Databricks App                    │
│  ┌──────────────┐        ┌───────────────────────┐  │
│  │  React SPA   │──API──▶│    Express Server     │  │
│  │  (Vite+TS)   │        │    (server/index.js)  │  │
│  └──────────────┘        └───┬──────────┬────────┘  │
└──────────────────────────────┼──────────┼───────────┘
                    ┌──────────▼──┐  ┌────▼──────────────┐
                    │  Lakebase   │  │ Model Serving      │
                    │  (Postgres) │  │ (Chat Endpoint)    │
                    └─────────────┘  └────────────────────┘
```

**Frontend:** React 18 + TypeScript + Tailwind CSS + Framer Motion
**Backend:** Express.js serving SPA and API routes
**Database:** Databricks Lakebase (Postgres-compatible)
**AI Agents:** Two Model Serving endpoints:
  - Multi-agent supervisor (Genie tables + deep research) for Chat UI & Agent Tab
  - Claude Haiku 4.5 for meeting notes extraction & Salesforce updates
**Auth:** On-behalf-of-user via `X-Forwarded-Access-Token` header

## Key Directories

- `src/` - React frontend
  - `App.tsx` - Main app with 5-tab routing (Overview, Agent, Use Cases, Meeting Notes, Docs)
  - `components/dashboard/` - Page components
  - `components/chatbot/` - Floating chat widget
  - `context/ThemeContext.tsx` - Dark/light mode state
  - `config/databricks.config.ts` - API endpoints and UI labels
- `server/` - Express backend
  - `index.js` - Main server with auth, chat proxy, AI extraction
  - `config.js` - Environment variable configuration
  - `lakebase.js` - Postgres data routes
- `db/` - Database schema
  - `migration.sql` - Create tables (accounts, users, use_cases, meeting_notes, extracted_use_cases, activities)
  - `seed.sql` - Sample data

## Key Patterns

**State Management:** React Context for theme, component-level useState for UI state. No Redux.

**API Calls:** Fetch API with JSON bodies. Token passed via `X-Forwarded-Access-Token` header (Databricks Apps auto-injects).

**Database Access:** Per-request Postgres connections using user's OAuth token as password. Parameterized queries.

**Chat:** Server-Side Events (SSE) for streaming. Message history accumulated client-side. System prompts for specialized tasks.

**UI:** Glass-morphism cards, neon color scheme (#00E599 green, #00D4FF blue), Framer Motion animations, dark/light mode via class strategy.

## Database Schema

Six tables in Lakebase: `accounts`, `users`, `use_cases`, `meeting_notes`, `extracted_use_cases`, `activities`

Use-case stages: `validating` → `scoping` → `evaluating` → `confirming` → `onboarding` → `live`

## Environment Variables

**Databricks:**
- `DATABRICKS_HOST` - Workspace URL
- `DATABRICKS_TOKEN` - PAT token (local dev)

**Model Serving Endpoints:**
- `DATABRICKS_AGENT_ENDPOINT` - Multi-agent endpoint for Chat UI & Agent Tab (default: `agents_ankit_yadav-demo-logfood_agent_dev`)
- `DATABRICKS_CLAUDE_ENDPOINT` - Claude endpoint for extraction & updates (default: `databricks-claude-haiku-4-5`)
- `DATABRICKS_CHAT_ENDPOINT` - Legacy fallback (deprecated)

**Lakebase:**
- `LAKEBASE_PG_HOST` - Postgres host
- `LAKEBASE_PG_DATABASE` - Database name (default: databricks_postgres)
- `LAKEBASE_PG_USER` - Databricks identity

## Adding a New Page

1. Create component in `src/components/dashboard/NewPage.tsx`
2. Import in `src/App.tsx`
3. Add tab object to `tabs` array
4. Add case to `renderPage()` switch statement

## Adding a New API Route

1. Add route in `server/lakebase.js` (for data) or `server/index.js` (for AI/auth)
2. Add endpoint definition in `src/config/databricks.config.ts`
