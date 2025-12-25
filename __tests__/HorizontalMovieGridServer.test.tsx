import React from 'react';
import { render, screen } from '@testing-library/react';
// Note: we import the server component dynamically inside the test
// after mocking external modules to avoid loading runtime-only modules.

jest.mock('@/lib/tmdb', () => ({
  fetchTrendingMovies: jest.fn().mockResolvedValue([
    { id: 1, media_type: 'movie', poster_path: '/a.jpg', title: 'A', release_date: '2020-01-01', vote_average: 7.1 },
    { id: 2, media_type: 'movie', poster_path: '/b.jpg', title: 'B', release_date: '2020-01-01', vote_average: 6.2 }
  ])
}));

// Mock prisma to avoid DB adapter initialisation in test env
jest.mock('@/lib/prisma', () => ({
  prisma: {
    watchList: {
      findMany: jest.fn().mockResolvedValue([]),
    },
  },
}));

// Mock next-auth getServerSession to avoid importing ESM-only deps
jest.mock('next-auth', () => ({
  getServerSession: jest.fn().mockResolvedValue({ user: { id: 'test-user' } }),
}));

// Mock auth options to avoid importing src/auth (which initializes DB adapters)
jest.mock('@/auth', () => ({ authOptions: {} }));

// Mock MovieCard to observe props
jest.mock('@/app/components/MovieCard', () => {
  return function Dummy({ movie, initialIsBlacklisted, initialStatus }: any) {
    return (
      <div data-testid={`card-${movie.id}`} data-blacklisted={initialIsBlacklisted ? '1' : '0'} data-status={initialStatus ?? 'null'}>
        {movie.title}
      </div>
    );
  };
});

describe('HorizontalMovieGridServer', () => {
  test('passes initialIsBlacklisted to MovieCard', async () => {
    const blacklisted = new Set<number>([2]);

    // HorizontalMovieGridServer is an async server component — call it and render its result
    // It returns React elements; we can await and render
    // Import after mocks
    // @ts-ignore
    const { default: HorizontalMovieGridServer } = await import('@/app/components/HorizontalMovieGridServer');
    // @ts-ignore
    const element = await HorizontalMovieGridServer({ blacklistedIds: blacklisted });

    // Render the returned tree
    render(element as any);

    expect(screen.getByTestId('card-1')).toHaveAttribute('data-blacklisted', '0');
    expect(screen.getByTestId('card-1')).toHaveAttribute('data-status');
    // card-2 is blacklisted and should be filtered out
    expect(screen.queryByTestId('card-2')).toBeNull();
  });
});
