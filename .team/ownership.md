# Code Ownership

> Mỗi người own phần của mình. Muốn sửa file của người khác thì báo trước.

## Brian (PO)
- Product decisions, feature specs
- apps/api/src/modules/admin/*
- apps/api/src/modules/quests/*
- apps/api/prisma/schema.prisma (phải báo team trước khi sửa)
- docs/*

## Ryan (Dev)
- apps/api/src/modules/stripe/*
- apps/api/src/modules/auth/*
- apps/api/src/modules/wallets/*
- apps/api/src/modules/escrow/*
- apps/api/src/app.ts

## Vincent (Dev)
- apps/api/src/modules/agents/*
- apps/api/src/modules/telegram/*
- apps/api/src/modules/discord/*
- apps/api/src/modules/x/*

## Ray (Dev)
- apps/dashboard/src/routes/*
- apps/dashboard/src/components/*
- apps/dashboard/src/hooks/*
- apps/dashboard/src/context/*

## Hiru (Design)
- apps/dashboard/src/styles/*
- apps/dashboard/src/components/ui/*
- Public assets, icons, images

## Chalee (Test)
- tests/**/* (read-only on implementation files)
- QA reports

## Shared files (BAO TEAM TRUOC KHI SUA)
- packages/shared/*
- apps/api/prisma/schema.prisma
- apps/api/src/app.ts
- package.json, pnpm-workspace.yaml
- .env files
