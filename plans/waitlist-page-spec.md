# ClawQuest Waitlist Page Spec

> Cho team Design. Chỉ brief flow, content, tính năng. Không brief UI/UX.
> **Updated:** Copy reviewed & improved using AIDA/PAS/4Us frameworks. A/B test variants ở cuối.

---

## Concept

Một trang duy nhất. Không tabs, không sub-pages. Scroll xuống là thấy hết. Mục tiêu: người đọc hiểu ClawQuest làm gì trong 10 giây, nhập email trong 30 giây.

**Target audiences:** Skill Publishers (primary monetization) + Agent Owners (supply side). Copy phải nói được với cả hai, nhưng hero section ưu tiên publisher vì họ là người trả tiền.

---

## Page Structure (từ trên xuống dưới)

### 1. Hero

**Headline:**
"Stop Paying for Installs That Vanish"

> Rationale: PAS (solution-first). 6 từ, dưới 10-word threshold. Action verb "Stop" tạo urgency. Speaks to publisher pain point trực tiếp. 4Us score: Urgent ✓ Useful ✓ Ultra-specific ✓ Unique (partial).

**Sub-headline:**
"Post a quest. Real agents use your skill. Get on-chain proof of 30-day retention. Pay only for results."

> Rationale: 22 từ (giảm từ 31). 4 câu ngắn mirrors How It Works flow. Mỗi câu = 1 benefit rõ ràng. "You"-focused (implicit). Eliminates confusing "We pay agents" phrasing.

**CTA:** Email input + **"Claim Your Spot"** button

> Rationale: Scarcity framing. "Claim" = ownership + urgency (CTA pattern: Action + Benefit). First-person alternative for A/B: "Reserve My Early Access".

**Urgency line dưới CTA:**
"Only [X] early access spots remain"

> Rationale: "Only" + "remain" tạo urgency mạnh hơn "left". Shorter, more direct.

**Trust indicator dưới urgency (NEW):**
"Join [X]+ skill publishers and agent owners already in line"

> Rationale: Social proof near CTA = CRO principle #8. Mentions cả 2 audiences.

### 2. Problem (2 cột hoặc 2 khối đặt cạnh nhau)

**Section header (NEW):** "Sound familiar?"

> Rationale: Question headline drives engagement. Transitions from hero pain point.

**Cột trái: "Without ClawQuest"**
- You pay per install — most get deleted within 48 hours
- Zero visibility into actual usage
- No way to prove retention to investors or partners
- Budget burned on vanity metrics
- Agents game installs for rewards, then vanish

> Rationale: Mỗi bullet cụ thể hơn (specificity > vague claims). "48 hours" = ultra-specific. "Investors or partners" = emotional agitation cho publishers. "Vanity metrics" = familiar pain term.

**Cột phải: "With ClawQuest"**
- You pay for verified, on-chain skill usage
- Agents complete real tasks — every action is logged
- 7, 14, 30-day retention reports you can share
- Transparent proof for investors, partners, and your team
- Only pay when agents actually deliver results

> Rationale: Mirrors left column point-by-point. "You can share" = actionable benefit. "Investors, partners, and your team" = expanded audience cho social proof.

### 3. How It Works (3 bước, 1 dòng mỗi bước)

**Section header:** "Three steps. Real results."

1. **Post a quest.** Define your skill, set the task, choose the reward.
2. **Agents get to work.** Real agents use your skill to complete tasks. Every action verified on-chain.
3. **Track what sticks.** Get retention data at 7, 14, and 30 days. Pay only for results.

> Changes: Step 2 "compete" → "get to work" (accurate cho FCFS/Lucky Draw, không chỉ Leaderboard). Step 3 "See who stays" → "Track what sticks" (more active, dual-audience friendly — publishers track retention, agent owners track earnings potential).

### 4. Social Proof (3 con số lớn trên 1 hàng)

[X] skills in catalog | [X] agents active | [X]% avg 30-day retention

> Note: Khi có real data, dùng specific numbers. Nếu chưa có, dùng "Growing" thay vì fake numbers. CRO principle #24: specificity > vague claims. Fake numbers destroy trust (conversion-psychology principle).

### 5. Early Access Tiers

**Section header:** "Your position unlocks your tier"

> Rationale: "Unlocks" = gamification language, phù hợp quest platform identity. More active than "determines".

| Position | Tier | Perks |
|----------|------|-------|
| Top 100 | OG Pioneer | Lifetime reduced fees + OG badge |
| Top 500 | Early Publisher | 50% off first campaign |
| Top 1,000 | Beta Tester | Day-1 access + priority support |

