# Research: Enable Strict TypeScript Mode & Production-Grade Linting

## Executive Summary

**Goal**: Enable strict TypeScript mode (`strict: true`, `noImplicitAny: true`, `strictNullChecks: true`) and upgrade ESLint rules to production-grade quality while maintaining a buildable codebase.

**Current State**: TypeScript configured with relaxed settings (target: es5, strict: false), ESLint rules `off`, Next.js ignoring build errors.

**Impact**: Enabling strict mode will reveal **~200 type errors** across 40+ files, requiring systematic fixes.

---

## Configuration Changes Required

### Files to Modify

1. **`tsconfig.json`** - Core TypeScript configuration
2. **`.eslintrc.json`** - Linting rules  
3. **`next.config.ts`** - Build error handling
4. **`vitest.config.ts`** - Type error in coverage config (Vitest 4 incompatibility)

---

## Current TypeScript Errors (13 before strict mode)

Even with `strict: false`, the codebase has 13 errors:

### 1. **Vitest Configuration Error** (vitest.config.ts:16)
```typescript
coverage: {  // Error: 'coverage' does not exist in type 'ViteUserConfigExport'
```
**Cause**: Vitest 4 moved coverage to test namespace
**Fix**: Move coverage under `test` or upgrade to vitest 1.x pattern

### 2. **Map/Set Iteration** (es5 target limitation)
- `src/lib/taste-map/compute.ts:50,95,100`
- `src/lib/taste-map/similarity.ts:263`

```typescript
for (const [genre, data] of genreMap) // error TS2802
```
**Cause**: Target `es5` doesn't support iterating Map/Set without `--downlevelIteration`
**Fix**: Change target to `es2017` (recommended) or add downlevelIteration flag

### 3. **JSON Type Casting Issues** (person-profile-v2.ts)
- Lines 149, 157, 201, 293

```typescript
Type 'PersonData[]' is not assignable to type 'JsonNull | InputJsonValue'.
Type 'JsonArray' is not comparable to type 'PersonData[]'.
```
**Cause**: Prisma's `Json` type uses `JsonValue` which can be `JsonObject | JsonArray | string | number | boolean | null`. Direct array assignment fails.
**Fix**: Use type assertion `as unknown as PersonData[]` or cast through `unknown`

### 4. **Missing Interface Definitions**
- `src/app/profile/taste-map/TasteMapClient.tsx:62,101`

```typescript
.map((actor: ActorData) => // ActorData not defined
.map((creator: DirectorData) => // DirectorData not defined
```
**Fix**: Define these interfaces locally or in shared types file

### 5. **Undefined Variable in Scope**
- `src/app/api/collection/[id]/route.ts:134`

```typescript
collectionId: id, // 'id' not in scope in catch block
```
**Fix**: Capture route param id into a variable at function scope

### 6. **Missing Properties in Type**
- `src/lib/taste-map/similarity.ts:518`

```typescript
Type '{ perfectMatches: number; ... }' is missing properties from 'RatingMatchPatterns':
largeDifference, avgRatingDifference, positiveRatingsPercentage, bothRewatchedCount, overallMovieMatch
```
**Fix**: Add missing properties to object literal or extend type

---

## Strict Mode Additional Errors (Estimated 187+)

After analyzing any usage (`grep -r ":\s*any\b"`), found **194 matches** of `any` type across 40+ files:

### High-Impact Files with Many `any`:
- `src/app/api/search/route.ts` (12+ any)
- `src/app/api/random/route.ts` (8+ any)
- `src/lib/recommendation-types.ts` (20+ any in generic objects)
- `src/lib/tmdb.ts` (5+ any)
- `src/app/api/my-movies/route.ts` (7+ any)
- `src/app/api/debug/stats/route.ts` (5+ any)

### Other Strict Null Checks Issues:
Likely many `null`/`undefined` checks needed across codebase.

---

## Existing Types Available for Reuse

### `src/lib/taste-map/types.ts`
```typescript
export interface PersonProfiles {
  actors: Record<string, number>;
  directors: Record<string, number>;
}

export interface WatchListItemFull {
  userId: string;
  tmdbId: number;
  mediaType: string;
  userRating: number | null;
  voteAverage: number;
  credits?: {
    cast: { id: number; name: string; character?: string }[];
    crew: { id: number; name: string; job?: string }[];
  };
}
```

### `src/lib/recommendation-algorithms/types.ts`
Rich recommendation system types, but not directly related to actors/directors.

### Prisma Schema Models (auto-generated)
- `WatchList` (includes `userRating?: number | null`)
- `PersonProfile` (stores top-50 persons as `Json`)
- `MoviePersonCache` (caches TMDB credits)

---

## New Types Needed

### 1. ActorData & DirectorData Interfaces
Location: `src/lib/taste-map/types.ts` or new `src/lib/taste-map/person.types.ts`

```typescript
export interface ActorData {
  tmdbPersonId: number;
  name: string;
  avgWeightedRating: number;
  count: number; // movies count
}

export interface DirectorData {
  tmdbPersonId: number;
  name: string;
  avgWeightedRating: number;
  count: number;
}
```

