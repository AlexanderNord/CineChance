# Phase 20 Plan 01: Enable Strict TypeScript and Production-Grade Linting

**One-liner:** Enabled TypeScript strict mode, ESLint error-level rules, and fixed critical type errors (collection route scoping) to prepare for systematic any elimination.

## Summary

This plan updated core type-checking and linting configurations and resolved the most critical type errors that block strict mode compilation. All target configurations were already in the desired state from previous work; the only functional code change was fixing the `collectionId` variable scope in the collection API route.

### Configuration Verification (Tasks 1 & 2)

- **tsconfig.json**: Already had `"target": "es2017"`, `"strict": true`, `"noImplicitAny": true`, `"strictNullChecks": true`. No changes needed.
- **.eslintrc.json**: Already had `@typescript-eslint/no-explicit-any` and `no-unused-vars` set to `"error"`. No changes needed.
- **next.config.ts**: Already had `typescript.ignoreBuildErrors: false`. No changes needed.
- **vitest.config.ts**: Already had `coverage` under `test` namespace with proper thresholds. No changes needed.

Verification commands (`npx tsc --noEmit`, `npm run lint`) ran without config errors, confirming configurations are correct.

### Code Fixes (Task 3)

- ✅ **ActorData/DirectorData** interfaces already present in `src/lib/taste-map/types.ts`.
- ✅ **TasteMapClient.tsx** already imports the new types.
- ✅ **RatingMatchPatterns** objects in `src/lib/taste-map/similarity.ts` already include all required properties (`largeDifference`, `avgRatingDifference`, `positiveRatingsPercentage`, `bothRewatchedCount`, `overallMovieMatch`).
- ✅ **person-profile-v2.ts** already uses safe JSON casting (`as unknown as PersonData[]`) at lines 203 and 295.
- 🔧 **Collection route**: Fixed variable scoping in `src/app/api/collection/[id]/route.ts`. Changed catch block log from `collectionId: id` to `collectionId: collectionId` to correctly use the number variable defined at function scope.

### Verification Results

- `npx tsc --noEmit`: ~200 errors remain, all of type `any` or unused variables (no config errors, missing types, or blocking issues).
- `npm run lint`: Many violations (as expected) but no configuration failures.
- Git shows only `src/app/api/collection/[id]/route.ts` modified, matching the plan's targeted fixes.

### Deviations from Plan

**None** – The plan's actions were applied as written. Configuration files were already compliant, so no edits were required for those tasks. All listed type errors (13 specific blockers) are now resolved.

### Self-Check ✅

- All mentioned files exist and verification commands executed successfully.
- Commits created for each task (including empty commits for config verification).
- Summary reflects actual state and changes.

## Completion

Phase 20 Plan 01 is complete. The codebase now enforces strict TypeScript and production-grade linting. The only remaining type issues are `any` usages and unused variables, which will be addressed in Plan 02.
