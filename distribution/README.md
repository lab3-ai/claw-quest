# Distribution Workspace

> Không gian dành cho các hoạt động phân phối sản phẩm ClawQuest: marketing, content, partnerships, community, outreach.

## Dự án này là gì?

**ClawQuest** — nền tảng quest nơi sponsor tạo quest với phần thưởng crypto thật, AI agent thi đấu hoàn thành, human owner xử lý các task social/marketing. Ba loại quest: FCFS, Leaderboard, Lucky Draw.

- Website: clawquest.ai
- Telegram Bot: @ClawQuest_aibot
- Chain: Base + BNB Chain

---

## Quy tắc (BẮT BUỘC)

1. **CHỈ** tạo/sửa file trong folder `distribution/` — KHÔNG ĐƯỢC chạm file nào khác
2. **KHÔNG** commit thẳng vào branch `main` — phải tạo branch riêng rồi mở PR
3. **KHÔNG** commit file nhạy cảm (API key, mật khẩu, số liệu nội bộ chưa public)
4. Dùng **Markdown** (.md) cho tất cả nội dung văn bản
5. Ảnh/video đặt trong folder `assets/` của campaign tương ứng

---

## Cách làm việc (Workflow)

### Bước 1: Tạo branch

```bash
git checkout main && git pull origin main
git checkout -b distribution/<tên-bạn>/<mô-tả-ngắn>
```

Ví dụ:
- `distribution/minh/testnet-launch-campaign`
- `distribution/linh/weekly-report-w10`
- `distribution/agent-duc/x-content-march`

### Bước 2: Tạo/sửa file

Chỉ làm việc trong `distribution/`. Tham khảo templates trong `distribution/templates/`.

### Bước 3: Commit

```bash
git add distribution/
git commit -m "content: <mô tả ngắn>"
```

Format commit message:
- `content: viết 5 post X cho testnet launch`
- `content: thêm campaign brief Q2`
- `content: cập nhật báo cáo tuần 10`

### Bước 4: Push và mở PR

```bash
git push -u origin distribution/<tên-bạn>/<mô-tả-ngắn>
```

Mở Pull Request trên GitHub:
```bash
gh pr create --title "[Distribution] <mô tả>" --body "Mô tả chi tiết thay đổi"
```

### Bước 5: Chờ review

Owner sẽ review PR của bạn. Có thể:
- **Approve** → merge vào main
- **Request changes** → bạn sửa theo comment rồi push lại

---

## Cấu trúc folder

```
distribution/
├── README.md              ← File này — hướng dẫn chung
├── templates/             ← Template có sẵn, copy ra dùng
│   ├── campaign-brief.md
│   ├── social-post-batch.md
│   └── weekly-report.md
├── campaigns/             ← Kế hoạch chiến dịch (mỗi chiến dịch 1 folder)
│   └── YYMM-tên-chiến-dịch/
│       ├── brief.md
│       ├── calendar.md
│       ├── assets/        ← Ảnh, design
│       └── posts/
├── content/               ← Nội dung theo nền tảng
│   ├── blog/
│   ├── social/
│   │   ├── x/
│   │   ├── telegram/
│   │   └── discord/
│   └── email/
├── brand/                 ← Brand guidelines, voice, keywords
├── reports/               ← Báo cáo định kỳ
│   ├── weekly/
│   └── metrics/
└── inbox/                 ← Ý tưởng mới, bản nháp chưa phân loại
```

---

## Quy tắc đặt tên file

| Loại | Format | Ví dụ |
|------|--------|-------|
| Campaign folder | `YYMM-tên-chiến-dịch/` | `2603-testnet-launch/` |
| Bài post | `YYMMDD-platform-topic.md` | `260315-x-quest-intro-thread.md` |
| Báo cáo tuần | `YYMMDD-weekly-report.md` | `260307-weekly-report.md` |
| Ý tưởng inbox | `YYMMDD-tên-ý-tưởng.md` | `260303-partnership-binance.md` |

- Dùng **kebab-case** (chữ thường, nối bằng dấu gạch ngang)
- Prefix ngày theo format **YYMMDD** để dễ sắp xếp

---

## Checklist trước khi commit

- [ ] Tất cả file nằm trong `distribution/`?
- [ ] Branch name đúng format `distribution/<tên>/<mô-tả>`?
- [ ] Commit message bắt đầu bằng `content:`?
- [ ] Không chứa thông tin nhạy cảm?
- [ ] Đã dùng template phù hợp (nếu có)?

---

## Hướng dẫn cho LLM/Agent

Nếu bạn đang chỉ đạo AI agent (Claude, GPT, Cursor, v.v.) làm việc trong repo này:

1. Cho agent đọc file `distribution/README.md` này trước tiên
2. Cho agent đọc template phù hợp trong `distribution/templates/`
3. Nhắc agent: "Chỉ tạo/sửa file trong folder distribution/, không chạm file nào khác"
4. Nhắc agent tạo branch đúng format trước khi commit
5. Sau khi agent push, kiểm tra PR trên GitHub

**Prompt mẫu cho agent:**

```
Đọc file distribution/README.md trong repo này.
Tạo branch distribution/<tên-tôi>/<chủ-đề>.
Viết <nội dung cần làm> theo template trong distribution/templates/.
Lưu vào distribution/<đường-dẫn-phù-hợp>.
Commit với message "content: <mô tả>" rồi push và mở PR.
```

---

## Liên hệ

- Review PR: Owner sẽ review trong vòng 24h
- Câu hỏi: Comment trực tiếp trong PR hoặc liên hệ qua Telegram
- Khẩn cấp: Tag owner trong PR comment
