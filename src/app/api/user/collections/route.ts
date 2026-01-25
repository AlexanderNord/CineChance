import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import { prisma } from '@/lib/prisma';

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const BASE_URL = 'https://api.themoviedb.org/3';

const ITEMS_PER_PAGE = 12;

interface TMDBMovieDetails {
  id: number;
  title: string;
  belongs_to_collection: {
    id: number;
    name: string;
    poster_path: string | null;
  } | null;
  release_date: string;
}

interface CollectionProgress {
  id: number;
  name: string;
  poster_path: string | null;
  total_movies: number;
  watched_movies: number;
  added_movies: number;
  progress_percent: number;
  average_rating: number | null;
}

// Получение деталей фильма с информацией о коллекции
async function fetchMovieWithCollection(tmdbId: number): Promise<TMDBMovieDetails | null> {
  try {
    const url = new URL(`${BASE_URL}/movie/${tmdbId}`);
    url.searchParams.append('api_key', TMDB_API_KEY || '');
    url.searchParams.append('language', 'ru-RU');

    const response = await fetch(url.toString(), {
      headers: { 'accept': 'application/json' },
      next: { revalidate: 86400, tags: ['movie-details'] },
    });

    if (!response.ok) {
      return null;
    }

    return await response.json();
  } catch (error) {
    return null;
  }
}

// Получение списка фильмов в коллекции
async function fetchCollectionMovies(collectionId: number): Promise<number[]> {
  try {
    const url = new URL(`${BASE_URL}/collection/${collectionId}`);
    url.searchParams.append('api_key', TMDB_API_KEY || '');
    url.searchParams.append('language', 'ru-RU');

    const response = await fetch(url.toString(), {
      headers: { 'accept': 'application/json' },
      next: { revalidate: 86400, tags: ['collection-details'] },
    });

    if (!response.ok) {
      return [];
    }

    const data = await response.json();
    return (data.parts || []).map((movie: { id: number }) => movie.id);
  } catch (error) {
    return [];
  }
}

// Сортировка коллекций
function sortCollections(collections: CollectionProgress[]): CollectionProgress[] {
  return [...collections].sort((a, b) => {
    // Сначала по рейтингу (desc), null в конце
    if (a.average_rating !== null && b.average_rating !== null) {
      if (b.average_rating !== a.average_rating) {
        return b.average_rating - a.average_rating;
      }
    } else if (a.average_rating === null && b.average_rating !== null) {
      return 1;
    } else if (a.average_rating !== null && b.average_rating === null) {
      return -1;
    }
    
    // Если рейтинги равны или оба null, сортируем по прогрессу (desc)
    if (b.progress_percent !== a.progress_percent) {
      return b.progress_percent - a.progress_percent;
    }
    
    // Если и прогресс одинаковый, сортируем по алфавиту (asc)
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
    const watchedMovies = await prisma.watchList.findMany({
      where: {
        userId,
        status: { name: { in: ['Просмотрено', 'Пересмотрено'] } },
      },
      select: {
        tmdbId: true,
        mediaType: true,
        userRating: true,
      },
    });

    if (watchedMovies.length === 0) {
      return NextResponse.json({
        collections: [],
        hasMore: false,
        totalCount: 0,
      });
    }

    // Map для хранения коллекций и их фильмов
    const collectionMap = new Map<number, { 
      name: string; 
      poster_path: string | null; 
      watchedIds: Set<number>;
      ratings: number[];
    }>();

    // Оптимизированная параллельная загрузка данных о коллекциях
    const BATCH_SIZE = 10;
    for (let i = 0; i < watchedMovies.length; i += BATCH_SIZE) {
      const batch = watchedMovies.slice(i, i + BATCH_SIZE);
      
      const results = await Promise.all(
        batch.map(async (movie) => {
          if (movie.mediaType !== 'movie') return null;
          const details = await fetchMovieWithCollection(movie.tmdbId);
          return { details, rating: movie.userRating };
        })
      );

      for (const result of results) {
        if (!result) continue;
        const { details, rating } = result;
        if (details?.belongs_to_collection) {
          const collection = details.belongs_to_collection;
          
          if (!collectionMap.has(collection.id)) {
            collectionMap.set(collection.id, {
              name: collection.name,
              poster_path: collection.poster_path,
              watchedIds: new Set(),
              ratings: [],
            });
          }
          
          collectionMap.get(collection.id)!.watchedIds.add(details.id);
          
          if (rating !== null && rating !== undefined) {
            collectionMap.get(collection.id)!.ratings.push(rating);
          }
        }
      }

      // Уменьшенная пауза между батчами
      if (i + BATCH_SIZE < watchedMovies.length) {
        await new Promise(resolve => setTimeout(resolve, 15));
      }
    }

    // Параллельная загрузка данных о коллекциях
    const collectionEntries = Array.from(collectionMap.entries());
    const achievementsPromises = collectionEntries.map(async ([collectionId, collectionData]) => {
      const collectionMovies = await fetchCollectionMovies(collectionId);
      const totalMovies = collectionMovies.length;
      const watchedInCollection = collectionData.watchedIds.size;

      const averageRating = collectionData.ratings.length > 0
        ? parseFloat((collectionData.ratings.reduce((sum, r) => sum + r, 0) / collectionData.ratings.length).toFixed(1))
        : null;

      return {
        id: collectionId,
        name: collectionData.name,
        poster_path: collectionData.poster_path,
        total_movies: totalMovies,
        added_movies: watchedInCollection,
        watched_movies: watchedInCollection,
        progress_percent: totalMovies > 0 
          ? Math.round((watchedInCollection / totalMovies) * 100)
          : 0,
        average_rating: averageRating,
      };
    });

    // Ждем завершения всех запросов параллельно
    const achievements = await Promise.all(achievementsPromises);

    // Сортировка результатов
    const sortedCollections = sortCollections(achievements);

    // Пагинация
    // Для запроса с профиля возвращаем все отсортированные данные
    // Для страниц коллекций используем постраничный вывод
    const skip = isProfileRequest ? 0 : (page - 1) * limit;
    const hasMore = isProfileRequest ? false : (skip + limit < sortedCollections.length);
    const resultCollections = isProfileRequest ? sortedCollections : sortedCollections.slice(skip, skip + limit);

    return NextResponse.json({
      collections: resultCollections,
      hasMore,
      totalCount: sortedCollections.length,
    });

  } catch (error) {
    console.error('Ошибка при получении коллекций:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}
