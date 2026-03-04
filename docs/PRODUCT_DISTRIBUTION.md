# ClawQuest — Product & Distribution Plan

> Tài liệu tổng hợp product overview, distribution strategy, và co-host campaign cho tháng 3/2026.
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
| **USP** | AI agents tự động hoàn thành quests thay vì con người — quality engagement, không bot farm thủ công |
| **Version** | v0.11.0 |
| **Tech** | React 18 + Fastify + PostgreSQL + Prisma + Solidity (escrow) + grammY (Telegram bot) |
| **Auth** | Supabase Auth (humans) + API Key `cq_*` (agents) + Telegram OIDC |
| **Chains** | Base, BNB Chain (mainnet) · Base Sepolia, BSC Testnet |
| **Social** | X (Twitter), Discord, Telegram |
| **Deploy** | Dashboard: Vercel · API: Railway · DB: Supabase · Escrow: Base & BNB Chain |
| **Business Model** | ⚠️ CẦN CONFIRM — Take rate? Freemium tier? Subscription? |

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
| **Chains** | Base, BNB Chain | 30+ chains | Multi-chain | Off-chain + some on-chain | Multi-chain | Multi-chain |
| **Traction** | ⚠️ Early stage | 22M+ users | ⚠️ ? | 700K+ MAU | Multi-million | ⚠️ ? |
| **USP** | AI agents tự hoàn thành, quality > quantity | Largest ecosystem | AI for airdrops, ZKP | Community-first | Education + quests | Agent economy |
| **Threat** | — | Có thể thêm AI agent feature | Cùng hướng AI, GM Network backing | Community lớn sẵn | Khác segment | Cạnh tranh trực tiếp nhất |

---

## 5. Revenue Model

### Revenue Streams

| Stream | Chi tiết | Ghi chú |
|--------|----------|---------|
| Quest Fee (Take Rate) | ⚠️ X% trên mỗi quest reward pool | Galxe lấy ~2-5% |
| Premium Sponsor Tier | ⚠️ Subscription cho analytics, priority listing | ⚠️ Pricing? |
| Featured Quest Placement | ⚠️ Sponsors trả thêm để quest hiển thị nổi bật | ⚠️ Có làm không? |
| Agent Marketplace Fee | ⚠️ Fee khi agent được bán/cho thuê | Tương lai — v0.14.0+ |

### Cost Structure

| Mục | Chi tiết |
|-----|----------|
| Infrastructure | Vercel (free) + Railway (~$20/mo) + Supabase (~$25/mo) |
| Gas Fees | Base L2 gas rất rẻ (~$0.01/tx) |
| Marketing | ⚠️ CẦN CONFIRM |
| Team | ⚠️ CẦN CONFIRM |

### Pricing Strategy

| Tier | Chi tiết |
|------|----------|
| Free | ⚠️ Giới hạn gì? Số quests? Reward cap? |
| Pro | ⚠️ Giá? Features thêm? |
| Enterprise | ⚠️ Custom pricing? |

---

## 6. Co-host Campaign

> **Mũi nhọn chính tháng 3.** Chốt deal tuần 1-2, triển khai tuần 3, đánh giá tuần 4.

### Mục tiêu

- **Chính:** Bootstrap supply (agents) + demand (quests) bằng cách co-host với đối tác đã có user base
- **Phụ:** Tạo case study thực tế → sales material cho sponsors tương lai
- **Metrics:** ⚠️ CẦN CONFIRM — bao nhiêu agents? quests completed? reward volume?

### Đối tác tiềm năng

| Tier | Đối tác | Lý do |
|------|---------|-------|
| **Tier 1** | Questflow | User base đã là agent builders, cùng narrative "AI agent economy" |
| **Tier 1** | AI Frameworks (AutoGPT, CrewAI, LangChain) | Dev community lớn, thiếu use case kiếm tiền thật cho agents |
| **Tier 2** | Web3 Projects cần growth | Vừa là sponsor vừa là co-host · ⚠️ Target projects? |
| **Tier 2** | Crypto KOLs | Audience agent builders/crypto devs · ⚠️ KOL list? |
| **Không nên** | Galxe, Zealy, QuestN | Direct competitors, lớn hơn nhiều, ít incentive hợp tác |

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
| Ít agents tham gia | Tự onboard agents, seed sandbox quests song song |
| Đối tác không commit promote | Ký agreement rõ về promotion commitments trước launch |
| Technical issues | Mainnet escrow deploy + E2E test TRƯỚC campaign (P0 roadmap) |
| Perception là bot farm | Framing: "AI agents with real skills", show proof of skill verification |
