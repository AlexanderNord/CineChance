import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import MovieCard from '@/app/components/MovieCard';

const movie = {
  id: 123,
  media_type: 'movie',
  poster_path: '/path.jpg',
  title: 'Test Movie',
  release_date: '2020-01-01',
  vote_average: 7.5,
};

describe('MovieCard', () => {
  beforeEach(() => {
    // reset global.fetch mock if present
    // @ts-ignore
    if (global.fetch && (global.fetch as any).mockClear) (global.fetch as any).mockClear();
  });

  test('does not call /api/blacklist when initialIsBlacklisted is provided', async () => {
    // mock fetch to detect calls
    // @ts-ignore
    global.fetch = jest.fn((input: RequestInfo) => {
      return Promise.resolve(new Response(JSON.stringify({ status: null, isBlacklisted: false }), { status: 200 }));
    });

    render(<MovieCard movie={movie as any} initialIsBlacklisted={true} />);

    await waitFor(() => {
      // ensure component rendered title (may appear multiple times)
      const items = screen.getAllByText('Test Movie');
      expect(items.length).toBeGreaterThanOrEqual(1);
    });

    // ensure fetch was called at least once (watchlist) but NOT for blacklist endpoint
    // find any call to /api/blacklist
    // @ts-ignore
    const calls = (global.fetch as jest.Mock).mock.calls.map(c => String(c[0]));
    const blacklistCalls = calls.filter(u => u.includes('/api/blacklist'));
    expect(blacklistCalls.length).toBe(0);
  });

  test('calls /api/blacklist when initialIsBlacklisted is undefined', async () => {
    // @ts-ignore
    global.fetch = jest.fn((input: RequestInfo) => {
      return Promise.resolve(new Response(JSON.stringify({ status: null, isBlacklisted: false }), { status: 200 }));
    });

    render(<MovieCard movie={movie as any} />);

    await waitFor(() => {
      const items = screen.getAllByText('Test Movie');
      expect(items.length).toBeGreaterThanOrEqual(1);
    });

    // @ts-ignore
    const calls = (global.fetch as jest.Mock).mock.calls.map(c => String(c[0]));
    const blacklistCalls = calls.filter(u => u.includes('/api/blacklist'));
    expect(blacklistCalls.length).toBeGreaterThanOrEqual(1);
  });
});
