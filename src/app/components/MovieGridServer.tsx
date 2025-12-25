// src/app/components/MovieGridServer.tsx
import MovieCard from './MovieCard';
import { fetchTrendingMovies } from '@/lib/tmdb';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';

export default async function MovieGridServer() {
  try {
    const movies = await fetchTrendingMovies('week');
    const displayMovies = movies.slice(0, 28);

    // Получаем статусы пакетом для отображаемых фильмов
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;
    const watchlistMap = new Map<string, string | null>();
    const blacklistedSet = new Set<number>();
    if (userId && displayMovies.length > 0) {
      const ids = displayMovies.map(m => m.id);
      const rows = await prisma.watchList.findMany({
        where: { userId, tmdbId: { in: ids } },
        include: { status: true },
      });
      const STATUS_FROM_DB: Record<string, string> = {
        'Хочу посмотреть': 'want',
        'Просмотрено': 'watched',
        'Брошено': 'dropped',
      };
      rows.forEach(r => watchlistMap.set(`${r.tmdbId}:${r.mediaType}`, STATUS_FROM_DB[r.status?.name ?? ''] ?? null));
      // ensure explicit null for movies without a watchlist row
      displayMovies.forEach(m => {
        const key = `${m.id}:${m.media_type}`;
        if (!watchlistMap.has(key)) watchlistMap.set(key, null);
      });
      // Получаем черный список для отображаемых фильмов
      try {
        const bl = await prisma.blacklist.findMany({ where: { userId, tmdbId: { in: ids } }, select: { tmdbId: true } });
        bl.forEach(b => blacklistedSet.add(b.tmdbId));
      } catch (e) {
        console.error('Failed to fetch blacklist in MovieGridServer', e);
      }
    }

    if (displayMovies.length === 0) {
      return (
        <div className="w-full">
          <h1 className="text-3xl sm:text-4xl font-bold mb-8 mt-4">Популярное на этой неделе</h1>
          <div className="text-center py-12">
            <p className="text-gray-400 text-lg">Не удалось загрузить фильмы. Попробуйте позже.</p>
          </div>
        </div>
      );
    }

    return (
      <div className="w-full">
        <h1 className="text-3xl sm:text-4xl font-bold mb-8 mt-4">Популярное на этой неделе</h1>
        
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-4 sm:gap-6">
          {displayMovies.map((movie) => (
              <MovieCard
                key={movie.id}
                movie={movie}
                initialStatus={(watchlistMap.get(`${movie.id}:${movie.media_type}`) as any)}
                initialIsBlacklisted={blacklistedSet.has(movie.id)}
              />
          ))}
        </div>
      </div>
    );
  } catch (error) {
    console.error('Error in MovieGridServer:', error);
    return (
      <div className="w-full">
        <h1 className="text-3xl sm:text-4xl font-bold mb-8 mt-4">Популярное на этой неделе</h1>
        <div className="text-center py-12">
          <p className="text-red-400 text-lg">Ошибка при загрузке фильмов</p>
        </div>
      </div>
    );
  }
}