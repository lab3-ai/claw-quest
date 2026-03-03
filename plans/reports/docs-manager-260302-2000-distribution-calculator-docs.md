# Documentation Update: Reward Distribution Calculator

**Date:** 2026-03-02
**Scope:** Update project documentation to reflect new reward distribution calculator module
**Status:** Complete

---

## Summary

Updated 3 core documentation files to reflect the new reward distribution calculator (`apps/api/src/modules/escrow/distribution-calculator.ts`) and related database schema changes.

---

## Files Updated

### 1. `/Users/hd/clawquest/docs/PROJECT_STATUS.md`
**Lines: 247 → 258 (+11 lines)**

**Changes:**
- Added "Escrow Module" subsection to API Endpoints section noting:
  - Distribution calculator functions (computeFcfs, computeLeaderboard, computeLuckyDraw)
  - Status guards and dust handling
- Updated "Backend Escrow Module" section to highlight:
  - Reward distribution calculator with 24 unit tests per quest type (FCFS, LEADERBOARD, LUCKY_DRAW)
  - Dust handling to first recipient with sum invariant
  - Status guards rejecting non-live quests and double-pay

---

### 2. `/Users/hd/clawquest/docs/ARCHITECTURE.md`
**Lines: 101 → 111 (+10 lines)**

**Changes:**
- Added new subsection "Reward Distribution Logic" under data flows that documents:
  - **FCFS**: First N completed agents split equally (with dust to first winner)
  - **LEADERBOARD**: Custom tiers or inverse-rank proportional fallback
  - **LUCKY_DRAW**: Crypto-safe random selection (Fisher-Yates) with equal split
  - **Dust Handling**: Rounding remainder added to first recipient
  - **Status Guards**: Live quest requirement, double-pay prevention via DB constraints
  - File reference: `apps/api/src/modules/escrow/distribution-calculator.ts`

---

### 3. `/Users/hd/clawquest/docs/DB_SCHEMA.md`
**Lines: 110 → 174 (+64 lines)**

**Changes:**
- **Updated Quest Model** with actual Prisma schema:
  - Added `rewardTiers` field: `Json?` for LEADERBOARD custom tier percentages
  - Example: `[40, 25, 15, 20]` = 1st gets 40%, 2nd gets 25%, 3rd gets 15%, rest split 20%
  - Documented fallback to inverse-rank proportional when null/empty
  - Added `type` field (FCFS/LEADERBOARD/LUCKY_DRAW)
  - Added `status` field (draft/live/scheduled/completed)

- **Added new section "Distribution Calculator Module"**:
  - Module location and purpose
  - Complete API interface documentation (Participant, PayoutResult types)
  - Function signatures with parameters and return types
  - Dust handling guarantee: sum invariant always enforced
  - Test coverage notes (24 unit tests, various edge cases)

---

## Technical Details

### Distribution Calculator Implementation
- **File**: `apps/api/src/modules/escrow/distribution-calculator.ts`
- **Functions**:
  - `computeFcfs()`: First N agents get equal split
  - `computeLeaderboard()`: Custom tiers OR inverse-rank proportional
  - `computeLuckyDraw()`: Crypto-safe random selection (Fisher-Yates with randomBytes)

- **Key Features**:
  - Uses BigInt for safe integer arithmetic (no floating-point errors)
  - Dust (rounding remainder) always goes to first recipient
  - Sum invariant guaranteed: `sum(payouts) === totalAmount`
  - Status guards prevent distributing non-live quests or double-paying

### Database Integration
- **rewardTiers field** added to Quest model (nullable Json)
- Only used for LEADERBOARD quests
- Format: array of integers representing percentages

### Test Coverage
- **24 unit tests** per distribution function
- Located: `apps/api/src/modules/escrow/__tests__/distribution-calculator.test.ts`
- All tests validate sum invariant and dust distribution

---

## Line Count Summary

| File | Before | After | Change |
|------|--------|-------|--------|
| PROJECT_STATUS.md | 247 | 258 | +11 |
| ARCHITECTURE.md | 101 | 111 | +10 |
| DB_SCHEMA.md | 110 | 174 | +64 |
| **Total** | **458** | **543** | **+85** |

**All files remain well under 800 LOC limit.**

---

## Documentation Accuracy

All changes documented against actual code:
- ✓ Function signatures verified from distribution-calculator.ts
- ✓ Prisma schema matches apps/api/prisma/schema.prisma
- ✓ Test coverage verified from __tests__/distribution-calculator.test.ts
- ✓ Integration points confirmed in escrow.service.ts

---

## Cross-References

- Distribution calculator used in: `apps/api/src/modules/escrow/escrow.service.ts` (lines 207-213)
- Test file: `apps/api/src/modules/escrow/__tests__/distribution-calculator.test.ts` (24 tests)
- Implements interface for types defined in: `apps/api/src/modules/escrow/escrow.types.ts`
