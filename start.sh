#!/bin/bash

# AI Job Reviewer - Startup Script

echo "🚀 Starting AI Job Reviewer..."

# Check if .env exists
if [ ! -f .env ]; then
    echo "[ERROR] .env file not found"
    echo "[INFO] Creating .env from .env.example..."
    cp .env.example .env
    echo "[WARNING] Please edit .env and add your GEMINI_API_KEY"
    echo "[INFO] Then run this script again"
    exit 1
fi

# Check if GEMINI_API_KEY is set
if grep -q "your_gemini_api_key_here" .env; then
    echo "[WARNING] GEMINI_API_KEY not set in .env"
    echo "[INFO] Please add your actual API key to .env file"
    exit 1
fi

# Start services
echo "[INFO] Starting Docker containers..."
docker compose up -d --build

# Wait for PostgreSQL to be ready
echo "[INFO] Waiting for PostgreSQL to be ready..."
sleep 5

# Run database migrations
echo "[INFO] Running database migrations..."
docker compose exec -T api npx prisma migrate deploy

# Show logs
echo "[INFO] All services started successfully!"
echo ""
echo "[INFO] Following logs (Ctrl+C to stop logs, services will keep running)..."
docker compose logs -f

# If you want to run in background without logs, comment out the line above
