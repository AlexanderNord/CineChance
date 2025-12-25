// src/app/page.tsx
import HorizontalMovieGridServer from './components/HorizontalMovieGridServer';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import { fetchTrendingMovies } from '@/lib/tmdb';

export default async function Home() {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;

  let blacklistedIds = new Set<number>();

  if (userId) {
    try {
      const blacklist = await prisma.blacklist.findMany({
        where: { userId },
        select: { tmdbId: true }
      });
      blacklistedIds = new Set(blacklist.map(b => b.tmdbId));
    } catch (error) {
      console.error("Failed to fetch blacklist", error);
    }
  }
  // Загружаем тренды на сервере и фильтруем по черному списку
  const allMovies = await fetchTrendingMovies('week');
  const filtered = allMovies.filter(m => !blacklistedIds.has(m.id));
  const displayMovies = filtered.slice(0, 20);

  // Получаем статусы из WatchList одной пачкой (Server)
  const watchlistMap = new Map<string, 'want'|'watched'|'dropped'|null>();
  if (userId && displayMovies.length > 0) {
    const ids = displayMovies.map(m => m.id);
    try {
      const rows = await prisma.watchList.findMany({ where: { userId, tmdbId: { in: ids } }, include: { status: true } });
      const STATUS_FROM_DB: Record<string, 'want'|'watched'|'dropped'> = {
        'Хочу посмотреть': 'want',
        'Просмотрено': 'watched',
        'Брошено': 'dropped',
      };
      rows.forEach(r => {
        const key = `${r.tmdbId}:${r.mediaType}`;
        watchlistMap.set(key, STATUS_FROM_DB[r.status?.name ?? ''] ?? null);
      });
      displayMovies.forEach(m => {
        const key = `${m.id}:${m.media_type}`;
        if (!watchlistMap.has(key)) watchlistMap.set(key, null);
      });
    } catch (e) {
      console.error('Failed to fetch watchlist in Home', e);
      displayMovies.forEach(m => watchlistMap.set(`${m.id}:${m.media_type}`, null));
    }
  } else {
    displayMovies.forEach(m => watchlistMap.set(`${m.id}:${m.media_type}`, null));
  }

  const moviesWithFlags = displayMovies.map(m => ({
    ...m,
    _initialStatus: watchlistMap.get(`${m.id}:${m.media_type}`) ?? null,
    _initialIsBlacklisted: blacklistedIds.has(m.id),
  }));

  return (
    <div className="w-full max-w-full">
      {/* Передаем уже отфильтрованные и аннотированные фильмы */}
      <HorizontalMovieGridServer movies={moviesWithFlags} />

      <div className="mt-12 px-4 sm:px-6 lg:px-8">
        <h2 className="text-2xl font-bold mb-6">Что посмотреть дальше?</h2>
        <p className="text-gray-400">
          Скоро здесь появятся персонализированные рекомендации и новые релизы.
        </p>
      </div>

      <div className="h-12"></div>
    </div>
  );
}