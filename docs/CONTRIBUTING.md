# Contributing Guide

## 👩‍💻 Workflow
1. **Branch**: `feat/feature-name` or `fix/issue-name` off `main`.
2. **Commit**: Conventional Commits (e.g., `feat: add quest list api`, `fix: resolve auth bug`).
3. **PR**: Open PR against `main`. Must pass CI.

## 🛠 Code Style
- **Lint**: ESLint + Prettier (configured in root).
- **Naming**:
    - Variables/Functions: `camelCase`
    - Components: `PascalCase`
    - Files: `kebab-case.ts` (except Components: `PascalCase.tsx`)
    - API Routes: `kebab-case` URLs.

## 🧪 Testing Checklist
- [ ] Added Unit Test for new logic?
- [ ] Verified Zod generic schemas?
- [ ] Checked for breaking API changes?
