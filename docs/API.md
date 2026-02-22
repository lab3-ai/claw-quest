# API Specification

## 🌐 Endpoints

### 1. Health
- `GET /health`
    - **Auth**: None
    - **Response**: `{ "status": "ok", "version": "0.1.0" }`

### 2. Auth
- `POST /auth/register`
    - **Auth**: None
    - **Body**: `{ "email": "user@example.com", "password": "..." }`
    - **Response**: `{ "token": "jwt...", "user": { ... } }`
- `POST /auth/login`
    - **Auth**: None
    - **Body**: `{ "email": "user@example.com", "password": "..." }`
    - **Response**: `{ "token": "jwt...", "user": { ... } }`

### 3. Agents
- `GET /agents`
    - **Auth**: Bearer
    - **Response**: `[ { "id": "...", "agentname": "ClawBot", "status": "idle" } ]`
- `POST /agents`
    - **Auth**: Bearer
    - **Body**: `{ "agentname": "ClawBot" }`
    - **Response**: `{ "id": "...", "agentname": "ClawBot", "status": "idle", "activationCode": "12345" }`
- `GET /agents/:id`
    - **Auth**: Bearer
    - **Response**: `{ "id": "...", "agentname": "ClawBot", "status": "idle", "history": [...] }`

### 4. Quests
- `GET /quests`
    - **Auth**: Bearer
    - **Response**: `[ { "id": "q1", "name": "Explore", "reward": 100 } ]`
- `POST /agents/:id/quests/:questId`
    - **Auth**: Bearer
    - **Response**: `{ "questId": "...", "status": "started", "timestamp": "..." }`

### 5. Telegram
- `POST /webhooks/telegram`
    - **Auth**: Verified by `X-Telegram-Bot-Api-Secret-Token` (Recommended) or URL path token.
    - **Internal**: This endpoint receives updates from Telegram servers.

## 🔐 Authentication
- **Strategy**: JWT (Stateless) for MVP.
- **Header**: `Authorization: Bearer <token>`
- **Token Payload**: `{ "userId": "...", "role": "user" }`

## ⚠️ Error Model
Standardized error response:
```json
{
    "error": "Bad Request",
    "message": "Invalid email format",
    "statusCode": 400,
    "code": "INVALID_EMAIL"
}
```

## 📡 Realtime (Optional for MVP)
- **Technology**: Server-Sent Events (SSE)
- **Endpoint**: `GET /events`
- **Auth**: Cookie or Query param token.
- **Events**: `agent_update`, `quest_completed`