These match the `PersonData` interface already defined in `person-profile-v2.ts` (lines 17-22). Can reuse or alias.

### 2. RatingMatchPatterns Complete Definition
Location: `src/lib/taste-map/similarity.ts` (around line 518)

Current incomplete type needs:
- `largeDifference: number`
- `avgRatingDifference: number`
- `positiveRatingsPercentage: number`
- `bothRewatchedCount: number`
- `overallMovieMatch: number`

---

## Architectural Patterns in Codebase

### 1. **Server Components by Default**
- Data fetching in Server Components
- Client components marked with `'use client'`
- Use `Suspense` boundaries for loading states

### 2. **Prisma Singleton Pattern**
```typescript
import { prisma } from '@/lib/prisma'; // singleton, never new PrismaClient()
```

### 3. **TMDB Integration with Caching**
- `src/lib/tmdb.ts` - API calls
- `src/lib/tmdbCache.ts` - Redis caching
- `src/lib/redis.ts` - Redis client

### 4. **Rate Limiting Middleware**
- `src/middleware/rateLimit.ts` - Upstash Redis based
- Pattern: `const { success } = await rateLimit(request, '/api/path')`

### 5. **Feature Flags & Experiments**
- `src/lib/recommendation-settings.ts`
- Algorithm experiments via `RecommendationSettings`

---

## Risks & Mitigations

### Risk 1: Build Breakage in Production
**Severity**: HIGH
**Likelihood**: HIGH

**Description**: Changing next.config.ts `ignoreBuildErrors` from `true` to `false` will cause `npm run build` to fail on any type error.

**Mitigation**:
- Fix ALL type errors BEFORE changing next.config.ts
- Use staged approach: config changes → fix errors → verify build → commit
- Keep `ignoreBuildErrors: true` temporarily until errors resolved

### Risk 2: Massive Refactocation Required for `any` Violations
**Severity**: HIGH
**Likelihood**: CERTAIN

**Description**: 194 occurrences of `any` will become errors. This is time-consuming but straightforward.

**Mitigation**:
- Use typed replacements from TMDB API types
- Create local utility types: `type JSONValue = Prisma.JsonValue`
- For external data: use `unknown` + runtime guards
- Can accept some `any` as `@ts-expect-error` with documentation, but goal is 0 errors

### Risk 3: Third-Party Library Types Incompatible
**Severity**: MEDIUM
**Likelihood**: LOW

**Description**: Some dependencies may not have proper types (bcryptjs, nodemailer have @types packages).

**Mitigation**:
- Verify all dev dependencies have types: `npm i -D @types/bcryptjs @types/nodemailer` (already in package.json)
- Use `// @ts-expect-error` sparingly for untyped imports

### Risk 4: Runtime Behavior Changes with Strict Null Checks
**Severity**: MEDIUM
**Likelihood**: MEDIUM

**Description**: Code that relied on implicit `any` or truthy/falsy coercion may break when null checks become explicit.

**Mitigation**:
- Add defensive checks: `if (value != null)` instead of `if (value)`
- Use optional chaining `?.` and nullish coalescing `??` appropriately
- Test all affected code paths manually after strict mode

### Risk 5: Vitest Configuration Incompatibility
**Severity**: LOW
**Likelihood**: HIGH (already broken)

**Description**: `coverage` config at root level not supported in Vitest 4.

**Mitigation**:
- Move coverage config under `test` namespace:
```typescript
export default defineConfig({
  test: {
    // ... existing
    coverage: { ... } // move here
  }
})
```

---

## Recommended File Structure for Phase Changes

No new files needed. Existing modifications:

```
├── tsconfig.json                    # UPDATED: target, strict flags
├── .eslintrc.json                   # UPDATED: rules to error
├── next.config.ts                   # UPDATED: ignoreBuildErrors → false/removed
├── vitest.config.ts                 # FIXED: coverage config placement
├── src/lib/taste-map/types.ts       # ADDED: ActorData, DirectorData
├── src/lib/taste-map/similarity.ts  # FIXED: RatingMatchPatterns complete
├── src/lib/taste-map/compute.ts     # FIXED: (auto-fixed by target change)
├── src/lib/taste-map/person-profile-v2.ts  # FIXED: JSON casting
├── src/app/profile/taste-map/TasteMapClient.tsx  # FIXED: import types
├── src/app/api/collection/[id]/route.ts        # FIXED: id scope
└── [~40 files]                      # FIXED: any violations, unused vars
```

---

## Files That Should NOT Be Modified

### Critical Production Infrastructure
- `src/middleware/rateLimit.ts` - Only modify if absolutely necessary for type fixes
- `src/auth.ts` - NextAuth configuration, stable
- `src/lib/prisma.ts` - Prisma singleton, usually auto-generated types
- `prisma/schema.prisma` - Database schema (unless type issues stem from schema)
- `.env*` files - Never commit secrets

### External API Clients (can break integrations)
- `src/lib/tmdb.ts` - External TMDB API calls; careful with type changes that affect runtime
- `src/lib/email.ts` - Nodemailer integration

