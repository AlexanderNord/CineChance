# Research: Simplify TasteMap - Remove Person Profiles

## Executive Summary

**Goal**: Remove actor and director person profiles from TasteMap feature to simplify calculations and reduce API dependencies, while preserving database schema for future use.

**Current State**: The taste map includes:
- PersonProfile computation (top-50 actors/directors)
- TMDB credits fetching for every movie
- MoviePersonCache table for caching
- Person similarity (Jaccard) in user matching
- Person comparison UI in taste map and comparison pages

**Proposed Changes**:
- Remove person-related UI sections
- Remove person calculations from similarity engine
- Update similarity weights: **Genres 60% + Movies 40%** (was 30% + 50% + 20%)
- Keep DB tables (`PersonProfile`, `MoviePersonCache`) intact but unused
- Deprecate related library functions

**Impact**: Significant reduction in TMDB API calls, simpler codebase, faster taste map computation.

---

## Points of Integration

### 1. Server Components
| File | Integration | Lines |
|------|-------------|-------|
| `src/app/profile/taste-map/page.tsx` | Fetches PersonProfile from DB, transforms to topActors/topDirectors props | 6, 23-28, 32-47 |
| `src/app/api/user/taste-map-comparison/[userId]/route.ts` | Calls `comparePersonProfiles()`, includes `personComparison` in response | 11, 76, 153-156, 173 |

### 2. Client Components
| File | Integration | Lines |
|------|-------------|-------|
| `src/app/profile/taste-map/TasteMapClient.tsx` | Receives `topActors`/`topDirectors` props, renders sections | 10-11, 23, 168-206 |
| `src/app/profile/taste-map/TwinTasters.tsx` | Tooltip explains 50/30/20 weights (needs update) | 137-143 |
| `src/app/profile/taste-map/compare/[userId]/page.tsx` | Renders full person comparison section | 630-729 |

### 3. Library Functions
| File | Integration | Lines |
|------|-------------|-------|
| `src/lib/taste-map/person-profile-v2.ts` | Entire file - computes and stores person profiles | All |
| `src/lib/taste-map/person-comparison.ts` | Entire file - compares person profiles | All |
| `src/lib/taste-map/compute.ts` | `computePersonProfile()` function (line 62-105) |
| `src/lib/taste-map/similarity.ts` | `personOverlap()` (329-350), weights (45-53), `SimilarityResult.personOverlap` (94), `WEIGHTS.personOverlap: 0.2` |
| `src/lib/taste-map/similarity-storage.ts` | `generateTasteMapSnapshot()` includes personProfiles (252-260) |

### 4. Database
| Table | Usage |
|-------|-------|
| `PersonProfile` | Stores top-50 persons per user (actor/director) |
| `MoviePersonCache` | Caches top-5 cast/crew per movie from TMDB |
| `SimilarityScore` | Stores `personOverlap` metric (will become 0) |

### 5. Tests
| Test File | What it tests |
|-----------|---------------|
| `.planning/phases/24-taste-map-db-read/tdd/spec-24-01.test.ts` | PersonProfile fetching |
| `.planning/phases/24-taste-map-db-read/tdd/spec-24-01-client.test.tsx` | Props with topActors/topDirectors |
| `.planning/tdd/acceptance-code-24-01.spec.ts` | Acceptance tests for PersonProfile |

---

## Existing Types for Reuse

**No new types needed** - we're removing functionality, not adding. However, these existing types will become unused:

```typescript
// src/lib/taste-map/types.ts
export interface PersonProfiles {
  actors: Record<string, number>;
  directors: Record<string, number>;
}

export interface WatchListItemWithCredits {
  credits?: {
    cast: { id: number; name: string; character?: string }[];
    crew: { id: number; name: string; job?: string }[];
  };
}

// src/lib/taste-map/person-profile-v2.ts
export interface PersonData {
  tmdbPersonId: number;
  name: string;
  count: number;
  avgWeightedRating: number;
}
```

**Recommendation**: Keep these types in place for potential future re-use rather than deleting them.

---

## New Types Needed

**None** - all changes are removals and weight adjustments.

---

## Architectural Pattern: Similarity Computation

The taste map similarity system follows a **multi-dimensional weighted scoring pattern**:

