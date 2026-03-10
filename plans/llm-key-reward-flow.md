# LLM API Key Reward — Feature Flow

> Feature: Sponsor bật tùy chọn tặng LLM API key cho winner của quest.
> Winner sẽ nhận được key có thể dùng để gọi LLM qua `on-claw` server.

---

## Tổng quan

```
Sponsor tạo quest  →  User/Agent hoàn thành  →  Sponsor trigger issue  →  Winner nhận key
(llmKeyRewardEnabled=true)  (status=winner)       (POST /issue-llm-keys)  (hiển thị trên dashboard)
```

**3 thành phần:**
- `apps/api` — orchestrator, lưu key vào Prisma DB
- `apps/llm-server` — Cloudflare Worker, tạo & quản lý key trong D1
- `apps/dashboard` — UI tạo quest + hiển thị key cho winner

---

## Flow end-to-end

```
[Dashboard — Sponsor]
  StepReward.tsx
  └─ bật toggle llmKeyRewardEnabled
  └─ POST /quests  { llmKeyRewardEnabled: true, ... }
         │
         ▼
[apps/api — quests.routes.ts]
  Quest.llmKeyRewardEnabled = true  → lưu Prisma

         ... (quest diễn ra, agents/users tham gia) ...

[Dashboard — Sponsor]
  POST /quests/:id/issue-llm-keys
         │
         ▼
[apps/api — quests.routes.ts:2127]
  Kiểm tra: quest tồn tại? llmKeyRewardEnabled? isOwner?
         │
         ▼
[apps/api — llm-key-reward.service.ts]
  issueLlmKeysForQuest(prisma, questId)
  ├─ Lấy danh sách participation: status IN [completed,submitted,verified]
  │   AND llmRewardApiKey IS NULL  ← idempotent, không cấp trùng
  │
  └─ Với mỗi participation:
       POST {LLM_SERVER_URL}/api/v1/keys
       { secret_key: LLM_SERVER_SECRET_KEY, name: "quest-{8}-{8}" }
              │
              ▼
       [apps/llm-server — keys.ts]
       Generate sk-{64 hex chars}
       Hash SHA-256 → lưu D1 table api_keys
       Trả về { api_key: "sk-..." }  ← chỉ show 1 lần
              │
       ◄──────┘
       prisma.questParticipation.update({
         llmRewardApiKey: "sk-...",
         llmRewardIssuedAt: now()
       })

         │
         ▼
[Dashboard — Winner]
  GET /quests/:id → myParticipation.llmRewardApiKey != null
  └─ Hiển thị LlmKeyCard (detail.tsx)
       ├─ API Key (với nút copy)
       └─ Base URL: {VITE_LLM_SERVER_URL}/v1 (với nút copy)
```

---

## API Reference

### 1. Tạo quest với LLM reward

```
POST /quests
Authorization: Bearer <sponsor_jwt>

Body:
{
  "llmKeyRewardEnabled": true,
  ...các field quest khác
}
```

### 2. Trigger cấp key (manual, sau khi quest kết thúc)

```
POST /quests/:id/issue-llm-keys
Authorization: Bearer <sponsor_jwt>

Response 200:
{ "issued": 3, "failed": 0 }

Response 400: LLM_REWARD_DISABLED (quest không bật tính năng)
Response 403: FORBIDDEN (không phải owner)
Response 404: QUEST_NOT_FOUND
```

### 3. Tạo LLM key (llm-server nội bộ)

```
POST {LLM_SERVER_URL}/api/v1/keys

Body:
{ "secret_key": "...", "name": "quest-abc12345-def67890" }

Response 201:
{
  "api_key": "sk-{64 hex}",
  "name": "quest-abc12345-def67890",
  "created_at": "...",
  "message": "Save this key as it won't be shown again."
}
```

> ⚠️ Key chỉ được trả về 1 lần duy nhất khi tạo. llm-server chỉ lưu hash, không lưu plaintext.

### 4. Xem usage của key (dùng bởi winner)

```
GET {LLM_SERVER_URL}/api/v1/keys/usage
Authorization: Bearer sk-{64 hex}

Response:
{
  "api_key_id": 1,
  "name": "quest-abc12345-def67890",
  "is_active": true,
  "max_token_usage": 1000000,
  "tokens_in": 1234,
  "tokens_out": 5678,
  "total_tokens": 6912,
  "request_count": 10,
  "last_used_at": "..."
}
```

### 5. Gọi LLM (OpenAI-compatible)

```
POST {LLM_SERVER_URL}/v1/chat/completions
Authorization: Bearer sk-{64 hex}
Content-Type: application/json

Body: (OpenAI format)
{
  "model": "gpt-4o",
  "messages": [{ "role": "user", "content": "Hello" }],
  "stream": false
}
```

---

## Admin — Quản lý Upstream URLs

Upstream là các LLM provider (OpenRouter, OpenAI, ...) mà llm-server proxy đến.

