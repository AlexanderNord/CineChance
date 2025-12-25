// src/app/components/HorizontalMovieGridServer.tsx
import MovieCard from './MovieCard';
import './ScrollContainer.css';
import ScrollContainer from './ScrollContainer';
import { Media, fetchTrendingMovies } from '@/lib/tmdb';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';

// Интерфейс для входящих пропсов — поддерживаем два режима:
// - `movies` передан: просто рендерим массив (используется Home)
// - `movies` не передан: компонент сам загрузит тренды и применит фильтрацию по blacklistedIds (для обратной совместимости и тестов)
interface Props {
  movies?: (Media & { _initialStatus?: 'want' | 'watched' | 'dropped' | null; _initialIsBlacklisted?: boolean })[];
  blacklistedIds?: Set<number>;
}

export default async function HorizontalMovieGridServer({ movies, blacklistedIds = new Set() }: Props) {
  // Если передан готовый массив — просто отрисовать
  if (movies && movies.length > 0) {
    return (
      <div className="w-full">
        <h1 className="text-3xl sm:text-4xl font-bold mb-6 mt-4">Популярное на этой неделе</h1>
        <ScrollContainer>
          {movies.map((movie) => (
            <div key={`${movie.media_type}_${movie.id}`} className="flex-shrink-0 w-48">
              <MovieCard
                movie={movie}
                initialStatus={(movie as any)._initialStatus}
                initialIsBlacklisted={(movie as any)._initialIsBlacklisted}
              />
            </div>
          ))}
        </ScrollContainer>
      </div>
    );
  }

  // Backwards-compatible mode: загрузить тренды и отфильтровать по переданным blacklistedIds
  try {
    const all = await fetchTrendingMovies('week');
    const filtered = all.filter(movie => !blacklistedIds.has(movie.id));
    const displayMovies = filtered.slice(0, 20);

    // Получаем сессию и статусы watchlist
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;

    const watchlistMap = new Map<string, 'want'|'watched'|'dropped'|null>();
    if (userId && displayMovies.length > 0) {
      const ids = displayMovies.map(m => m.id);
      const rows = await prisma.watchList.findMany({ where: { userId, tmdbId: { in: ids } }, include: { status: true } });
      const STATUS_FROM_DB: Record<string, 'want'|'watched'|'dropped'> = {
        'Хочу посмотреть': 'want',
        'Просмотрено': 'watched',
        'Брошено': 'dropped',
      };
      rows.forEach(r => watchlistMap.set(`${r.tmdbId}:${r.mediaType}`, STATUS_FROM_DB[r.status?.name ?? ''] ?? null));
      displayMovies.forEach(m => {
        const key = `${m.id}:${m.media_type}`;
        if (!watchlistMap.has(key)) watchlistMap.set(key, null);
      });
    } else {
      displayMovies.forEach(m => watchlistMap.set(`${m.id}:${m.media_type}`, null));
    }

    return (
      <div className="w-full">
        <h1 className="text-3xl sm:text-4xl font-bold mb-6 mt-4">Популярное на этой неделе</h1>
        <ScrollContainer>
          {displayMovies.map((movie) => (
            <div key={movie.id} className="flex-shrink-0 w-48">
              <MovieCard
                movie={movie}
                initialIsBlacklisted={blacklistedIds.has(movie.id)}
                initialStatus={watchlistMap.get(`${movie.id}:${movie.media_type}`) as any}
              />
            </div>
          ))}
        </ScrollContainer>
      </div>
    );
  } catch (error) {
    console.error('Ошибка в компоненте HorizontalMovieGridServer:', error);
    return (
      <div className="w-full">
        <h1 className="text-3xl sm:text-4xl font-bold mb-6 mt-4">Популярное на этой неделе</h1>
        <div className="bg-red-900/30 border border-red-700 rounded-lg p-6">
          <p className="text-red-300">Критическая ошибка при загрузке фильмов</p>
          <p className="text-gray-400 text-sm mt-2">Пожалуйста, проверьте консоль для подробностей.</p>
        </div>
      </div>
    );
  }
}