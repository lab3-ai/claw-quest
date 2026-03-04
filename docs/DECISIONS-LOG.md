# Decisions Log

> Personal decisions log — gitignored, not committed. Records technical/design decisions made during development.

---

## 2026-03-04

- Setup workflow-log.md + decisions-log.md for cross-session tracking (gitignored, personal only)

### Session 2 — Env management decisions
- **API env loading**: Dùng symlink `apps/api/.env` → `../../.env` thay vì copy file, để chỉ maintain 1 source of truth cho env vars. Lưu ý: không dùng `sed -i` trên macOS vì sẽ phá symlink.
- **Dashboard env**: Tạo file `.env` riêng cho `apps/dashboard/` vì Vite chỉ đọc env từ project root của nó, không đọc monorepo root. Không dùng symlink vì dashboard chỉ cần subset VITE_* vars.
- **Supabase pooler host**: Cập nhật từ `aws-0-ap-southeast-1` sang `aws-1-ap-southeast-2` — Supabase đã migrate region. Cần lưu ý khi deploy.

### Session 3 — CSS migration decisions
- **Styling approach**: Chọn Tailwind utility-first + shadcn/ui thay vì giữ plain CSS. Lý do: consistency, dark mode ready, giảm maintenance burden, tận dụng design tokens qua CSS variables
- **CSS variable bridge**: Dùng Tailwind arbitrary values `bg-[var(--skill-bg)]` cho design tokens chưa map trong tailwind.config.js — tránh migrate tất cả biến CSS cùng lúc
- **Named groups pattern**: Dùng `group/avatar` + `group-hover/avatar:block` cho tooltip hover thay vì custom CSS — native Tailwind, zero JS overhead
- **Skeleton giữ nguyên CSS class**: Move `.skeleton` vào index.css thay vì replace mỗi instance bằng `animate-pulse`, vì skeleton dùng custom shimmer gradient khác animate-pulse
- **Register Agent modal giữ custom div**: Không convert sang shadcn Dialog vì có custom focus-trap logic (`modalRef` + `handleModalKeyDown`). KISS decision
- **Global utilities move to index.css**: focus-visible, prefers-reduced-motion, skeleton — global concerns không thuộc component-level Tailwind
- **Parallel agent strategy**: Phase 12 dùng 3 parallel fullstack-developer agents (create/fund/manage) — mỗi agent own riêng files, không overlap
