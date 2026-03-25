# Product Specification (MVP)

## 🎯 Goal
Ship a functional logic platform "ClawQuest" where "Humans" can own "Agents" that complete "Quests" via a Telegram interface and Web Dashboard.

## 👤 Personas
1. **Human / Owner**: The user. Owns agents, views progress, configures settings.
2. **Agent**: The digital entity. Has an identity, stats, and can be "activated" inside Telegram.
3. **Admin**: (Internal) System monitoring and global config.

## 📦 Scope & Features (MVP)

### 1. Authentication & Onboarding
- **Web**: Email, Google, or "Login with Telegram" (TBD in Decisions).
- **Bot**: `/start` command registers the Telegram account.
- **Linking**: Human generates an "Activation Code" on Web -> Enters it in Bot to link TG account to Human account.

### 2. Dashboard Features
- **Home**: List of registered agents.
- **Agent Detail**: View logs, current status, stats.
- **Quest Log**: See active and completed quests.
- **Create Agent**: Form to provision a new agent identity.

### 3. Telegram Bot Features
- **/start**: Welcome & Identify.
- **/link [code]**: Link TG user to Dashboard account.
- **/status**: Show current agent status.
- **/quest**: Trigger a demo quest/task.

### 4. Admin Features
- Basic user list.
- System health status.

## 🚫 Non-Goals (MVP)
- Creating custom quests via UI (hardcoded demo quests for MVP).
- Crypto/Wallet integration.
- Voice/Audio support.
- Complex multi-agent coordination.

## 📝 User Stories

### Story 1: The Setup
> As a Human, I want to create an account and register my first Agent so I can start using the platform.
> **Acceptance**: Sign up on Web -> Create Agent "ClawBot" -> See it in dashboard.

### Story 2: Activation
> As a Human, I want to link my Telegram to my Agent so I can interact with it on the go.
> **Acceptance**: Click "Connect Telegram" on Web -> Get Code "12345" -> DM Bot `/link 12345` -> Success message.

### Story 3: Questing
> As a Human, I want to send my agent on a quest so it gains XP.
> **Acceptance**: DM Bot `/quest explore` -> Bot replies "Exploring..." -> Wait 5s -> Bot replies "Found item!" -> Dashboard updates with result.

## 📅 Milestones

| Milestone | Deliverables | Est. Effort |
| :--- | :--- | :--- |
| **M0: Scaffold** | Repo setup, Docker, CI/CD pipeline | 1 session |
| **M1: Core DB** | Auth, User/Agent models, API base | 2 sessions |
| **M2: Dashboard** | Agent creation UI, Agent list | 2 sessions |
| **M3: Bot Link** | Telegram Bot setup, Activation flow | 2 sessions |
| **M4: Quest Loop** | Quest logic, Status updates, End-to-end flow | 3 sessions |
| **M5: Polish** | Rate limits, Audit logs, Deploy to Prod | 2 sessions |
