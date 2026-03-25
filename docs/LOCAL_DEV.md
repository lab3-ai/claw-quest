# Local Development Setup

## 🛠 Prerequisites
- Node.js 20+
- Docker & Docker Compose
- pnpm (`npm i -g pnpm`)

## 🚀 Quick Start

1. **Clone Repo**
   ```bash
   git clone <repo_url>
   cd clawquest
   pnpm install
   ```

2. **Environment Setup**
   Copy `.env.example` to `.env` in root (or per app if preferred).
   ```bash
   cp apps/api/.env.example apps/api/.env
   cp apps/dashboard/.env.example apps/dashboard/.env
   ```

3. **Start Infrastructure (DB)**
   ```bash
   cd infra
   docker-compose up -d
   ```

4. **Initialize Database**
   ```bash
   pnpm db:migrate
   pnpm db:seed
   ```
   *(Scripts defined in root package.json)*

5. **Run Development Servers**
   ```bash
   pnpm dev
   ```
   - Dashboard: http://localhost:5173
   - API: http://localhost:3000

## 🤖 Bot Development Local
1. Use `ngrok` to expose your local API:
   ```bash
   ngrok http 3000
   ```
2. Update your Telegram Bot Webhook to the ngrok URL:
   ```bash
   curl -F "url=https://<ngrok-id>.ngrok.io/webhooks/telegram" https://api.telegram.org/bot<TOKEN>/setWebhook
   ```

## 🧪 Testing
- **Unit**: `pnpm test`
- **E2E**: `pnpm test:e2e` (Playwright)
