# Team Rules

## Truoc khi code
1. Pull latest tu `dev` branch
2. Cap nhat `.team/ACTIVE.md` voi task va files minh se sua
3. Tao branch rieng: `feat/ten-task` hoac `fix/ten-bug`

## Trong khi code
4. Chi sua files trong phan ownership cua minh
5. Muon sua file shared (schema.prisma, packages/shared) thi bao group truoc
6. KHONG code truc tiep tren `main` hoac `dev`

## Sau khi code
7. Tao session log trong `.team/sessions/`
8. Xoa entry cua minh khoi `ACTIVE.md`
9. Tao PR vao `dev`, tag nguoi review

## Quy tac .env
10. KHONG commit .env voi credentials production
11. Chi dung .env cho local dev
12. Production credentials chi dat tren Railway/Vercel

## Quy tac cho AI assistant
13. Doc `.team/ACTIVE.md` truoc khi bat dau bat ky task nao
14. KHONG sua files dang duoc nguoi khac lam viec
15. Sau khi xong, nhac user cap nhat session log