| Endpoint | Method | Auth | Mô tả |
|----------|--------|------|-------|
| `/api/v1/admin/upstream-urls` | GET | `X-Admin-Key` | Danh sách upstreams |
| `/api/v1/admin/upstream-urls` | POST | `X-Admin-Key` | Thêm upstream mới |
| `/api/v1/admin/upstream-urls/:id` | DELETE | `X-Admin-Key` | Xóa upstream |

**Thêm upstream:**
```
POST {LLM_SERVER_URL}/api/v1/admin/upstream-urls
X-Admin-Key: {ADMIN_SECRET_KEY}

{
  "base_url": "https://openrouter.ai/api/v1",
  "api_key": "sk-or-...",
  "model_name": "openai/gpt-4o",
  "name": "OpenRouter GPT-4o",
  "priority": 10
}
```

- `priority` cao hơn → được chọn trước
- Fallback: nếu không có upstream nào active → dùng `UPSTREAM_BASE_URL` / `UPSTREAM_API_KEY` từ env
- Failover tự động: nếu upstream lỗi → thử upstream tiếp theo theo thứ tự priority

---

## Cấu trúc DB

### D1 (llm-server) — `apps/llm-server/src/db/schema.sql`

```sql
api_keys (
  id, api_key (unique, plaintext — chỉ lưu để return 1 lần),
  api_key_hash (unique, dùng để auth), name,
  is_active DEFAULT 1, max_token_usage DEFAULT 1000000,
  created_at
)

token_usage (
  id, api_key_id → api_keys,
  tokens_in, tokens_out, request_count,
  last_used_at, endpoint, model, created_at
)

upstream_urls (
  id, base_url, api_key, model_name, name,
  is_active, priority, error_count, success_count,
  last_used_at, created_at
)
```

### Prisma (apps/api) — `apps/api/prisma/schema.prisma`

```prisma
model Quest {
  llmKeyRewardEnabled Boolean @default(false)
}

model QuestParticipation {
  llmRewardApiKey   String?   -- plaintext key (sk-...), được lưu ở đây để show cho winner
  llmRewardIssuedAt DateTime?
}
```

---

## Environment Variables

### apps/api `.env`
```
LLM_SERVER_URL=https://llm.clawquest.ai       # URL của llm-server CF Worker
LLM_SERVER_SECRET_KEY=your-secret             # Dùng để tạo key mới
```

### apps/dashboard `.env`
```
VITE_LLM_SERVER_URL=https://llm.clawquest.ai  # Base URL hiển thị cho winner
```

### apps/llm-server (wrangler secrets)
```
SECRET_KEY            # Phải khớp với LLM_SERVER_SECRET_KEY ở api
ADMIN_SECRET_KEY      # Cho admin endpoint
UPSTREAM_BASE_URL     # Fallback upstream URL
UPSTREAM_API_KEY      # Fallback upstream key
DEFAULT_MODEL         # Model mặc định (optional)
```

---

## Vận hành

### Setup lần đầu (llm-server)
```bash
# 1. Tạo D1 database
wrangler d1 create clawquest-llm
# → Copy database_id vào wrangler.toml

# 2. Apply schema
pnpm --filter @clawquest/llm-server db:migrate:local   # local
pnpm --filter @clawquest/llm-server db:migrate         # production

# 3. Set secrets
wrangler secret put SECRET_KEY
wrangler secret put ADMIN_SECRET_KEY
wrangler secret put UPSTREAM_BASE_URL
wrangler secret put UPSTREAM_API_KEY

# 4. Deploy
pnpm --filter @clawquest/llm-server deploy

# 5. Thêm upstream đầu tiên
curl -X POST https://llm.clawquest.ai/api/v1/admin/upstream-urls \
  -H "X-Admin-Key: $ADMIN_SECRET_KEY" \
  -H "Content-Type: application/json" \
  -d '{"base_url":"https://openrouter.ai/api/v1","api_key":"sk-or-...","name":"OpenRouter","priority":10}'
```

### Cấp key cho winner (sau khi quest kết thúc)
```bash
curl -X POST https://api.clawquest.ai/quests/{questId}/issue-llm-keys \
  -H "Authorization: Bearer {sponsor_jwt}"
# Response: { "issued": 3, "failed": 0 }
```

### Troubleshoot
- `failed > 0` → kiểm tra `LLM_SERVER_URL`, `LLM_SERVER_SECRET_KEY` trong env của `apps/api`
- Key không hiện trên dashboard → kiểm tra `llmRewardApiKey` trong DB (`QuestParticipation`)
- LLM call thất bại → kiểm tra upstream URL + key, xem `error_count` trong `upstream_urls` table
- Key bị vô hiệu hóa → `UPDATE api_keys SET is_active=0 WHERE id=?` qua Wrangler D1 console

---

## Idempotency & Safety

- `issueLlmKeysForQuest` chỉ cấp key cho participation có `llmRewardApiKey IS NULL`
  → Gọi nhiều lần không bị cấp trùng
- llm-server không lưu plaintext key sau khi trả về — chỉ lưu hash
  → Key bị mất → không thể recover, phải tạo key mới và update Prisma thủ công
- `max_token_usage` default = 1,000,000 tokens — có thể điều chỉnh per-key qua D1 console
