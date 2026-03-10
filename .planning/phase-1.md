# Phase Plan: Strict TypeScript Mode & Production Linting

## Overview
Enable strict TypeScript mode and production-grade ESLint configuration. This phase upgrades code quality by enforcing type safety and catching errors at compile time.

**Duration**: 15-25 hours
**Priority**: P0 (Blocking for production readiness)
**Goal**: `tsc --noEmit` passes with 0 errors, `npm run build` succeeds, ESLint strict rules enforced.

---

## Task Breakdown

### Configuration Changes (Blocking, 30 min)

**T1: Update tsconfig.json**
- Change `target` from `"es5"` to `"es2017"`
- Set `strict: true`
- Set `noImplicitAny: true`
- Set `strictNullChecks: true`
- **Files**: `tsconfig.json`
- **Complexity**: 1
- **Dependencies**: None

**T2: Update .eslintrc.json**
- Change `"@typescript-eslint/no-explicit-any": "off"` to `"error"`
- Change `"no-unused-vars": "off"` to `"error"`
- Change `"@typescript-eslint/no-unused-vars": "off"` to `"error"` (or rely on base rule)
- **Files**: `.eslintrc.json`
- **Complexity**: 1
- **Dependencies**: T1

**T3: Update next.config.ts**
- Remove `typescript.ignoreBuildErrors` or set to `false`
- **Files**: `next.config.ts`
- **Complexity**: 1
- **Dependencies**: T1, T2

**T4: Fix vitest.config.ts**
- Move `coverage` config under `test` namespace (Vitest 4 compatibility)
- **Files**: `vitest.config.ts`
- **Complexity**: 2
- **Dependencies**: T1

**Verification after T1-T4**: Run `npx tsc --noEmit` → Should see ~200 errors (13 existing + ~187 from any/unused). Document error count.

---

### Fix Low-Hanging Type Errors (1-2 hours)

**T5: Define ActorData & DirectorData**
- Add interfaces to `src/lib/taste-map/types.ts`:
  - `ActorData` (tmdbPersonId, name, avgWeightedRating, count)
  - `DirectorData` (same structure)
- OR import `PersonData` from `person-profile-v2.ts` and use type alias
- Update `TasteMapClient.tsx` to import these types
- **Files**: `src/lib/taste-map/types.ts` (create if not exist), `src/app/profile/taste-map/TasteMapClient.tsx`
- **Complexity**: 2
- **Dependencies**: T1

**T6: Fix collection route undefined id**
- In `src/app/api/collection/[id]/route.ts`, capture `id` at function scope
- Change catch block to use captured variable
- **Files**: `src/app/api/collection/[id]/route.ts`
- **Complexity**: 1
- **Dependencies**: T1

**T7: Complete RatingMatchPatterns object**
- In `src/lib/taste-map/similarity.ts` line ~518, add missing properties:
  - `largeDifference`, `avgRatingDifference`, `positiveRatingsPercentage`, `bothRewatchCount`, `overallMovieMatch`
- Determine appropriate default values or compute from existing data
- **Files**: `src/lib/taste-map/similarity.ts`
- **Complexity**: 2
- **Dependencies**: T1

**Verification after T5-T7**: Run `npx tsc --noEmit` → Should drop to ~185 errors (15 fixed)

---

### Fix JSON Casting Issues (1 hour)

**T8: Fix person-profile-v2.ts JSON assignments**
- Lines 149, 157, 201, 293
- Use type-safe casting: `data as unknown as PersonData[]` or Prisma's `$utils.Json.parse<PersonData[]>()`
- Ensure all PersonData array assignments are properly cast
- **Files**: `src/lib/taste-map/person-profile-v2.ts`
- **Complexity**: 5
- **Dependencies**: T1, T5 (if PersonData interface created)

**Verification after T8**: Run `npx tsc --noEmit` → Should drop to ~180 errors (5 fixed)

---

### Systematic Any Elimination (Major effort, 8-16 hours)

**T9-T50: Fix any violations (~194 instances)**

**Strategy**:
- Group by file, start with high-impact files:
  1. `src/lib/recommendation-types.ts` (20+ any) → Create proper types for filter state objects
  2. `src/app/api/search/route.ts` (12+ any) → Define TMDbMovie, TMDbSearchResult interfaces
  3. `src/app/api/random/route.ts` (8+ any)
  4. `src/app/api/my-movies/route.ts` (7+ any)
  5. `src/lib/tmdb.ts` (5+ any) → Use TMDB official types if available, or define locally
  6. `src/app/api/debug/stats/route.ts` (5+ any)
  7. `src/app/api/recommendations/random/route.ts`
  8. `src/lib/recommendation-outcome-tracking.ts`
  9. Remaining files (~40 files with 1-3 any each)

**Approach per file**:
- Replace `any` with specific interfaces
- For external API data (TMDB): create `TMDbMovie`, `TMDbPerson`, `TMDbSearchResult` types
- For dynamic objects (config, state): use `Record<string, unknown>` or specific interfaces
- Use type guards: `function isTMDbMovie(obj: unknown): obj is TMDbMovie { ... }`

**Complexity**: 15 total (distributed across ~40 files)
**Dependencies**: T1, T5 (some types may be reusable)

---

### Fix Unused Variables (2-4 hours)

**T51-T80: Fix no-unused-vars errors**

After any violations, run ESLint to identify unused variables.

**Patterns**:
- Remove unused imports/parameters
- Prefix intentionally unused with `_` (e.g., `_id`, `_unused`)
- For destructuring: keep only used properties

**Complexity**: 5 total
**Dependencies**: T1, T9 (some any fixes may also remove unused vars)

---

### Final Verification & Testing (1 hour)

**T81: TypeScript compilation**
```bash
npx tsc --noEmit
# Expect: exit code 0, 0 errors
```

**T82: Build verification**
```bash
npm run build
# Expect: successful production build
```

**T83: Lint check**
```bash
npm run lint
# Expect: 0 warnings (strict mode)
```

**T84: Test suite**
```bash
npm run test:ci
# Expect: all tests pass
```

**T85: Manual smoke test**
- `/` - homepage
- `/recommendations` - recommendations page
- `/profile` - user profile
- `/search` - search functionality

**Complexity**: 3
**Dependencies**: All previous tasks

---

## Dependency Graph

```
T1 (Config)
 ├─ T2 (ESLint)
 ├─ T3 (Next.js)
 ├─ T4 (Vitest)
 └─ v
     T5-T7 (Quick fixes)
     └─ T8 (JSON casting)
         └─ T9-T50 (Any elimination)
             └─ T51-T80 (Unused vars)
                 └─ T81-T85 (Verification)
```

---

## Rollback Plan

If strict mode proves too disruptive:

1. Revert `tsconfig.json` to previous values
2. Revert `.eslintrc.json` rules to `"off"`
3. Keep code changes but in separate branch for future work

**However**: This phase is blocking production; aim to complete fully.

---

## Notes

- Use `git commit` after each logical fix (e.g., "fix: add ActorData interface", "fix: resolve any in search route")
- Consider creating a shared `src/types/tmdb.ts` for external API types
- Some `any` may be legitimate (e.g., `JSON.parse` results), use `unknown` + runtime validation instead
- Check `.planning/debug/resolved/` for similar type issues encountered before
