# Unit Test Specification: Taste-Map Compute Module

**Phase:** 19-03 Task 1  
**Target File:** `src/lib/taste-map/compute.ts`  
**Test File:** `src/lib/__tests__/taste-map/compute.test.ts`

---

## Functions to Test

Based on the actual `compute.ts` implementation, we need to test:

### 1. `calculateGenreWeights(ratings: Rating[])` (or equivalent)
**Purpose:** Compute genre affinity weights based on user's movie ratings.

**Test Cases:**
- Empty ratings array → returns empty object or defaults
- Single rating → returns object with that genre having weight based on rating value
- Multiple ratings in same genre → higher average rating yields higher weight
- Multiple ratings across different genres → each genre gets appropriate weight
- Ratings with extreme values (1 and 10) → weights reflect difference
- All ratings are the same → weights distribute normally, not zero

**Expected Behavior:**
- Returns an object mapping genre IDs/names to numeric weights (0-1 or 0-100)
- Weights are proportional to rating values and quantity
- No NaN or Infinity values

### 2. `computeRatingVector(genreWeights: Record<string, number>)` (or equivalent)
**Purpose:** Create a normalized vector representing user's genre preferences.

**Test Cases:**
- Empty genre weights → returns empty vector or zeros
- Single genre → that genre gets 1 (or normalized max)
- Multiple genres → vector components sum to 1 (or normalized max)
- Large number of genres → all properly normalized

**Expected Behavior:**
- Returns a normalized vector where values are between 0 and 1
- Sum of vector equals 1 (or max weight is 1)
- Deterministic output for same input

### 3. Conflict Resolution (same genre, different ratings)
**Purpose:** When multiple ratings exist for the same genre, combine them appropriately.

**Test Cases:**
- Two ratings in same genre (e.g., 5 and 10) → average or weighted average
- Many ratings in same genre with wide range → stable result
- Negative ratings (if applicable) handled correctly

**Expected Behavior:**
- Uses weighted average: Σ(rating * weight) / Σ(weight)
- Higher ratings increase the final genre affinity
- No overflow or underflow

### 4. Edge Cases
**Purpose:** Ensure robustness against unusual inputs.

**Test Cases:**
- Empty array → no crash, returns empty structures
- Single element array → processes correctly
- All ratings are identical → still computes correctly
- Very large number of ratings → performance acceptable (but not testing perf explicitly)
- Ratings with decimals → handled correctly

---

## Mocking Strategy

- No external dependencies expected in `compute.ts` (pure functions)
- If any dependencies exist, mock them (e.g., configuration constants)
- Use random data for broad coverage plus explicit edge values

---

## Coverage Goals

- **Lines:** ≥ 80%
- **Functions:** ≥ 80%
- **Branches:** ≥ 75%
- **Statements:** ≥ 80%

Focus on:
- All public functions
- All branches (if/else, switch)
- Error paths (if any)
- Edge case handling

---

## Test Structure

```typescript
describe('calculateGenreWeights', () => {
  it('handles empty ratings', () => { ... });
  it('calculates weights for multiple ratings', () => { ... });
  it('resolves conflicts for same genre', () => { ... });
  it('handles extreme ratings', () => { ... });
});

describe('computeRatingVector', () => {
  it('normalizes single genre', () => { ... });
  it('normalizes multiple genres', () => { ... });
  it('handles empty input', () => { ... });
});

describe('Edge Cases', () => {
  // Additional edge tests
});
```

---

## Success Criteria

- [ ] All test cases from this spec are implemented
- [ ] Tests pass consistently (no flakiness)
- [ ] Coverage meets 80%+ threshold
- [ ] Tests are readable and maintainable
