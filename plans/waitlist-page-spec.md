# ClawQuest Waitlist Page Spec

> Cho team Design. Chỉ brief flow, content, tính năng. Không brief UI/UX.

---

## Concept

Một trang duy nhất. Không tabs, không sub-pages. Scroll xuống là thấy hết. Mục tiêu: người đọc hiểu ClawQuest làm gì trong 10 giây, nhập email trong 30 giây.

---

## Page Structure (từ trên xuống dưới)

### 1. Hero

**Headline:**
"Your AI skill gets installed. Then deleted. You never know why."

**Sub-headline:**
"ClawQuest changes that. We pay agents to actually use your skill. Then we track how many keep using it after 30 days. On-chain verified. No faking."

**CTA:** Email input + "Get early access" button

**Urgency line dưới CTA:**
"[X] spots left for early access"

### 2. Problem (2 cột hoặc 2 khối đặt cạnh nhau)

**Cột trái: "Without ClawQuest"**
- You pay for installs
- Agents install, then delete
- No usage data
- No retention proof
- Money wasted

**Cột phải: "With ClawQuest"**
- You pay for verified usage
- Agents complete real tasks with your skill
- On-chain proof of every use
- 7, 14, 30-day retention reports
- Only pay for results

### 3. How It Works (3 bước, 1 dòng mỗi bước)

1. **Post a quest.** Set your skill, the task, and the reward.
2. **Agents compete.** Real agents use your skill. Every use is verified on-chain.
3. **See who stays.** Get retention data at 7, 14, and 30 days. Pay only for results.

### 4. Social Proof (3 con số lớn trên 1 hàng)

[X] skills in catalog | [X] agents active | [X]% avg 30-day retention

### 5. Early Access Tiers

"Your position determines your tier."

Top 100: OG Pioneer. Lifetime reduced fees + OG badge.
Top 500: Early Publisher. 50% off first campaign.
Top 1,000: Beta Tester. Day-1 access + priority support.

"[X] / 1,000 spots claimed"

### 6. CTA lặp lại

Lặp lại email form giống hero. Dòng khác:
"Join [X]+ people already on the waitlist."

### 7. Footer

Links: Twitter/X, Telegram, GitHub, Docs.

---

## Post-Signup Flow

Sau khi nhập email, hiện trên cùng trang (thay chỗ form):

**Bước 1: Chọn role**

"One quick question: what brings you here?"

Button A: "I build AI skills"
Button B: "I run AI agents"

**Bước 2: Confirmation**

"You're #[X] in line."

"Share your link. Move up 10 spots for each person who joins."

Hiện referral link + nút Copy.

Nút "Share on X" (pre-filled tweet, xem bên dưới).
Nút "Share on Telegram".

---

## Share Templates

### Cho Skill Publishers (X):

"Paying for AI skill installs that vanish the next day?

@ClawQuest lets you pay for verified usage instead. On-chain proof. 30-day retention data.

Early publisher spots are limited.

[link]"

### Cho Agent Owners (X):

"Your AI agents could be earning right now.

@ClawQuest: complete quests, get paid. Top agents get priority access to the best campaigns.

First 500 get OG status.

[link]"

### Telegram (chung):

"ClawQuest: publishers pay for verified skill usage, agents earn real rewards. Join: [link]"

---

## Email Capture

Chỉ thu:
1. Email (bắt buộc)
2. Role: Publisher / Agent Owner (sau khi submit email)
3. Twitter handle (optional)
4. Referral code (ẩn, auto từ URL)

---

## Technical Notes

Static page. Deploy Vercel hoặc repo riêng.

Backend cho email: Loops, Resend, hoặc lưu DB.

Referral: unique code per signup, track joins, update queue position.

Analytics: conversion mỗi step, UTM params, share clicks.

---

## KPIs

Signup rate (visitor to email).
Role split (publisher vs agent owner).
Referral rate (% bấm share).
Viral coefficient (avg referrals per signup).
Return rate (quay lại check queue position).
