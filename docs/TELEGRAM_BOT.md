# Telegram Bot Integration

## 🤖 Bot Persona

- **Name**: ClawQuest_aibot
- **Role**: Quest facilitator & Companion.
- **Tone**: Adventures, helpful, slightly mystical.

## 📜 Commands

### Registration & Linking

- `/start <CODE>` - Link agent by activation code from dashboard
- `/register` - Conversational multi-step agent registration (platform, name, avatar, skills)

### Quest Management

- `/quests` - List available quests (paginated)
- `/accept <questId>` - Accept a quest
- `/done` - Mark active quest complete
- `/cancel` - Cancel active quest

### Information

- `/status` - Show linked agents & active quest progress
- `/help` - List all commands
- `/about` - Knowledge base (expandable inline topics: agents, quests, types, registration)

### Session Storage

- `/register` uses in-memory session store keyed by Telegram user ID
- Sessions persist during bot lifetime (cleared on restart)

## 🔄 User Flows

### 1. Registration (Conversational)

1. **User**: `/register`
2. **Bot**: "Choose platform (OpenClaw/Claude Code/ChatGPT/Cursor)" — inline buttons
3. **User**: Taps platform
4. **Bot**: "Agent name?" — awaits text input
5. **User**: Types name
6. **Bot**: "Avatar (URL or skip)?" — text + skip button
7. **User**: Submits avatar or skips
8. **Bot**: "Install these skills:" [skill list] "Done?" — done button
9. **User**: Taps done
10. **Bot**: Confirms agent created, saves to DB

### 2. Linking by Code

1. **User** (Dashboard): Copies activation code from My Agents
2. **User** (Telegram): `/start <CODE>`
3. **Bot**: Validates code, creates TelegramLink, shows "Linked to Agent [Name]"

### 3. Questing

1. **User**: `/quests`
2. **Bot**: Shows paginated quest list with /accept buttons
3. **User**: `/accept <questId>`
4. **Bot**: Confirms quest started, shows task checklist
5. **User**: `/done` → marks complete
6. **User**: `/cancel` → abandons quest

### 4. Status Check

1. **User**: `/status`
2. **Bot**: Shows linked agents (platform, name), active quest progress (X/Y tasks), time left

### 5. Waitlist join (web → Telegram)

1. **User** (Waitlist page): Clicks "Join via Telegram" → frontend calls `POST /waitlist/token`, then opens `t.me/ClawQuest_aibot?start=wl_<accessToken>`.
2. **User** (Telegram): Opens bot, sends `/start wl_<token>` (automatic from deep link).
3. **Bot**: `handleWaitlistJoinByToken` finds pending entry by `accessToken`, sets `telegramId` and **position** (rank = count of already-joined + 1), recalculates effectivePosition, replies with position + referral link.
4. **Frontend**: Polls `GET /waitlist/me?token=<accessToken>` every 3s until `joined: true`, then shows success modal.

**Numbering**: Position and effectivePosition are assigned only when the user has joined via Telegram. Pending entries (token created but bot not opened) keep position 0 and are not counted in the waitlist rank or in `waitlistCount` stats.

## Production: bot không trả lời khi ấn "Join via Telegram"

Bot dùng **polling** (getUpdates), không dùng webhook. Nếu bot không trả lời trên production, kiểm tra:

1. **`TELEGRAM_BOT_TOKEN`** có set trong env production (Railway) chưa. Thiếu → server log "Missing TELEGRAM_BOT_TOKEN", bot không start.
2. **Webhook cũ**: Nếu từng gọi `setWebhook` (test/script khác), Telegram chỉ gửi update vào URL đó; polling không nhận gì. Khi start, API gọi `deleteWebhook` để xóa webhook → sau deploy mới polling nhận bình thường.
3. **Polling lỗi**: Log "Telegram bot polling failed" → kiểm tra network/firewall từ server tới `api.telegram.org`.
4. **Dashboard API URL**: Production build cần `VITE_API_URL` trỏ đúng API. Sai thì `POST /waitlist/token` có thể fail → fallback mở `?start=waitlist`; bot vẫn nên trả lời. Nếu bot hoàn toàn không reply → thường do (1)–(3).
