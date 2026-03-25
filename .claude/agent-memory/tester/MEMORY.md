# Tester Agent Memory

## Project Testing Standards

### Framework & Tools
- **Test Framework:** Vitest 4.0.18 (NOT Jest)
- **Package Manager:** pnpm (never npm/yarn)
- **Test Command:** `pnpm --filter api test` (runs `vitest run`)
- **Build Commands:**
  - API: `pnpm --filter api build` (tsup, outputs CJS+ESM)
  - Dashboard: `pnpm --filter dashboard build` (tsc + vite)
  - Both succeed with 0 errors as baseline

### Test File Locations
- API tests: `apps/api/src/modules/*//__tests__/*.test.ts`
- Pattern: Describe/It/Expect (globals enabled in vitest.config.ts)
- beforeEach/afterEach for mock cleanup

### Mocking Patterns
- Use `vi.fn()` for function mocks
- Use `vi.spyOn()` for spying on existing functions
- Global mocks: assign to `global.fetch` for fetch mocking
- Always call `vi.clearAllMocks()` in beforeEach and `vi.restoreAllMocks()` in afterEach

## ClawQuest Testing Insights

### Social Validator Module
- File: `apps/api/src/modules/quests/social-validator.ts`
- Main function: `validateSocialTarget(platform, type, value, telegramBotToken?)`
- Platform coverage: X, Discord, Telegram, + unknown fallthrough
- Key behavior: Graceful degradation (network errors return `{ valid: true }`)
- Timeout: 8000ms per fetch via `AbortSignal.timeout()`

### Test Coverage Best Practices
1. Mock all external API calls (Twitter oEmbed, Discord API, Telegram Bot API)
2. Test both happy path AND error scenarios (404s, non-200s, network errors)
3. Verify input normalization (@prefix stripping, URL parsing, whitespace trimming)
4. Test graceful degradation (no blocking on network failures)
5. Use precise fetch URL assertions to catch regex/parsing bugs early
6. Test edge cases: empty input, special chars, malformed data

### Report Standards
- Location: `/Users/hd/clawquest/Users/hd/clawquest/plans/{plan-id}/reports/tester-{date}-{slug}.md`
- Format: Markdown with tables, summary sections, categorized findings
- Content: test count, coverage %, critical issues, recommendations
- Tone: concise, list unresolved questions at end
