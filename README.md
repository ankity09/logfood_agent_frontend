# LogFood Agent Frontend

A full-stack Databricks App for managing sales use-case pipelines, meeting notes, and AI-powered chat — built with React, Express, and Databricks Lakebase.

## Architecture

```
┌────────────────────────────────────────────────────────────────────┐
│                          Databricks App                            │
│   ┌──────────────┐            ┌───────────────────────┐            │
│   │  React SPA   │────API────▶│    Express Server     │            │
│   │  (Vite+TS)   │            │    (server/index.js)  │            │
│   └──────────────┘            └─────┬─────────────────┘            │
└─────────────────────────────────────┼──────────────────────────────┘
                                      │        
      ┌───────────────────────────────▼────────────────────────────────────────┐
      │                               │                                        │
┌─────▼─────┐                  ┌──────▼──────┐                      ┌──────────▼──────────┐
│ Lakebase  │                  │Model Serving│                      │   LangGraph Agent   │
│ (Postgres)│                  ├─────────────┤                      └──────────┬──────────┘
└───────────┘                  │Claude Haiku │                                 │
                               │(Extraction) │         ┌───────────────────────▼───────────────────────┐
                               └─────────────┘         │                       │                       │
                                                 ┌─────▼─────┐          ┌──────▼──────┐         ┌──────▼──────┐
                                                 │  Genie    │          │UC Functions │         │Model Serving│
                                                 │  Space    │          │  (Tools)    │         ├─────────────┤
                                                 └─────┬─────┘          └─────────────┘         │ GPT-OSS-120B│
                                                       │                                        │ (Research)  │
                                                 ┌─────▼─────┐                                  └─────────────┘
                                                 │Delta Lake │
                                                 │ (Unity)   │
                                                 └───────────┘
```

- **Frontend**: React 18 + TypeScript + Tailwind CSS + Framer Motion
- **Backend**: Express.js serving the SPA and API routes
- **Database**: Databricks Lakebase (Postgres-compatible, autoscaling)
- **Research Agent**: LangGraph supervisor (GPT-OSS-120B) → Genie Space + UC Functions
- **AI Extraction**: Claude Haiku 4.5 for meeting notes extraction & Salesforce updates
- **Auth**: On-behalf-of-user via `X-Forwarded-Access-Token` (Databricks Apps)

## Pages

| Tab | Description |
|---|---|
| **Overview** | Dashboard with pipeline stats, stage counts, and recent activity |
| **Research Agent** | Full-featured AI chat with persistent conversation history, session management, and async processing |
| **Use Cases** | Filterable pipeline of sales use cases with stage/service/search filters and Go-Live view |
| **Accounts** | Account Central with metrics aggregation, stage distribution, and drill-down |
| **Meeting Notes** | Uploaded meeting notes with AI-extracted use cases, structured summaries, and confidence scoring |
| **Reports** | AI-generated reports (weekly, monthly, quarterly, use case summary, custom) |
| **Documentation** | Help, architecture overview, and feature documentation |

## Project Structure

```
├── app.yaml                  # Databricks App deployment config
├── package.json
├── index.html                # Vite entry point
├── vite.config.ts
├── tailwind.config.js
├── tsconfig.json
├── agent/                    # Research agent (LangGraph + MLflow)
│   ├── agent_dev.py          # Main agent module
│   ├── Logfood_Agent_Dev.ipynb        # Agent development notebook
│   └── Logfood_Agent_UC_tools.ipynb   # UC function tools notebook
├── genie_tables/             # Databricks Genie Space tables
│   ├── 01_dim_accounts.ipynb          # Account dimension
│   ├── 02_dim_use_cases.ipynb         # Use case dimension
│   ├── 03_fact_consumption_daily.ipynb
│   ├── 04_fact_consumption_weekly.ipynb
│   └── 05_fact_consumption_monthly.ipynb
├── db/
│   ├── migration.sql                  # Core schema DDL + seed data
│   ├── migration_v3_chat_sessions.sql # Chat persistence schema
│   ├── migration_v4_enhancements.sql  # Enhanced meeting notes, extracted use cases
│   ├── migration_v5_reports.sql       # Reports table
│   ├── migration_v6_pgvector.sql      # RAG embeddings (pgvector)
│   ├── seed.sql                       # Standalone seed data (idempotent)
│   └── seed_chat_sessions.sql         # Sample chat conversations
├── server/
│   ├── index.js              # Express server entry point
│   ├── config.js             # Centralized config (env vars)
│   ├── lakebase.js           # Lakebase Postgres routes (pg driver)
│   ├── routes/
│   │   ├── users.js          # User/AE endpoints
│   │   ├── reports.js        # Report generation endpoints
│   │   └── context-search.js # RAG search endpoints
│   ├── services/
│   │   ├── embedding.js      # Databricks GTE embedding service
│   │   └── context-indexer.js# Auto-indexing for RAG
│   └── prompts/
│       └── meeting-notes.js  # Enhanced extraction prompts
└── src/
    ├── App.tsx               # Main app with 7-tab routing
    ├── main.tsx
    ├── config/
    │   └── databricks.config.ts  # Frontend API config
    ├── context/
    │   └── NavigationContext.tsx # Cross-tab navigation state
    ├── components/
    │   ├── layout/           # Sidebar, header layout
    │   ├── dashboard/        # OverviewDashboard, AgentPage, UseCasesPage,
    │   │                     # AccountCentralPage, MeetingNotesPage, ReportsPage
    │   ├── chatbot/          # Chat interface components
    │   └── ui/               # Shared UI primitives
    └── styles/
```

