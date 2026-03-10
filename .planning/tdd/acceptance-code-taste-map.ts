/**
 * Acceptance Code: E2E/Integration Test for Taste-Map Compute
 *
 * This file contains integration tests that verify the taste-map compute module
 * works correctly through the API layer.
 *
 * Phase: 19-03 Task 1
 * Target: src/app/api/user/taste-map/route.ts
 */

import { test, expect } from 'vitest';
import { GET } from '@/app/api/user/taste-map/route';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';

// Mock dependencies
vi.mock('@/auth', () => ({
  authOptions: { /* mock */ },
}));
vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}));
vi.mock('@/lib/taste-map', () => ({
  generateTasteMapProfile: vi.fn(),
}));

describe('Taste-Map API End-to-End', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('GET /api/user/taste-map returns 200 with valid session', async () => {
    const mockSession = { user: { id: 'user123' } };
    vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
    vi.mocked(generateTasteMapProfile).mockResolvedValue({
      genreAffinity: [{ genre: 'Action', score: 0.8 }],
      ratingVector: { Action: 0.8, Drama: 0.2 },
      computedAt: new Date().toISOString(),
    });

    const request = new Request('http://localhost:3000/api/user/taste-map');
    const response = await GET(request);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty('genreAffinity');
    expect(data).toHaveProperty('ratingVector');
  });

  test('GET /api/user/taste-map returns 401 without session', async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);

    const request = new Request('http://localhost:3000/api/user/taste-map');
    const response = await GET(request);

    expect(response.status).toBe(401);
  });

  test('GET /api/user/taste-map handles compute errors gracefully', async () => {
    const mockSession = { user: { id: 'user123' } };
    vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
    vi.mocked(generateTasteMapProfile).mockRejectedValue(new Error('Compute failed'));

    const request = new Request('http://localhost:3000/api/user/taste-map');
    const response = await GET(request);

    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data).toHaveProperty('error');
  });
});
