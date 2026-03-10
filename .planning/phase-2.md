# Phase 2: Testing Foundation Plan

## Goal
Increase test coverage from ~10% to 80%+ for critical modules while establishing TDD workflow.

## Priority Modules (In Order)
1. `src/lib/recommendation-algorithms/` (7 algorithms)
2. `src/lib/taste-map/compute.ts` (ML core)
3. `src/lib/logger.ts` (centralized logging)
4. `src/app/api/watchlist/` (API routes)

## Tasks

### 1. Configure Testing Infrastructure
**Priority**: Critical
**Complexity**: Low
**Dependencies**: None

#### TDD Checklist

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 75,
        statements: 80
      }
    },
    environment: 'happy-dom'
  }
})
```

- [ ] Acceptance Spec: All critical modules must have ≥80% coverage
- [ ] Unit Spec: Coverage thresholds enforced in CI
- [ ] Red: Run `npm test` - fails due to low coverage
- [ ] Green: Configure Vitest thresholds
- [ ] Refactor: Add `test:coverage` script to package.json
- [ ] Verify: `npm run test:coverage` shows threshold enforcement

### 2. Test Recommendation Algorithms
**Priority**: High
**Complexity**: High
**Dependencies**: Task 1 completed

#### TDD Checklist

```typescript
// __tests__/recommendation-algorithms/v1.test.ts
import { weightedHybrid } from '@/lib/recommendation-algorithms/v1';

const mockUser = {
  id: 'user1',
  watchHistory: [{
    tmdbId: 1,
    rating: 8,
    mediaType: 'movie',
    status: 'watched'
  }],
  tags: [{ name: 'sci-fi', weight: 0.9 }]
};

describe('Weighted Hybrid Algorithm', () => {
  it('should prioritize high-rated similar genres', () => {
    const recommendations = weightedHybrid(mockUser, []);
    expect(recommendations[0].genreMatch).toBeGreaterThan(0.7);
  });

  it('should handle empty watch history gracefully', () => {
    const recommendations = weightedHybrid({ ...mockUser, watchHistory: [] }, []);
    expect(recommendations).toHaveLength(10);
    expect(recommendations.every(r => r.confidence < 0.5)).toBe(true);
  });
});
```

- [ ] Acceptance Spec: All 7 algorithms must have ≥85% coverage
- [ ] Unit Spec: Test edge cases (empty history, max ratings)
- [ ] Red: Create test files with failing assertions
- [ ] Green: Implement minimal algorithm logic to pass tests
- [ ] Refactor: Add dependency injection for Prisma/TMDB mocks
- [ ] Verify: Coverage report shows ≥85% for all algorithms

### 3. Test Taste-Map Compute Module
**Priority**: High
**Complexity**: High
**Dependencies**: Task 2 completed

#### TDD Checklist

```typescript
// __tests__/taste-map/compute.test.ts
import { computeTasteProfile } from '@/lib/taste-map/compute';

const mockRatings = [
  { tmdbId: 1, rating: 9, genres: ['Action', 'Sci-Fi'] },
  { tmdbId: 2, rating: 3, genres: ['Romance'] }
];

describe('Taste Profile Computation', () => {
  it('should amplify highly-rated genre preferences', () => {
    const profile = computeTasteProfile(mockRatings);
    expect(profile.genres['Sci-Fi']).toBeGreaterThan(0.8);
    expect(profile.genres['Romance']).toBeLessThan(0.2);
  });

  it('should handle genre conflicts correctly', () => {
    const conflictingRatings = [
      { tmdbId: 1, rating: 9, genres: ['Action'] },
      { tmdbId: 2, rating: 2, genres: ['Action'] }
    ];
    const profile = computeTasteProfile(conflictingRatings);
    expect(profile.genres['Action']).toBeCloseTo(0.35, 2);
  });
});
```

- [ ] Acceptance Spec: Taste-map must have ≥80% coverage
- [ ] Unit Spec: Test genre weighting logic and conflict resolution
- [ ] Red: Write tests for profile computation edge cases
- [ ] Green: Implement vector math for genre weights
- [ ] Refactor: Extract genre conflict resolution to separate function
- [ ] Verify: All taste-map calculations produce expected vectors

### 4. Test Logger Utilities
**Priority**: Medium
**Complexity**: Low
**Dependencies**: Task 1 completed

#### TDD Checklist

```typescript
// __tests__/logger.test.ts
import { logger } from '@/lib/logger';

jest.mock('next-auth', () => ({
  getServerSession: jest.fn().mockResolvedValue({
    user: { id: 'test-user' }
  })
}));

describe('Logger', () => {
  it('should include session context in errors', async () => {
    const mockError = new Error('Test error');
    logger.error('Test message', { error: mockError });
    
    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining('"context":"TestComponent"'),
      expect.stringContaining('"userId":"test-user"')
    );
  });

  it('should sanitize sensitive data', () => {
    logger.info('Auth data', { token: 'secret123', userId: 'user1' });
    expect(console.log).not.toHaveBeenCalledWith(
      expect.stringContaining('secret123')
    );
  });
});
```

- [ ] Acceptance Spec: Logger must have 100% coverage
- [ ] Unit Spec: Test context inclusion and data sanitization
- [ ] Red: Write tests for error context propagation
- [ ] Green: Implement session context capture
- [ ] Refactor: Add PII sanitization middleware
- [ ] Verify: No sensitive data appears in logs

### 5. Add Integration Tests for Watchlist API
**Priority**: Medium
**Complexity**: Medium
**Dependencies**: Task 1, 2 completed

#### TDD Checklist

```typescript
// __tests__/api/watchlist.test.ts
import { testApi } from '@/test/utils';

describe('Watchlist API', () => {
  it('POST /api/watchlist should add new entry', async () => {
    const response = await testApi.post('/api/watchlist', {
      tmdbId: 123,
      mediaType: 'movie',
      status: 'want'
    });

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      tmdbId: 123,
      userId: 'test-user',
      status: 'want'
    });
  });

  it('GET /api/watchlist should respect rate limits', async () => {
    // Make 10 requests (limit is 5/min)
    const responses = await Promise.all(
      Array(10).fill().map(() => testApi.get('/api/watchlist'))
    );
    
    expect(responses.filter(r => r.status === 429).length).toBe(5);
  });
});
```

- [ ] Acceptance Spec: All API routes must have ≥75% integration coverage
- [ ] Unit Spec: Test authentication, rate limiting, and data validation
- [ ] Red: Write failing tests for all API methods
- [ ] Green: Implement route handlers with validation
- [ ] Refactor: Extract common validation logic
- [ ] Verify: All endpoints handle errors gracefully

## Verification Protocol

1. Run `npm run test:coverage` - must show:
   - ≥85% coverage for recommendation algorithms
   - ≥80% coverage for taste-map
   - 100% coverage for logger
   - ≥75% coverage for API routes

2. Verify all tests pass in CI environment

3. Confirm no regression in application functionality

## Research Flags

- **Critical**: Prisma transaction mocking strategy for recommendation tests
- **Medium**: TMDB API response patterns for realistic test fixtures
- **Low**: Performance impact of taste-map tests at scale