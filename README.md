# AI Job Screening Reviewer

AI-powered backend service that automates initial screening of job applications by evaluating candidate CVs and project reports against job descriptions and scoring rubrics using Google Gemini, ChromaDB (RAG), and BullMQ (async processing).


### ✅ Core Requirements
- **RESTful API Endpoints:** POST /upload, POST /evaluate, GET /result/{id}
- **RAG System:** ChromaDB + Gemini embeddings with job-title-scoped document retrieval
- **LLM Chaining:** 5-step pipeline (Parse CV → Evaluate CV → Parse Project → Evaluate Project → Final Summary)
- **Async Processing:** BullMQ job queue with immediate job ID return
- **Error Handling:** Retry logic, exponential backoff, timeout handling, rate limit detection
- **Structured Evaluation:** cv_match_rate (0-100%), project_score (1-5), detailed feedback

### 🚀 Tech Stack
- **Backend:** Node.js + Express + TypeScript
- **LLM:** Google Gemini 2.0 Flash (JSON mode, structured outputs)
- **Vector DB:** ChromaDB (document embeddings + retrieval)
- **Queue:** BullMQ + Redis (async job processing)
- **Database:** PostgreSQL + Prisma ORM
- **Deployment:** Docker Compose (5 services, auto-migrations)
- **Logging:** Winston (structured JSON logs)

### 📚 Documentation
- **[README.md](README.md)** - Setup and API guide (this file)
- **[APPROACH_AND_DESIGN.md](APPROACH_AND_DESIGN.md)** - Complete architecture explanation, design decisions, prompt engineering strategies

## Quick Start

### 1. Setup

```bash
# Clone and navigate
cd ai-job-reviewer

# Copy environment file
cp .env.example .env

# Add your Gemini API key to .env
GEMINI_API_KEY=your_actual_api_key_here
```

### 2. Run with Docker

```bash
# Option 1: Use the start script (recommended)
./start.sh

# Option 2: Manual start
docker compose up -d --build
```

This starts:
- PostgreSQL (localhost:5432)
- Redis (localhost:6379)
- ChromaDB (localhost:8000)
- API Server (localhost:3000)
- Worker Process

**Note:** Database migrations run automatically when the containers start.

## Project Structure

```
documents/                    # Internal job documents (ingested into RAG)
  ├── backend_engineer_2025/
  │   ├── job_description.pdf
  │   ├── case_study_brief.pdf
  │   └── scoring_rubric.pdf
  └── frontend_engineer_2025/
      ├── job_description.pdf
      ├── case_study_brief.pdf
      └── scoring_rubric.pdf

src/
  ├── server.ts              # Express API server
  ├── worker.ts              # BullMQ background worker
  ├── api/
  │   ├── routes/           # API endpoints (upload, evaluate, result)
  │   └── middlewares/      # Multer file upload middleware
  ├── services/
  │   ├── evaluation.services.ts  # Main evaluation orchestration
  │   ├── llm.services.ts         # LLM interaction (Gemini)
  │   └── rag.services.ts         # ChromaDB + embeddings
  ├── jobs/
  │   ├── evaluation-queue.ts     # BullMQ queue setup
  │   └── evaluation-worker.ts    # Job processor with retry logic
  ├── prompts/                     # LLM prompts (CV, project, summary)
  ├── schemas/                     # JSON schemas for validation
  └── utils/                       # Shared utilities (logger, PDF extraction, etc.)

prisma/
  └── schema.prisma          # Database schema (PostgreSQL)
```

## Environment Variables

Required in `.env`:
- `GEMINI_API_KEY` - Get from https://aistudio.google.com/

## API Endpoints

- `POST /upload` - Upload CV or project report
- `POST /evaluate` - Start evaluation job
- `GET /result/:jobId` - Get evaluation result

## Troubleshooting

**Worker not processing?**
```bash
docker compose logs -f worker
docker compose restart worker
```

**Database issues?**
```bash
docker compose down -v
docker compose up -d --build
```

**Check queue status:**
```bash
docker compose exec redis redis-cli
> KEYS *
```

**Manually run migrations (if needed):**
```bash
docker compose exec api npx prisma migrate deploy
```

**Prisma binary issues on macOS/Linux:**
If you see "Query Engine not found" errors, regenerate Prisma client with both platforms:
```bash
npx prisma generate
```

## Development

```bash
# Run locally (without Docker)
npm install
npx prisma generate  # Generate Prisma client
npx prisma migrate dev
npm run dev          # Terminal 1: API server
npm run worker       # Terminal 2: Background worker
```
