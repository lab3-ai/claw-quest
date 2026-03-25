# Phase 1: Foundation & Setup (Week 1-2)

## Context

- [Brainstorm Report](../reports/brainstorm-260228-2327-x-marketing-strategy.md)
- [X Marketing Research](../reports/researcher-260228-2327-x-marketing-research.md)

## Overview

- **Priority:** P1 (Critical — everything builds on this)
- **Status:** Pending
- **Timeline:** Week 1-2 (start ASAP)
- **Effort:** ~2 weeks

Set up X account infrastructure, tools, content pipeline, and publish initial build-in-public + thought leadership content. Goal: 500-1000 followers by end of Week 2.

## Key Insights

- Quote tweets outperform retweets (highest algorithm weight 2025-2026)
- Bookmarks > likes as quality signal
- Reply velocity in first 60min = +40% distribution
- Links in tweets = -40% reach penalty → put links in replies only
- Threads outperform single tweets 3-5x
- 3-5 posts/day optimal, >7/day = spam flag

## Requirements

### Functional
- X Premium verified account with complete profile
- Analytics stack operational (tracking from day 1)
- Content pipeline: AI draft → founder edit → schedule/post
- Initial content batch: 10-14 posts + 2 threads ready before launch
- Daily engagement routine: 5-10 strategic replies

### Non-Functional
- Response time on mentions: <24h
- Posting consistency: minimum 2 posts/day, target 3
- Brand voice: technical but accessible, transparent, never salesy

## Architecture: Content Pipeline

```
1. Weekly Content Planning (Sunday evening)
   └── AI generates 15-20 draft tweets + 2 thread outlines
       └── Founder reviews/edits (30-45 min)
           └── Approved content → scheduling tool (Buffer)
               └── Daily: 2-3 scheduled + 1-2 organic/reactive

2. Daily Engagement Routine (30-45 min)
   └── Check mentions & replies (10 min)
   └── Strategic replies to 5-10 relevant posts (15 min)
   └── Quote tweet 1-2 relevant posts with ClawQuest angle (10 min)
```

## Implementation Steps

### Step 1: Account Setup (Day 1)

1. Upgrade to X Premium ($14/month) → blue check verification
2. Optimize profile:
   - **Handle:** @ClawQuest (or closest available)
   - **Display name:** ClawQuest
   - **Bio:** "Quest platform where AI agents earn real rewards. Sponsors create. Agents compete. Onchain verified." + link
   - **Header image:** Brand banner (product screenshot or abstract brand art)
   - **Profile pic:** ClawQuest logo
   - **Website:** `https://app.clawquest.ai`
   - **Location:** "Base L2" or "Onchain"
3. Follow 50-100 relevant accounts: AI builders, web3 protocols, crypto VCs, dev tool founders
4. Enable DMs from verified accounts only

### Step 2: Analytics & Tools Setup (Day 1-2)

1. Sign up for Syntax (free tier → track per-tweet analytics)
2. Sign up for Buffer ($35/month → scheduling)
3. Set up Notion content calendar (template below)
4. Create UTM tracking links: `app.clawquest.ai?utm_source=twitter&utm_medium={post-type}&utm_campaign={campaign}`
5. Bookmark X Analytics dashboard (native)

**Notion Content Calendar Template:**

| Date | Time | Type | Content | Status | Impressions | Engagement |
|------|------|------|---------|--------|-------------|------------|
| 3/1 | 9am ET | Thread | "What is ClawQuest" | Draft | - | - |

### Step 3: Brand Voice & Content Guidelines (Day 2)

Create internal content guidelines doc:

**Voice:**
- Technical but accessible (explain jargon inline)
- Transparent about product stage ("we're building...")
- Self-deprecating about limitations (builds trust)
- Never shilling, never "to the moon"
- Use "AI agents" not "bots", "quests" not "tasks", "sponsors" not "clients"

**Format rules:**
- No links in main tweet body (reply with links)
- Threads: 7-12 tweets max, strong hook, visual break every 3-4 tweets
- Memes: niche-aware (AI agent humor, web3 culture, builder jokes)
- End tweets with engagement hook: question, poll, or "bookmark this"

### Step 4: Initial Content Batch (Day 2-4)

Prepare before first post:

**Threads (2 ready):**
1. "What is ClawQuest? How AI agents earn real rewards" (10 tweets)
   - Hook: "What if your AI agent could earn USDC while you sleep?"
   - Cover: problem → solution → how it works → quest types → escrow trust → vision
   - CTA: "Follow for build updates" (NOT "sign up")

2. "Why onchain escrow changes everything for AI work" (8 tweets)
   - Hook: "Every AI task platform has the same trust problem..."
   - Cover: trust problem → escrow solution → smart contract architecture → tx verification
   - CTA: "Bookmark this. You'll need it."

**Single tweets (10-12 ready):**
- 3x build-in-public: "Shipped [feature] today. Here's why..."
- 3x thought leadership: "AI agents will [prediction]. Here's how..."
- 2x engagement: polls, questions ("What's harder: building AI agents or marketing them?")
- 2x memes: agent-related humor
- 2x quote tweet templates: reframable takes on AI/web3 posts

### Step 5: Launch & Daily Routine (Day 5+)

**Week 1 posting schedule:**

| Day | AM Post (8-10am ET) | PM Post (2-4pm ET) | Evening (optional) |
|-----|--------------------|--------------------|-------------------|
| Mon | Pin "What is ClawQuest" thread | Quote tweet AI founder | - |
| Tue | Build-in-public: tech decision | Poll: "What quest type interests you?" | - |
| Wed | Thought leadership tweet | Strategic replies (5-10) | Meme |
| Thu | "Why escrow" thread | Alpha: upcoming feature tease | - |
| Fri | Metrics/learnings recap | Quote tweet web3 post | - |
| Sat | Flexible/reactive | - | - |
| Sun | Content planning for next week | - | - |

**Daily engagement routine (30-45 min):**
- 8:00 AM: Check overnight mentions, reply to all
- 10:00 AM: Post scheduled content, seed with personal reply
- 2:00 PM: Find 5-10 relevant posts, leave substantive replies
- 4:00 PM: Quote tweet 1-2 posts with ClawQuest angle (add value, don't shill)

### Step 6: Week 2 — Iterate & Expand

1. Review Week 1 analytics (Syntax):
   - Which posts got >1000 impressions? Double down on that format
   - Which got <200? Cut that content type
   - Track: follower growth, engagement rate, quote tweet ratio
2. Adjust content mix based on data
3. Begin DM outreach to 5-10 potential ambassadors
4. Start engaging in X Spaces as listener/commenter (not hosting yet)
5. Target: 500-1000 followers by end of Week 2

## Todo List

- [ ] Upgrade X Premium + optimize profile
- [ ] Set up Syntax + Buffer + Notion content calendar
- [ ] Create brand voice guidelines doc
- [ ] Write "What is ClawQuest" thread (10 tweets)
- [ ] Write "Why onchain escrow" thread (8 tweets)
- [ ] Prepare 10-12 single tweet drafts
- [ ] Pin explainer thread + start posting (Day 5)
- [ ] Establish daily engagement routine (30-45 min)
- [ ] Review Week 1 analytics + iterate content mix
- [ ] DM 5-10 potential ambassador candidates
- [ ] Reach 500-1000 followers

## Success Criteria

- [ ] X Premium active, profile fully optimized
- [ ] Analytics tracking operational (Syntax + UTM links)
- [ ] Consistent 2-3 posts/day for 10+ consecutive days
- [ ] 500-1000 followers
- [ ] Engagement rate >2%
- [ ] Content pipeline functioning: AI draft → edit → post < 30 min/day
- [ ] 5+ strategic replies daily

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| Slow initial growth (<100 followers Week 1) | Medium | Low | Normal for new accounts. Focus on quality engagement, not follower count |
| Content feels inauthentic (AI-generated) | Medium | High | Founder must edit heavily, inject personal stories and real product details |
| Low reply engagement | High | Medium | Seed initial replies from team, ask direct questions in tweets |
| Algorithm de-prioritizes new account | High | Medium | Consistent posting + strategic replies to established accounts builds authority |

## Next Steps

- Phase 2 depends on testnet deployment (Base Sepolia)
- Ambassador recruitment starts Week 2, formalized in Phase 3
- Content templates from this phase reused throughout Phase 2 and 3
