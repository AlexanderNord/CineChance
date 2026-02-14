'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Star, Tag as TagIcon, Music, ArrowLeft } from 'lucide-react';

interface UserStats {
  total: {
    watched: number;
    wantToWatch: number;
    dropped: number;
    hidden: number;
    totalForPercentage: number;
  };
  typeBreakdown: {
    movie: number;
    tv: number;
    cartoon: number;
    anime: number;
  };
  averageRating: number | null;
  ratedCount: number;
  ratingDistribution: Record<number, number>;
}

interface TagUsage {
  id: string;
  name: string;
  count: number;
}

interface GenreData {
  id: number;
  name: string;
  count: number;
}

interface StatsClientProps {
  userId: string;
}

function AverageRatingSkeleton() {
  return (
    <div className="bg-gray-900 rounded-lg md:rounded-xl p-4 md:p-5 border border-gray-800 animate-pulse">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-4 h-4 bg-gray-700 rounded"></div>
        <div className="h-4 w-24 bg-gray-700 rounded"></div>
      </div>
      <div className="flex items-end gap-3">
        <div className="h-10 w-16 bg-gray-700 rounded"></div>
        <div className="flex-1 pb-1">
          <div className="flex gap-0.5 mb-1">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
              <div key={i} className="w-4 h-4 bg-gray-700 rounded"></div>
            ))}
          </div>
          <div className="h-3 w-20 bg-gray-800 rounded"></div>
        </div>
      </div>
    </div>
  );
}

function TagsSkeleton() {
  return (
    <div className="bg-gray-900 rounded-lg md:rounded-xl p-4 md:p-5 border border-gray-800 animate-pulse">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-4 h-4 bg-gray-700 rounded"></div>
        <div className="h-4 w-24 bg-gray-700 rounded"></div>
      </div>
      <div className="flex flex-wrap gap-2">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="h-7 w-20 bg-gray-700 rounded-full"></div>
        ))}
      </div>
    </div>
  );
}

