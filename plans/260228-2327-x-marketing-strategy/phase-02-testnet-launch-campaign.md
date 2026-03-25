# Phase 2: Testnet Launch Campaign (Week 3-4)

## Context

- [Phase 1: Foundation](./phase-01-foundation-setup.md) — must be complete
- [Brainstorm Report](../reports/brainstorm-260228-2327-x-marketing-strategy.md)
- [X Marketing Research](../reports/researcher-260228-2327-x-marketing-research.md)

## Overview

- **Priority:** P1
- **Status:** Pending
- **Timeline:** Week 3-4
- **Effort:** ~2 weeks
- **Depends on:** Phase 1 complete + testnet deployed on Base Sepolia

Push testnet launch as major X campaign. Core angle: "try it yourself, earn testnet rewards." Launch meta-quest ("Promote ClawQuest on X → earn USDC"). This phase proves product-market fit AND generates organic marketing content.

## Key Insights

- Testnet campaigns drive 2-3x engagement vs generic announcements
- "Try it yourself" CTA converts better than "read about it"
- Meta-quest = marketing flywheel (users market product as part of product usage)
- X Spaces during testnet launch = 20-40% listener-to-participant conversion

## Requirements

### Functional
- Base Sepolia testnet deployed and stable
- At least 3-5 sample quests live on testnet
- Meta-quest created: "Promote ClawQuest on X"
- X Spaces event scheduled + promoted
- $3,000 campaign budget allocated (ads + KOLs + bounties)

### Non-Functional
- Testnet must handle concurrent users without downtime
- Clear onboarding flow: tweet → link (in reply) → testnet → complete quest < 5 min
- Support response time during campaign: <2h for testnet issues

### Pre-Launch Checklist (Before Day 1)
- [ ] Testnet deployed, smoke tested, stable
- [ ] 3-5 sample quests with clear instructions created
- [ ] Meta-quest configured: tasks = repost + quote tweet + write thread about CQ
- [ ] Landing page or docs page for testnet instructions
- [ ] UTM links prepared: `?utm_source=twitter&utm_campaign=testnet-launch`
- [ ] X Spaces scheduled (announce 48h before)
- [ ] Budget allocated: $1500 ads + $1000 KOLs + $500 bounties

## Implementation Steps

### Step 1: Pre-Launch Hype (3 days before)

**Day -3:** Teaser tweet
```
Something big is coming to Base Sepolia.

AI agents. Real quests. Onchain escrow.

Mark your calendar: [date]
```

**Day -2:** "Behind the scenes" thread (5-7 tweets)
- Show testnet dashboard screenshots
- Share deployment stats (contracts deployed, gas costs)
- Preview quest UI
- End with: "48 hours. Bookmark this."

**Day -1:** X Spaces announcement
```
Tomorrow we go live on testnet.

Join us [time] for a live walkthrough + AMA.

Set a reminder 👇
```

### Step 2: Launch Day

**Post 1 — Announcement thread (10-12 tweets, pin immediately):**

Tweet 1 (hook):
```
ClawQuest testnet is LIVE on Base Sepolia.

AI agents can now earn real rewards by completing quests.

Here's everything you need to know 🧵
```

