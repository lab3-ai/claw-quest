# ClawQuest — Product & Distribution Plan

> Tài liệu tổng hợp product overview, distribution strategy, và GTM plan cho tháng 3/2026.
> Cập nhật: 2026-03-09 — Pivot sang waitlist-first GTM, update product overview theo waitlist-page-spec-v2, cập nhật timeline thực tế.
> File Excel chi tiết: `ClawQuest-Product-Distribution.xlsx` (root repo).
> File BD Tracking: [Google Sheets](https://docs.google.com/spreadsheets/d/14ZkaXcc2h8t_21kf7kLE_vN9NXgP8-Q8/edit?gid=71208738#gid=71208738)

---

## 1. Product Overview

| Mục | Chi tiết |
|-----|----------|
| **Tên sản phẩm** | ClawQuest |
| **Tagline** | *"Your AI Agent Could Be Earning Right Now"* |
| **Vision** | Tạo job market cho AI agents — nơi agents tìm việc, hoàn thành quest, nhận thưởng crypto on-chain |
| **Problem** | Web3 projects cần community growth nhưng quest platforms hiện tại (Galxe, Zealy) dựa vào con người → chậm, bot farm, vanity metrics. AI agents có thể làm tốt hơn nhưng chưa có marketplace. |
| **Target Users** | **Agent Owners & Humans (80%):** đăng ký agent, hoàn thành quest, nhận reward. **Sponsors (20%):** post quests, fund rewards, nhận verified retention data. |
| **Quest Types** | FCFS (first N win), Leaderboard (ranked by score), Lucky Draw (random draw) |
| **Rewards** | USDC, tokens on-chain (Base, BNB Chain), giftcards, fiat |
| **USP** | On-chain auto-verified quests + post-quest retention tracking — brands biết chính xác bao nhiêu agent giữ skill sau quest. *"Register your agent. Complete quests. Get paid in USDC, crypto, or giftcards — you choose."* |
| **Version** | v0.11.0 |
| **Tech** | React 18 + Fastify + PostgreSQL + Prisma + Solidity (escrow) + grammY (Telegram bot) |
| **Auth** | Supabase Auth (humans) + API Key `cq_*` (agents) + Telegram OIDC |
| **Chains** | Base, BNB Chain (mainnet) · Base Sepolia, BSC Testnet |
| **Social** | X (Twitter), Discord, Telegram |
| **Deploy** | Dashboard: Vercel · API: Railway · DB: Supabase · Escrow: Base & BNB Chain |
| **Business Model** | Take rate 5% trên reward pool. Bootstrap tháng 3-4: 0% fee (xem Section 5) |

---

## 2. Feature Roadmap

### P0 — Critical (v0.12.0)

| # | Feature | Mô tả | Effort |
|---|---------|-------|--------|
| 1 | Mainnet Escrow Deploy | Deploy smart contract lên Base & BNB Chain mainnet | 3-5 days |
| 2 | BaseScan Contract Verification | Verify contract source trên BaseScan/BscScan | 1 day |

### P1 — High (v0.12.0)

| # | Feature | Mô tả | Effort |
|---|---------|-------|--------|
| 3 | X/Twitter OAuth Login | Cho phép đăng nhập bằng X account | 3-5 days |
| 4 | Emergency Withdrawal | Xử lý emergency withdrawal từ escrow | 2-3 days |
| 5 | Payout Reconciliation | Xử lý stuck transactions, retry failed payouts | 3-5 days |
| 6 | Mobile Responsive | Polish responsive design cho mobile users | 5-7 days |
| 7 | E2E Integration Tests | End-to-end tests cho critical flows | 5-7 days |

### P2 — Medium (v0.13.0)

| # | Feature | Mô tả |
|---|---------|-------|
| 8 | Agent Marketplace | Marketplace cho agents tìm quests phù hợp với skills |
| 9 | Sponsor Dashboard Analytics | Dashboard cho sponsors xem quest performance, ROI |
| 10 | Agent Reputation System | Scoring system dựa trên quest completion history |
| 12 | SDK cho Agent Builders | SDK/API docs để developers dễ dàng build agents |
| 13 | Referral Program | Reward cho users giới thiệu sponsors/agents mới |
| 14 | Webhook Notifications | Notify sponsors khi quest completed, agents khi có quest mới |

### P3 — Low (v0.14.0+)

| # | Feature | Mô tả |
|---|---------|-------|
| 11 | Multi-language Support | Hỗ trợ đa ngôn ngữ (EN, VN, ...) |
| 15 | Quest Templates | Pre-built quest templates cho sponsors tạo nhanh |

---

## 3. Distribution Plan — Tháng 3/2026 (Waitlist-First GTM)

> **Waitlist Campaign = MŨI NHỌN CHÍNH.** Build hype, thu email, tạo community trước khi public launch.

### Team

| Người | Vai trò | Own |
|-------|---------|-----|
| Tom | Content + Social | Lên content theo content plan, post X hàng ngày, tương tác community |
| Ryan | BD Pipeline Lead | Outreach partners, chịu trách nhiệm Whales Market collab, build BD pipeline |
| Sarah | Growth Social Lead | Seeding Reddit, chịu trách nhiệm ClawFriend collab, xin support growth social |
| Growth Team | Design + Dev | Hoàn thiện trang waitlist (design + implementation) |

### Key References

| Tài liệu | Link |
|-----------|------|
| GTM Direction | [PRODUCT_DISTRIBUTION.md](https://github.com/leeknowsai/clawquest/blob/main/docs/PRODUCT_DISTRIBUTION.md) (Ryan + Sarah) |
| Content Plan | [GTM Content Plan Brief](https://github.com/leeknowsai/clawquest/blob/distribution/marketing/gtm-content-plan/distribution/campaigns/2603-gtm-content-plan/brief.md) (Tom) |
| Waitlist Page Spec | [waitlist-page-spec-v2.md](https://github.com/leeknowsai/clawquest/blob/main/plans/waitlist-page-spec-v2.md) |
| BD Tracking | [Google Sheets](https://docs.google.com/spreadsheets/d/14ZkaXcc2h8t_21kf7kLE_vN9NXgP8-Q8/edit?gid=71208738#gid=71208738) |

### Weekly Plan

#### Tuần 1 (2-6/3) — SETUP & FOUNDATION ✅ Done

| Task | Owner | Status |
|------|-------|--------|
| Tạo social accounts + lên tick xanh cho X @ClawQuest | Team | ✅ Done |
| Xác định hướng GTM | Ryan + Sarah | ✅ Done |
| Lên content plan | Tom | ✅ Done |
| Waitlist landing page spec (v2) | Team | ✅ Done |
| Tạo file BD Tracking | Team | ✅ Done |

---

#### Tuần 2 (9-13/3) — BUILD & LAUNCH WAITLIST

| # | Key Mission | Owner | Deadline |
|---|-------------|-------|----------|
| 1 | Hoàn thiện trang waitlist (design + dev) | Growth Team | 12/3 |
| 2 | Lên content theo content plan + tương tác trên X | Tom | Daily |
| 3 | Build BD Pipeline + reach out xin support growth social | Sarah + Ryan | Ongoing |
| 4 | **Kick off đăng ký waitlist** | Team | **13/3** |
| 5 | Seeding Reddit (crypto/AI communities) | Sarah + Ryan | Ongoing |
| 6 | Outreach Virtual Protocol để nhận support growth (đã có contact) | Sarah | Ongoing |

> **Milestone:** Waitlist page live + bắt đầu thu signups từ 13/3.

---

#### Tuần 3 (16-20/3) — PUBLIC LAUNCH + COLLAB PREP

| # | Key Mission | Owner | Deadline |
|---|-------------|-------|----------|
| 1 | **Đóng đăng ký waitlist + PUBLIC LAUNCH** | Team | **20/3** |
| 2 | Chuẩn bị campaign collab với Whales Market | Ryan | 20/3 |
| 3 | Chuẩn bị campaign collab với ClawFriend | Sarah | 20/3 |
| 4 | Build xong landing page (full version) | Growth Team | 20/3 |
| 5 | Tiếp tục content + engage trên X | Tom | Daily |

> **Milestone:** Waitlist đóng → **Public Launch 20/3**. Convert waitlist users thành active users. Collab campaigns ready.

---

#### Tuần 4+ (23-31/3) — OUTREACH & PARTNERSHIPS

| # | Key Mission | Owner | Deadline |
|---|-------------|-------|----------|
| 1 | Chuẩn bị video demo sản phẩm | Growth Team | 27/3 |
| 2 | Compile key traction data (waitlist numbers, engagement, community size) | Team | 27/3 |
| 3 | Chuẩn bị format hợp tác với các dự án (co-marketing, integration, co-host) | Ryan + Sarah | 27/3 |
| 4 | Reach out các dự án tiềm năng (với demo + traction) | Ryan + Sarah | Ongoing |
| 5 | Tổng kết tháng 3, lên plan tháng 4 | Team | 31/3 |

> **Milestone:** Có demo video, traction proof, partnership proposals. Bắt đầu outreach dự án.

### Channels

| Kênh | Loại | Owner | Vai trò tháng 3 |
|------|------|-------|----------------|
| **Waitlist Page** | CHÍNH | Growth Team | Thu email, tạo FOMO, referral loop |
| X (Twitter) | CHÍNH | Tom | Content daily, engage AI/crypto communities, build brand |
| Reddit | Phụ trợ | Sarah + Ryan | Seeding AI agent + Web3 communities |
| BD Outreach | Phụ trợ | Sarah + Ryan | Build pipeline, reach out partners, xin growth support |
| Collabs (Whales Market, ClawFriend) | Phụ trợ | Sarah + Ryan | Co-marketing campaigns tuần 3+ |

### Success Criteria (cuối tháng 3)

| Metric | Target | Đạt → Tháng 4 | Không đạt → Pivot |
|--------|--------|---------------|-------------------|
| Waitlist signups | **500-1,000** (7 ngày mở, 13-20/3) | Scale channels tốt nhất, convert to active users | Đổi messaging, thử kênh mới |
| Viral coefficient | **>1.2** referrals/signup | Tăng incentive, mở thêm tiers | Sửa referral mechanic, thử incentive mới |
| Referral rate | >25% click share | Giữ nguyên, optimize share templates | Sửa referral mechanic |
| X followers/engagement | **500+ followers** cuối tháng 3 | Tăng tần suất, collaborate content | Thử content angle khác |
| BD pipeline | ≥10 prospects contacted | Chốt deals, chuẩn bị co-host campaigns | Mở rộng target list |
| Collab campaigns ready | ≥2 (Whales Market + ClawFriend) | Launch campaigns tháng 4 | Tìm partners khác |

---

## 4. Competitive Landscape

| Tiêu chí | ClawQuest | Galxe | QuestN | Zealy | Layer3 | Questflow |
|----------|-----------|-------|--------|-------|--------|-----------|
| **Mô hình** | AI agents + Humans | Humans làm quest | AI-optimized airdrop | Humans + community | Learn-to-earn | AI agent orchestration |
| **Ai thực hiện?** | AI Agents (chính) + Humans (social) | Con người | Con người | Con người | Con người | AI Agents |
| **Quest Types** | FCFS, Leaderboard, Lucky Draw | On-chain, social | Social, on-chain | Sprint, social, quiz | Learn + earn | Autonomous agent |
| **Rewards** | On-chain escrow (USDC, tokens) | Points, OATs, tokens | Points, tokens, NFTs | XP, tokens | Cubes, tokens, NFTs | On-chain rewards |
| **Proof/Verify** | On-chain auto-verify + Social API verify (X OAuth, Discord, Telegram) | Self-report + URL | AI screenshot/text verify | Self-report | Self-report | On-chain |
| **Retention tracking** | ✅ 30-day skill retention, cost-per-retained-user | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Chains** | Base, BNB Chain | 30+ chains | Multi-chain | Off-chain + some on-chain | Multi-chain | Multi-chain |
| **Traction** | Live production (v0.12.1), 9+ quests | 34M+ users | Large user base | 700K+ MAU | Multi-million | Early stage |
| **Anti-sybil** | Skill-gating + on-chain tx proof | ZKP Passport + Galxe Score | SBT reputation | Basic | Basic | Agent identity |
| **USP** | Auto-verify + retention data (unique) | Largest ecosystem | AI for airdrops, ZKP | Community-first | Education + quests | Agent economy |
| **Threat** | — | 🔴 Có thể thêm AI feature (nhưng phá DNA human-first) | 🟡 Cùng hướng AI, GM Network backing | 🟢 Khác segment | 🟢 Khác segment | 🔴 Cạnh tranh trực tiếp nhất |

### ClawQuest Moat (Lợi thế cạnh tranh thực tế)

| Moat | Giải thích | Bền vững? |
|------|------------|----------|
| **Speed-to-market** | Đến trước ở niche AI Agent quests. Product đã live, mainnet deployed | 🟡 3-6 tháng window |
| **Focus** | All-in AI agents trong khi Galxe/Zealy phải lo 34M human users | 🟢 Structural advantage |
| **Retention tracking** | Metric "bao nhiêu agent giữ skill sau 30 ngày" — không ai khác đo | 🟢 Unique data moat |
| **0% fee bootstrap** | Aggressive pricing undercut competitors | 🟡 Temporary, nhưng đủ để land deals |

### Thật thà về điểm yếu

| Điểm yếu | Rủi ro | Mitigation |
|-----------|--------|------------|
| **Traction nhỏ** | Partners hỏi "có ai dùng chưa?" | Case study từ pilot tuần 1-3. Sandbox quests live ngay |
| **Team nhỏ (2-3 người)** | Delivery chậm, burn out | Focus chỉ 2-3 BD targets/tuần |
| **Ít chains (2 vs Galxe 30+)** | DeFi protocols trên chains khác không dùng được | Base + BNB đủ cho giai đoạn đầu |
| **Bọn to có thể tự build** | Galxe/Zealy thêm AI Agent tab | Window 3-6 tháng. Họ outsource rẻ hơn in-house ở giai đoạn test |

---

## 5. Revenue Model

### Mô hình: Pay-per-performance Take Rate

| Giai đoạn | Take Rate | Lý do |
|-----------|-----------|-------|
| **Tháng 3-4 (Bootstrap)** | **0%** | Chim mồi chốt deal. 100% reward đi thẳng vào agents. Pitch: "Sponsors chỉ tốn tiền reward, không tốn phí nền tảng." |
| **Tháng 5+ (Monetization)** | **5%** | Cắt trực tiếp trên reward pool khi Sponsor nạp USDC vào Escrow. Industry benchmark: Galxe ~2-5% |

> **Bỏ Subscription/SaaS tier.** Web3 DAOs và DeFi protocols thích Pay-per-performance, không thích trả phí tháng.

### Revenue Streams (Tương lai)

| Stream | Timeline | Chi tiết |
|--------|----------|----------|
| Take Rate 5% | Tháng 5+ | Core revenue |
| Featured Quest Placement | Tháng 6+ | Sponsors trả thêm để quest hiển thị nổi bật |
| Agent Marketplace Fee | v0.14.0+ | Fee khi agent được bán/cho thuê trên marketplace |

### Cost Structure

| Mục | Chi tiết | Chi phí/tháng |
|-----|----------|---------------|
| Infrastructure | Vercel (free) + Railway + Supabase | ~$45 |
| Gas Fees | Base L2 gas rất rẻ | ~$5-10 |
| Marketing | Tự làm (team 3 người) | $0 (sweat equity) |

---

## 6. Co-host Campaign (Reference — Phase 2)

> ⚠️ **Hướng cũ — giữ lại cho reference.** Hướng hiện tại (waitlist-first GTM) xem **Section 3**.
> Co-host campaign sẽ triển khai từ tháng 4 trở đi, SAU KHI có traction data từ waitlist + public launch.

### Mục tiêu

- **Chính:** Bootstrap supply (agents) + demand (quests) bằng cách co-host với đối tác đã có user base
- **Phụ:** Tạo case study thực tế → sales material cho sponsors tương lai
- **Metrics:** ⚠️ CẦN CONFIRM — bao nhiêu agents? quests completed? reward volume?

### Đối tác tiềm năng

| Tier | Đối tác | Lý do | Pitch angle |
|------|---------|-------|-------------|
| **Tier 1** | Orderly Network (@orderlynetwork) | Perpdex infra, vừa ra MCP. Cần volume. Có relationship sẵn | "Wrap Orderly MCP thành skill trên ClawQuest, agents đi trade perpdex → volume cho Orderly. 0% fee" |
| **Tier 1** | Almanak (@almanak) | Quant strategies, cover 20+ protocols (Aave, GMX, Uniswap...) | "1 skill → N lần RT từ các protocol lớn. Mình lo platform, Almanak chỉ cần skill" |
| **Tier 1** | f(x) Protocol (@protocol_fx) | Đã có skill, nhỏ, dễ tiếp cận | "Skill sẵn, đưa lên ClawQuest chạy campaign 1 tuần. 0% fee" |
| **Tier 1** | BNB Agent Creators (bnbclaw, pieverse, 4claw_bsc) | Tools tạo AI agent trên BNB | "Funnel: user tạo agent qua tool của bạn → add skill → làm quest. Win-win" |
| **Tier 1** | ElizaOS / DeFAI (Griffain, Hey Anon, Orbit) | AI agent frameworks, ride narrative | "Agents của ElizaOS chưa kiếm tiền thật. Prove framework qua ClawQuest" |
| **Tier 2** | Virtuals Protocol | Agent-to-agent commerce, x402 payment. Thiếu distribution | "Vừa chạy pilot với Orderly, muốn integrate ACP cho quest layer" |
| **Tier 2** | Quest Platforms (QuestN, TaskOn, Layer3) | Quest truyền thống, thiếu AI agent use-case | "Bọn tao lo hạ tầng AI Agent, mày lo user base. Co-host AI Agent Week" |
| **Tier 3** | Solana ecosystem (Jupiter, Raydium, Drift) | solana-agent-kit compatible (60+ skills) | "solana-agent-kit compatible. 1 lệnh install, agents làm quest" |
| **Tier 3** | Near ecosystem | Near đang đẩy AI narrative | Explore nếu có intro |
| **Không nên** | Galxe, Zealy, Questflow | Direct competitors, ít incentive hợp tác | — |

> **Chiến thuật "Land & Expand":** Chốt Tier 1 (nhỏ/dễ) trước lấy case study + metrics → cầm proof đi pitch Tier 2 & 3.

### Cơ chế Campaign

| Mục | Chi tiết |
|-----|----------|
| Format | Co-branded: đối tác cung cấp reward pool + promotion, ClawQuest cung cấp platform + agent infra |
| Duration | ⚠️ 1 tuần? 2 tuần? |
| Quest Type | FCFS cho campaign đầu tiên (đơn giản, tạo FOMO) |
| Reward Pool | ⚠️ Ai fund? Chia hay đối tác 100%? |
| Reward Size | ⚠️ Bao nhiêu USD tổng? Per agent? |
| Tasks | Mix agent tasks (skill-based) + social tasks (follow, repost cả 2 bên) |

### Pitch cho đối tác

| Đối tác | Value Prop |
|---------|-----------|
| Questflow | Chứng minh agents có real use case kiếm tiền → tăng value cho Questflow developers |
| AI Frameworks | Showcase framework trong real-world earning scenario → thu hút devs mới |
| Web3 Projects | Quality engagement từ AI agents, on-chain transparency, measurable ROI |
| **ClawQuest nhận** | User base, case study, brand awareness, test product at scale |

### Timeline (tháng 3)

| Tuần | Việc cần làm | Ghi chú |
|------|-------------|---------|
| **Tuần 1 (4-10/3)** | Outreach 3-5 targets ngay ngày 1, gửi pitch/proposal, follow up liên tục | Không chờ, gửi ngay |
| **Tuần 2 (11-17/3)** | Negotiate terms, chốt deal cuối tuần 2 | Nếu chưa chốt → mở rộng targets |
| **Tuần 3 (18-24/3)** | LAUNCH campaign — cả 2 bên promote, monitor agents + completions | X/DMs/TG đều promote campaign |
| **Tuần 4 (25-31/3)** | Đánh giá kết quả, compile case study, quyết định tháng 4 | |

### Backup (nếu không chốt được deal)

Tuần 3-4: Chạy sandbox quests lớn hơn (self-sponsor), đẩy mạnh DM builders + X, tự tạo campaign không cần partner. Vẫn có data để đánh giá cuối tháng.

### Rủi ro & Mitigation

| Rủi ro | Mitigation |
|--------|-----------|
| Ít agents tham gia | Tự onboard agents, seed sandbox quests song song, partner BNB agent creators tạo funnel |
| Đối tác không commit promote | Ký agreement rõ về promotion commitments trước launch, mutual KPIs |
| Technical issues | Product đã mainnet + 161 tests ✅. Monitor escrow health endpoint real-time |
| Perception là bot farm | Framing: "on-chain auto-verified" + show tx hash proof. USP = verified usage, KHÔNG PHẢI "AI thay người" |
| Security concern từ users | "Sợ agent cầm tiền đi đánh lung tung" → Escrow controlled (tiền nằm trong contract, ko ở agent). Agent chỉ nhận reward SAU KHI proof verified |
| Sponsor lo skill chỉ farmers dùng | Retention tracking 30 ngày chứng minh ongoing usage. Có thể thêm verify bằng additional tx |
| Quest Platform (tay to) tự build | Window 3-6 tháng. Họ outsource rẻ hơn in-house ở giai đoạn test. Mình chạy nhanh xây user base + data moat |
| Ai tạo skill khi partner agree? | ClawQuest (Người 3) chủ động wrap MCP/SDK của partner thành skill. Partner chỉ cần approve + fund reward pool |

---

## 7. North Star Metrics

> Tháng 3 chia thành 2 phase: **Waitlist (13-20/3)** và **Public Launch (20/3+)**. Mỗi phase có metric riêng.

### Phase 1 (13-20/3): **Total Waitlist Signups** + **Viral Coefficient**

| Metric | Tại sao? | Target |
|--------|----------|--------|
| **Total Waitlist Signups** | Gộp mọi nỗ lực (content, BD, Reddit, collabs) vào 1 con số. Leading indicator cho traction khi pitch partners tuần 4. | 500-1,000 |
| **Viral Coefficient** | Đo hiệu quả referral loop — mỗi signup trung bình mang về bao nhiêu signup mới. >1.0 = organic growth. | >1.2 |

### Phase 2 (20/3+): **Total USDC Distributed to Agents**

| Tại sao metric này? | Giải thích |
|---------------------|------------|
| Sponsor quan tâm | Tiền ra khỏi Escrow = có agent làm việc thật |
| Agent/Dev quan tâm | Tiền ra khỏi Escrow = platform trả tiền thật |
| Gộp mọi nỗ lực | BD, content, tech — tất cả đều quy về: "Hôm nay có thêm USDC nào giải ngân không?" |
| Case study | Con số USDC = social proof mạnh nhất khi pitch partners tháng sau |

---

## 8. Growth Tactics (Nâng cao)

> Không bắt buộc tuần 1, triển khai khi có bandwidth.

### Tactic 1: "Bắt cóc" Sponsors (Show, Don't Tell)

1. Dev team viết 1 con AI Agent nhỏ dùng API/MCP của **chính Sponsor targeted** (VD: Aerodrome)
2. Cho agent tự swap/stake/farm points trên protocol đó
3. Quay clip / chụp screenshot kết quả
4. Post lên X, tag protocol: *"AI Agent vừa auto-farm yield trên @Aerodrome. Muốn hàng ngàn agents cày TVL cho bạn? DM us — 0% fee tháng này."*

### Tactic 2: Contrarian Content (Tạo bão X)

**Owner: Tom**

- *"Airdrops are dead. Pay APIs, not human clickers."*
- *"Your AI framework is useless if it can't earn money."* → Tag LangChain/CrewAI founders
- *"Install count is the vanity metric of AI skills."*

### Tactic 3: "Leaderboard Wars" giữa Agent Frameworks

1. Tạo quest mở cho tất cả agents
2. Leaderboard công khai: "Top earning agents by framework"
3. Post kết quả hàng tuần: "ElizaOS agents earned $X, CrewAI agents earned $Y"
4. Framework nào thắng → tự RT flex → organic traffic cho ClawQuest

### Tactic 4: Waitlist Leaderboard Wars (Phase 1)

**Owner: Tom + Sarah**

1. Post daily waitlist stats trên X: *"Day 3: 247 agent owners signed up. Top referrer has 18 invites. Can you beat them?"*
2. Tag top referrers → họ RT → organic reach
3. Tạo urgency: *"87/100 OG Pioneer slots claimed. 13 left."*

### Tactic 5: Reddit Seeding Playbook (Phase 1)

**Owner: Ryan + Sarah**

| Subreddit | Angle | Post format |
|-----------|-------|-------------|
| r/artificial | AI agent earnings, automation | *"Built an AI agent that earns crypto by completing quests"* — show results |
| r/cryptocurrency | Crypto earning opportunity | *"New platform pays AI agents in USDC for completing tasks"* — focus on rewards |
| r/web3 | Web3 innovation | *"AI agents are replacing airdrop farmers — here's how"* — narrative angle |
| r/SideProject | Builder story | *"We built a job market for AI agents"* — founder story |

> **Rules:** Không spam. Mỗi post phải add value. Comment trước, post sau. Mỗi subreddit tối đa 1 post/tuần.
