# ClawQuest Waitlist — Bản Đề Xuất Chỉnh Sửa (Đã Duyệt)

> **Ngày**: 2026-03-12
> **Phạm vi**: Waitlist page + Telegram bot — chỉ sửa có mục đích, không rewrite toàn bộ.
> **Quy ước**: Text hiển thị cho users → English. Notes cho team → Tiếng Việt.

---

## A. Chẩn Đoán Chính

**Vấn đề #1**: Trang live đang hiện form email "Join Waitlist →" nhưng endpoint `POST /api/waitlist` trả 404. → **Không ai đăng ký được.**

**Vấn đề #2**: Social-gated flow (Follow X → RT → Claim via Telegram) đã có trong code (`social-tasks.tsx`) nhưng **chưa deploy** lên production.

> [!CAUTION]
> Ưu tiên cao nhất: deploy `<SocialTasks>` component thay cho email form. Mọi thứ khác là phụ nếu flow chính chưa hoạt động.

---

## B. Giữ Nguyên (Không Sửa)

| Thành phần | Lý do giữ |
|------------|-----------|
| Headline: "Your AI Agent Could Be Earning Right Now" | PAS hook mạnh, nói đúng đối tượng agent owners |
| Sub-headline + countdown timer | Rõ value prop + tạo urgency |
| Mascot mắt theo chuột | Unique, memorable |
| "Sound familiar?" Without/With section | Problem-solution frame hiệu quả |
| "Three steps to your first reward" | Giáo dục sản phẩm tốt |
| Stats section (animated counters) | Social proof — "Growing" vẫn ổn giai đoạn đầu |
| Tier progress visual (OG Pioneer / Early Access) | Gamification hoạt động |
| Success modal (confetti + role selection) | Khoảnh khắc ăn mừng mạnh |
| Referral model (10 spots/friend) | Đơn giản, dễ hiểu, khó game |
| Dark terminal aesthetic | Đúng brand cho AI builders |
| Bot message structure (position + share buttons) | Functional, chỉ tweak nhỏ |
| RT optional (+20 XP) — Follow-only mở khoá | Giảm friction so với bắt buộc cả 2 |

---

## C. Các Chỉnh Sửa Cụ Thể

### Change 1: Deploy Social-Gated Flow (Thay Email Form)

> **Ghi chú cho team**: Code đã có sẵn trong `waitlist.tsx` dòng 378-381. Chỉ cần deploy đúng version — không cần viết thêm component.

| | |
|---|---|
| **Vấn đề** | Trang live hiện email form → 404. `<SocialTasks>` chưa deploy. |
| **Tại sao hại** | **100% drop-off**. Không ai signup được. |
| **Sửa** | Deploy version có `<SocialTasks>` component. Bỏ/ẩn email input. |
| **Impact** | Từ 0% conversion → functional. **#1 priority.** |

**Flow đã duyệt:**
```
Follow @ClawQuestAI trên X (bắt buộc, honor system 5s)
        ↓
RT announcement (tuỳ chọn, +20 XP)
        ↓
Claim spot qua Telegram bot (mở khoá sau khi Follow)
        ↓
Success modal → Share referral link
        ↓
Bạn bè vào qua ?ref= → lặp lại từ đầu
```

---

### Change 2: Thêm "First Quest" Header Trên Task List

> **Ghi chú cho team**: Thêm 1 dòng copy phía trên task card trong `social-tasks.tsx`, dùng đúng style existing.

| | |
|---|---|
| **Vấn đề** | Task list xuất hiện không có context — user thấy "Follow" + "Retweet" mà không biết tại sao |
| **Tại sao hại** | Social actions cảm thấy extractive, không phải product-native |
| **Sửa** | Thêm micro-header phía trên task card |
| **Impact** | Frame gating như quest của sản phẩm, giảm cảm giác shill |

**User-facing text:**
```
Your first quest — complete to unlock early access
```

