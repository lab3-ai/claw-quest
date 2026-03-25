# ClawQuest Waitlist Page Spec — V2 (Agent-Owner-First)

> Design brief for the waitlist landing page. Content, flow, and visual direction only.
> **Primary audience (80%):** Agent Owners & Humans. **Secondary (20%):** Sponsors (below fold).
> **Design references:** hello.trade, gm.ai, lora.finance — dark, lean, visual-first.
> **Frameworks:** PAS (hero), AIDA (page flow), Conversion Psychology.

---

## Concept

Single page. 4 screens max. Dark theme. Minimal text — product mockups and visuals do the talking. Visitor understands ClawQuest in 10 seconds, enters email in 30 seconds.

**Visual style:** Product mockups (realistic UI screenshots of the ClawQuest dashboard). No abstract illustrations. Real interfaces build credibility.

---

## Page Structure — 4 Screens

### Screen 1: Hero

**Headline:**
"Your AI Agent Could Be Earning Right Now"

**Sub-headline:**
"Register your agent on ClawQuest. Complete quests from real sponsors. Get paid in USDC, crypto, or giftcards — you choose."

**CTA:** Email input + **"Join the Waitlist"** button

**Countdown timer:**
"Public launch in [X] days [H:M:S]"

**Trust indicator:**
"[X]+ agent owners already on the waitlist"

> No changes from previous version. Hero is approved.

---

### Screen 2: How It Works

**Section header:** "Three steps to your first reward."

3 cards in a horizontal row. Each card contains a **product mockup screenshot** with a **1-line caption** below it.

| Card | Mockup Visual | Caption |
|------|--------------|---------|
| 1 | Agent registration screen — skill scan in progress, skills detected list | **Register your agent.** |
| 2 | Quest browser — list of available quests with reward amounts, sponsor logos, quest type badges (FCFS/Leaderboard/Lucky Draw) | **Accept a quest.** |
| 3 | Payout confirmation screen — "$127.50 USDC sent to wallet" or "Amazon $50 Giftcard delivered" | **Get paid.** |

> Rationale: Mockups replace all body text. Visitor sees the actual product, not descriptions of it. Each caption is 3 words max. Visual storytelling inspired by hello.trade card layout.

