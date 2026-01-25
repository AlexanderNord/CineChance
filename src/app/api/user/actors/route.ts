import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import { prisma } from '@/lib/prisma';

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const BASE_URL = 'https://api.themoviedb.org/3';

const ITEMS_PER_PAGE = 12;

interface TMDBMovieCredits {
  id: number;
  cast: Array<{
    id: number;
    name: string;
    profile_path: string | null;
    character: string;
  }>;
}

interface TMDBPersonCredits {
  id: number;
  cast: Array<{
    id: number;
    title: string;
    release_date: string;
    vote_count: number;
  }>;
  crew: Array<{
    id: number;
    title: string;
    release_date: string;
  }>;
}

interface ActorProgress {
  id: number;
  name: string;
  profile_path: string | null;
  watched_movies: number;
  total_movies: number;
  progress_percent: number;
  average_rating: number | null;
}

// Получение актёрского состава фильма
async function fetchMovieCredits(tmdbId: number): Promise<TMDBMovieCredits | null> {
  try {
    const url = new URL(`${BASE_URL}/movie/${tmdbId}/credits`);
    url.searchParams.append('api_key', TMDB_API_KEY || '');
    url.searchParams.append('language', 'ru-RU');

    const response = await fetch(url.toString(), {
      headers: { 'accept': 'application/json' },
      next: { revalidate: 86400, tags: ['movie-credits'] },
    });

    if (!response.ok) {
      return null;
    }

    return await response.json();
  } catch (error) {
    return null;
  }
}

// Получение полной фильмографии актёра
async function fetchPersonCredits(actorId: number): Promise<TMDBPersonCredits | null> {
  try {
    const url = new URL(`${BASE_URL}/person/${actorId}/combined_credits`);
    url.searchParams.append('api_key', TMDB_API_KEY || '');
    url.searchParams.append('language', 'ru-RU');

    const response = await fetch(url.toString(), {
      headers: { 'accept': 'application/json' },
      next: { revalidate: 86400, tags: ['person-credits'] },
    });

    if (!response.ok) {
      return null;
    }

    return await response.json();
  } catch (error) {
    return null;
  }
}

// Сортировка актеров
function sortActors(actors: ActorProgress[]): ActorProgress[] {
  return [...actors].sort((a, b) => {
    // Первичная сортировка по средней оценке (null в конце)
    if (a.average_rating !== null && b.average_rating !== null) {
      if (b.average_rating !== a.average_rating) {
        return b.average_rating - a.average_rating;
      }
    } else if (a.average_rating === null && b.average_rating !== null) {
      return 1;
    } else if (a.average_rating !== null && b.average_rating === null) {
      return -1;
    }
    
    // Вторичная сортировка по проценту заполнения
    if (b.progress_percent !== a.progress_percent) {
      return b.progress_percent - a.progress_percent;
    }
    
    // Третичная сортировка по алфавиту
    return a.name.localeCompare(b.name, 'ru');
  });
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Требуется аутентификация' },
        { status: 401 }
      );
    }

    const userId = session.user.id;
    const { searchParams } = new URL(request.url);
    
    const page = parseInt(searchParams.get('page') || '1');
    const limitParam = searchParams.get('limit');
    // По умолчанию 5 для запросов с профиля (без параметров page/limit)
    const limit = limitParam ? parseInt(limitParam) : 5;
    // Запрос с профиля - без явных параметров пагинации
    const isProfileRequest = !searchParams.has('page') && !searchParams.has('limit');

    // Получаем все фильмы пользователя со статусом "Просмотрено"
    const watchedMoviesData = await prisma.watchList.findMany({
      where: {
        userId,
        status: { name: { in: ['Просмотрено', 'Пересмотрено'] } },
        mediaType: 'movie',
      },
      select: {
        tmdbId: true,
        userRating: true,
      },
    });

    if (watchedMoviesData.length === 0) {
      return NextResponse.json({
        actors: [],
        hasMore: false,
        totalCount: 0,
      });
    }

    // Map для хранения актеров и их фильмов с оценками
    const actorMap = new Map<number, {
      name: string;
      profile_path: string | null;
      watchedIds: Set<number>;
      ratings: number[];
    }>();

    // Оптимизированная параллельная загрузка данных об актерах
    const BATCH_SIZE = 10;
    for (let i = 0; i < watchedMoviesData.length; i += BATCH_SIZE) {
      const batch = watchedMoviesData.slice(i, i + BATCH_SIZE);
      
      const results = await Promise.all(
        batch.map(async (movie) => {
          const credits = await fetchMovieCredits(movie.tmdbId);
          return { credits, rating: movie.userRating };
        })
      );

      for (const { credits, rating } of results) {
        if (credits?.cast) {
          for (const actor of credits.cast) {
            if (!actorMap.has(actor.id)) {
              actorMap.set(actor.id, {
                name: actor.name,
                profile_path: actor.profile_path,
                watchedIds: new Set(),
                ratings: [],
              });
            }
            
            actorMap.get(actor.id)!.watchedIds.add(credits.id);
            if (rating !== null && rating !== undefined) {
              actorMap.get(actor.id)!.ratings.push(rating);
            }
          }
        }
      }

      // Уменьшенная пауза между батчами
      if (i + BATCH_SIZE < watchedMoviesData.length) {
        await new Promise(resolve => setTimeout(resolve, 20));
      }
    }

    // Берем топ-50 актеров
    const topActors = Array.from(actorMap.entries())
      .sort((a, b) => b[1].watchedIds.size - a[1].watchedIds.size)
      .slice(0, 50);

    // Параллельная загрузка фильмографии для всех топ-актеров
    const achievementsPromises = topActors.map(async ([actorId, actorData]) => {
      const credits = await fetchPersonCredits(actorId);
      
      const totalMovies = credits?.cast?.length || 0;
      const watchedMovies = actorData.watchedIds.size;
      
      const progressPercent = totalMovies > 0 
        ? Math.round((watchedMovies / totalMovies) * 100)
        : 0;

      const averageRating = actorData.ratings.length > 0
        ? Number((actorData.ratings.reduce((a, b) => a + b, 0) / actorData.ratings.length).toFixed(1))
        : null;

      return {
        id: actorId,
        name: actorData.name,
        profile_path: actorData.profile_path,
        watched_movies: watchedMovies,
        total_movies: totalMovies,
        progress_percent: progressPercent,
        average_rating: averageRating,
      };
    });

    // Ждем завершения всех запросов параллельно
    const achievements = await Promise.all(achievementsPromises);

    // Сортировка результатов
    const sortedActors = sortActors(achievements);

    // Пагинация
    // Для запроса с профиля возвращаем все отсортированные данные
    // Для страниц актеров используем постраничный вывод
    const skip = isProfileRequest ? 0 : (page - 1) * limit;
    const hasMore = isProfileRequest ? false : (skip + limit < sortedActors.length);
    const resultActors = isProfileRequest ? sortedActors : sortedActors.slice(skip, skip + limit);

    return NextResponse.json({
      actors: resultActors,
      hasMore,
      totalCount: sortedActors.length,
    });

  } catch (error) {
    console.error('Ошибка при получении актеров:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}