```typescript
// Current (BEFORE):
overallMatch = 
  ratingCorrelation * 0.5 +   // Movies (Pearson correlation on shared watched)
  tasteSimilarity * 0.3 +     // Genres (cosine similarity on genre profiles)
  personOverlap * 0.2;        // Persons (Jaccard on favorite actors/directors)

// New (AFTER):
overallMatch = 
  ratingCorrelation * 0.4 +   // Movies: 40%
  tasteSimilarity * 0.6;      // Genres: 60%
```

**Pattern characteristics**:
- `computeSimilarity()` returns `SimilarityResult` with all metrics
- `computeOverallMatch()` applies weights
- `isSimilar()` checks `overallMatch > 0.5`
- Results cached in Redis (`similar-users:v2`) and DB (`SimilarityScore`)

---

## Risks

### Risk 1: Breaking Existing Similarity Scores
- **Severity**: HIGH
- **Description**: Changing weights from (50/30/20) to (40/60) will change all similarity scores, affecting TwinTasters list.
- **Mitigation**:
  - Accept that scores will change - this is expected
  - Update documentation/tooltip to reflect new weights
  - Consider migration: keep old scores in DB but compute with new weights on read (add version field)
  - Or: trigger recomputation for all users via background job

### Risk 2: Incomplete Removal Leading to Dead Code
- **Severity**: MEDIUM
- **Description**: Missing some references to person profiles could cause runtime errors if code still expects data.
- **Mitigation**:
  - Use TypeScript compiler to catch missing prop deletions
  - Search for ALL references: `grep -r "personProfile\|topActors\|topDirectors\|personComparison"` before release
  - Run tests thoroughly (phase 24 tests may expect person data)

### Risk 3: Database Schema Left in Stale State
- **Severity**: LOW
- **Description**: `PersonProfile` and `MoviePersonCache` tables accumulate data but are never cleaned.
- **Mitigation**:
  - Document that tables are deprecated but kept for future re-use
  - Optionally add cleanup cron job (delete records older than X days)
  - Or keep as-is - not harmful, just storage

### Risk 4: API Response Changes Breaking Consumers
- **Severity**: MEDIUM
- **Description**: `/api/user/taste-map-comparison/[userId]` removes `personComparison` field, possibly breaking frontend.
- **Mitigation**:
  - Ensure `TasteMapClient` and comparison page are updated together
  - Version the API if external consumers exist (unlikely for internal feature)
  - Test comparison flow end-to-end

---

## Recommended File Structure Changes

```
BEFORE (with persons):
src/app/profile/taste-map/
├── page.tsx                          (fetches PersonProfile)
├── TasteMapClient.tsx                (renders topActors/topDirectors)
├── TwinTasters.tsx                   (tooltip: 50/30/20)
└── compare/[userId]/page.tsx         (renders personComparison)

src/lib/taste-map/
├── person-profile-v2.ts              (computeUserPersonProfile)
├── person-comparison.ts              (comparePersonProfiles)
├── compute.ts                        (computePersonProfile)
├── similarity.ts                     (personOverlap, weights)
└── similarity-storage.ts             (snapshot includes personProfiles)

src/app/api/user/
├── taste-map-comparison/[userId]/   (returns personComparison)
└── similar-users/                   (weights affect scores)
```

```
AFTER (simplified):
src/app/profile/taste-map/
├── page.tsx                          (REMOVED: PersonProfile fetching)
├── TasteMapClient.tsx                (REMOVED: actors/directors sections)
├── TwinTasters.tsx                   (UPDATED: tooltip 40/60)
└── compare/[userId]/page.tsx         (REMOVED: personComparison section)

src/lib/taste-map/
├── person-profile-v2.ts              (DEPRECATED: keep but unused)
├── person-comparison.ts              (DEPRECATED: keep but unused)
├── compute.ts                        (computePersonProfile left as dead code or removed)
├── similarity.ts                     (REMOVED: personOverlap function, updated weights)
└── similarity-storage.ts             (UPDATED: snapshot excludes personProfiles)

src/app/api/user/
├── taste-map-comparison/[userId]/   (REMOVED: personComparison from response)
└── similar-users/                   (uses new weights automatically)
```

---

## What NOT to Touch

### Critical Infrastructure
- `src/lib/prisma.ts` - Prisma singleton
- `src/middleware/rateLimit.ts` - Rate limiting logic
- `src/auth.ts` - NextAuth configuration
- `src/lib/redis.ts` - Redis caching layer