### Test Files (don't fix test-specific any unless required)
- `src/lib/__tests__/**/*.test.ts` - Test files may use any for mocks; prioritize production code first

---

## Implementation Order (Priority)

### Phase 1: Configuration Changes (30 min)
**Priority**: P0 (Blocking)

1. Update `tsconfig.json`:
   - `target: "es2017"`
   - `strict: true`
   - `noImplicitAny: true`
   - `strictNullChecks: true`
2. Update `.eslintrc.json`:
   - `"@typescript-eslint/no-explicit-any": "error"`
   - `"no-unused-vars": "error"`
   - `"@typescript-eslint/no-unused-vars": "error"`
3. Update `next.config.ts`:
   - Remove or set `ignoreBuildErrors: false`
4. Update `vitest.config.ts`:
   - Move coverage under `test` namespace

**Verification**: `npx tsc --noEmit` (expect ~200 errors)

### Phase 2: Fix Low-Hanging Fruit (1-2 hrs)
**Priority**: P1 (Quick wins)

5. Fix `TasteMapClient.tsx`:
   - Import `ActorData` and `DirectorData` from `person-profile-v2.ts` (reuse `PersonData`) or create in types.ts
   - If using `PersonData`, rename in.map() cast or create type aliases

6. Fix `collection/[id]/route.ts`:
   - Capture `id` param at function start: `const collectionId = id;`
   - Use `collectionId` in catch block

7. Fix `similarity.ts:518`:
   - Complete the `RatingMatchPatterns` object with all required properties

**Verification**: `npx tsc --noEmit` (should drop to ~190 errors)

### Phase 3: Fix JSON Casting in person-profile-v2 (1 hr)
**Priority**: P1

8. Update `person-profile-v2.ts` lines 149, 157, 201, 293:
   - Cast through `unknown`: `data.topPersons as unknown as PersonData[]`
   - Or use type-safe helper: `prisma.$utils.Json.parse<PersonData[]>()`

**Verification**: `npx tsc --noEmit` (should drop to ~185 errors)

### Phase 4: Systematic Any Elimination (Major effort)
**Priority**: P2 (Can be done incrementally but phase requires 0 errors)

9. Audit and fix `any` violations file by file:
   - Start with high-usage files: `src/app/api/search/route.ts`, `recommendation-types.ts`
   - Replace `any` with specific types or `unknown`
   - For TMDB data: create `TMDbMovie`, `TMDbPerson` interfaces
   - Use type guards: `isMovie(data): data is TMDbMovie`

10. Fix unused variables (ESLint):
    - Remove or prefix with `_` for intentionally unused
    - Fix destructuring assignments with unused properties

### Phase 5: Final Verification
**Priority**: P0

11. Run `npx tsc --noEmit` → Expect 0 errors
12. Run `npm run build` → Expect successful build
13. Run `npm run test:ci` → Ensure tests still pass
14. Run `npm run lint` → 0 warnings

---

## Estimated Complexity per Task

| Task | Complexity | Estimated Time |
|------|------------|----------------|
| Config changes | 1 | 30 min |
| ActorData/ DirectorData types | 2 | 20 min |
| Collection route id fix | 1 | 10 min |
| RatingMatchPatterns fix | 2 | 15 min |
| JSON casting fixes | 5 | 1 hr |
| Vitest config | 2 | 15 min |
| Any violations (~194 instances) | 15+ | 8-16 hrs |
| Unused vars | 5 | 2-4 hrs |
| Testing & verification | 3 | 1 hr |
| **TOTAL** | **~37** | **~15-25 hours** |

---

## Success Criteria

- ✅ `tsconfig.json`: `strict: true`, `noImplicitAny: true`, `strictNullChecks: true`, `target: "es2017"`
- ✅ `.eslintrc.json`: `no-explicit-any: error`, `no-unused-vars: error`
- ✅ `next.config.ts`: `ignoreBuildErrors: false` (or removed)
- ✅ `npx tsc --noEmit` exits with code 0, 0 errors
- ✅ `npm run build` completes successfully
- ✅ No runtime regressions (basic smoke test of main pages)

---

## Open Questions

1. **Should we create a dedicated `src/types/` folder?** Currently types are scattered in feature folders. Consider consolidating if many shared types needed for fixing `any`.

2. **How strict should we be with test files?** Tests often use `any` for mocks. Could exempt `src/lib/__tests__/**` from no-explicit-any if needed, but phase goal requires codebase-wide compliance.

3. **Should we accept `// @ts-expect-error` comments?** For unavoidable external data shapes, maybe acceptable but should be documented. Phase goal suggests 0 errors implies no expect-errors either.

4. **Is Vitest 4 coverage config fix required?** Coverage might be unused in CI. Verify CI config before spending time.

---

## Next Steps

1. Create phase plan in `.planning/phases/phase-1.md` with above task breakdown
2. Execute Phase 1 (config changes) first to see full error picture
3. Group errors by file and tackle systematically
4. Update `knowledge.md` with findings
