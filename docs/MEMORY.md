# Project Memory

> Purpose: To capture high-level context, "tribal knowledge", and philosophical alignments.

## 🧠 Core Beliefs
1. **Simplicity over Complexity**: We prefer a simple `docker-compose` over Kubernetes for this stage.
2. **Type Safety is Non-Negotiable**: If it's not in Zod/TypeScript, it doesn't exist.
3. **Mobile First (Logic)**: Most users will interact via Telegram (Mobile), so the API must be optimized for chat-based interactions (short text, fast response).

## 🚫 Things to Avoid
- **Microservices**: Keep it Monolithic (Modulith) for now. One API service.
- **ORM Magic**: Use Prisma, but be wary of N+1. Prefer `findMany` over loop queries.
- **Premature Optimization**: Don't shard the DB yet.

## 📝 Key Agreements
- All timestamps are stored in UTC.
- All IDs are UUID v4.
- We use `pnpm` exclusively.
