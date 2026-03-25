# Deployment Guide

## 🏗 Strategies

### 1. Frontend (Dashboard)
- **Target**: Vercel
- **Build Command**: `pnpm build`
- **Output Directory**: `dist`
- **Environment Variables**:
    - `VITE_API_URL`: URL of the deployed API (e.g., `https://api.clawquest.xyz`)

### 2. Backend (API + Bot)
- **Target**: Railway / Fly.io / Render (Any usage of Dockerfile)
- **Service Type**: Web Service (Always-on)
- **Build Command**: `docker build -t api .`
- **Start Command**: `docker run api` (or `node dist/main.js`)
- **Environment Variables**:
    - `DATABASE_URL`: Connection string to Supabase transaction pool.
    - `JWT_SECRET`: Random 32-char string.
    - `TELEGRAM_BOT_TOKEN`: From BotFather.
    - `FRONTEND_URL`: `https://dashboard.clawquest.xyz` (for CORS).

### 3. Database
- **Target**: Supabase
- **Migrations**:
    - **CI/CD**: `prisma migrate deploy` on deployment pipeline.
    - **Manual**: `npx prisma migrate deploy` locally pointing to prod DB URL.

## 🚀 Pipeline (GitHub Actions or Native)

### Stage 1: Check
- Lint + Type Check (`pnpm typecheck`).
- Unit Tests (`pnpm test`).

### Stage 2: Build & Push
- Build Docker image for API.
- Push to Registry (GitHub Container Registry / Railway).

### Stage 3: Deploy
- Update service on Railway/Fly to use new image.
- Trigger Vercel deployment hook (usually automatic on push).
