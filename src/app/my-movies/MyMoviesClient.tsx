// src/app/my-movies/MyMoviesClient.tsx
'use client';

import { useState } from 'react';
import MovieCard from '../components/MovieCard';
import { Media } from '@/lib/tmdb';

interface MyMoviesClientProps {
  watched: (Media & { statusName: string })[];
  wantToWatch: (Media & { statusName: string })[];
  dropped: (Media & { statusName: string })[];
}

export default function MyMoviesClient({
  watched,
  wantToWatch,
  dropped,
}: MyMoviesClientProps) {
  const [activeTab, setActiveTab] = useState<'watched' | 'wantToWatch' | 'dropped'>('watched');

  const tabs = [
    { id: 'watched' as const, label: 'Просмотрено', count: watched.length },
    { id: 'wantToWatch' as const, label: 'Хочу посмотреть', count: wantToWatch.length },
    { id: 'dropped' as const, label: 'Брошено', count: dropped.length },
  ];

  const tabData = {
    watched,
    wantToWatch,
    dropped,
  };

  const currentMovies = tabData[activeTab];

  return (
    <div className="min-h-screen bg-gray-950 py-3 sm:py-4">
      <div className="container mx-auto px-2 sm:px-3">
        <h1 className="text-2xl sm:text-3xl font-bold text-white mb-6">
          Мои фильмы
        </h1>

        {/* Вкладки */}
        <div className="flex flex-wrap gap-4 mb-8 border-b border-gray-800 pb-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`pb-3 px-2 border-b-2 transition-colors relative ${
                activeTab === tab.id
                  ? 'border-blue-500 text-white'
                  : 'border-transparent text-gray-400 hover:text-white hover:border-gray-600'
              }`}
            >
              <span className="font-medium text-sm sm:text-base">{tab.label}</span>
              <span className="ml-2 text-xs sm:text-sm">({tab.count})</span>
            </button>
          ))}
        </div>

        {/* Сетка фильмов */}
        {currentMovies.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
            {currentMovies.map((movie) => (
              <div key={movie.id} className="p-1">
                <MovieCard movie={movie} />
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <p className="text-gray-400 text-lg">
              В этом списке пока ничего нет
            </p>
            <p className="text-gray-500 text-sm mt-4">
              Добавляйте фильмы с главной страницы или поиска
            </p>
          </div>
        )}
      </div>
    </div>
  );
}