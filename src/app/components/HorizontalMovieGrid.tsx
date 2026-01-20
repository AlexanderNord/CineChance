// src/app/components/HorizontalMovieGrid.tsx
'use client';

import { useEffect, useState } from 'react';
import MovieCard from './MovieCard';
import MovieCardSkeleton from './MovieCardSkeleton';
import { fetchTrendingMovies, Media } from '@/lib/tmdb';
import { BlacklistProvider } from './BlacklistContext';

export default function HorizontalMovieGrid() {
  const [movies, setMovies] = useState<Media[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadMovies() {
      setLoading(true);
      const trending = await fetchTrendingMovies('week');
      setMovies(trending);
      setLoading(false);
    }
    loadMovies();
  }, []);

  if (loading) {
    return (
      <div className="py-8">
        <div className="container mx-auto px-4">
          <div className="h-8 w-48 bg-gray-800 rounded skeleton-shimmer mb-6" />
          <div className="flex space-x-4 overflow-x-auto pb-4">
            {[...Array(6)].map((_, i) => (
              <MovieCardSkeleton key={i} variant="horizontal" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <BlacklistProvider>
      <div className="py-8">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl font-bold text-white mb-6">В тренде сейчас</h2>
          <div className="flex space-x-4 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-gray-900">
            {movies.map((movie, index) => (
              <div key={movie.id} className="w-48 flex-shrink-0">
                <MovieCard movie={movie} priority={index < 4} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </BlacklistProvider>
  );
}