function GenresSkeleton() {
  return (
    <div className="bg-gray-900 rounded-lg md:rounded-xl p-4 md:p-5 border border-gray-800 animate-pulse">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-4 h-4 bg-gray-700 rounded"></div>
        <div className="h-4 w-24 bg-gray-700 rounded"></div>
      </div>
      <div className="space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="w-5 h-5 bg-gray-700 rounded"></div>
            <div className="flex-1">
              <div className="flex justify-between items-center mb-1">
                <div className="h-4 w-16 bg-gray-700 rounded"></div>
                <div className="h-4 w-8 bg-gray-700 rounded"></div>
              </div>
              <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                <div className="h-full w-1/2 bg-gray-700 rounded-full"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function StatsClient({ userId }: StatsClientProps) {
  const [stats, setStats] = useState<UserStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [averageRatingLoading, setAverageRatingLoading] = useState(true);
  const [tagUsage, setTagUsage] = useState<TagUsage[]>([]);
  const [tagUsageLoading, setTagUsageLoading] = useState(true);
  const [watchedGenres, setWatchedGenres] = useState<GenreData[]>([]);
  const [watchedGenresLoading, setWatchedGenresLoading] = useState(true);

  useEffect(() => {
    const loadDataInParallel = async () => {
      try {
        const [statsRes, tagUsageRes, genresRes] = await Promise.all([
          fetch('/api/user/stats'),
          fetch('/api/user/tag-usage?limit=100'),
          fetch('/api/user/genres?statuses=watched,rewatched&limit=100'),
        ]);

        if (statsRes.ok) {
          const data = await statsRes.json();
          setStats({
            total: {
              watched: data.total?.watched || 0,
              wantToWatch: data.total?.wantToWatch || 0,
              dropped: data.total?.dropped || 0,
              hidden: data.total?.hidden || 0,
              totalForPercentage: data.total?.totalForPercentage || 0,
            },
            typeBreakdown: {
              movie: data.typeBreakdown?.movie || 0,
              tv: data.typeBreakdown?.tv || 0,
              cartoon: data.typeBreakdown?.cartoon || 0,
              anime: data.typeBreakdown?.anime || 0,
            },
            averageRating: data.averageRating || null,
            ratedCount: data.ratedCount || 0,
            ratingDistribution: data.ratingDistribution || {},
          });
        }
        setStatsLoading(false);
        setAverageRatingLoading(false);

        if (tagUsageRes.ok) {
          const data = await tagUsageRes.json();
          setTagUsage(data.tags || []);
        }
        setTagUsageLoading(false);

        if (genresRes.ok) {
          const data = await genresRes.json();
          setWatchedGenres(data.genres || []);
        }
        setWatchedGenresLoading(false);

      } catch (error) {
        setStatsLoading(false);
        setAverageRatingLoading(false);
        setTagUsageLoading(false);
        setWatchedGenresLoading(false);
      }
    };

    loadDataInParallel();
  }, []);

  return (
    <div className="space-y-6">
      <Link
        href="/profile"
        className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Вернуться в профиль</span>
      </Link>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {averageRatingLoading ? (
          <AverageRatingSkeleton />
        ) : stats?.averageRating !== null ? (
          <div className="bg-gray-900 rounded-lg md:rounded-xl p-4 md:p-5 border border-gray-800">
            <div className="flex items-center gap-2 mb-4">
              <Star className="w-4 h-4 text-yellow-400" />
              <h3 className="text-sm font-medium text-white">Средняя оценка</h3>
            </div>
            <div className="flex items-end gap-3">
              <span className="text-4xl md:text-5xl font-bold text-white">
                {stats?.averageRating?.toFixed(1) || '-'}
              </span>
              <div className="flex-1 pb-1">
                <div className="flex gap-0.5 mb-1">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((star) => (
                    <Star
                      key={star}
                      className={`w-4 h-4 ${
                        (stats?.averageRating || 0) >= star 
                          ? 'text-yellow-400 fill-yellow-400' 
                          : 'text-gray-600'
                      }`}
                    />
                  ))}
                </div>
                <p className="text-gray-500 text-xs">
                  {stats?.ratedCount || 0} оценённых
                </p>
              </div>
            </div>

            {stats?.ratingDistribution && (() => {
              const distribution = stats.ratingDistribution;
              const totalRatings = Object.values(distribution).reduce((sum, count) => sum + count, 0);
              
              if (totalRatings === 0) {
                return null;
              }
              
              const maxValue = Math.max(...Object.values(distribution), 0);
              
              return (
                <div className="mt-4 pt-4 border-t border-gray-800">
                  <div className="space-y-3">
                    {[10, 9, 8, 7, 6, 5, 4, 3, 2, 1].map((rating) => {
                      const count = distribution[rating] || 0;
                      if (count === 0) return null;
                      
                      const barWidth = maxValue > 0 ? (count / maxValue) * 100 : 0;
                      
                      return (
                        <Link
                          key={rating}
                          href={`/stats/ratings/${rating}?source=ratings`}
                          className="flex items-center gap-3 group hover:opacity-80 transition"
                        >
                          <div className="relative w-7 h-7 flex-shrink-0 group-hover:scale-110 transition">
                            <svg 
                              width="28" 
                              height="28" 
                              viewBox="0 0 32 32" 
                              fill="none" 
                              xmlns="http://www.w3.org/2000/svg"
                              className="absolute inset-0 w-full h-full"
                            >
                              <path 
                                d="M16 2L21 10L29 12L24 18L24 27L16 24L8 27L8 18L3 12L11 10L16 2Z" 
                                stroke="#FFD700" 
                                strokeWidth="1.5" 
                                fill="none"
                              />
                            </svg>
                            <span className="absolute inset-0 flex items-center justify-center text-white text-xs font-bold z-10" style={{ transform: 'translateY(0.5px)' }}>
                              {rating}
                            </span>
                          </div>
                          
                          <div className="flex-1">
                            <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-yellow-400 rounded-full transition-all duration-500"
                                style={{ width: `${barWidth}%` }}
                              />
                            </div>
                          </div>
                          
                          <span className="text-gray-300 text-xs w-6 text-right">{count}</span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              );
            })()}
          </div>
        ) : null}

        {tagUsageLoading ? (
          <TagsSkeleton />
        ) : tagUsage.length > 0 ? (
          <div className="bg-gray-900 rounded-lg md:rounded-xl p-4 md:p-5 border border-gray-800">
            <div className="flex items-center gap-2 mb-4">
              <TagIcon className="w-4 h-4 text-cyan-400" />
              <h3 className="text-sm font-medium text-white">Теги пользователя</h3>
            </div>
            <div className="space-y-3">
              {tagUsage.slice(0, 15).map((tag) => {
                const totalTags = tagUsage.reduce((sum, t) => sum + t.count, 0);
                const percentage = totalTags > 0 ? (tag.count / totalTags) * 100 : 0;
                
                return (
                  <Link
                    key={tag.id}
                    href={`/stats/tags/${tag.id}?source=tags`}
                    className="flex items-center gap-3 group hover:opacity-80 transition"
                  >
                    <div className="w-5 h-5 bg-cyan-400/20 rounded flex items-center justify-center flex-shrink-0 group-hover:bg-cyan-400/40 transition">
                      <TagIcon className="w-3 h-3 text-cyan-400" />
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-gray-300 text-sm group-hover:text-cyan-400 transition">{tag.name}</span>
                        <span className="text-white text-xs">{tag.count}</span>
                      </div>
                      <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-cyan-500 rounded-full transition-all duration-500"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        ) : !tagUsageLoading && tagUsage.length === 0 ? (
          <div className="bg-gray-900 rounded-lg md:rounded-xl p-4 md:p-5 border border-gray-800">
            <div className="flex items-center gap-2 mb-4">
              <TagIcon className="w-4 h-4 text-cyan-400" />
              <h3 className="text-sm font-medium text-white">Теги пользователя</h3>
            </div>
            <p className="text-gray-500 text-sm">Пока нет тегов. Добавляйте их при оценке фильма.</p>
          </div>
        ) : null}

        {watchedGenresLoading ? (
          <GenresSkeleton />
        ) : watchedGenres.length > 0 ? (
          <div className="bg-gray-900 rounded-lg md:rounded-xl p-4 md:p-5 border border-gray-800">
            <div className="flex items-center gap-2 mb-4">
              <Music className="w-4 h-4 text-pink-400" />
              <h3 className="text-sm font-medium text-white">Жанры просмотренного</h3>
            </div>
            <div className="space-y-3">
              {watchedGenres.slice(0, 15).map((genre) => {
                const totalWatched = watchedGenres.reduce((sum, g) => sum + g.count, 0);
                const percentage = totalWatched > 0 ? (genre.count / totalWatched) * 100 : 0;
                
                return (
                  <Link
                    key={genre.id}
                    href={`/stats/genres/${genre.id}?source=genres`}
                    className="flex items-center gap-3 group hover:opacity-80 transition"
                  >
                    <div className="w-5 h-5 bg-pink-400/20 rounded flex items-center justify-center flex-shrink-0 group-hover:bg-pink-400/40 transition">
                      <Music className="w-3 h-3 text-pink-400" />
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-gray-300 text-sm group-hover:text-pink-400 transition">{genre.name}</span>
                        <span className="text-white text-xs">{genre.count}</span>
                      </div>
                      <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-pink-500 rounded-full transition-all duration-500"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        ) : !watchedGenresLoading && watchedGenres.length === 0 ? (
          <div className="bg-gray-900 rounded-lg md:rounded-xl p-4 md:p-5 border border-gray-800">
            <div className="flex items-center gap-2 mb-4">
              <Music className="w-4 h-4 text-pink-400" />
              <h3 className="text-sm font-medium text-white">Жанры просмотренного</h3>
            </div>
            <p className="text-gray-500 text-sm">Жанры появятся после просмотра фильмов.</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
