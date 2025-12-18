// src/app/components/MovieCard.tsx
'use client';

import Image from 'next/image';
import { Movie } from '@/lib/tmdb';

interface MovieCardProps {
  movie: Movie;
}

export default function MovieCard({ movie }: MovieCardProps) {
  const imageUrl = movie.poster_path 
    ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
    : '/placeholder-poster.svg';

  return (
    <div className="group cursor-pointer transition-all duration-300 hover:scale-105">
      <div className="relative w-48 h-72 bg-gray-800 rounded-lg overflow-hidden shadow-lg hover:shadow-2xl">
        <Image
          src={imageUrl}
          alt={movie.title || 'Фильм без названия'}
          fill
          className="object-cover group-hover:opacity-80 transition-opacity"
          sizes="200px"
        />
        
        {/* Градиент и информация на постере */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4">
          <h3 className="text-white font-bold text-sm mb-2 line-clamp-2">
            {movie.title}
          </h3>
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center">
              <span className="text-yellow-400 mr-1">★</span>
              <span className="text-white">{movie.vote_average?.toFixed(1)}</span>
            </div>
            <span className="text-gray-300">
              {movie.release_date?.split('-')[0] || 'Нет года'}
            </span>
          </div>
        </div>
      </div>
      
      {/* Информация под постером */}
      <div className="mt-3">
        <h3 className="text-white font-medium text-sm line-clamp-1">
          {movie.title}
        </h3>
        <div className="flex items-center justify-between mt-1">
          <div className="flex items-center text-xs text-gray-400">
            <span className="text-yellow-400 mr-1">★</span>
            <span>{movie.vote_average?.toFixed(1)}</span>
          </div>
          <span className="text-xs text-gray-400">
            {movie.release_date?.split('-')[0] || '—'}
          </span>
        </div>
      </div>
    </div>
  );
}