**Mockup direction:**
- Dark UI matching ClawQuest dashboard aesthetic (terminal meets SaaS)
- ClawQuest orange (#F97316) accent for CTAs and active states
- Geist Mono typography in mockups for brand consistency
- Show realistic data (agent names, quest titles, reward amounts) — not lorem ipsum

---

### Screen 3: Social Proof + Tiers

**Top half: 3 floating stat counters** (single horizontal row, large animated numbers)

| Stat | Display |
|------|---------|
| Agents on waitlist | **[X]+** agents |
| Quests ready at launch | **[X]+** quests |
| Total rewards pool | **$[X]+** in rewards |

> Animated count-up on scroll. Large typography (48-64px). No body text. Numbers speak for themselves.
> Pre-launch: use milestone targets ("500+ agents targeting", "50+ quests planned", "$25K+ reward pool"). Update to real numbers post-traction.

**Bottom half: Gamified progress visual**

A visual leaderboard/progress bar that shows:
- Your current position: **"You're #[X]"** (dynamic after signup, placeholder before)
- Two tier thresholds marked on the bar:
  - **OG Pioneer (Top 100):** OG Discord badge + 500 bonus XP
  - **Early Access (Top 1,000):** Premium quests 30 min before public
- Filled vs remaining slots visualized (e.g., progress bar with "86/100 OG Pioneer slots claimed")
- Referral mechanic baked into the visual: **"Refer a friend → move up 10 spots"** as a single line below the bar

> Rationale: Gamified visual replaces the text table + separate referral section. Position, tiers, perks, and referral mechanic all visible in one glance. Drives "tier-chase" behavior (+2-3x engagement per research). Progress bar creates scarcity per tier.

---

### Screen 4: Repeat CTA + Sponsor Banner + Footer

**Repeat CTA:**

Email form (same as hero).

Above: "Early access is first come, first served."
Below: "[X]+ people already in line. Where will you land?"

**Sponsor banner** (thin strip, visually distinct):

"Are you a sponsor? Tap into our agent army →" **[List Your Quest]**

> Single line + CTA link. No paragraph. Enough to capture sponsors without competing with agent-owner messaging.

**Footer:**

Links: Twitter/X · Telegram · Discord · GitHub · Docs

---

## Post-Signup Flow

After entering email, replaces the form area on the same page:

**Step 1: Role selection**

"What brings you here?"

| Button A | Button B |
|----------|----------|
| "I own AI agents" → tag Agent Owner | "I sponsor quests" → tag Sponsor |

**Step 2: Confirmation**

"You're #[position] in line."

Referral link + Copy button.

"Share to move up. Every friend = 10 spots closer."

Share buttons: **Share on X** · **Share on Telegram** · **Copy Link**

---

## Share Templates (Viral Loop)

First-person perspective. Status signaling + FOMO.

### Twitter — Agent Owner

```
My AI agent is about to start farming real rewards on @ClawQuest.

USDC, crypto, or giftcards — you pick how you get paid. One platform for Web3 and Web2.

Top 100 on the waitlist get 500 bonus XP. Use my link to jump the queue:

[link]
```

> ~248 chars (under 280).

### Twitter — Sponsor / Publisher

```
Looking to get real AI agents using your product — not just installs that vanish?

@ClawQuest lets you post quests, set rewards, and get on-chain retention proof. Pay only for results.

Early sponsor spots are limited:

[link]
```

> ~243 chars.

### Telegram — Agent Owner

```
I just signed up for ClawQuest early access. My AI agent is going to complete quests and earn real rewards — USDC, crypto, or giftcards.

Top 100 waitlist get OG Pioneer status + 500 XP head start. I'm already climbing.

Jump the queue with my referral link: [link]
```

### Telegram — General

```
ClawQuest: the first platform where AI agents earn real money by completing quests.

Agents: register, complete quests, get paid in USDC or giftcards.
Sponsors: post quests, get verified retention data, pay for results.

Early access waitlist is live. Top 100 get OG perks: [link]
```

---

## Email Capture

| Field | Type | Notes |
|-------|------|-------|
| Email | Required | Primary conversion |
| Role | Post-submit | Agent Owner / Sponsor (micro-commitment ladder) |
| Twitter/X handle | Optional | Pre-fill share template |
| Referral code | Hidden | Auto-populated from URL param |

---

## Technical Notes

- Static page on Vercel (or standalone repo)
- Email backend: Loops, Resend, or direct DB
- Referral: unique code per signup, queue position updates in real-time
- Countdown: server-side target date, client-side JS. Fallback: "Launching Soon"
- Mockup images: static PNGs or Lottie animations for card reveals
- Analytics: conversion per step, UTM params, share clicks, countdown interaction
- Track: share clicks by template type, tier threshold alerts, referral chain depth, role split ratio, A/B variant assignment

---

## KPIs

| KPI | Metric | Target |
|-----|--------|--------|
| Signup rate | Visitor → email | >15% |
| Role split | Agent Owner vs Sponsor | Track (expect ~80/20) |
| Referral rate | % who click share | >25% |
| Viral coefficient | Avg referrals per signup | >1.2 |
| Return rate | Revisit within 7 days | >30% |

---

## A/B Tests

Priority order:

| # | Element | Control | Variant A | Hypothesis |
|---|---------|---------|-----------|------------|
| 1 | Headline | "Your AI Agent Could Be Earning Right Now" | "Put Your AI Agent to Work. Get Paid." | Imperative may convert higher with action-oriented audiences |
| 2 | CTA | "Join the Waitlist" | "Get My Early Access" | First-person CTA: up to 90% more clicks (research) |
| 3 | Urgency | Countdown timer | Spots remaining counter | Countdown = +15-25% lift, but spots remaining is proven in Web3 |
| 4 | Sub-headline | 21-word narrative version | 15-word punchy version ("Real quests. Real sponsors. Get paid in crypto or giftcards. Your agent, your choice.") | Shorter may scan faster on mobile |

---

## Visual Direction Summary

| Principle | Implementation |
|-----------|---------------|
| **Dark theme** | Black/dark gray background, white text, orange (#F97316) accents |
| **Lean copy** | Max 15 words per section (excluding hero). Visuals replace text. |
| **Product mockups** | 3 realistic UI screenshots for How It Works cards |
| **Floating stats** | Large animated counters, no body text |
| **Gamified progress** | Visual leaderboard bar with tier thresholds + referral mechanic |
| **Sponsor = minimal** | 1-line banner strip with CTA, no paragraph |
| **Typography** | Geist Mono (headings), clean sans-serif (body). Large sizes for stats. |
| **4 screens total** | Hero → How It Works → Social Proof + Tiers → CTA + Sponsor + Footer |
