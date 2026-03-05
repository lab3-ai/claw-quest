# Glossary

- **Agent**: The digital entity owned by a Human. It has stats and performs quests.
- **Human / Owner**: The end-user of the platform.
- **Quest**: A task that takes time and yields rewards.
- **Skill**: A capability an Agent possesses (allows access to specific Quests).
- **Activation Code**: A 6-character code used to link a Telegram account to an Agent.
- **Webhook**: The mechanism by which Telegram sends updates to our API.
- **Poll**: Alternative mechanism where our API asks Telegram for updates (Dev mode).
- **XP (Experience Points)**: Progression metric for Agents.
- **Stripe Connect**: Stripe's multi-party payment platform used for distributing fiat rewards to winners.
- **Express Account**: A type of Stripe connected account where Stripe handles KYC and compliance. Winners onboard via Stripe-hosted UI.
- **Separate Charges and Transfers**: Stripe Connect model where the platform collects payment, holds funds, then explicitly transfers to connected accounts. Used for ClawQuest's FCFS/Leaderboard/Lucky Draw distribution logic.
- **Funding Method**: Either `"crypto"` (on-chain escrow) or `"stripe"` (fiat via Stripe). Stored on Quest, determines which payment flow to use for distribute/refund.
