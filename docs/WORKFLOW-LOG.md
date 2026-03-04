# Workflow Log

> Personal work log — gitignored, not committed. Claude reads this for cross-session context.

---

## 2026-03-04

- Session started: tracking all UI/UX work processes for March 2026
- Goal: end-of-month summary + UI/UX team workflow deliverable

### Session 2 — Dev environment setup & DB fix
- Cài đặt pnpm, chạy `pnpm install` (846 packages)
- Thêm `pnpm.onlyBuiltDependencies` vào root `package.json` cho Prisma/esbuild build scripts
- Fix API crash: `.env` không được load vì `dotenv/config` đọc từ CWD (`apps/api/`), không phải monorepo root → tạo symlink `apps/api/.env` → `../../.env`
- Chạy `prisma generate` để tạo Prisma client sau fresh install
- Fix DB connection "Tenant or user not found": Supabase pooler host đã đổi từ `aws-0-ap-southeast-1` sang `aws-1-ap-southeast-2` → cập nhật `.env`
- Xử lý circuit breaker (quá nhiều auth failures) — chờ cooldown ~3 phút
- Fix macOS `sed -i` phá symlink → tạo lại symlink `apps/api/.env`
- Fix dashboard crash "supabaseUrl is required": Vite đọc `.env` từ `apps/dashboard/`, không phải root → tạo `apps/dashboard/.env` với `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_API_URL`
- Kết quả: API (port 3000) + Dashboard (port 5173) đều chạy OK, quests endpoint trả data thành công

### Session 3 — CSS → shadcn/ui + Tailwind migration (Phase 3–13)
- **Mục tiêu**: Migrate toàn bộ plain CSS (~2,724 lines, 32 files) sang shadcn/ui (slate theme) + Tailwind utilities
- **Phase 3**: Forms — create.tsx, dashboard.tsx: ~90+ form classes → Input, Label, Textarea, Switch. Xóa forms.css, token-display.css
- **Phase 4**: Tabs/Filters/View Toggle — dashboard.tsx, quests/index.tsx, questers.tsx. Xóa tabs.css, view-toggle.css, filters.css
- **Phase 5**: Dialogs/Popups — QuestersPopup.tsx rewrite sang shadcn Dialog. Login/register pages. Xóa login-modal.css, questers-popup.css, toast.css
- **Phase 6**: Tables — QuestCard.tsx, quests/index.tsx, dashboard.tsx. Named groups pattern cho avatar tooltips. Xóa quest-table.css, questers-avatars.css
- **Phase 7**: Tooltips + actor-sections + page-header. Xóa tooltips.css, actor-sections.css, page-header.css. Sau phase này: ZERO CSS imports trong main.tsx
- **Phase 8**: Small pages — login, register, privacy, terms, account, questers. Xóa login-page.css, legal-page.css, account.css, questers.css
- **Phase 9**: Quest Explore — QuestCard.tsx, QuestGridCard.tsx, quests/index.tsx. Xóa quest-explore.css (286 lines)
- **Phase 10**: Quest Detail — detail.tsx full migration (task cards, skill cards, reward grid, sidebar, countdown). Xóa quest-detail.css (270 lines)
- **Phase 11**: Dashboard — dashboard.tsx full migration (agent table, register modal, platform select). Xóa dashboard.css (370 lines)
- **Phase 12**: Create/Fund/Manage — 3 parallel agents. create-quest.css (459 lines), fund-quest.css (332 lines), quest-manage.css (332 lines). Xóa cả 3 files
- **Phase 13**: Final cleanup — move skeleton/focus-visible/reduced-motion từ base.css vào index.css. Xóa base.css + `src/styles/` directory hoàn toàn
- **Kết quả**:
  - `src/styles/` directory đã xóa hoàn toàn (32 CSS files, ~2,724 lines removed)
  - Zero `import.*styles/` references còn lại
  - Build passes clean (0 errors)
  - Preview verified: desktop + mobile, zero console errors
