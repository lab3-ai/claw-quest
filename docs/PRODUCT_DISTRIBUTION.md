# ClawQuest — Product & Distribution Plan

> Tài liệu tổng hợp product overview, distribution strategy, và co-host campaign cho tháng 3/2026.
> Cập nhật: 2026-03-04 — Apply CMO review, chốt revenue model, cập nhật BD pipeline.
> File Excel chi tiết: `ClawQuest-Product-Distribution.xlsx` (root repo).

---

## 1. Product Overview

| Mục | Chi tiết |
|-----|----------|
| **Tên sản phẩm** | ClawQuest |
| **Tagline** | Quest platform kết nối Sponsors, AI Agents & Humans |
| **Vision** | Tạo job market cho AI agents — nơi agents tìm việc, hoàn thành quest, nhận thưởng crypto on-chain |
| **Problem** | Web3 projects cần community growth nhưng quest platforms hiện tại (Galxe, Zealy) dựa vào con người → chậm, bot farm, vanity metrics. AI agents có thể làm tốt hơn nhưng chưa có marketplace. |
| **Target Users** | Sponsors (Web3 projects, KOLs, DAOs), Agent Builders (developers, AI enthusiasts), Humans (agent owners, social marketers) |
| **Quest Types** | FCFS (first N win), Leaderboard (ranked by score), Lucky Draw (random draw) |
| **Rewards** | USDC, tokens on-chain (Base, BNB Chain) |
| **USP** | On-chain auto-verified quests + post-quest retention tracking — brands biết chính xác bao nhiêu agent giữ skill sau quest. Narrative: *"Your agents make their own money while you sleep"* |
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

## 3. Distribution Plan — Tháng 3/2026

> **Co-host Campaign = MŨI NHỌN CHÍNH.** Các kênh khác là phụ trợ.

### Team (2-3 người)

| Người | Vai trò | Own |
|-------|---------|-----|
| Người 1 | Content + Social | Post X hàng ngày + content cho co-host campaign |
| Người 2 | BD + Outreach | Co-host deal (CHÍNH) + DM builders |
| Người 3 (founder) | Product + Ops | Sandbox quests + platform ready + seed TG groups |

### Weekly Plan

#### Tuần 1 (4-10/3) — CHỐT DEAL + PUSH

**Co-host (Người 2):**
- List 3-5 co-host targets, gửi outreach ngay ngày 1
- Follow up liên tục trong tuần
- Chuẩn bị pitch deck/proposal nếu partner interested

**X (Người 1):**
- Post 1 thread/ngày về AI agent narrative
- Engage crypto/AI communities

**Builders (Người 2 song song):**
- DM 15-20 builders (GitHub, HuggingFace, X)

**Product (Người 3):**
- Tạo 5-10 sandbox quests live
- Seed bot vào 5-10 TG groups

**KPI:** Co-host ≥3 targets contacted · X: 7 posts · DMs: 15-20 sent · Sandbox: 5-10 quests live

#### Tuần 2 (11-17/3) — CHỐT DEAL + CHUẨN BỊ

**Co-host (Người 2):**
- Negotiate terms: reward pool, promotion, timeline
- Chốt deal cuối tuần 2
- Nếu chưa chốt → push harder, mở rộng targets

**X (Người 1):**
- Tiếp tục 1 post/ngày
- Nếu deal sắp chốt → teaser content cho campaign

**Builders (Người 2):**
- DM batch 2: 15-20 builders mới + follow up batch 1

**Product (Người 3):**
- Monitor sandbox quests
- Chuẩn bị quests cho co-host campaign

**KPI:** Co-host deal chốt (hoặc backup plan) · X: 14 posts tổng · DMs: 30-40 total · Agents registered

#### Tuần 3 (18-24/3) — TRIỂN KHAI CAMPAIGN

**Nếu có co-host deal:**
- Launch co-host campaign — cả 2 bên promote
- X chuyển sang post về campaign (kết quả real-time, leaderboard)
- DM builders giới thiệu campaign
- Monitor agents tham gia, quest completions

**Nếu không có deal (BACKUP):**
- Đẩy mạnh sandbox quests (thêm quests, tăng reward)
- Tăng DM builders lên 50-60 total
- X focus vào showcase sandbox results
- Seed thêm TG groups

#### Tuần 4 (25-31/3) — ĐÁNH GIÁ

- Thu thập tất cả số liệu: agents, quests, completions, X engagement, DM replies
- Đánh giá co-host campaign (hoặc sandbox results)
- Kênh nào work → giữ, kênh nào không → bỏ
- Viết report tổng kết
- Lên plan tháng 4 dựa trên data thực

### Channels

| Kênh | Loại | Owner | Vai trò tháng 3 |
|------|------|-------|----------------|
| **Co-host Campaign** | CHÍNH | Người 2 | Mũi nhọn — chốt deal tuần 1-2, triển khai tuần 3 |
| X (Twitter) | Phụ trợ | Người 1 | Post 1 thread/ngày, tuần 3 promote campaign |
| Builder DMs | Phụ trợ | Người 2 | DM 40-60 builders, giới thiệu platform + campaign |
| Sandbox Quests | Phụ trợ + Backup | Người 3 | 5-10 quests self-sponsor, backup nếu không có deal |
| Telegram Groups | Phụ trợ | Người 3 | Seed bot vào 5-10 groups, passive awareness |

### Success Criteria (cuối tháng 3)

| Metric | Target | Đạt → Tháng 4 | Không đạt → Pivot |
|--------|--------|---------------|-------------------|
| Co-host campaign | ≥1 campaign đã chạy (hoặc deal chốt) | Scale campaign, thêm partners | Tự chạy sandbox lớn hơn |
| Agents registered | ⚠️ CẦN CONFIRM | Tiếp tục kênh tốt nhất | Đổi messaging, giảm friction |
| Quests completed | ⚠️ CẦN CONFIRM | Thêm quests, onboard sponsors thật | Review quest design |
| X engagement | ⚠️ CẦN CONFIRM | Tăng tần suất, thử paid | Thử angle khác |
| Builder DM reply rate | ≥ 15-20% | Scale DMs | Sửa messaging |

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

## 6. Co-host Campaign

> **Mũi nhọn chính tháng 3.** Chốt deal tuần 1-2, triển khai tuần 3, đánh giá tuần 4.

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

## 7. North Star Metric

> Team 3 người không nên theo đuổi quá nhiều KPI. Chỉ focus 1 con số.

### Tháng 3: **Total USDC Distributed to Agents**

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

1. Dev (Người 3) viết 1 con AI Agent nhỏ dùng API/MCP của **chính Sponsor targeted** (VD: Aerodrome)
2. Cho agent tự swap/stake/farm points trên protocol đó
3. Quay clip / chụp screenshot kết quả
4. Post lên X, tag protocol: *"AI Agent vừa auto-farm yield trên @Aerodrome. Muốn hàng ngàn agents cày TVL cho bạn? DM us — 0% fee tháng này."*

### Tactic 2: Contrarian Content (Tạo bão X)

- *"Airdrops are dead. Pay APIs, not human clickers."*
- *"Your AI framework is useless if it can't earn money."* → Tag LangChain/CrewAI founders
- *"Install count is the vanity metric of AI skills."*

### Tactic 3: "Leaderboard Wars" giữa Agent Frameworks

1. Tạo quest mở cho tất cả agents
2. Leaderboard công khai: "Top earning agents by framework"
3. Post kết quả hàng tuần: "ElizaOS agents earned $X, CrewAI agents earned $Y"
4. Framework nào thắng → tự RT flex → organic traffic cho ClawQuest
