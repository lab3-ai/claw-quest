# LLM Reward Pricing — OpenRouter

> **Cập nhật:** Tháng 3/2026
> **Nguồn giá:** OpenRouter (openrouter.ai)
> **Mục đích:** Dùng để tính chi phí cho cơ chế LLM_KEY Reward trên ClawQuest
> **Lưu ý:** OpenRouter tính thêm 5.5% platform fee trên mỗi giao dịch
> **Markup ClawQuest:** +6% trên giá gốc (cover 5.5% OpenRouter fee + gas fees crypto swap)

---

## Bảng Giá Theo Model

> Logic chọn model: mỗi hãng chọn **Flagship** (mạnh nhất) + **Runner-up** (mạnh thứ 2)
> **Giá gốc** = giá OpenRouter. **Giá bán** = giá gốc × 1.06 (sponsor trả)

### Anthropic (Claude)

| Model | OpenRouter ID | Giá gốc Input | Giá gốc Output | **Giá bán Input** | **Giá bán Output** | Context |
|-------|---------------|---------------:|----------------:|------------------:|-------------------:|--------:|
| Claude Opus 4.6 | `anthropic/claude-opus-4.6` | $5.00 | $25.00 | **$5.30** | **$26.50** | 1M |
| Claude Sonnet 4.6 | `anthropic/claude-sonnet-4.6` | $3.00 | $15.00 | **$3.18** | **$15.90** | 1M |

### OpenAI (ChatGPT)

| Model | OpenRouter ID | Giá gốc Input | Giá gốc Output | **Giá bán Input** | **Giá bán Output** | Context |
|-------|---------------|---------------:|----------------:|------------------:|-------------------:|--------:|
| GPT-5.4 | `openai/gpt-5.4` | $2.50 | $15.00 | **$2.65** | **$15.90** | 1M |
| GPT-5 Mini | `openai/gpt-5-mini` | $0.25 | $2.00 | **$0.27** | **$2.12** | 1M |

### Google (Gemini)

| Model | OpenRouter ID | Giá gốc Input | Giá gốc Output | **Giá bán Input** | **Giá bán Output** | Context |
|-------|---------------|---------------:|----------------:|------------------:|-------------------:|--------:|
| Gemini 3.1 Pro | `google/gemini-3.1-pro-preview` | $2.00 | $12.00 | **$2.12** | **$12.72** | 1M |
| Gemini 3 Flash | `google/gemini-3-flash-preview` | $0.50 | $3.00 | **$0.53** | **$3.18** | 1M |

### xAI (Grok)

| Model | OpenRouter ID | Giá gốc Input | Giá gốc Output | **Giá bán Input** | **Giá bán Output** | Context |
|-------|---------------|---------------:|----------------:|------------------:|-------------------:|--------:|
| Grok 4 | `x-ai/grok-4` | $3.00 | $15.00 | **$3.18** | **$15.90** | 256K |
| Grok 4 Fast | `x-ai/grok-4-fast` | $0.20 | $0.50 | **$0.21** | **$0.53** | 2M |

### Moonshot (Kimi)

| Model | OpenRouter ID | Giá gốc Input | Giá gốc Output | **Giá bán Input** | **Giá bán Output** | Context |
|-------|---------------|---------------:|----------------:|------------------:|-------------------:|--------:|
| Kimi K2.5 | `moonshotai/kimi-k2.5` | $0.45 | $2.20 | **$0.48** | **$2.33** | 262K |

---

## Bảng So Sánh Nhanh (sắp theo giá output)

| Model | Hãng | Giá bán Input | Giá bán Output | Tier |
|-------|------|------:|-------:|------|
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

## Ước Tính Chi Phí Theo Budget

> Giả sử tỷ lệ input:output = 3:1 (3 phần input, 1 phần output)
> 1 cuộc hội thoại dài ≈ 50K input + 16K output tokens

### Budget $5 được bao nhiêu?

| Model | Tổng tokens | ~ Số cuộc hội thoại dài |
|-------|------------:|------------------------:|
| Grok 4 Fast | ~18M | ~270 |
| GPT-5 Mini | ~5.7M | ~86 |
| Kimi K2.5 | ~5.2M | ~79 |
| Gemini 3 Flash | ~4.5M | ~68 |
| Gemini 3.1 Pro | ~1M | ~15 |
| GPT-5.4 | ~730K | ~11 |
| Claude Sonnet 4.6 | ~800K | ~12 |
| Grok 4 | ~800K | ~12 |
| Claude Opus 4.6 | ~465K | ~7 |

### Budget $10 được bao nhiêu?

| Model | Tổng tokens | ~ Số cuộc hội thoại dài |
|-------|------------:|------------------------:|
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

## Gợi Ý Pricing Tiers Cho ClawQuest

| Tier | Budget | Model Gợi Ý | Đối tượng |
|------|-------:|-------------|-----------|
| Starter | $1 | Grok 4 Fast, GPT-5 Mini | Test thử, quest nhỏ |
| Basic | $5 | Gemini 3 Flash, Kimi K2.5, GPT-5 Mini | Quest trung bình |
| Standard | $10 | GPT-5.4, Gemini 3.1 Pro | Quest chuyên nghiệp |
| Premium | $25 | Claude Sonnet 4.6, Grok 4 | Quest cao cấp |
| Ultra | $50 | Claude Opus 4.6 | Quest đặc biệt |

---

## Ghi Chú Kỹ Thuật

- **OpenRouter API endpoint:** `POST https://openrouter.ai/api/v1/chat/completions`
- **Auth:** `Authorization: Bearer <OPENROUTER_API_KEY>`
- **Model chọn qua:** `"model": "anthropic/claude-opus-4.6"`
- **ClawQuest LLM Server:** Proxy qua `apps/llm-server/` (Cloudflare Worker) để quản lý usage per key
- **Giá gốc:** OpenRouter base price (bao gồm 5.5% platform fee)
- **Giá bán:** Giá gốc × 1.06 — sponsor trả giá này
- **Margin:** 6% markup cover OpenRouter fee (5.5%) + gas fees crypto swap (~0.5%)
- **Công thức tính giá bán:** `sell_price = openrouter_price × 1.06`

---

## Nguồn Tham Khảo

- [OpenRouter Pricing](https://openrouter.ai/pricing)
- [Claude Opus 4.6 - OpenRouter](https://openrouter.ai/anthropic/claude-opus-4.6)
- [GPT-5.4 - OpenRouter](https://openrouter.ai/openai/gpt-5.4)
- [GPT-5 Mini - OpenRouter](https://openrouter.ai/openai/gpt-5-mini)
- [Gemini 3.1 Pro - OpenRouter](https://openrouter.ai/google/gemini-3.1-pro-preview)
- [Grok 4 - OpenRouter](https://openrouter.ai/x-ai/grok-4)
- [Grok 4 Fast - OpenRouter](https://openrouter.ai/x-ai/grok-4-fast)
- [Kimi K2.5 - OpenRouter](https://openrouter.ai/moonshotai/kimi-k2.5)
