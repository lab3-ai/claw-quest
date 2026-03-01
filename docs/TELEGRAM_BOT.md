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
