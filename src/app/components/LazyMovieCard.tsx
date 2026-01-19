// src/app/components/LazyMovieCard.tsx
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Media } from '@/lib/tmdb';
import { logger } from '@/lib/logger';
import { useBlacklist } from './BlacklistContext';
import MovieCard from './MovieCard';

interface LazyMovieCardProps {
  movie: Media;
  index: number;
  priority?: boolean;
}

export default function LazyMovieCard({ movie, index, priority = false }: LazyMovieCardProps) {
  const [shouldRender, setShouldRender] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const { checkBlacklist, isLoading: isBlacklistLoading } = useBlacklist();

  // Проверяем blacklist только когда карточка становится видимой
  useEffect(() => {
    if (!shouldRender) return;

    const checkStatus = async () => {
      try {
        // Проверяем blacklist контекст
        const isBlacklisted = checkBlacklist(movie.id);
        
        // Загружаем статус watchlist
        const statusRes = await fetch(`/api/watchlist?tmdbId=${movie.id}&mediaType=${movie.media_type}`);
        if (statusRes.ok) {
          const data = await statusRes.json();
          setDataLoaded(true);
        }
      } catch (error) {
        logger.error('Failed to load card data', { tmdbId: movie.id, error });
        // Всё равно показываем карточку даже если данные не загрузились
        setDataLoaded(true);
      }
    };

    checkStatus();
  }, [shouldRender, movie.id, movie.media_type, checkBlacklist]);

  // Intersection Observer для lazy loading
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setShouldRender(true);
            observer.disconnect();
          }
        });
      },
      {
        rootMargin: '100px', // Начинаем загрузку за 100px до появления
        threshold: 0.01,
      }
    );

    if (cardRef.current) {
      observer.observe(cardRef.current);
    }

    return () => observer.disconnect();
  }, []);

  // Приоритетные карточки (первые 6) загружаем сразу
  useEffect(() => {
    if (priority) {
      setShouldRender(true);
    }
  }, [priority]);

  // Показываем скелетон пока данные загружаются
  if (!shouldRender) {
    return (
      <div ref={cardRef} className="w-full h-[300px] bg-gray-800/50 rounded-lg animate-pulse" />
    );
  }

  // Показываем лоадер пока загружаем данные карточки
  if (!dataLoaded && !priority) {
    return (
      <div ref={cardRef} className="w-full">
        <div className="w-full aspect-[2/3] bg-gray-800 rounded-lg animate-pulse mb-1" />
        <div className="h-4 bg-gray-800 rounded animate-pulse mb-1" />
        <div className="h-3 bg-gray-800/50 rounded animate-pulse" />
      </div>
    );
  }

  return <MovieCard movie={movie} priority={priority} />;
}