**Progress bar:** "[X] / 1,000 spots claimed"

> Rationale: Table format dễ scan hơn list. Progress bar visual hơn text.

### 6. CTA lặp lại

Lặp lại email form giống hero. Dòng trên CTA:

"Don't wait for launch day. The best spots are filling up."

> Rationale: Loss aversion ("Don't wait") + scarcity ("filling up"). CRO principle #9: cognitive bias stack.

Dòng dưới CTA:
"Join [X]+ people already on the waitlist."

### 7. Footer

Links: Twitter/X, Telegram, GitHub, Docs.

---

## Post-Signup Flow

Sau khi nhập email, hiện trên cùng trang (thay chỗ form):

**Bước 1: Chọn role**

"One quick question — what brings you here?"

Button A: "I build AI skills" → tag as Publisher
Button B: "I run AI agents" → tag as Agent Owner

> Rationale: Giữ nguyên — simple, clear binary choice. Em dash thay comma cho flow tốt hơn.

**Bước 2: Confirmation**

"You're #[X] in line."

"Share your link to move up. Each signup you refer = 10 spots closer to the front."

> Rationale: Rephrased for clarity. "10 spots closer to the front" = concrete benefit framing thay vì "Move up 10 spots" (abstract).

Hiện referral link + nút Copy.

Nút "Share on X" (pre-filled tweet, xem bên dưới).
Nút "Share on Telegram" (pre-filled message, xem bên dưới).

---

## Share Templates

### Cho Skill Publishers (X):

"Most AI skill installs get deleted within 48 hours. No usage data. No retention proof.

@ClawQuest fixes this — post a quest, get on-chain verified retention data at 7, 14, and 30 days.

Early access is limited to 1,000 spots.

[link]"

> Changes: Hook cụ thể hơn ("48 hours" thay vì "next day"). Thêm data points. Bỏ "Early publisher spots" → "1,000 spots" = specific. Character count: 236 chars ✓ (dưới 280).

### Cho Agent Owners (X):

"Your AI agent has skills. Why isn't it earning from them?

@ClawQuest: complete quests with your agent's skills, get paid in real rewards. On-chain verified.

Top 100 get OG Pioneer status + lifetime perks.

[link]"

> Changes: Hook mạnh hơn (question = engagement driver). Fixed tier inconsistency: 500 → 100 (match OG Pioneer tier). Thêm "On-chain verified" consistency. Character count: 214 chars ✓.

### Telegram — Cho Skill Publishers:

"Bạn đang trả tiền cho installs mà agents xóa ngay sau đó?

ClawQuest giúp bạn trả tiền cho usage thật sự. Agents hoàn thành tasks thật, mọi hành động verified on-chain. Bạn nhận retention reports ở 7, 14, 30 ngày.

Early access chỉ 1,000 spots. Join: [link]"

> Rationale: Telegram users expect more context than X. Vietnamese cho Telegram VN community. Separate templates cho mỗi audience.

### Telegram — Cho Agent Owners:

"Agent của bạn có skills nhưng chưa kiếm được gì từ chúng?

ClawQuest: hoàn thành quests, nhận rewards thật. Top agents được priority access vào campaigns tốt nhất.

1,000 spots early access. Join: [link]"

### Telegram — English (chung):

"ClawQuest: the first marketplace where AI skills prove their worth.

Publishers: post quests, get on-chain retention proof, pay only for results.
Agents: complete quests, earn real rewards.

Early access: 1,000 spots. [link]"

> Rationale: Tách Telegram thành 3 templates (VN publisher, VN agent, EN chung) thay vì 1 generic message. More targeted = higher conversion.

---

## Email Capture

Chỉ thu:
1. Email (bắt buộc)
2. Role: Publisher / Agent Owner (sau khi submit email — micro-commitment ladder)
3. Twitter/X handle (optional — pre-fill share template)
4. Referral code (ẩn, auto từ URL)

> CRO principle #5: 5-field max. Current flow = 2 visible fields (email + role) = optimal. Twitter optional = no friction.

---

## Technical Notes

Static page. Deploy Vercel hoặc repo riêng.

Backend cho email: Loops, Resend, hoặc lưu DB.

Referral: unique code per signup, track joins, update queue position.

Analytics: conversion mỗi step, UTM params, share clicks.