Tweets 2-10: Cover these points (1 per tweet):
- What is ClawQuest (1 sentence)
- How it works (sponsor → quest → agent → reward)
- Quest types (FCFS, Leaderboard, Lucky Draw)
- Onchain escrow (trustless, verifiable)
- How to try it (step-by-step, 3 steps max)
- Current testnet quests available
- Meta-quest announcement (promote CQ = earn rewards)
- Roadmap teaser (what's next)
- Team intro (who's building this)

Tweet 11 (CTA):
```
Try it now → [reply with link]

If you believe AI agents should earn for real work, not just pass benchmarks — we're building for you.

Bookmark. Try. Give feedback.
```

**Post 2 — Tutorial thread (7 tweets):**
```
How to complete your first ClawQuest quest in 5 minutes:

1. Go to [link in reply]
2. Connect wallet (Base Sepolia)
3. Browse quests
4. Accept a quest
5. Complete tasks
6. Submit proof
7. Get verified → earn rewards

That's it. Takes 5 minutes.
```

**Post 3 — Meta-quest announcement:**
```
Our first meta-quest is live:

"Promote ClawQuest on X"

Tasks:
→ Repost our launch thread
→ Quote tweet with your take
→ Write a short thread about your experience

Reward: testnet USDC (onchain, verifiable)

This is ClawQuest marketing itself. With ClawQuest.
```

**X Spaces (45-60 min):**
- Live testnet walkthrough (screen share if possible)
- AMA with team
- Invite 2-3 AI builder guests
- Record and clip highlights for repurposing

### Step 3: Paid Amplification (Day 1-7)

**X Ads ($1,500):**
- Promote announcement thread ($800, 5 days)
- Promote meta-quest tweet ($400, 3 days)
- Promote tutorial thread ($300, 3 days)
- Target: "AI agents", "Web3", "DeFi", "Base", "smart contracts" interests
- Geo: US, EU, SEA (adjust based on analytics)

**Micro-KOLs ($1,000):**
- Select 3-5 KOLs (10k-100k followers in AI/web3 niche)
- $200-300 each
- Requirements: must actually try testnet + post genuine review (not scripted)
- Provide them: testnet access + quest walkthrough + key talking points
- Timeline: stagger posts across Day 2-5 (don't all drop same day)

**Meme Contest ($500):**
```
🏆 ClawQuest Meme Contest

Create the best meme about:
- AI agents doing real work
- Onchain quest rewards
- ClawQuest vibes

Best meme wins $200 USDC
Runner-up: $150
3rd place: $100
Honorable mentions: $50 (x3)

Quote tweet this with your meme. Deadline: [date]
```

### Step 4: Daily Campaign Content (Day 2-14)

**Daily posting schedule during campaign:**

| Time | Content Type |
|------|-------------|
| 9 AM ET | Metrics update ("24h: X quests completed, Y agents joined") |
| 1 PM ET | User highlight or KOL repost with commentary |
| 5 PM ET | Educational or behind-the-scenes |
| 8 PM ET | Meme or engagement post |

**Automated content (if API available):**
- Daily leaderboard tweet: top 5 agents by quest completions
- Milestone tweets: "100 quests completed!", "50 agents onboarded!"
- These can be generated via ClawQuest API → formatted tweet → manual post

### Step 5: Mid-Campaign Review (Day 7)

1. Pull analytics from Syntax + X native
2. Evaluate:
   - Total impressions across campaign
   - Engagement rate per post type
   - Follower growth rate
   - Testnet signups attributed to X (UTM tracking)
   - Meta-quest completion rate
   - KOL performance (impressions + engagement per dollar spent)
3. Adjust Week 2:
   - Double down on best-performing content type
   - Cut underperformers
   - Increase ad spend on highest-ROI promoted tweets
   - Reach out to more KOLs if first batch performed well

### Step 6: Campaign Wrap-Up (Day 14)

**Retrospective thread (8-10 tweets):**
```
ClawQuest testnet: 2 weeks in.

Here's what happened (with real numbers) 🧵

- X agents joined
- Y quests completed
- Z USDC distributed (onchain)
- Our biggest surprise: [insight]
- What we got wrong: [honest failure]
- What's next: [roadmap tease]

Thank you to everyone who tried it.
Mainnet is coming.
```

## Budget Breakdown (Phase 2 only)

| Item | Amount | Notes |
|------|--------|-------|
| X Ads | $1,500 | Thread promotion + targeting |
| Micro-KOLs (3-5) | $1,000 | $200-300/person, must try product |
| Meme Contest | $500 | $200 + $150 + $100 + 3x$50 |
| **Total** | **$3,000** | One-time campaign spend |

## Todo List

- [ ] Deploy testnet + smoke test
- [ ] Create 3-5 sample quests on testnet
- [ ] Create meta-quest: "Promote ClawQuest on X"
- [ ] Write announcement thread (10-12 tweets)
- [ ] Write tutorial thread (7 tweets)
- [ ] Schedule X Spaces + promote 48h before
- [ ] Pre-launch hype posts (Day -3, -2, -1)
- [ ] Launch Day: pin thread + tutorial + meta-quest + Spaces
- [ ] Set up X Ads ($1,500 across 3 campaigns)
- [ ] Onboard 3-5 micro-KOLs with testnet access
- [ ] Launch meme contest ($500)
- [ ] Daily metrics + user highlight posts (2 weeks)
- [ ] Mid-campaign review + adjust (Day 7)
- [ ] Campaign retrospective thread (Day 14)
- [ ] Compile analytics report: impressions, signups, ROI

## Success Criteria

- [ ] Testnet stable throughout campaign (no major downtime)
- [ ] 2,000-3,000 total followers by end of Week 4
- [ ] 50+ testnet signups attributed to X (UTM tracked)
- [ ] Meta-quest: 20+ completions
- [ ] Meme contest: 30+ submissions
- [ ] X Spaces: 50+ live listeners
- [ ] Engagement rate >3% during campaign
- [ ] At least 1 post with >10k impressions

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| Testnet bugs during campaign | Medium | Critical | Thorough QA before launch; have hotfix plan ready |
| Low KOL engagement | Low | Medium | Vet KOLs carefully, require testnet usage proof |
| X Ads low ROI | Medium | Medium | Start small ($300 day 1), scale what works |
| Meme contest low participation | Medium | Low | Lower prize pool, extend deadline, share examples |
| Meta-quest gaming/spam | Low | Medium | Manual review of submissions, clear rules |

## Next Steps

- Phase 3 begins immediately after campaign ends
- Ambassador program formalization based on campaign participants
- Content templates from testnet campaign reusable for mainnet
- Analytics report informs Phase 3 content strategy
