# Team Rules

## Truoc khi code
1. Pull latest tu `main` branch
2. Doc `docs/CHANGELOG.md` de biet version hien tai va nhung gi da lam
3. Cap nhat `.team/ACTIVE.md` voi task va files minh se sua
4. Tao branch rieng: `feat/ten-task` hoac `fix/ten-bug`

## Trong khi code
5. Chi sua files trong phan ownership cua minh
6. Muon sua file shared (schema.prisma, packages/shared) thi bao group truoc
7. KHONG code truc tiep tren `main` hoac `dev`

## Sau khi code (BAT BUOC)
8. Cap nhat `docs/CHANGELOG.md` voi nhung thay doi cua minh
9. Cap nhat `docs/` neu co thay doi architecture, API, hoac schema
10. Tao session log trong `.team/sessions/`
11. Xoa entry cua minh khoi `ACTIVE.md`
12. Tao PR vao `main`, tag nguoi review

> Plan trong `plans/` la optional — dung local xong bo cung duoc.
> Docs trong `docs/` moi la nguon context chinh cho LLM cua anh em khac.

## Quy tac .env
13. KHONG commit .env voi credentials production
14. Chi dung .env cho local dev
15. Production credentials chi dat tren Railway/Vercel

## Quy tac cho AI assistant
16. Doc `docs/CHANGELOG.md` + `.team/ACTIVE.md` truoc khi bat dau bat ky task nao
17. KHONG sua files dang duoc nguoi khac lam viec
18. Sau khi xong: cap nhat changelog + docs lien quan, nhac user tao session log
19. KHONG duoc skip changelog update — day la cach anh em khac biet minh da lam gi
