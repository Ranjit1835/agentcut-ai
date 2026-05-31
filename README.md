# AgentCut AI

> **Production-grade multi-agent AI SaaS for intelligent video editing.**
> Upload any long-form video, and AgentCut's agent pipeline automatically transcribes, identifies viral moments, cuts clips, applies captions, and delivers ready-to-post short-form content.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        AgentCut AI Monorepo                     │
├────────────────────┬────────────────────┬───────────────────────┤
│   apps/frontend    │  apps/ai-backend   │  packages/shared-types│
│   Next.js 14       │  FastAPI + LangGraph│  TypeScript contracts │
│   App Router       │  Multi-agent graph │                       │
│   Tailwind CSS     │  Anthropic Claude  │                       │
│   Supabase Auth    │  Groq Whisper      │                       │
└────────────────────┴────────────────────┴───────────────────────┘
         │                    │
         ▼                    ▼
   Supabase DB          Cloudflare R2
   (Postgres +         (Video Storage)
    Realtime)
         │                    │
         └────────────────────┘
                   │
          Inngest (Job Queue)
          LangSmith (Tracing)
          Sentry (Errors)
          PostHog (Analytics)
          Polar.sh (Billing)
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14 (App Router), TypeScript, Tailwind CSS |
| UI Components | Radix UI, shadcn/ui, Framer Motion |
| State Management | Zustand, TanStack Query |
| Auth & Database | Supabase (Postgres + Auth + Realtime) |
| AI Backend | FastAPI, LangGraph, Anthropic Claude 3.5, Groq |
| Video Processing | FFmpeg, yt-dlp, MediaPipe |
| Storage | Cloudflare R2 |
| Job Queue | Inngest |
| Observability | LangSmith, Sentry, PostHog |
| Billing | Polar.sh |
| Monorepo | Turborepo |
| CI/CD | GitHub Actions |

## Agent Pipeline

```
Video Input
    │
    ▼
[Ingestion Agent] → Download + extract audio + generate thumbnails
    │
    ▼
[Transcription Agent] → Groq Whisper → word-level timestamps + speaker diarization
    │
    ▼
[Analysis Agent] → Claude 3.5 → identify viral moments, hooks, narrative arcs
    │
    ▼
[Clip Selector Agent] → Score + rank clips by virality (0-100)
    │
    ▼
[Caption Agent] → Generate styled subtitles with emphasis markers
    │
    ▼
[B-Roll Agent] → Detect relevant B-roll insertion points
    │
    ▼
[Render Agent] → FFmpeg render with captions, aspect ratios, watermarks
    │
    ▼
[Quality Agent] → Validate output + fallback retry logic
```

## Project Structure

```
agentcut-ai/
├── apps/
│   ├── frontend/           # Next.js 14 App Router
│   │   ├── app/            # App Router pages & layouts
│   │   ├── components/     # React components
│   │   ├── lib/            # Utilities, Supabase clients
│   │   └── ...
│   └── ai-backend/         # Python FastAPI + LangGraph
│       ├── app/
│       │   ├── agents/     # Individual agent implementations
│       │   ├── graph/      # LangGraph workflow definitions
│       │   ├── api/        # REST API routers
│       │   ├── models/     # Pydantic models
│       │   ├── services/   # Business logic services
│       │   ├── jobs/       # Inngest background jobs
│       │   └── observability/ # LangSmith + Sentry setup
│       └── ...
├── packages/
│   └── shared-types/       # Shared TypeScript types
├── infra/
│   └── supabase/
│       ├── migrations/     # SQL schema migrations
│       └── seed.sql        # Development seed data
└── .github/
    └── workflows/          # GitHub Actions CI/CD
```

## Getting Started

### Prerequisites

- Node.js >= 20
- Python >= 3.11
- Docker & Docker Compose
- Supabase CLI (`npm install -g supabase`)
- FFmpeg installed on your system

### 1. Clone & Install

```bash
git clone https://github.com/your-org/agentcut-ai.git
cd agentcut-ai
npm install
```

### 2. Environment Setup

```bash
cp .env.example .env.local
# Fill in all required values in .env.local
```

### 3. Database Setup

```bash
# Start local Supabase
supabase start

# Apply migrations
supabase db push

# Seed development data
supabase db reset
```

### 4. Python Backend Setup

```bash
cd apps/ai-backend
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -e ".[dev]"
```

### 5. Start Development

```bash
# From repo root — starts all services
npm run dev

# Or with Docker
docker-compose up
```

Frontend: http://localhost:3000
Backend API: http://localhost:8000
API Docs: http://localhost:8000/docs

## Key Features

- **Multi-agent pipeline** — Specialized agents for each step of video processing
- **Viral moment detection** — Claude 3.5 analyzes transcripts for hooks, stories, and high-engagement moments
- **Automated captions** — Word-level synchronized captions with style presets
- **Style presets** — Multiple visual styles (bold captions, minimal, branded)
- **Real-time progress** — WebSocket updates for live pipeline status
- **Feedback loop** — Natural language feedback re-runs specific agents
- **Brand kits** — Custom logos, colors, watermarks per user
- **Multi-currency billing** — Polar.sh with credit-based usage metering

## License

Proprietary — All rights reserved. © 2024 AgentCut AI.
