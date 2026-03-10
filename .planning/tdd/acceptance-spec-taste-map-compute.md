# Acceptance Spec: Taste-Map Compute Module Tests

**Phase:** 19-03 Task 1  
**Component:** `src/lib/taste-map/compute.ts`  
**Objective:** Ensure accurate genre affinity calculations and rating vector computations with proper edge case handling.

---

## User Stories

### US-1: Accurate Genre Affinity Calculation
As a user, I want my genre preferences to be calculated accurately based on my ratings, so that recommendations reflect my true tastes.

**Scenarios:**
- Given I have rated multiple movies in the same genre with high ratings (8-10)
- When the compute module calculates genre affinity
- Then the genre affinity score should be higher for that genre
- And the weight should reflect the average rating magnitude

- Given I have rated movies in a genre with mixed ratings (some high, some low)
- When the compute module processes these ratings
- Then the genre affinity should reflect the weighted average
- And conflict resolution should handle same-genre different ratings properly

### US-2: Edge Case Handling
As a user, I want the system to handle edge cases gracefully, so that it doesn't crash with unusual input.

**Scenarios:**
- Given I have an empty rating history
- When compute module attempts to calculate genre weights
- Then it should return empty/default structures without errors

- Given I have only one rated movie
- When the module computes the rating vector
- Then it should produce valid output based on that single data point

- Given all my ratings are the same (e.g., all 5/10)
- When genre affinity is calculated
- Then the result should be consistent and not produce NaN or Infinity

### US-3: Rating Vector Computation
As a user, I want my rating patterns to be analyzed correctly, so that type twins and other algorithms work properly.

**Scenarios:**
- Given I have rated movies across multiple genres
- When the rating vector is computed
- Then each genre should have a normalized weight between 0 and 1
- And the sum of weights should reflect my rating distribution

- Given I have some genres with high ratings and others with low ratings
- When conflict resolution is applied for same-genre different ratings
- Then the final genre affinity should be the weighted average
- And higher ratings should contribute more to the affinity score

---

## Acceptance Criteria

1. **Genre Weight Calculation:** Function `calculateGenreWeights` (or similar) correctly computes genre affinities based on user ratings.
2. **Rating Vector:** Function `computeRatingVector` (or similar) generates a normalized vector representing user's genre preferences.
3. **Conflict Resolution:** When same genre has different ratings, the module uses weighted average or other appropriate mechanism.
4. **Edge Cases:** Module handles empty arrays, single-item arrays, and uniform ratings without throwing exceptions.
5. **Data Integrity:** All outputs are numeric, non-NaN, and within expected ranges (e.g., 0-1 for normalized weights).

---

## Test Scope

Unit tests should cover:
- `compute.ts` main exported functions
- Pure functions (no external dependencies)
- All branches and edge cases

Coverage target: **80%+** lines and functions.

---

## Out of Scope

- API endpoints integration (handled separately)
- Redis caching behavior
- Database interactions
- UI components

---

## References

- Phase 19-03 Plan: `.planning/phases/19-testing-foundation-increase-test-coverage-to-80/19-03-PLAN.md`
- Source file: `src/lib/taste-map/compute.ts`