### Database Schema (intentionally preserved)
- `prisma/schema.prisma` - Keep `PersonProfile` and `MoviePersonCache` models intact
- `prisma/migrations/` - Do not delete existing migrations

### Unrelated Features
- `src/app/profile/actors/` and `src/app/profile/creators/` - These pages may still use person data from TMDB directly (not from PersonProfile)
- `src/app/api/person/` - Person-related API endpoints (different from taste map)

### TMDB Integration
- `src/lib/tmdb.ts` - External API client (will be used less, but keep)
- `src/lib/tmdbCache.ts` - General TMDB caching (independent)

---

## Implementation Order (Suggested)

1. **Update similarity weights** (`similarity.ts`) - change to 0.6/0.4
2. **Remove PersonProfile fetching** from `page.tsx` - delete lines 6, 23-28, 32-47, and props
3. **Update TasteMapClient** - remove topActors/topDirectors sections (lines 168-206)
4. **Update TwinTasters tooltip** - change weights explanation to 40% movies + 60% genres
5. **Remove personComparison** from comparison API and page
6. **Update similarity-storage snapshot** - exclude personProfiles
7. **Deprecate unused functions** - optionally add `@deprecated` JSDoc to person-profile-v2.ts and person-comparison.ts
8. **Run tests** - phase 24 tests may need updates to remove person assertions
9. **Verify** - All pages load without errors, taste map computes correctly

---

## Files to Modify Summary

| File | Action | Lines |
|------|--------|-------|
| `src/lib/taste-map/similarity.ts` | Update WEIGHTS, remove `personOverlap` field usage | 45-53, 362-373 |
| `src/app/profile/taste-map/page.tsx` | Remove PersonProfile fetch, update props | 6, 23-28, 32-47, 59-60 |
| `src/app/profile/taste-map/TasteMapClient.tsx` | Remove topActors/topDirectors sections | 10-11, 168-206 |
| `src/app/profile/taste-map/TwinTasters.tsx` | Update tooltip text | 137-143 |
| `src/app/profile/taste-map/compare/[userId]/page.tsx` | Remove personComparison section, update metrics display | 152-156, 173, 630-729 |
| `src/app/api/user/taste-map-comparison/[userId]/route.ts` | Remove personComparison from response | 11, 153-156, 173 |
| `src/lib/taste-map/similarity-storage.ts` | Update `generateTasteMapSnapshot` | 252-260 |
| `src/lib/taste-map/compute.ts` | Optionally remove `computePersonProfile` or mark deprecated | 62-105 |
| Test files | Update to match new signatures (remove person-related asserts) | Various |

---

## Verification Checklist

- [ ] TasteMap page loads without PersonProfile data
- [ ] TasteMapClient shows all sections except actors/directors
- [ ] TwinTasters list displays with updated tooltip (40/60)
- [ ] Comparison page loads without personComparison
- [ ] Similarity scores recalculated with new weights
- [ ] No TypeScript errors in modified files
- [ ] All existing tests pass (after updating expectations)
- [ ] No TMDB credits API calls during taste map computation (verify via logs)
- [ ] `personOverlap` in SimilarityScore DB field always 0 (or null)

---

## Migration Note for Database

The `SimilarityScore` table has a `personOverlap` field that will now always be 0. Options:
1. Keep field as-is (simplest)
2. Backfill all existing records with 0
3. Drop column (requires migration - not recommended if we may restore persons later)

Given requirement to keep schema, choose option 1 or 2.

---

## Open Questions

1. **Should we disable `computeUserPersonProfile` cron jobs?** Currently there may be background jobs computing person profiles. They should be turned off to avoid wasted resources.
2. **Should we remove `computePersonProfile` from `compute.ts` now or later?** Can leave as dead code initially, but should eventually delete to avoid confusion.
3. **Do we need to adjust taste map computation performance testing?** Removing TMDB credits calls will significantly speed up computation - this is a positive side effect.
4. **Should we update the `TasteMap` interface to remove `personProfiles`?** No, keep it for now to avoid cascade of changes; just don't populate it. Could clean up in separate refactor later.

---

## Related Knowledge Base

See `knowledge.md` updates:
- Added "Person Profile Complexity" section
- Documented deprecation of MoviePersonCache usage
- Noted weight change in similarity algorithm
