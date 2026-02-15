'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { Clapperboard } from 'lucide-react';
import ImageWithProxy from '@/app/components/ImageWithProxy';
import Loader from '@/app/components/Loader';
import '@/app/profile/components/AchievementCards.css';

interface CreatorAchievement {
  id: number;
  name: string;
  profile_path: string | null;
  job_type: 'director' | 'producer' | 'writer';
  watched_movies: number;
  rewatched_movies: number;
  dropped_movies: number;
  total_movies: number;
  progress_percent: number;
  average_rating: number | null;
  creator_score: number;
}

interface CreatorsClientProps {
  userId: string;
}

const TOP_CREATORS_COUNT = 50;
const DISPLAY_COUNT = 50;

const jobTypeLabels: Record<string, string> = {
  director: 'Режиссер',
  producer: 'Продюсер',
  writer: 'Сценарист',
};

const jobTypeColors: Record<string, string> = {
  director: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  producer: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  writer: 'bg-green-500/20 text-green-400 border-green-500/30',
};

function CreatorCardSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="aspect-[2/3] rounded-lg bg-gray-800 border border-gray-700" />
      <div className="mt-2 h-4 bg-gray-800 rounded w-3/4" />
      <div className="mt-1 h-3 bg-gray-900 rounded w-1/2" />
    </div>
  );
}

function PageSkeleton() {
  const skeletonCount = 12;
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
      {Array.from({ length: skeletonCount }).map((_, i) => (
        <CreatorCardSkeleton key={i} />
      ))}
    </div>
  );
}

export default function CreatorsClient({ userId }: CreatorsClientProps) {
  const [creators, setCreators] = useState<CreatorAchievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const fetchCreators = async () => {
      try {
        setLoading(true);
        setError(null);
        setProgress(0);

        progressIntervalRef.current = setInterval(() => {
          setProgress(prev => {
            if (prev < 70) {
              return Math.min(prev + Math.random() * 3 + 1, 70);
            } else if (prev < 85) {
              return Math.min(prev + Math.random() * 1 + 0.5, 85);
            } else {
              return prev;
            }
          });
        }, 200);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 60000);

        const response = await fetch(`/api/user/achiev_creators?limit=${TOP_CREATORS_COUNT}&singleLoad=true`, {
          signal: controller.signal,
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          throw new Error(`API Error: ${response.status}`);
        }

        const data = await response.json();
        
        setCreators(data.creators || []);
        
        if (progressIntervalRef.current) {
          clearInterval(progressIntervalRef.current);
        }
        setProgress(100);
        
        setTimeout(() => setProgress(0), 300);
        
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
          setError('Превышен таймаут запроса');
        } else {
          setError(err instanceof Error ? err.message : 'Ошибка загрузки');
        }
      } finally {
        setLoading(false);
        if (progressIntervalRef.current) {
          clearInterval(progressIntervalRef.current);
        }
      }
    };

    fetchCreators();
  }, [userId]);

  if (loading) {
    return (
      <div>
        <div className="mb-4">
          <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
        <PageSkeleton />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-400 mb-4">{error}</p>
        <button 
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition"
        >
          Повторить
        </button>
      </div>
    );
  }

  if (creators.length === 0) {
    return (
      <div className="text-center py-12">
        <Clapperboard className="w-16 h-16 text-gray-600 mx-auto mb-4" />
        <p className="text-gray-400 text-lg">У вас пока нет просмотренных создателей</p>
        <p className="text-gray-500 text-sm mt-2">Добавьте фильмы и сериалы в список просмотренных</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4">
        <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        {creators.slice(0, DISPLAY_COUNT).map((creator, index) => (
          <div key={`${creator.id}-${creator.job_type}-${index}`} className="group">
            <div className="relative aspect-[2/3] rounded-lg overflow-hidden bg-gray-900 border border-gray-800 group-hover:border-amber-500/30 transition-colors">
              {creator.profile_path ? (
                <ImageWithProxy
                  src={`https://image.tmdb.org/t/p/w500${creator.profile_path}`}
                  alt={creator.name}
                  fill
                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                  sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 16vw"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
                  <Clapperboard className="w-12 h-12 text-gray-600" />
                </div>
              )}
              
              <div className="absolute top-2 left-2">
                <span className={`px-2 py-0.5 text-xs font-medium rounded border ${jobTypeColors[creator.job_type]}`}>
                  {jobTypeLabels[creator.job_type]}
                </span>
              </div>

              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-2 pt-12">
                <p className="text-white text-sm font-medium line-clamp-2">{creator.name}</p>
                <div className="flex items-center justify-between mt-1">
                  <p className="text-gray-400 text-xs">
                    {creator.watched_movies} / {creator.total_movies}
                  </p>
                  <span className="px-1.5 py-0.5 bg-amber-500/20 text-amber-400 text-xs rounded">
                    {creator.progress_percent}%
                  </span>
                </div>
                <div className="mt-1 h-1 bg-gray-700 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-amber-500 rounded-full"
                    style={{ width: `${creator.progress_percent}%` }}
                  />
                </div>
              </div>
            </div>
            
            <div className="mt-2 flex items-center justify-between">
              <span className="text-gray-400 text-xs">
                {creator.watched_movies} просмотренных
              </span>
              {creator.average_rating !== null && (
                <span className="text-amber-400 text-xs flex items-center gap-1">
                  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                  </svg>
                  {creator.average_rating}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
