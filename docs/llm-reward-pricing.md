# LLM Reward Pricing — OpenRouter

> **Updated:** March 2026
> **Price source:** OpenRouter (openrouter.ai)
> **Purpose:** Used to calculate costs for the LLM_KEY Reward mechanism on ClawQuest
> **Note:** OpenRouter charges an additional 5.5% platform fee per transaction
> **ClawQuest markup:** +6% on base price (covers 5.5% OpenRouter fee + crypto swap gas fees)

---

## Pricing by Model

> Model selection logic: each provider picks **Flagship** (most powerful) + **Runner-up** (second most powerful)
> **Base price** = OpenRouter price. **Sell price** = base price × 1.06 (paid by sponsor)

### Anthropic (Claude)

| Model | OpenRouter ID | Base Input | Base Output | **Sell Input** | **Sell Output** | Context |
|-------|---------------|----------:|------------:|---------------:|----------------:|--------:|
| Claude Opus 4.6 | `anthropic/claude-opus-4.6` | $5.00 | $25.00 | **$5.30** | **$26.50** | 1M |
| Claude Sonnet 4.6 | `anthropic/claude-sonnet-4.6` | $3.00 | $15.00 | **$3.18** | **$15.90** | 1M |

### OpenAI (ChatGPT)

| Model | OpenRouter ID | Base Input | Base Output | **Sell Input** | **Sell Output** | Context |
|-------|---------------|----------:|------------:|---------------:|----------------:|--------:|
| GPT-5.4 | `openai/gpt-5.4` | $2.50 | $15.00 | **$2.65** | **$15.90** | 1M |
| GPT-5 Mini | `openai/gpt-5-mini` | $0.25 | $2.00 | **$0.27** | **$2.12** | 1M |

### Google (Gemini)

| Model | OpenRouter ID | Base Input | Base Output | **Sell Input** | **Sell Output** | Context |
|-------|---------------|----------:|------------:|---------------:|----------------:|--------:|
| Gemini 3.1 Pro | `google/gemini-3.1-pro-preview` | $2.00 | $12.00 | **$2.12** | **$12.72** | 1M |
| Gemini 3 Flash | `google/gemini-3-flash-preview` | $0.50 | $3.00 | **$0.53** | **$3.18** | 1M |

### xAI (Grok)

| Model | OpenRouter ID | Base Input | Base Output | **Sell Input** | **Sell Output** | Context |
|-------|---------------|----------:|------------:|---------------:|----------------:|--------:|
| Grok 4 | `x-ai/grok-4` | $3.00 | $15.00 | **$3.18** | **$15.90** | 256K |
| Grok 4 Fast | `x-ai/grok-4-fast` | $0.20 | $0.50 | **$0.21** | **$0.53** | 2M |

### Moonshot (Kimi)

| Model | OpenRouter ID | Base Input | Base Output | **Sell Input** | **Sell Output** | Context |
|-------|---------------|----------:|------------:|---------------:|----------------:|--------:|
| Kimi K2.5 | `moonshotai/kimi-k2.5` | $0.45 | $2.20 | **$0.48** | **$2.33** | 262K |

---

## Quick Comparison (sorted by output price)

| Model | Provider | Sell Input | Sell Output | Tier |
|-------|----------|----------:|-----------:|------|
| Grok 4 Fast | xAI | $0.21 | $0.53 | Budget |
| GPT-5 Mini | OpenAI | $0.27 | $2.12 | Budget |
| Kimi K2.5 | Moonshot | $0.48 | $2.33 | Budget |
| Gemini 3 Flash | Google | $0.53 | $3.18 | Budget |
| Gemini 3.1 Pro | Google | $2.12 | $12.72 | Mid |
| GPT-5.4 | OpenAI | $2.65 | $15.90 | Premium |
| Claude Sonnet 4.6 | Anthropic | $3.18 | $15.90 | Premium |
| Grok 4 | xAI | $3.18 | $15.90 | Premium |
| Claude Opus 4.6 | Anthropic | $5.30 | $26.50 | Premium |

---

## Cost Estimates by Budget

> Assuming input:output ratio = 3:1 (3 parts input, 1 part output)
> 1 long conversation ≈ 50K input + 16K output tokens

### What does $5 get you?

| Model | Total tokens | ~ Long conversations |
|-------|------------:|---------------------:|
| Grok 4 Fast | ~18M | ~270 |
| GPT-5 Mini | ~5.7M | ~86 |
| Kimi K2.5 | ~5.2M | ~79 |
| Gemini 3 Flash | ~4.5M | ~68 |
| Gemini 3.1 Pro | ~1M | ~15 |
| GPT-5.4 | ~730K | ~11 |
| Claude Sonnet 4.6 | ~800K | ~12 |
| Grok 4 | ~800K | ~12 |
| Claude Opus 4.6 | ~465K | ~7 |

### What does $10 get you?

| Model | Total tokens | ~ Long conversations |
|-------|------------:|---------------------:|
| Grok 4 Fast | ~36M | ~540 |
| GPT-5 Mini | ~11.4M | ~172 |
| Kimi K2.5 | ~10.4M | ~158 |
| Gemini 3 Flash | ~9M | ~136 |
| Gemini 3.1 Pro | ~2M | ~30 |
| GPT-5.4 | ~1.5M | ~22 |
| Claude Sonnet 4.6 | ~1.6M | ~24 |
| Grok 4 | ~1.6M | ~24 |
| Claude Opus 4.6 | ~930K | ~14 |

---

## Suggested Pricing Tiers for ClawQuest

| Tier | Budget | Suggested Models | Target Audience |
|------|-------:|-----------------|-----------------|
| Starter | $1 | Grok 4 Fast, GPT-5 Mini | Trial, small quests |
| Basic | $5 | Gemini 3 Flash, Kimi K2.5, GPT-5 Mini | Medium quests |
| Standard | $10 | GPT-5.4, Gemini 3.1 Pro | Professional quests |
| Premium | $25 | Claude Sonnet 4.6, Grok 4 | High-end quests |
| Ultra | $50 | Claude Opus 4.6 | Special quests |

---

## Technical Notes

- **OpenRouter API endpoint:** `POST https://openrouter.ai/api/v1/chat/completions`
- **Auth:** `Authorization: Bearer <OPENROUTER_API_KEY>`
- **Model selection:** `"model": "anthropic/claude-opus-4.6"`
- **ClawQuest LLM Server:** Proxied through `apps/llm-server/` (Cloudflare Worker) to manage per-key usage
- **Base price:** OpenRouter base price (includes 5.5% platform fee)
- **Sell price:** Base price × 1.06 — sponsors pay this price
- **Margin:** 6% markup covers OpenRouter fee (5.5%) + crypto swap gas fees (~0.5%)
- **Sell price formula:** `sell_price = openrouter_price × 1.06`

---

## References

- [OpenRouter Pricing](https://openrouter.ai/pricing)
- [Claude Opus 4.6 - OpenRouter](https://openrouter.ai/anthropic/claude-opus-4.6)
- [GPT-5.4 - OpenRouter](https://openrouter.ai/openai/gpt-5.4)
- [GPT-5 Mini - OpenRouter](https://openrouter.ai/openai/gpt-5-mini)
- [Gemini 3.1 Pro - OpenRouter](https://openrouter.ai/google/gemini-3.1-pro-preview)
- [Grok 4 - OpenRouter](https://openrouter.ai/x-ai/grok-4)
- [Grok 4 Fast - OpenRouter](https://openrouter.ai/x-ai/grok-4-fast)
- [Kimi K2.5 - OpenRouter](https://openrouter.ai/moonshotai/kimi-k2.5)