**Thêm:**
- Track share button clicks by template type (X publisher, X agent, TG publisher, TG agent, TG general)
- Track tier threshold notifications (khi spots gần hết mỗi tier)
- A/B test tracking: variant assignment + conversion per variant

---

## KPIs

| KPI | Metric | Target |
|-----|--------|--------|
| Signup rate | Visitor → email | >15% |
| Role split | Publisher vs Agent Owner | Track ratio, no target |
| Referral rate | % bấm share button | >25% |
| Viral coefficient | Avg referrals per signup | >1.2 (viral threshold) |
| Return rate | Quay lại check queue | >30% within 7 days |
| Share template performance | Clicks per template type | Track & compare |

---

## A/B Test Variants

### Test 1: Headlines

| Variant | Copy | Framework | Hypothesis |
|---------|------|-----------|------------|
| **Control** | "Stop Paying for Installs That Vanish" | PAS (solution) | Direct, action-oriented. Primary recommendation. |
| A | "Your AI Skill Gets Installed. Then Deleted. Sound Familiar?" | PAS (problem) | Keeps original story feel, adds engagement via question. May resonate more emotionally. |
| B | "The First Marketplace Where AI Skills Prove Their Worth" | Positioning | Broader appeal (cả publisher + agent). Less urgent but more aspirational. |

**Priority:** Test Control vs A first (same framework, different angle). Winner vs B.

### Test 2: CTA Button

| Variant | Copy | Hypothesis |
|---------|------|------------|
| **Control** | "Claim Your Spot" | Scarcity + ownership. Should outperform generic CTAs. |
| A | "Reserve My Early Access" | First-person CTA (90% more clicks per CRO data). Longer but more personal. |

### Test 3: Sub-headline

| Variant | Copy | Word count |
|---------|------|------------|
| **Control** | "Post a quest. Real agents use your skill. Get on-chain proof of 30-day retention. Pay only for results." | 22 |
| A | "Real agents. Verified usage. 30-day retention proof. You only pay for results." | 14 |

**Hypothesis:** Shorter A variant may scan faster. Control has more story flow.

### Test 4: Urgency Line

| Variant | Copy |
|---------|------|
| **Control** | "Only [X] early access spots remain" |
| A | "[X] of 1,000 spots claimed — [Y] remaining" |

**Hypothesis:** A shows progress (social proof + scarcity combo). More transparent.

### Test 5: Share Templates

| Variant | Change | Hypothesis |
|---------|--------|------------|
| **Control** | Current improved templates | Baseline |
| A | Add "I just claimed spot #[X]" as personal opener | Personal touch may increase share rate |

### Recommended Test Priority

1. **Headlines** (highest impact — 80% won't read past headline)
2. **CTA button** (direct conversion impact)
3. **Urgency line** (scarcity perception)
4. **Sub-headline** (supporting conversion)
5. **Share templates** (viral loop optimization)

---

## Copy Review Summary

### Changes Made

| Section | Issue | Fix |
|---------|-------|-----|
| Headline | Only speaks to publishers, 14 words | Shortened to 6 words, PAS solution-first, action verb |
| Sub-headline | 31 words, confusing "We pay agents" | 22 words, 4 clear benefit statements, mirrors How It Works |
| CTA | Generic "Get early access" | "Claim Your Spot" — scarcity + ownership framing |
| Urgency line | Weak "spots left" | "Only [X] spots remain" + trust indicator added |
| Problem bullets | Generic ("Money wasted") | Specific ("deleted within 48 hours", "vanity metrics") |
| How It Works | "Agents compete" misleading | "Agents get to work" — accurate for all quest types |
| Share: X Publisher | No specificity, no social proof | Added "48 hours" stat, "1,000 spots" specificity |
| Share: X Agent | Tier inconsistency (500 ≠ 100) | Fixed to "Top 100 OG Pioneer", stronger hook |
| Share: Telegram | 1 generic template | 3 targeted templates (VN publisher, VN agent, EN general) |
| Tiers header | "determines" passive | "unlocks" — gamification language |
| Repeat CTA | Missing pre-CTA hook | Added loss aversion + scarcity line |

### Frameworks Applied
- **PAS** (Problem-Agitate-Solution): Hero headline, problem section
- **AIDA** (Attention-Interest-Desire-Action): Overall page flow
- **4Us** (Urgent-Unique-Useful-Ultra-specific): Headline scoring
- **CRO 25 principles**: Social proof near CTAs, first-person CTA variant, micro-commitment ladder, genuine urgency, specificity
- **Conversion psychology**: Loss aversion, scarcity + social proof combo, belonging trigger
