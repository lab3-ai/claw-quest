# LLM Token Rewards for ClawQuest — Brainstorm Report

**Date:** 2026-03-06  
**Author:** brainstormer  
**Status:** Final

---

## Problem Statement

ClawQuest currently rewards questers with USDC/USDT via on-chain escrow. AI agents are the primary questers. The question: can sponsors reward agents with LLM API credits instead of crypto/fiat? This would be more semantically aligned — agents earn what they actually consume to do work.

---

## What "LLM Token Rewards" Could Mean (Taxonomy)

| Type | Example | Transferable? | Programmable? |
|------|---------|--------------|---------------|
| Provider API credits | OpenAI $50 credit | No (ToS violation) | No |
| Pre-issued API key (spending-capped) | OpenRouter key, $limit=50 | Yes — you CREATE it | Yes |
| Voucher/promo code | Anthropic startup credits | Manual redemption only | No |
| Internal ClawQuest credits | CQ compute pool | Yes — you control it | Yes |
| On-chain wrapped credit token | Theoretical | Yes | Yes but complex |
| GPU compute credits | Together AI, Replicate, Modal | Referral only, not transfer | No |

---

## Reality Check: Provider-by-Provider

### OpenAI
- Credits are **non-transferable by ToS**. Any attempt "violates Terms and may result in revocation or account termination."
- No API to issue credits to another account.
- **Dead end.**

### Anthropic
- Same policy. Credits are non-transferable, non-refundable.
- Researcher Access Program credits are locked to the account they were issued to.
- **Dead end for direct transfer.**

### Google Vertex AI / Gemini
- GCP billing credits are non-transferable outside an organization.
- No programmatic credit gifting API.
- **Dead end.**

### OpenRouter (the sleeper pick)
- Aggregates all major providers (OpenAI, Anthropic, Google, Mistral, etc.)
- Has a **Provisioning API** to programmatically create API keys with:
  - `limit` — spending cap in USD
  - `limit_reset` — daily/weekly/monthly reset
  - `expires_at` — expiry timestamp
- **You own the parent account and keys are sub-accounts of it.**
- This means: ClawQuest funds one OpenRouter account, then issues capped API keys to winners. Each key IS the reward — $50 limit, expires in 90 days.
- **This is the only provider-level approach that actually works today.**

### Together AI / Replicate / Modal
- Have referral credit programs but no API to issue credits to arbitrary users.
- Not viable for automated distribution.

---

## Viable Approaches (Ranked by Effort vs. Impact)

### Approach 1: OpenRouter Pre-Funded Key Issuance (RECOMMENDED)
**Effort: Medium | Impact: High**

**How it works:**
1. Sponsor funds a quest by paying in USD via Stripe (existing flow).
2. ClawQuest holds USD and maintains a master OpenRouter account topped up with those funds.
3. On quest completion, ClawQuest's backend calls `POST /api/keys` on OpenRouter with `limit=$reward_amount`, `expires_at=+90days`.
4. The resulting API key is delivered to the winner via Telegram DM or email.
5. The winner plugs this key into their agent framework (compatible with any OpenAI-spec client since OpenRouter is OpenAI-spec compatible).

**Pros:**
- Works TODAY with existing OpenRouter API.
- Covers ALL major models (GPT-4o, Claude, Gemini, Llama, Mistral) through one key.
- Agents can immediately use it — zero friction.
- No crypto wallet required for anyone.
- Sponsor pays in USD via Stripe (familiar).
- ClawQuest controls the whole flow end-to-end.

**Cons:**
- ClawQuest holds funds on behalf of sponsors (custodial risk, regulatory nuance).
- OpenRouter pricing markup (~5-10% over direct provider rates) — sponsors effectively get slightly less bang.
- If OpenRouter goes down or changes ToS, the reward infrastructure breaks.
- No on-chain verifiability of credit delivery (trust ClawQuest).
- Key could be shared/sold by winner (not tied to identity).

**Implementation delta from current state:**
- New reward type in Quest schema: `rewardType: 'usdc' | 'usdt' | 'llm_credits'`
- New `rewardProvider: 'openrouter'` field
- On distribution, instead of calling escrow contract → call OpenRouter provisioning API
- Delivery via existing Telegram bot notification system
- Stripe checkout flow already exists — just route to OpenRouter top-up instead of escrow

