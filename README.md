# AI Job Reviewer

AI-powered system for evaluating job candidates using Google Gemini, ChromaDB, and BullMQ.

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

### 3. Test the API

```bash
# Health check
curl http://localhost:3000/

# Upload CV
curl -X POST http://localhost:3000/upload \
  -F "file=@cv.pdf" \
  -F "type=cv"

# Upload Project Report
curl -X POST http://localhost:3000/upload \
  -F "file=@report.pdf" \
  -F "type=project_report"

# Start Evaluation
curl -X POST http://localhost:3000/evaluate \
  -H "Content-Type: application/json" \
  -d '{
    "job_title": "Frontend Developer",
    "cv_document_id": "uuid-from-upload",
    "report_document_id": "uuid-from-upload"
  }'

# Check Result
curl http://localhost:3000/result/{job-id}
```

## Project Structure

```
documents/          # Job descriptions (PDF)
  ├── backend_engineer/
  ├── frontend_engineer/
  └── data_analyst/
src/
  ├── server.ts     # API server
  ├── worker.ts     # Background worker
  ├── services/     # Business logic
  └── api/routes/   # API endpoints
```

### Quick Start

1. **Start all services:**
   ```bash
   docker compose up --build
   # or use the convenience script:
   ./start.sh
   ```

2. **Start in detached mode (background):**
   ```bash
   docker compose up -d
   ```

3. **Stop all services:**
   ```bash
   docker compose down
   ```

4. **View logs:**
   ```bash
   docker compose logs -f
   # or for specific service:
   docker compose logs -f api
   docker compose logs -f worker
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
