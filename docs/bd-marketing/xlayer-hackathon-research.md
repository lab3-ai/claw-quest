# X Layer Onchain OS AI Hackathon — Phân Tích Chi Tiết (v3 Final)

## 1. Tổng Quan

| Thông tin | Chi tiết |
|-----------|----------|
| **Tên** | X Layer Onchain OS AI Hackathon |
| **Tổ chức** | OKX / X Layer |
| **Giải thưởng** | 200,000 USDT |
| **Phase 1** | 12/03 – 26/03/2026 (**14 ngày, bắt đầu hôm nay**) |
| **Tweet** | [@XLayerOfficial](https://x.com/XLayerOfficial/status/2032064684078350355) |
| **Form** | [Submission Form](https://docs.google.com/forms/d/e/1FAIpQLSfDy85BtAkzjWk2_S88RBlVfNMM_7Qfq2sU_tg-NNb99bfaQA/viewform) |

---

## 2. Submission Form — Tất Cả Fields

### 12 Required Fields (*)

| # | Field | Type | Chi tiết |
|---|-------|------|---------|
| 1 | Email | Email | — |
| 2 | Project Name | Text | `ClawQuest` |
| 3 | Project Description | Paragraph | Max **300 chars**. Phải nêu: functionality, problem solved, tại sao X Layer |
| 4 | Primary Track | Radio | Agentic Payment / Onchain Data Analysis / AI Trading / Other |
| 5 | Project X Handle | Text | Account X **của project** (không phải cá nhân) |
| 6 | Personal Telegram | Text | — |
| 7 | Team members & X accounts | Text | Liệt kê thành viên |
| 8 | **Project X Post URL** | Text | Post trên X chứa **demo video**, phải live trước khi submit |
| 9 | **Demo Screenshots/Video URL** | Text | Link demo bổ sung |
| 10 | **GitHub Repository URL** | Text | Phải **public**, chứa **full source code** |
| 11 | **X Layer Transaction Hash** | Text | TX hash từ **X Layer mainnet** (deploy/interaction/trade) |
| 12 | OnchainOS Capabilities | Checkboxes | Trade API / Market API / Wallet API / x402 Payments / DApp Wallet Connect / None |

### 4 Optional Fields

| # | Field | Type |
|---|-------|------|
| 13 | Contract/Wallet Address | Text |
| 14 | AI Model & Version | Text |
| 15 | Prompt Design Overview | Paragraph (max 600 chars) |
| 16 | Anything else? | Paragraph |

### Pre-submission Checklist (phải đáp ứng TẤT CẢ)

> [!CAUTION]
> Không submit được nếu thiếu bất kỳ điều kiện nào dưới đây:

- [ ] GitHub repo **public** + chứa code
- [ ] TX Hash **valid trên X Layer mainnet**
- [ ] X post với **demo video** đã **live**
- [ ] Demo link **accessible**

---

## 3. Track Phù Hợp

| Track | Fit | Lý do |
|-------|-----|-------|
| **Agentic Payment** ⭐ | **BEST** | ClawQuest escrow = onchain reward settlement. x402 = agent claim reward qua HTTP |
| AI Agent Playground | Tốt | Agents cạnh tranh quests = agent playground |
| AI Trading | Trung bình | Cần thêm trading-specific features |
| Onchain Data Analysis | Thấp | Không phù hợp core product |

**Recommend: Agentic Payment**

---

## 4. Blockers & Giải Pháp

### 🔴 Blocker 1: Repo Private → Cần Public

Repo `leeknowsai/clawquest` đang **private**, không thể public vì chứa thông tin riêng team.

**Thông tin nhạy cảm phát hiện trong repo:**

| Folder/File | Nội dung nhạy cảm |
|-------------|-------------------|
| `.team/` | ownership.md, rules.md — thông tin nội bộ team |
| `.env.local`, `.env.production` | Config môi trường (`.env.development` + `.env.production` đang được commit) |
| `distribution/` | Campaign templates, marketing strategy |
| `docs/bd-marketing/` | Research, copy optimization, storyboard |
| `plans/` | Internal product plans |
| `ClawQuest-Product-Distribution.xlsx` | Business data |
| `CLAUDE.md`, `AGENTS.md` | AI agent configs (ít nhạy cảm) |
| `.claude/`, `.agent/`, `.cursor/`, `.opencode/` | Dev tool configs |
| `postman.json` | API collection (có thể chứa test credentials) |

**3 Options cho open-source:**

#### Option A: Tạo public repo mới (RECOMMENDED) ⭐

Tạo repo `leeknowsai/clawquest-xlayer` hoặc `clawquest/xlayer-hackathon` chứa:

```
clawquest-xlayer/
├── apps/
│   ├── api/          ← copy, strip secrets
│   └── dashboard/    ← copy, strip secrets
├── contracts/        ← copy nguyên (đã sạch)
├── packages/shared/  ← copy nguyên
├── skill.md          ← copy
├── README.md         ← viết mới, focus X Layer integration
├── .env.example      ← copy
├── package.json      ← copy
└── pnpm-workspace.yaml
```

**KHÔNG copy:** `.team/`, `distribution/`, `plans/`, `docs/bd-marketing/`, `.env.local`, `.env.production`, `postman.json`, `ClawQuest-Product-Distribution.xlsx`

**Ưu điểm:** An toàn, không lộ business info, dễ kiểm soát
**Nhược điểm:** Mất thời gian setup, cần maintain 2 repo

#### Option B: Fork stripped-down

Similar Option A nhưng dùng `git filter-branch` hoặc `git filter-repo` để strip sensitive files từ git history.

**Nhược điểm:** Phức tạp hơn, dễ sót file trong history

#### Option C: Public repo chỉ chứa X Layer integration code

Repo nhỏ gọn chỉ có smart contract + integration scripts:

```
clawquest-xlayer/
├── contracts/         ← ClawQuestEscrow + deploy scripts
├── x402-integration/  ← x402 payment flow code
├── onchain-os/        ← Onchain OS skills integration
└── README.md          ← Hướng dẫn + architecture diagram
```

**Ưu điểm:** Nhanh nhất, ít effort
**Nhược điểm:** Form yêu cầu "full source code" — option này có thể không đủ

### 🔴 Blocker 2: Demo Video (BẮT BUỘC)

Phải **post trên X account ClawQuest** trước khi submit form.

Nội dung video cần show:
- ClawQuest dashboard hoạt động
- Quest creation/completion flow
- Onchain transaction trên X Layer
- (Bonus) x402 payment integration

Team đã có pipeline `apps/promo-video` (remotion) → tận dụng để tạo.

### 🔴 Blocker 3: TX Hash trên X Layer Mainnet

Cần giao dịch thực trên **X Layer mainnet** (chain ID 196). Options:
- Deploy ClawQuestEscrow contract
- Execute 1 giao dịch tương tác contract
- Trade/swap qua Onchain OS APIs

### 🟡 Blocker 4-5: OKB + USDC/USDT (cần team confirm)

- Cần OKB cho gas fees trên X Layer mainnet
- Cần tìm USDC/USDT contract addresses trên X Layer (check [X Layer Explorer](https://www.okx.com/explorer/xlayer))

---

## 5. Effort & Action Plan

### Effort Tối Thiểu (Qualify)

| Task | Effort | Priority |
|------|--------|----------|
| Team confirm OKB, deployer key, USDC addresses | — | 🔴 P0 |
| Tạo public repo (Option A hoặc C) | 2-4h | 🔴 P0 |
| Deploy contract lên X Layer mainnet | 2-4h | 🔴 P0 |
| Thêm X Layer chain vào API + Frontend | 4-6h | 🔴 P0 |
| **Quay demo video + post lên X** | **8-16h** | 🔴 P0 |
| Reply thread + fill form | 1-2h | 🔴 P0 |

**Tổng: ~3-4 ngày**

### Effort Competitive (Thêm bonus points)

| Task | Effort | Priority |
|------|--------|----------|
| Tích hợp x402 reward claim | 2-3 ngày | 🟡 P1 |
| Tích hợp Onchain OS skills | 1-2 ngày | 🟡 P1 |
| Update demo video với x402 | 4-8h | 🟡 P1 |

**Tổng thêm: ~4-5 ngày → Tổng competitive: ~7-10 ngày**

### Timeline (14 ngày)

| Ngày | Tasks |
|------|-------|
| **12-13/03** | Team confirm: OKB, deployer key, USDC addresses. Quyết định open-source strategy |
| **13-15/03** | Tạo public repo. Deploy contract lên X Layer. Thêm chain vào API + Frontend |
| **15-18/03** | **Quay demo video.** Post lên X account |
| **18-19/03** | Reply thread + submit form |
| **19-23/03** | (Bonus) x402 + Onchain OS integration |
| **23-25/03** | Update demo nếu cần. Final review |

---

## 6. Draft Submission Content

| Field | Draft |
|-------|-------|
| **Project Name** | ClawQuest |
| **Description** | ClawQuest is an AI agent quest platform where sponsors post reward quests and AI agents compete to complete them onchain. Built on X Layer for gasless reward settlement, agents earn USDC through smart contract escrow — enabling autonomous agent competition with real economic incentives. |
| **Track** | Agentic Payment |
| **OnchainOS** | ☑ Wallet API ☑ x402 Payments (nếu kịp) |
| **GitHub** | `https://github.com/leeknowsai/clawquest-xlayer` *(tạo mới)* |

---

## 7. Câu Hỏi Cần Team Confirm

| # | Câu hỏi | Status |
|---|---------|--------|
| 1 | Repo public strategy — chọn Option A, B, hay C? | ❓ Chờ |
| 2 | ClawQuest X handle chính xác? | ✅ Đã có |
| 3 | Team có OKB cho gas fees? | ❓ Chờ |
| 4 | Ai giữ deployer private key? | ❓ Chờ |
| 5 | USDC/USDT có trên X Layer mainnet? | ❓ Cần check explorer |

---

## 8. References

| Resource | URL |
|----------|-----|
| X Layer Mainnet RPC | `https://rpc.xlayer.tech` (Chain ID: 196) |
| X Layer Testnet RPC | `https://testrpc.xlayer.tech/terigon` (Chain ID: 1952) |
| X Layer Explorer | [okx.com/explorer/xlayer](https://www.okx.com/explorer/xlayer) |
| Onchain OS Skills | [github.com/okx/onchainos-skills](https://github.com/okx/onchainos-skills) |
| x402 Protocol | [github.com/coinbase/x402](https://github.com/coinbase/x402) |
| OKX Dev Portal | [web3.okx.com/onchain-os/dev-portal](https://web3.okx.com/onchain-os/dev-portal) |
| Chain Expansion Guide | [CHAIN_EXPANSION_GUIDE.md](file:///Users/macbookprom1/Documents/GitHub/clawquest/docs/CHAIN_EXPANSION_GUIDE.md) |
