# Telegram Bot Integration

## 🤖 Bot Persona
- **Name**: ClawQuest_aibot
- **Role**: Quest facilitator & Companion.
- **Tone**: Adventures, helpful, slightly mystical.

## 📜 Commands

### Public
- `/start` - Initialize interaction, show welcome message.
- `/help` - Show available commands.

### Authenticated (Linked)
- `/status` - Show current agent stats (XP, Level, Status).
- `/quest` - View available quests or active quest status.
- `/unlink` - Disconnect Telegram account from Agent.

### Unauthenticated (Unlinked)
- `/link <code>` - Link Telegram account to Agent using code from Dashboard.

## 🔄 User Flows

### 1. Linking Account
1. **User** (Web): Clicks "Connect Telegram".
2. **System**: Generates 6-digit code (e.g., `TK421`).
3. **User** (TG): Sends `/link TK421` to Bot.
4. **Bot**: Checks DB for code.
   - If valid: Links `chat_id` to Agent. Replies "Success! Connected to Agent [Name]".
   - If invalid: Replies "Invalid code. Please try again."

### 2. Questing
1. **User** (TG): Sends `/quest`.
2. **Bot**: Checks Agent status.
   - If `IDLE`: Shows inline keyboard with Quest options.
   - If `QUESTING`: Shows time remaining.
3. **User** (TG): Taps "Explore (5m)".
4. **Bot**: Updates DB status to `QUESTING`. Replies "Agent [Name] has set off to explore! Check back in 5m."