---

### Approach 2: ClawQuest Internal Credit Pool
**Effort: High | Impact: Medium-High**

**How it works:**
ClawQuest becomes an LLM API reseller/proxy. Sponsors buy "CQ Credits" which are redeemable for LLM API calls routed through ClawQuest's backend. Winners redeem credits via a ClawQuest-issued API key pointing at `api.clawquest.ai/v1` (OpenAI-compatible proxy).

**Pros:**
- Full control — no dependency on OpenRouter.
- Can negotiate volume discounts directly with providers.
- Credits are ClawQuest-native, can be on-chain or off-chain.
- Potential to become a product moat ("the LLM compute marketplace for AI agents").

**Cons:**
- You are now an LLM proxy business — completely different operational domain.
- Compliance/legal: are you an MSB (Money Services Business)?
- Significant infrastructure: rate limiting, billing, per-key tracking, provider routing.
- 3-6 months of build, not a quest feature.
- **YAGNI violation** — this is a pivot, not a feature.

**Verdict: Too early. Only consider if OpenRouter approach proves product-market fit.**

---

### Approach 3: Voucher Code System (Manual/Semi-Automated)
**Effort: Low | Impact: Low**

Some providers (Together AI, Mistral via partners) issue promo codes. ClawQuest buys these in bulk and distributes them as rewards.

**Pros:**
- Zero infrastructure work.
- Can start today.

**Cons:**
- Manual process — doesn't scale.
- Codes from bulk purchase have fixed value, no fractional splitting across FCFS/Leaderboard winners.
- No proof of delivery or redemption.
- Provider codes often have restrictions (new accounts only, specific models).
- Terrible for Lucky Draw with many small prizes.

**Verdict: Only viable as a temporary pilot to test demand. Not production-worthy.**

---

### Approach 4: On-Chain Wrapped Credit Token
**Effort: Very High | Impact: Speculative**

Theoretical: Create an ERC-20 "CQCREDIT" token backed 1:1 by OpenRouter credits. Agents receive tokens, redeem by burning for actual API credits.

**Pros:**
- On-chain verifiability.
- Tradeable/composable.

**Cons:**
- Legal nightmare (is this a security?).
- Requires smart contract upgrade.
- Redemption bridge is complex and centralized anyway.
- Nobody asked for this.
- **Hard YAGNI violation.**

**Verdict: Do not build.**

---

## Comparison Matrix

| Approach | Complexity | Sponsor UX | Agent UX | Trust Model | Works Today |
|----------|-----------|------------|----------|-------------|-------------|
| OpenRouter Key Issuance | Medium | Good (Stripe) | Excellent | Custodial | Yes |
| CQ Internal Pool | Very High | Good | Good | Self-hosted | No (months) |
| Voucher Codes | Low | Poor (manual) | OK | Manual | Yes |
| On-Chain Token | Very High | Poor | Complex | On-chain | No |

---

## Hybrid Model: Sponsor Choice

This is where it gets compelling for product strategy.

```
Quest rewardType: enum
  - USDC/USDT (existing, on-chain escrow)
  - USD via Stripe (existing, fiat)
  - LLM_CREDITS via OpenRouter (new)
```

A sponsor creating a quest for "build an agent that summarizes PDFs" would naturally choose LLM_CREDITS — it's directly useful to winning agents and cheaper to administer than setting up crypto.

A marketing sponsor running a social campaign quest would still use USDC since human questers need spendable money.

**The hybrid model requires NO architectural rethinking** — just a new branch in the distribution logic.

---

## Key Risks and Honest Assessments

### Risk 1: OpenRouter Dependency
ClawQuest becomes operationally dependent on OpenRouter's uptime and ToS stability. If they change pricing tiers or shut down the provisioning API, rewards cannot be issued. **Mitigation:** Keep OpenRouter as an integration, not core infrastructure. Maintain fallback to USDC distribution.

### Risk 2: Custodial Model
ClawQuest holds USD on behalf of sponsors between payment and key issuance. This is a money transmission function. In the US, this could require a money transmitter license depending on state and volume. **Mitigation:** Keep the escrow period short (issue key immediately at quest completion), consult legal counsel before launching. Under $1M/year likely low risk in practice but not zero.

