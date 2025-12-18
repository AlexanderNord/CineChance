// src/app/components/HorizontalMovieGrid.tsx
'use client';

import { useEffect, useState } from 'react';
import MovieCard from './MovieCard';
import { fetchTrendingMovies, Movie } from '@/lib/tmdb';

export default function HorizontalMovieGrid() {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadMovies = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const data = await fetchTrendingMovies('week');
        
        if (data && Array.isArray(data)) {
          setMovies(data.slice(0, 20)); // Показываем 20 фильмов в горизонтальном скролле
        } else {
          setError('Неверный формат данных от сервера');
          setMovies([]);
        }
      } catch (err) {
        console.error('Ошибка загрузки фильмов:', err);
        setError(`Ошибка загрузки: ${err instanceof Error ? err.message : 'Неизвестная ошибка'}`);
        setMovies([]);
      } finally {
        setLoading(false);
      }
    };

    loadMovies();
  }, []);

  if (loading) {
    return (
      <div className="w-full">
        <h1 className="text-3xl sm:text-4xl font-bold mb-6 mt-4">Популярное на этой неделе</h1>
        <div className="flex overflow-x-auto gap-4 pb-4 hide-scrollbar">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="flex-shrink-0 w-48 h-72 bg-gray-800 rounded-lg animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full">
        <h1 className="text-3xl sm:text-4xl font-bold mb-6 mt-4">Популярное на этой неделе</h1>
        <div className="bg-red-900/30 border border-red-700 rounded-lg p-6">
          <p className="text-red-300 mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="px-6 py-2 bg-red-700 hover:bg-red-600 rounded-lg transition"
          >
            Попробовать снова
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <h1 className="text-3xl sm:text-4xl font-bold mb-6 mt-4">Популярное на этой неделе</h1>
      
      {movies.length > 0 ? (
        <div className="relative">
          {/* Горизонтальный скролл контейнер */}
          <div className="flex overflow-x-auto gap-4 pb-4 hide-scrollbar">
            {movies.map((movie) => (
              <div key={movie.id} className="flex-shrink-0 w-48">
                <MovieCard movie={movie} />
              </div>
            ))}
          </div>
          
          {/* Градиентные индикаторы для скролла */}
          <div className="absolute left-0 top-0 bottom-4 w-8 bg-gradient-to-r from-gray-950 to-transparent pointer-events-none"></div>
          <div className="absolute right-0 top-0 bottom-4 w-8 bg-gradient-to-l from-gray-950 to-transparent pointer-events-none"></div>
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-gray-400 text-lg">Фильмы не найдены</p>
          <button 
            onClick={() => window.location.reload()}
            className="mt-4 px-6 py-2 bg-blue-700 hover:bg-blue-600 rounded-lg transition"
          >
            Обновить
          </button>
        </div>
      )}
    </div>
  );
}