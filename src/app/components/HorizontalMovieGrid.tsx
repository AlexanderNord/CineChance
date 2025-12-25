// src/app/components/HorizontalMovieGrid.tsx
'use client';

import { useEffect, useState } from 'react';
import MovieCard from './MovieCard';
import { fetchTrendingMovies, Media } from '@/lib/tmdb';

export default function HorizontalMovieGrid() {
  const [movies, setMovies] = useState<Media[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadMovies() {
      setLoading(true);
      const trending = await fetchTrendingMovies('week');
      // Batch request for watchlist statuses for the fetched movies
      try {
        const items = trending.map(m => ({ tmdbId: m.id, mediaType: m.media_type }));
        // fetch watchlist and blacklist in parallel
        const [watchRes, blackRes] = await Promise.all([
          fetch('/api/watchlist/batch', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ items }) }),
          fetch('/api/blacklist/batch', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ items }) }),
        ]);
        const watchResults = watchRes.ok ? (await watchRes.json()).results || {} : {};
        const blackResults = blackRes.ok ? (await blackRes.json()).results || {} : {};
        // attach statuses and blacklist flags to movies and set at once to avoid intermediate renders
        setMovies(trending.map(m => {
          const key = `${m.id}:${m.media_type}`;
          const watchEntry = Object.prototype.hasOwnProperty.call(watchResults, key) ? watchResults[key] : undefined;
          const status = watchEntry !== undefined ? (watchEntry.status ?? null) : null;
          const isBl = Object.prototype.hasOwnProperty.call(blackResults, key) ? !!blackResults[key] : false;
          return {
            ...m,
            _initialStatus: status,
            _initialIsBlacklisted: isBl,
          };
        }));
      } catch (e) {
        // on error, still set movies without statuses/blacklist flags
        setMovies(trending.map(m => ({ ...m, _initialStatus: null, _initialIsBlacklisted: false })));
      }
      setLoading(false);
    }
    loadMovies();
  }, []);

  if (loading) {
    return (
      <div className="py-8">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl font-bold text-white mb-6">Загружается...</h2>
          <div className="flex space-x-4 overflow-x-auto pb-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="w-48 h-72 bg-gray-800 rounded-lg animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="py-8">
      <div className="container mx-auto px-4">
        <h2 className="text-2xl font-bold text-white mb-6">В тренде сейчас</h2>
        <div className="flex space-x-4 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-gray-900">
          {movies.map((movie: any) => (
            <div key={movie.id} className="w-48 flex-shrink-0">
              <MovieCard movie={movie} initialStatus={movie._initialStatus} initialIsBlacklisted={movie._initialIsBlacklisted} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}