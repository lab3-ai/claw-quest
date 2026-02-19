# ClawQuest (CQ) - Mission Control

ClawQuest is an end-to-end platform for managing and deploying autonomous agents with a Telegram bot interface and a rich web dashboard.

## 🚀 Vision
To ship a stable, testable, and production-ready MVP that enables users to register, manage, and interact with agents via Telegram and a web dashboard.

## 📚 Documentation Map

| Doc | Purpose |
| :--- | :--- |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | High-level system design, data flows, and tech stack choices. |
| [PRODUCT_SPEC.md](./PRODUCT_SPEC.md) | MVP scope, user stories, and acceptance criteria. |
| [API.md](./API.md) | API reference, endpoints, and authentication. |
| [DB_SCHEMA.md](./DB_SCHEMA.md) | Database schema, models, and migration strategy. |
| [DOMAIN_MODEL.md](./DOMAIN_MODEL.md) | Core entities and business logic relationships. |
| [TELEGRAM_BOT.md](./TELEGRAM_BOT.md) | Bot commands, flows, and integration details. |
| [SECURITY.md](./SECURITY.md) | Threat model, sec controls, and best practices. |
| [DEPLOYMENT.md](./DEPLOYMENT.md) | Infrastructure and deployment guides. |
| [LOCAL_DEV.md](./LOCAL_DEV.md) | Local development setup and commands. |
| [RUNBOOKS.md](./RUNBOOKS.md) | Operational guides for incidents and maintenance. |
| [DECISIONS.md](./DECISIONS.md) | ADRs and key technical decisions. |
| [GLOSSARY.md](./GLOSSARY.md) | Project terminology. |
| [CONTRIBUTING.md](./CONTRIBUTING.md) | Dev workflow and standards. |

## 🏗 System Status
- **Status**: Initialization Phase
- **Current Version**: v0.1.0-alpha
- **Latest Milestone**: M0 (Repo Scaffold)

## 🎯 Quick Start
(See [LOCAL_DEV.md](./LOCAL_DEV.md) for full details)

```bash
# Clone and install
git clone <repo>
pnpm install

# Start infrastructure
docker-compose up -d

# Run everything
pnpm dev
```
