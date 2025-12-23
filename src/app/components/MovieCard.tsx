// src/app/components/MovieCard.tsx
'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { Media } from '@/lib/tmdb';

// Определяем тип локально
type MediaStatus = 'want' | 'watched' | 'dropped' | null;

interface MovieCardProps {
  movie: Media;
}

export default function MovieCard({ movie }: MovieCardProps) {
  const [showOverlay, setShowOverlay] = useState(false);
  const [status, setStatus] = useState<MediaStatus>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  const imageUrl = movie.poster_path 
    ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
    : '/placeholder-poster.svg';
  
  const title = movie.title || movie.name || 'Без названия';
  const date = movie.release_date || movie.first_air_date;
  const year = date ? date.split('-')[0] : '—';

  // Инициализируем статус при монтировании
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await fetch(`/api/watchlist?tmdbId=${movie.id}&mediaType=${movie.media_type}`);
        if (res.ok) {
          const data = await res.json();
          setStatus(data.status);
        }
      } catch (error) {
        console.error("Failed to fetch status", error);
      }
    };

    fetchStatus();
    
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => {
      window.removeEventListener('resize', checkMobile);
    };
  }, [movie.id, movie.media_type]);

  // Обработчик клика вне карточки
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        overlayRef.current &&
        !overlayRef.current.contains(event.target as Node) &&
        cardRef.current &&
        !cardRef.current.contains(event.target as Node) &&
        showOverlay
      ) {
        setShowOverlay(false);
      }
    };

    if (showOverlay) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showOverlay]);

  // Функция для изменения статуса (отправка в API)
  const handleStatusChange = async (newStatus: MediaStatus) => {
    const oldStatus = status;
    setStatus(newStatus);
    setShowOverlay(false);

    try {
      const res = await fetch('/api/watchlist', {
        method: newStatus === null ? 'DELETE' : 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tmdbId: movie.id,
          mediaType: movie.media_type,
          status: newStatus,
          title: title,
          voteAverage: movie.vote_average,
        }),
      });

      if (!res.ok) {
        setStatus(oldStatus); 
        console.error('Failed to update status');
      }
    } catch (error) {
      setStatus(oldStatus);
      console.error('Network error', error);
    }
  };

  // Функция для получения иконки статуса
  const getStatusIcon = () => {
    switch (status) {
      case 'want':
        return (
          <div className="absolute top-2 right-2 z-10 bg-white rounded-full p-1.5 shadow-lg">
            <div className="w-4 h-4 flex items-center justify-center">
              <span className="text-blue-500 text-lg font-bold leading-none" style={{ marginTop: '-1px' }}>+</span>
            </div>
          </div>
        );
      case 'watched':
        return (
          <div className="absolute top-2 right-2 z-10 bg-green-500 rounded-full p-1.5 shadow-lg">
            <div className="w-4 h-4 flex items-center justify-center">
              <span className="text-white text-sm font-bold leading-none" style={{ marginTop: '-1px' }}>✓</span>
            </div>
          </div>
        );
      case 'dropped':
        return (
          <div className="absolute top-2 right-2 z-10 bg-red-500 rounded-full p-1.5 shadow-lg">
            <div className="w-4 h-4 flex items-center justify-center">
              <span className="text-white text-base font-bold leading-none flex items-center justify-center h-full">×</span>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  // Обработчик клика/тапа на карточку
  const handleCardClick = () => {
    if (isMobile) {
      setShowOverlay(!showOverlay);
    }
  };

  // Обработчик наведения на десктопе
  const handleMouseEnter = () => {
    if (!isMobile) {
      setShowOverlay(true);
    }
  };

  const handleMouseLeave = () => {
    if (!isMobile) {
      setShowOverlay(false);
    }
  };

  return (
    <div 
      ref={cardRef}
      className="group w-full h-full min-w-0 relative"
      onClick={handleCardClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Общий контейнер для плашки и постера */}
      <div className="relative">
        {/* Плашка с типом медиа */}
        <div className={`${movie.media_type === 'movie' ? 'bg-green-500' : 'bg-blue-500'} text-white text-xs font-semibold px-2 py-1.5 rounded-t-lg w-full text-center`}>
          {movie.media_type === 'movie' ? 'Фильм' : 'Сериал'}
        </div>
        
        {/* Контейнер постера */}
        <div className={`relative w-full aspect-[2/3] bg-gradient-to-br from-gray-800 to-gray-900 rounded-b-lg overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300 ${
          showOverlay && !isMobile ? 'cursor-default' : 'cursor-pointer'
        }`}>
          {getStatusIcon()}

          <Image
            src={imageUrl}
            alt={title}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            sizes="(max-width: 640px) 48vw,
                   (max-width: 768px) 31vw,
                   (max-width: 1024px) 23vw,
                   (max-width: 1280px) 19vw,
                   15vw"
            loading="lazy"
          />
          
          {!showOverlay && (
            <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-2 sm:p-3">
              <h3 className="text-white font-bold text-xs sm:text-sm mb-1.5 line-clamp-3">
                {title}
              </h3>
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center bg-black/40 px-1.5 py-0.5 rounded">
                  <span className="text-yellow-400 mr-1 text-xs">★</span>
                  <span className="text-white font-medium">
                    {movie.vote_average?.toFixed(1) || '0.0'}
                  </span>
                </div>
                <div className="bg-black/40 px-1.5 py-0.5 rounded">
                  <span className="text-gray-300">
                    {year}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Оверлей с кнопками выбора статуса */}
        {showOverlay && (
          <div 
            ref={overlayRef}
            className="absolute -top-8 left-0 right-0 bottom-0 bg-black/80 flex flex-col items-center justify-center p-2 sm:p-3 z-50 rounded-lg"
          >
            <div className="w-full max-w-[140px] sm:max-w-[150px] space-y-1">
              <button
                onClick={() => handleStatusChange('want')}
                className={`w-full py-1.5 px-2 rounded-lg text-xs font-medium transition-all duration-200 flex items-center justify-start text-left cursor-pointer ${
                  status === 'want' 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-white/10 text-white hover:bg-white/20'
                }`}
              >
                <span className="text-base font-bold min-w-[16px] flex justify-center mr-1.5">+</span>
                <span className="truncate">Хочу посмотреть</span>
              </button>
              
              <button
                onClick={() => handleStatusChange('watched')}
                className={`w-full py-1.5 px-2 rounded-lg text-xs font-medium transition-all duration-200 flex items-center justify-start text-left cursor-pointer ${
                  status === 'watched' 
                    ? 'bg-green-500 text-white' 
                    : 'bg-white/10 text-white hover:bg-white/20'
                }`}
              >
                <span className="text-sm font-bold min-w-[16px] flex justify-center mr-1.5">✓</span>
                <span className="truncate">Просмотрено</span>
              </button>
              
              <button
                onClick={() => handleStatusChange('dropped')}
                className={`w-full py-1.5 px-2 rounded-lg text-xs font-medium transition-all duration-200 flex items-center justify-start text-left cursor-pointer ${
                  status === 'dropped' 
                    ? 'bg-red-500 text-white' 
                    : 'bg-white/10 text-white hover:bg-white/20'
                }`}
              >
                <span className="text-sm font-bold min-w-[16px] flex justify-center mr-1.5">×</span>
                <span className="truncate">Брошено</span>
              </button>

              {status && (
                <button
                  onClick={() => handleStatusChange(null)}
                  className="w-full py-1 px-2 rounded-lg text-[10px] sm:text-xs font-medium bg-gray-800/50 text-gray-300 hover:bg-gray-800/70 mt-1 flex items-center justify-center cursor-pointer"
                >
                  Убрать из списков
                </button>
              )}
            </div>
          </div>
        )}
      </div>
      
      {/* Информация под постером */}
      <div className="mt-2 px-0.5">
        <h3 className="text-white font-medium text-xs sm:text-sm line-clamp-1 leading-tight">
          {title}
        </h3>
        <div className="flex items-center justify-between mt-1.5">
          <div className="flex items-center bg-gray-800/50 px-1.5 py-0.5 rounded text-xs">
            <span className="text-yellow-400 mr-1">★</span>
            <span className="text-gray-200 font-medium">
              {movie.vote_average?.toFixed(1) || '0.0'}
            </span>
          </div>
          <div className="text-xs text-gray-400">
            {year}
          </div>
        </div>
      </div>
    </div>
  );
}