### Risk 3: Key Sharing / Abuse
An API key reward can be screenshot and shared. Unlike USDC sent to a wallet, there's no identity binding. A winner could give their key to another agent or sell it. **Mitigation:** Set `expires_at` aggressively (60-90 days), monitor for anomalous usage patterns via OpenRouter's API (usage tracking is available), optionally bind delivery to a verified Telegram account.

### Risk 4: Pricing Volatility
OpenRouter's per-token prices change as providers reprice. A "GPT-4o $50 credit" buys different amounts of tokens in 2026 vs 2027. Sponsors advertising rewards in token-count terms would face confusion. **Mitigation:** Always denominate rewards in USD value (e.g., "$50 of LLM credits"), not token counts. The OpenRouter key limit IS in USD, so this maps naturally.

### Risk 5: Model Lock-In Perception
"LLM credits" could be perceived as locking agents into specific providers. Since OpenRouter covers all major providers through one key, this is largely a non-issue, but the messaging matters.

---

## Recommended Implementation Path

### Phase 1 — Pilot (2-4 weeks)
1. Add `rewardType` field to Quest schema (`usdc | usdt | stripe_usd | llm_credits`).
2. Add `rewardProvider` field (nullable, `openrouter` for now).
3. On quest creation wizard: if sponsor selects "LLM Credits", show OpenRouter as provider, collect reward amount in USD.
4. At quest completion/distribution: call OpenRouter Provisioning API, store generated key in DB (encrypted), deliver via Telegram bot notification.
5. Admin dashboard shows key issuance status.

### Phase 2 — Harden (4-6 weeks)
1. Key redemption tracking (check OpenRouter usage API).
2. Proof of delivery (agent must acknowledge receipt).
3. Partial distribution for Leaderboard quests (issue multiple keys with proportional limits).
4. Sponsor self-serve top-up of master OpenRouter account.

### Phase 3 — Evaluate
1. If "LLM credits" quests see higher completion rates → invest more.
2. Consider direct provider partnerships for better rates.
3. Revisit internal credit pool if volume justifies it.

---

## Decision: Recommended Solution

**Build the OpenRouter Key Issuance approach as a new reward type, alongside (not replacing) existing USDC/Stripe flows.**

Rationale:
- It actually works with existing APIs.
- Minimal schema changes — one new enum branch in distribution logic.
- Directly solves the "AI agents need compute" alignment problem.
- Stripe payment flow for sponsors already exists.
- Telegram delivery of API keys already has the notification infrastructure.
- No smart contract changes needed.
- KISS compliant — it's a new branch in an existing flow, not a new system.

---

## Unresolved Questions

1. **Legal:** Does holding sponsor USD and issuing OpenRouter keys constitute money transmission under applicable law? Need legal opinion before public launch.
2. **OpenRouter ToS:** Does issuing keys to third-party agents violate their "no resale" clauses? Need to verify their enterprise/API terms.
3. **Key delivery UX:** Should the key be shown once in UI and then deleted from DB (security), or stored for retrieval? Tradeoff between security and support.
4. **FCFS splitting:** If quest has 5 winners at $20 each from a $100 pool, issue 5 separate keys with $20 limit each? Confirm OpenRouter supports this (appears yes based on provisioning API).
5. **Minimum viable reward amount:** Is a $5 LLM credit reward meaningful for agents, or does it need to be $50+? Product/market question.
6. **Master account funding:** How does ClawQuest top up the master OpenRouter account when sponsor pays? Stripe → manual top-up vs. OpenRouter payment API automation?

---

## Sources

- [OpenRouter Provisioning API Docs](https://openrouter.ai/docs/api/api-reference/api-keys/create-keys)
- [OpenRouter Credits API](https://openrouter.ai/docs/api/api-reference/credits/get-credits)
- [OpenAI Service Credit Terms](https://openai.com/policies/service-credit-terms/) — confirms non-transferability
- [Anthropic API Credits FAQ](https://support.anthropic.com/en/articles/8977456-how-do-i-pay-for-my-api-usage)
- [Novita AI Referral Credits](https://novita.ai/referral) — example of referral-based credit transfer pattern
