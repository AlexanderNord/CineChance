// src/app/profile/collections/CollectionsClient.tsx
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Film } from 'lucide-react';
import Loader from '@/app/components/Loader';

interface CollectionAchievement {
  id: number;
  name: string;
  poster_path: string | null;
  total_movies: number;
  added_movies: number;
  watched_movies: number;
  progress_percent: number;
}

interface CollectionsClientProps {
  userId: string;
}

export default function CollectionsClient({ userId }: CollectionsClientProps) {
  const [collections, setCollections] = useState<CollectionAchievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCollections = async () => {
      try {
        const res = await fetch('/api/user/achievements');
        if (!res.ok) throw new Error('Failed to fetch collections');
        const data = await res.json();
        setCollections(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('Failed to fetch collections:', err);
        setError('Не удалось загрузить коллекции');
      } finally {
        setLoading(false);
      }
    };

    fetchCollections();
  }, [userId]);

  if (loading) {
    return (
      <div className="bg-gray-900 rounded-lg md:rounded-xl p-6 border border-gray-800">
        <Loader text="Загрузка коллекций..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-900/30 border border-red-700 rounded-lg p-6">
        <p className="text-red-300">{error}</p>
      </div>
    );
  }

  if (collections.length === 0) {
    return (
      <div className="bg-gray-900 rounded-lg md:rounded-xl p-6 border border-gray-800">
        <p className="text-gray-400 text-center py-10">
          У вас пока нет коллекций с просмотренными фильмами
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Сетка коллекций */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        {collections
          .sort((a, b) => b.progress_percent - a.progress_percent)
          .map((collection) => {
            // Рассчитываем opacity на основе прогресса
            const overlayOpacity = (100 - collection.progress_percent) / 100;
            
            return (
              <Link
                key={collection.id}
                href={`/collection/${collection.id}`}
                className="group relative"
              >
                <div className="relative">
                  {/* Постер */}
                  <div className="aspect-[2/3] rounded-lg overflow-hidden bg-gray-800 border border-gray-700 group-hover:border-purple-500/50 transition-all relative">
                    {collection.poster_path ? (
                      <img
                        src={`https://image.tmdb.org/t/p/w300${collection.poster_path}`}
                        alt={collection.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-600">
                        <Film className="w-10 h-10" />
                      </div>
                    )}
                    
                    {/* Оверлей прогресса */}
                    <div 
                      className="absolute inset-0 bg-gray-900 transition-opacity duration-300 group-hover:!opacity-0"
                      style={{ 
                        opacity: overlayOpacity,
                        // Используем important в инлайн-стиле для переопределения
                        transition: 'opacity 300ms !important'
                      }}
                    />
                    
                    {/* Прогресс просмотра */}
                    <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-gray-800">
                      <div 
                        className="h-full bg-purple-500 transition-all"
                        style={{ width: `${collection.progress_percent}%` }}
                      />
                    </div>
                    
                    {/* Процент просмотра */}
                    <div className="absolute top-2 right-2 bg-purple-600/90 text-white text-xs font-medium px-2 py-1 rounded">
                      {collection.progress_percent}%
                    </div>
                  </div>
                  
                  {/* Название */}
                  <h3 className="mt-2 text-gray-300 text-sm truncate group-hover:text-purple-400 transition-colors">
                    {collection.name.replace(/\s*\(Коллекция\)\s*$/i, '')}
                  </h3>
                  
                  {/* Статистика */}
                  <p className="text-gray-500 text-xs">
                    <span className="text-green-400">{collection.watched_movies}</span>
                    {' / '}
                    <span>{collection.total_movies}</span>
                    {' фильмов'}
                  </p>
                </div>
              </Link>
            );
          })}
      </div>

      {/* Итого */}
      <p className="text-gray-500 text-sm text-center pt-4">
        Всего коллекций: {collections.length}
      </p>
    </div>
  );
}