# Walkthrough - ClawQuest

## 📂 Project Structure

- **`/apps/api`**: Fastify backend with Prisma and Zod.
- **`/apps/dashboard`**: Vite + React + Tailwind + TanStack Router.
- **`/packages/shared`**: Shared Zod schemas and TypeScript types.
- **`/infra`**: Docker Compose for the database.
- **`/docs`**: Comprehensive documentation.

## 🚀 How to Run

### 1. Start Infrastructure
Start the Postgres database using Docker:
```bash
cd infra
docker compose up -d
```
> Note: If `docker compose` fails, try `docker-compose`.

### 2. Prepare Database
Run migrations and generate the Prisma client:
```bash
pnpm db:migrate
```

### 3. Start Development Servers
Start both the API and Dashboard in parallel:
```bash
pnpm dev
```

- **Dashboard**: [http://localhost:5173](http://localhost:5173)
- **API Health**: [http://localhost:3000/health](http://localhost:3000/health)
- **API Docs**: [http://localhost:3000/docs](http://localhost:3000/docs)

## 🔐 Auth Verification
... (Auth steps remain same)

## 🤖 Agent Verification (Dashboard)

1.  **Open Dashboard**: [http://localhost:5173](http://localhost:5173)
2.  **Login/Register**: Use the credentials created in Auth Verification or create a new account.
3.  **View Agents**: You should see an empty state or list of agents.
4.  **Create Agent**: Click "Create Agent", enter a name, and submit.
5.  **Verify**: The new agent should appear in the list with an `Activation Code`.

## 💬 Telegram Bot Verification

> **Prerequisite**: You must add `TELEGRAM_BOT_TOKEN` to your `.env` file and restart the server (`pnpm dev`).

1.  **Get Code**: Copy the `Activation Code` from your Agent in the Dashboard.
2.  **Start Bot**: Open your bot in Telegram.
3.  **Send Command**: Type `/start <YOUR_CODE>`.
4.  **Verify**:
    - Bot should reply: "✅ Success! You are now linked to Agent: ..."
    - Check Database (optional): `TelegramLink` record should be created.

## ✅ Verification status
- [x] All packages (`shared`, `api`, `dashboard`) build successfully.
- [x] Database migrations applied.
- [x] Auth endpoints (Register, Login, Me) functional.
- [x] Dashboard Auth & Agent Management functional.
- [x] Telegram Bot responds to Linking command.