## Database Schema

Ten tables in Lakebase (`databricks_postgres`):

| Table | Description |
|---|---|
| `accounts` | Customer companies |
| `users` | Internal team members / owners |
| `use_cases` | Core pipeline entity with stage, value, services, stakeholders |
| `meeting_notes` | Uploaded meeting documents with summaries, structured_summary JSONB |
| `extracted_use_cases` | AI-extracted use cases with extraction_type, confidence_score |
| `activities` | Activity feed (meetings, use-case changes, notes) |
| `chat_sessions` | Conversation threads with user, title, timestamps |
| `chat_messages` | Individual messages with role, content, status, and metadata |
| `reports` | AI-generated reports (weekly, monthly, quarterly, custom) |
| `context_embeddings` | RAG embeddings with pgvector (optional) |

Use-case stages: `validating` → `scoping` → `evaluating` → `confirming` → `onboarding` → `live`

Message status: `pending` → `processing` → `completed` (or `failed`)

Extraction types: `new` (new use case) | `update` (update to existing)

## Research Agent

The research/chat functionality is powered by a LangGraph multi-agent supervisor deployed to Databricks Model Serving.

**Architecture:**
- **Foundation Model**: `databricks-gpt-oss-120b` (NOT Claude Haiku - that's for extraction)
- **Genie Integration**: Queries Delta tables (`ankit_yadav.demo.*`) for consumption analytics
- **UC Function Tools**:
  - `get_accounts_by_account_executive` - Account lookup by AE
  - `get_account_summaries` - AI-powered account analysis
  - `get_live_date_follow_up_messages` - Generate follow-up messages

**Middleware Stack:**
- `TodoListMiddleware` - Task planning with write_todos/read_todos
- `FilesystemMiddleware` - Virtual filesystem, auto-evicts large results
- `SummarizationMiddleware` - Token-aware context management
- `PatchToolCallsMiddleware` - Handles dangling tool calls

**Deployment**: MLflow `ResponsesAgent` wrapper → Model Serving endpoint

## Chat Session Persistence

The Research Agent page features full conversation persistence with async processing:

**Features:**
- **Session Management**: Create, rename, delete, and switch between up to 30 conversations
- **Message Persistence**: All user and assistant messages saved to Lakebase
- **Async Processing**: Backend processes AI responses in background, frontend polls for completion
- **Session Restoration**: Last session automatically restored on page reload
- **Status Tracking**: Messages track status (pending → processing → completed/failed)

**Flow:**
1. User sends message → `POST /api/chat-sessions/:id/chat`
2. Backend saves user message (completed) + assistant placeholder (processing)
3. Backend returns HTTP 202 with message IDs
4. Frontend polls `GET /api/chat-messages/:id/status` every 2 seconds
5. Backend processes AI in background, updates assistant message
6. Frontend detects completion, updates UI, stops polling

**Resilience**: If user navigates away during processing, polling resumes on return.

## Genie Space Tables

Delta tables in `ankit_yadav.demo.*` power the Genie analytics:

| Table | Description |
|-------|-------------|
| `dim_accounts` | Account dimension (5 accounts aligned with Lakebase) |
| `dim_use_cases` | Use case dimension (10 use cases aligned with Lakebase) |
| `fact_consumption_daily` | Daily consumption metrics (90 days) |
| `fact_consumption_weekly` | Weekly aggregated consumption |
| `fact_consumption_monthly` | Monthly aggregated consumption |

Run notebooks in `genie_tables/` in order (01-05) to populate.

## Prerequisites

- Node.js 18+
- A Databricks workspace with:
  - A **Lakebase Autoscaling** instance
  - **Model Serving** endpoints (Claude Haiku for extraction, LangGraph agent for chat)
  - A **Databricks App** configured with on-behalf-of-user auth

## New Workspace Setup (Complete Checklist)

If you're setting up on a new Databricks workspace:

### 1. Create Lakebase Instance
```
Workspace → Data → Databases → Create → Lakebase Autoscaling
```
Note the **Postgres host** (e.g., `ep-xxx.database.us-east-1.cloud.databricks.com`)

### 2. Run Database Migrations
Connect to Lakebase and run migrations in order:
```sql
-- Run each file in order via SQL Editor or psql:
-- 1. db/migration.sql
-- 2. db/migration_v3_chat_sessions.sql
-- 3. db/migration_v4_enhancements.sql
-- 4. db/migration_v5_reports.sql
-- 5. db/migration_v6_pgvector.sql (optional - requires pgvector)
```

### 3. Set Up Model Serving Endpoints
You need these endpoints:
| Endpoint | Model | Purpose |
|----------|-------|---------|
| `databricks-claude-haiku-4-5` | Claude Haiku 4.5 | Meeting notes extraction, Salesforce updates, Report generation |
| `agents_ankit_yadav-demo-logfood_agent_dev` | LangGraph Agent | Research chat (with Genie + UC tools) |
| `databricks-gte-large-en` | GTE-Large | Embeddings for RAG (optional) |

### 4. Update `app.yaml`
Update with your workspace values:
```yaml
env:
  - name: DATABRICKS_HOST
    value: https://YOUR-WORKSPACE.cloud.databricks.com
  - name: DATABRICKS_AGENT_ENDPOINT
    value: YOUR_AGENT_ENDPOINT_NAME
  - name: DATABRICKS_CLAUDE_ENDPOINT
    value: databricks-claude-haiku-4-5
  - name: LAKEBASE_PG_HOST
    value: YOUR-LAKEBASE-HOST.database.us-east-1.cloud.databricks.com
  - name: LAKEBASE_PG_DATABASE
    value: databricks_postgres
  - name: LAKEBASE_PG_USER
    value: your.email@databricks.com
```

### 5. Create Databricks App
```
Workspace → Compute → Apps → Create App
- Source: GitHub repo
- Branch: main
- Enable: "On behalf of user" authentication
```

### 6. (Optional) Set Up Genie Space
For consumption analytics, run notebooks in `genie_tables/` in order (01-05) to create Delta tables, then create a Genie Space pointing to them.

### 7. (Optional) Deploy LangGraph Agent
Run `agent/Logfood_Agent_Dev.ipynb` to deploy the research agent to Model Serving.

## Local Development

```bash
# Install dependencies
npm install

# Set environment variables (or use defaults in server/config.js)
export DATABRICKS_HOST=https://your-workspace.cloud.databricks.com
export DATABRICKS_TOKEN=your-pat-token
export LAKEBASE_PG_HOST=your-lakebase-host.database.us-east-1.cloud.databricks.com
export LAKEBASE_PG_DATABASE=databricks_postgres
export LAKEBASE_PG_USER=your.email@databricks.com

# Run frontend dev server (hot reload)
npm run dev

# Run backend server (separate terminal)
npm run dev:server
```

## Database Setup

1. Create a Lakebase Autoscaling instance in your Databricks workspace.
2. Run the migrations **in order** to create tables:
   ```bash
   # Connection string format
   CONN="postgresql://user@host:5432/databricks_postgres?sslmode=require"

   # Core tables (v1)
   psql "$CONN" -f db/migration.sql

   # Chat session tables (v3)
   psql "$CONN" -f db/migration_v3_chat_sessions.sql

   # Enhanced fields for meeting notes, extracted use cases (v4)
   psql "$CONN" -f db/migration_v4_enhancements.sql

   # Reports table (v5)
   psql "$CONN" -f db/migration_v5_reports.sql

   # RAG embeddings with pgvector (v6) - OPTIONAL, requires pgvector extension
   psql "$CONN" -f db/migration_v6_pgvector.sql
   ```
   Or paste the contents into the Lakebase SQL editor.

3. Optionally seed with sample data:
   ```bash
   psql "$CONN" -f db/seed.sql                # Core sample data
   psql "$CONN" -f db/seed_chat_sessions.sql  # Sample conversations
   ```

### Migration Summary

| Migration | Description |
|-----------|-------------|
| `migration.sql` | Core tables: accounts, users, use_cases, meeting_notes, extracted_use_cases, activities |
| `migration_v3_chat_sessions.sql` | Chat persistence: chat_sessions, chat_messages |
| `migration_v4_enhancements.sql` | Enhanced fields: structured_summary, confidence_score, extraction_type |
| `migration_v5_reports.sql` | Reports table for AI-generated reports |
| `migration_v6_pgvector.sql` | RAG: context_embeddings with pgvector (requires extension) |

## Building for Production

```bash
npm run build
```

This compiles TypeScript and builds the Vite frontend into `dist/`. The Express server serves these static files in production.

## Deploying to Databricks Apps

1. Push to your Git repository.
2. In the Databricks workspace, create or update a Databricks App pointing to this repo.
3. Configure `app.yaml` environment variables as needed.
4. The app runs `node server/index.js` which serves both the API and the built frontend.

### `app.yaml` Environment Variables

| Variable | Description |
|---|---|
| `DATABRICKS_HOST` | Databricks workspace URL |
| `DATABRICKS_CHAT_ENDPOINT` | Model Serving endpoint name for chat |
| `LAKEBASE_PG_HOST` | Lakebase Postgres wire-protocol host |
| `LAKEBASE_PG_DATABASE` | Database name (default: `databricks_postgres`) |
| `LAKEBASE_PG_USER` | Databricks identity used for Postgres auth |

## API Endpoints

### Core APIs

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/health` | Health check |
| `GET` | `/api/user` | Current user info |
| `POST` | `/api/auth/dashboard-token` | Get token for dashboard embedding |
| `GET` | `/api/stats` | Aggregated dashboard stats |

### Use Cases & Accounts

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/use-cases` | List use cases (filters: `stage`, `service`, `date`, `search`) |
| `GET` | `/api/use-cases/:id` | Get single use case |
| `POST` | `/api/use-cases` | Create use case |
| `PATCH` | `/api/use-cases/:id` | Update use case |
| `DELETE` | `/api/use-cases/:id` | Delete use case |
| `GET` | `/api/accounts` | List accounts |
| `POST` | `/api/accounts` | Create account |
| `GET` | `/api/users` | List users/AEs with stats |
| `GET` | `/api/users/:id` | Get user details with use cases |

### Meeting Notes & AI Extraction

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/meeting-notes` | List meeting notes with extracted use cases |
| `POST` | `/api/meeting-notes` | Create meeting note |
| `PATCH` | `/api/meeting-notes/:id` | Update meeting note (structured_summary, etc.) |
| `POST` | `/api/extracted-use-cases` | Save AI-extracted use case |
| `PATCH` | `/api/extracted-use-cases/:id` | Update extracted use case (link to existing) |
| `POST` | `/api/extract-use-cases` | AI extraction from raw notes (Claude Haiku) |
| `POST` | `/api/generate-update` | Generate Salesforce update from notes (Claude Haiku) |

### Reports (AI-Generated)

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/reports` | List user's reports |
| `POST` | `/api/reports` | Generate new report (types: weekly, monthly, quarterly, use_case_summary, custom) |
| `GET` | `/api/reports/:id` | Get report with full content |
| `DELETE` | `/api/reports/:id` | Delete report |

### Context Search (RAG)

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/context-search` | Semantic search over embeddings |
| `GET` | `/api/context-search/stats` | Get embedding statistics |

### Activities

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/activities` | Recent activities (query: `limit`) |
| `POST` | `/api/activities` | Create activity |

### Chat Sessions (Persistent Conversations)

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/chat-sessions` | List user's sessions (max 30, most recent first) |
| `POST` | `/api/chat-sessions` | Create new session |
| `GET` | `/api/chat-sessions/:id` | Get session with all messages |
| `PATCH` | `/api/chat-sessions/:id` | Update session title |
| `DELETE` | `/api/chat-sessions/:id` | Delete session (cascades to messages) |
| `POST` | `/api/chat-sessions/:id/chat` | Send message & get AI response (async) |

### Chat Messages

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/chat-sessions/:id/messages` | Add message to session |
| `GET` | `/api/chat-messages/:id/status` | Poll for message completion status |
| `PATCH` | `/api/chat-messages/:id` | Update message content/status |

### Legacy Chat (Non-persistent)

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/chat` | Chat with AI (single response) |
| `POST` | `/api/chat/stream` | Streaming chat with SSE |

## Lakebase Connection Details

The backend connects to Lakebase using the **Postgres wire protocol** via the `pg` npm package. Each API request creates a fresh `pg.Client` connection using the user's OAuth token as the Postgres password. This approach:

- Bypasses the PostgREST Data API (which requires `SET ROLE` not supported in Apps)
- Uses on-behalf-of-user auth for per-user access control
- Creates per-request connections to avoid stale token issues with connection pooling

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript, Tailwind CSS, Framer Motion, Lucide Icons |
| Backend | Express.js, Node.js |
| Database | Databricks Lakebase (PostgreSQL-compatible) |
| DB Driver | `pg` (node-postgres) |
| AI Agent | LangGraph, MLflow ResponsesAgent, databricks-langchain |
| Analytics | Databricks Genie Space, Delta Lake, Unity Catalog |
| Research Agent | LangGraph + GPT-OSS-120B (Model Serving) |
| AI Extraction | Claude Haiku 4.5 (Model Serving) |
| Build | Vite |
| Deployment | Databricks Apps, Model Serving |