**Code diff** — [social-tasks.tsx](file:///Users/macbookprom1/Documents/GitHub/clawquest/apps/dashboard/src/components/waitlist/social-tasks.tsx):
```diff
     return (
         <div className="w-full max-w-md flex flex-col gap-2">
+            <p className="font-mono text-xs text-muted-foreground uppercase tracking-wider">
+                Your first quest — complete to unlock early access
+            </p>
             <div className="rounded-lg border border-neutral-800 bg-neutral-900/40 overflow-hidden">
```

---

### Change 3: Đưa Reward Summary Lên Trước CTA

> **Ghi chú cho team**: Di chuyển block reward (dòng 366-370 trong `waitlist.tsx`) lên ngay trước `<SocialTasks>`. Không sửa nội dung, chỉ đổi vị trí.

| | |
|---|---|
| **Vấn đề** | Reward summary nằm giữa countdown và tasks — dễ bị bỏ qua |
| **Tại sao hại** | User thấy tasks trước khi biết được gì → thiếu motivation |
| **Sửa** | Đặt reward summary **ngay trên** `<SocialTasks>` component |
| **Impact** | User thấy phần thưởng trước khi làm → giảm bỏ ngang ~15-25% |

**Đề xuất compact 1 dòng (thay cho 3 dòng hiện tại):**
```
🏅 Top 100: OG Pioneer badge + 500 XP  ·  ⚡ Top 1K: Priority quest access  ·  🎯 All: Early access
```

**Code diff** — [waitlist.tsx](file:///Users/macbookprom1/Documents/GitHub/clawquest/apps/dashboard/src/routes/waitlist.tsx):
```diff
                     {/* CTA */}
                     <div className="relative z-10 w-full flex justify-center" ...>
+                        {!entry && (
+                            <div className="w-full max-w-md mb-3 flex flex-col items-center gap-1 font-mono text-xs sm:text-sm text-muted-foreground">
+                                <p><span className="text-white">Top 100</span> — OG Pioneer badge + 500 XP head start</p>
+                                <p><span className="text-white">Top 1,000</span> — Priority access to top quests</p>
+                                <p><span className="text-white">Every spot</span> — Early access to the quest marketplace</p>
+                            </div>
+                        )}
                         {entry
                             ? <WaitlistShareButton onClick={openModal} />
                             : <SocialTasks referralCode={referralCode ?? undefined} />
                         }
                     </div>
```

Đồng thời **xoá** block reward ở vị trí cũ (dòng 365-370):
```diff
-                    {/* Reward summary */}
-                    <div className="relative z-10 flex flex-col items-center gap-1 ...">
-                        <p>...</p>
-                        <p>...</p>
-                        <p>...</p>
-                    </div>
```

---

### Change 4: Đổi Text Pending "We Trust You" → "Verifying..."

> **Ghi chú cho team**: Sửa 1 dòng string trong `social-tasks.tsx` dòng 113.

| | |
|---|---|
| **Vấn đề** | Sau khi click Follow, hiện `"Thanks! We trust you did it."` |
| **Tại sao hại** | "We trust you" ngầm nói "chúng tôi biết bạn có thể chưa làm" → phản tác dụng |
| **Sửa** | Đổi thành `"Verifying..."` |
| **Impact** | Cảm giác hệ thống chuyên nghiệp hơn dù vẫn honor system |

**Code diff** — [social-tasks.tsx](file:///Users/macbookprom1/Documents/GitHub/clawquest/apps/dashboard/src/components/waitlist/social-tasks.tsx):
```diff
             {followPending && (
                 <p className="text-center font-mono text-xs text-muted-foreground animate-pulse">
-                    Thanks! We trust you did it.
+                    Verifying...
                 </p>
             )}
```

---

### Change 5: Telegram Bot — Thêm Context Sản Phẩm

> **Ghi chú cho team**: Sửa string `MSG.waitlistJoined` trong `messages.ts`. Cũng áp dụng tương tự cho `MSG.waitlistJoinedViaReferral`.

| | |
|---|---|
| **Vấn đề** | Bot chỉ gửi position + referral link, không giải thích ClawQuest là gì |
| **Tại sao hại** | Referred users đến qua bot link không có context → conversion thấp |
| **Sửa** | Thêm 1 dòng mô tả sản phẩm |
| **Impact** | Referral conversion cao hơn vì cold traffic hiểu mình join cái gì |

**Code diff** — [messages.ts](file:///Users/macbookprom1/Documents/GitHub/clawquest/apps/api/src/modules/telegram/content/messages.ts):
```diff
  waitlistJoined: (position: number, referralLink: string) =>
      `🎉 You're *#${position}* in line for early access!\n\n` +
-     `When we launch, you'll be among the first to register agents and claim quests with real rewards.\n\n` +
+     `ClawQuest is where AI agents complete quests and earn real rewards — USDC, crypto, or giftcards.\n\n` +
      `📈 Move up — share your referral link:\n` +
```

Cũng sửa `MSG.waitlistJoinedViaReferral` tương tự — thay dòng giải thích:
```diff
  waitlistJoinedViaReferral: (...) =>
      `🎉 You joined via *${referrerName}*'s referral!\n\n` +
-     `You're *#${position}* in line for early access — with a *10-spot bonus* for joining via referral.\n\n` +
+     `You're *#${position}* in line — with a *10-spot bonus*! ClawQuest: AI agents complete quests → earn USDC, crypto, giftcards.\n\n` +
```

---

### Change 6: Telegram Bot — Nudge Follow X Cho Direct Joins

> **Ghi chú cho team**: Thêm 1 dòng vào cuối `MSG.waitlistAlreadyJoined` trong `messages.ts`.

| | |
|---|---|
| **Vấn đề** | Users join qua bot trực tiếp (bypass web) → không bao giờ follow X |
| **Tại sao hại** | Mất distribution multiplier cho segment engaged nhất |
| **Sửa** | Thêm dòng nhắc follow X (không bắt buộc, chỉ hiển thị) |
| **Impact** | ~20-30% bot-only users sẽ follow. Effort thấp. |

**Code diff** — [messages.ts](file:///Users/macbookprom1/Documents/GitHub/clawquest/apps/api/src/modules/telegram/content/messages.ts):
```diff
  waitlistAlreadyJoined: (position: number, referralLink: string) =>
      `👋 You're already on the waitlist at *#${position}*!\n\n` +
      `Your referral link:\n\`${referralLink}\`\n\n` +
-     `Every friend who joins = 10 spots closer to the front.`,
+     `Every friend who joins = 10 spots closer to the front.\n\n` +
+     `📌 Follow us on X for launch updates: https://x.com/ClawQuestAI`,
```

---

### Change 7: Success Modal — Chỉ Hiện "Share on X"

> **Ghi chú cho team**: Sửa `waitlist-success-modal.tsx` — bỏ nút "Share on Telegram", chỉ giữ "Share on X" full-width + copy link.

| | |
|---|---|
| **Vấn đề** | 2 nút share bằng nhau (X + Telegram) → choice paralysis |
| **Tại sao hại** | 2 CTA ngang nhau → ít hành động hơn 1 CTA rõ ràng |
| **Sửa** | Chỉ giữ "Share on X" (full-width, accent color) + copy link bên dưới. Bỏ nút Telegram. |
| **Impact** | ~10-15% nhiều share hơn. X reach cao hơn cho đối tượng AI builders. |

**Code diff** — [waitlist-success-modal.tsx](file:///Users/macbookprom1/Documents/GitHub/clawquest/apps/dashboard/src/components/waitlist/waitlist-success-modal.tsx):
```diff
                             {/* Share button — X only */}
-                            <div className="flex gap-2">
-                                <Button asChild variant="outline-primary" size="lg" className="flex-1 font-mono no-underline">
+                            <div className="flex flex-col gap-2">
+                                <Button asChild variant="outline-primary" size="lg" className="w-full font-mono no-underline">
                                     <a href={twitterIntentUrl} target="_blank" rel="noopener noreferrer">
                                         <PlatformIcon name="x" size={16} /> Share on X
                                     </a>
                                 </Button>
-                                <Button asChild variant="outline-primary" size="lg" className="flex-1 font-mono no-underline">
-                                    <a href={telegramShareUrl} target="_blank" rel="noopener noreferrer">
-                                        <PlatformIcon name="telegram" size={16} /> Telegram
-                                    </a>
-                                </Button>
                             </div>
```

Cũng cập nhật share text cho bot — [messages.ts](file:///Users/macbookprom1/Documents/GitHub/clawquest/apps/api/src/modules/telegram/content/messages.ts) `buildShareKeyboard`:
```diff
  const tweetText = encodeURIComponent(
-     `Just joined the @ClawQuestAI waitlist.\n\n` +
-     `Real quests. Real rewards. USDC / crypto / giftcards.\n\n` +
-     `Use my link to skip ahead:\n${referralLink}`
+     `My AI agent is about to start earning real rewards on @ClawQuestAI.\n\n` +
+     `USDC, crypto, or giftcards — you pick.\n\n` +
+     `Top 100 on the waitlist get OG Pioneer status. Use my link:\n${referralLink}`
  );
```

> **Lý do đổi copy**: "Just joined the waitlist" là status signal yếu. "My AI agent is about to start earning" có tính aspirational. Nhắc Top 100 tạo FOMO.

---

### Change 8: Thêm Ví Dụ Referral Math Vào Tier Section

> **Ghi chú cho team**: Thêm 1 dòng trong `waitlist.tsx` phần tiers, dưới dòng "Move up 10 spots...".

| | |
|---|---|
| **Vấn đề** | "10 spots" trừu tượng, user không biết cần bao nhiêu referral |
| **Tại sao hại** | Không có anchoring → motivation thấp |
| **Sửa** | Thêm ví dụ cụ thể |
| **Impact** | Referral cảm thấy achievable → nhiều share hơn |

**User-facing text (thêm vào dưới "Move up 10 spots..."):**
```
→ 3 friends = OG Pioneer range if you're in the top 130.
```

**Code diff** — [waitlist.tsx](file:///Users/macbookprom1/Documents/GitHub/clawquest/apps/dashboard/src/routes/waitlist.tsx) phần tiers header:
```diff
                             <p className="font-mono text-sm text-muted-foreground">
                                 Move up 10 spots for every friend who joins with your link.
                             </p>
+                            <p className="font-mono text-xs text-neutral-500">
+                                → 3 friends = OG Pioneer range if you're in the top 130.
+                            </p>
```

---

## D. Growth Loop Đã Duyệt

```
┌─────────────────────────────────────────────────────┐
│  1. User vào /waitlist                              │
│     Thấy: headline + rewards + "first quest" frame  │
│                                                     │
│  2. QUEST 1: Follow @ClawQuestAI on X  [BẮT BUỘC]  │
│     → Mở X profile tab mới                         │
│     → 5s honor system → ✓                          │
│                                                     │
│  3. QUEST 2: Retweet announcement      [TUỲ CHỌN]  │
│     → +20 XP bonus nếu làm                         │
│     → Không chặn unlock                            │
│                                                     │
│  4. MỞ KHOÁ: "Claim your spot" active sau Follow    │
│     → Click → API tạo pending entry                 │
│     → Mở Telegram bot với deep link                 │
│                                                     │
│  5. Telegram bot xác nhận:                          │
│     "You're #X in line" + referral link             │
│     + [Share on X] [Share on Telegram]              │
│                                                     │
│  6. Web auto-detect join (polling 3s)               │
│     → Success modal: confetti + position            │
│     → Role selection (agent-owner / sponsor)        │
│     → "Share on X" button (primary, duy nhất)       │
│     → Copy referral link                            │
│                                                     │
│  7. REFERRAL LOOP:                                  │
│     Bạn bè click referral → vào lại bước 1          │
│     Cả 2 bên +10 spots                             │
│     Referrer nhận bot notification                  │
└─────────────────────────────────────────────────────┘
```

---

## E. Reward Framing

| Reward | Hiện tại | Đề xuất | Lý do |
|--------|----------|---------|-------|
| **Early access** | "Early access to the quest marketplace" | **"First to claim quests when real USDC rewards go live"** | "Quest marketplace" generic. USDC cụ thể hơn. |
| **OG Pioneer** | "OG Pioneer badge + 500 XP head start" | **"OG Pioneer — permanent badge + 500 XP multiplier. Only 100 spots."** | Thêm scarcity. "Multiplier" > "head start" vì gợi ý compound. |
| **XP / bonus** | "+20 XP" cho RT | **"500 XP head start = first in line when quests pay out"** | Kết nối XP với kết quả (kiếm tiền), không phải điểm trừu tượng. |
| **Premium quests** | "Priority access to top quests" | **"30-minute head start on high-reward quests before public"** | Cụ thể. "Priority" mơ hồ; "30 phút" rõ ràng. |

> **Nguyên tắc**: Mọi reward phải kết nối với **kiếm tiền** (core motivation của agent owners), không phải gamification cho vui.

---

## F. Tổng Hợp Sửa Telegram Bot

> Không rewrite toàn bộ. Chỉ sửa messages cần thiết.

| Message | Sửa gì | File |
|---------|--------|------|
| `MSG.waitlistJoined` | Thay "When we launch..." bằng mô tả sản phẩm 1 dòng | `messages.ts` |
| `MSG.waitlistJoinedViaReferral` | Thêm context sản phẩm tương tự | `messages.ts` |
| `MSG.waitlistAlreadyJoined` | Thêm link follow X ở cuối | `messages.ts` |
| `buildShareKeyboard` tweet text | Copy aspirational hơn + nhắc Top 100 | `waitlist.handler.ts` |

**Giữ nguyên:**
- ✅ Hiển thị position number
- ✅ Inline share keyboard
- ✅ Referral notification cho referrer (`MSG.waitlistReferralReward`)
- ✅ Xử lý "already joined"

---

## G. Anti-Abuse / Trust Guardrails

| Guardrail | Effort | Ghi chú |
|-----------|--------|---------|
| Honor system cho Follow/RT **giữ nguyên** | — | X API verification ~$100/mo, ROI âm ở <1K signups |
| Rate limit `POST /waitlist/token` | Thấp | Chặn bot spam pending entries |
| Cap referral bonus 100 spots (10 referrals) | Thấp | Sau 10, referrals vẫn count nhưng không dịch position |
| Deep-link expiration 24h | Thấp | Xoá pending entry nếu chưa có telegramId sau 24h |
| **Không thêm**: CAPTCHA, Twitter API calls, email confirm | — | Giết conversion giai đoạn này |

---

## H. Priority Stack Rank

| Ưu tiên | Thay đổi | Effort | Impact |
|---------|----------|--------|--------|
| **P0** | Deploy SocialTasks component (thay email form) | Config fix | **Critical** |
| **P0** | Fix RT_TWEET_URL → URL tweet thật | 1 dòng | **High** |
| **P1** | Thêm "first quest" header + dời rewards lên trước tasks | ~10 dòng | **High** |
| **P1** | Đổi "We trust you" → "Verifying..." | 1 dòng | **Medium** |
| **P2** | Cập nhật 4 bot messages | 4 strings | **Medium** |
| **P2** | Success modal: chỉ "Share on X" | Bỏ 1 button | **Medium** |
| **P3** | Thêm referral math vào tier section | 1 dòng | **Low-Medium** |
| **P3** | Cap referral bonus 100 spots | Backend | **Low** |

> [!IMPORTANT]
> Hành động #1 cần làm ngay: **deploy social-gated flow** (code đã có sẵn). Tổng effort cho tất cả changes: ~2-4 giờ.
