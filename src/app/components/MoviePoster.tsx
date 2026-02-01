// src/app/components/MoviePoster.tsx
'use client';

import { useState, useEffect, memo } from 'react';
import Image from 'next/image';
import { Media } from '@/lib/tmdb';
import { logger } from '@/lib/logger';
import { STATIC_BLUR_PLACEHOLDER } from '@/lib/blurPlaceholder';

// Детекция мобильного устройства
const isMobileDevice = () => {
  if (typeof window === 'undefined') return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

interface MoviePosterProps {
  movie: Media;
  priority?: boolean;
  isBlacklisted?: boolean;
  restoreView?: boolean;
  isHovered?: boolean;
  showOverlay?: boolean;
  onError?: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: (e: React.MouseEvent) => void;
  onClick?: () => void;
  children?: React.ReactNode;
}

const MoviePoster = memo(({
  movie,
  priority = false,
  isBlacklisted = false,
  restoreView = false,
  isHovered = false,
  showOverlay = false,
  onError,
  onMouseEnter,
  onMouseLeave,
  onClick,
  children
}: MoviePosterProps) => {
  // Сбрасываем состояние при каждом монтировании (новый фильм = новый постер)
  const [imageError, setImageError] = useState(false);
  const [fanartPoster, setFanartPoster] = useState<string | null>(null);
  const [isTryingFanart, setIsTryingFanart] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  // При изменении movie сбрасываем все состояния загрузки
  useEffect(() => {
    setImageError(false);
    setFanartPoster(null);
    setIsTryingFanart(false);
    setImageLoaded(false);
    setRetryCount(0);
  }, [movie.id, movie.poster_path]);

  const handlePosterError = async () => {
    logger.warn('Poster load failed, trying fanart.tv fallback', { 
      tmdbId: movie.id, 
      mediaType: movie.media_type,
      hasPosterPath: !!movie.poster_path,
      retryCount
    });
    
    // Пробуем Fanart.tv только если еще не пробовали и есть poster_path
    if (!isTryingFanart && !fanartPoster && movie.poster_path) {
      setIsTryingFanart(true);
      try {
        const res = await fetch(`/api/fanart-poster?tmdbId=${movie.id}&mediaType=${movie.media_type}`);
        if (res.ok) {
          const data = await res.json();
          if (data.poster) {
            logger.info('Fanart.tv poster found', { tmdbId: movie.id, posterUrl: data.poster });
            setFanartPoster(data.poster);
            setImageError(false); // Сбрасываем ошибку при успешном получении Fanart постера
            return;
          }
        }
      } catch (error) {
        logger.error('Failed to fetch Fanart.tv poster', { tmdbId: movie.id, mediaType: movie.media_type, error });
      }
    }
    
    // Если это первая ошибка и еще не было ретраев, пробуем перезагрузить TMDB изображение
    if (retryCount === 0 && !fanartPoster && movie.poster_path) {
      setRetryCount(1);
      // Добавляем случайный параметр чтобы избежать кэша
      const timestamp = Date.now();
      const tmdbUrl = `https://image.tmdb.org/t/p/w500${movie.poster_path}?t=${timestamp}`;
      logger.info('Retrying TMDB poster with cache bust', { tmdbId: movie.id, url: tmdbUrl });
      return;
    }
    
    logger.warn('All poster sources failed, showing placeholder', { tmdbId: movie.id, retryCount });
    setImageError(true);
    onError?.();
  };

  const imageUrl = imageError
    ? '/placeholder-poster.svg'
    : fanartPoster || (movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}${retryCount > 0 ? `?t=${Date.now()}` : ''}` : '/placeholder-poster.svg');

  // Определяем оптимальные размеры для разных устройств
  const imageSizes = isMobileDevice() 
    ? "(max-width: 640px) 33vw, (max-width: 768px) 25vw, (max-width: 1024px) 20vw, 16vw"
    : "(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, (max-width: 1280px) 20vw, 16vw";

  // На мобильных устройствах используем eager loading для первых изображений
  const shouldUseEagerLoading = priority || (isMobileDevice() && retryCount > 0);

  return (
    <div
      className={`relative w-full aspect-[2/3] bg-gradient-to-br from-gray-800 to-gray-900 rounded-none overflow-hidden shadow-lg transition-all duration-300 ${
        restoreView || isBlacklisted
          ? 'opacity-60 grayscale hover:opacity-80 hover:grayscale-0'
          : isHovered && !showOverlay ? 'shadow-xl' : ''
      } ${showOverlay ? 'cursor-default' : 'cursor-pointer'}`}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {children}

      <Image
        key={`${movie.id}-${fanartPoster ? 'fanart' : 'tmdb'}-${retryCount}-${imageLoaded}`}
        src={imageUrl}
        alt={movie.title || movie.name || 'Poster'}
        fill
        className={`object-cover transition-transform duration-500 ${
          isHovered && !showOverlay ? 'scale-105' : ''
        } ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
        sizes={imageSizes}
        loading={shouldUseEagerLoading ? "eager" : "lazy"}
        placeholder="blur"
        blurDataURL={STATIC_BLUR_PLACEHOLDER}
        onError={handlePosterError}
        onLoad={() => setImageLoaded(true)}
        unoptimized={!!fanartPoster} // Отключаем оптимизацию для Fanart URL
        quality={isMobileDevice() ? 75 : 85} // Снижаем качество на мобильных для ускорения загрузки
      />
    </div>
  );
});

MoviePoster.displayName = 'MoviePoster';

export default MoviePoster;