import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import { prisma } from '@/lib/prisma';
import { MOVIE_STATUS_IDS } from '@/lib/movieStatusConstants';
import { withCache } from '@/lib/redis';
import { logger } from '@/lib/logger';

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const BASE_URL = 'https://api.themoviedb.org/3';

async function fetchMovieWithCollection(tmdbId: number) {
  try {
    const url = new URL(`${BASE_URL}/movie/${tmdbId}`);
    url.searchParams.append('api_key', TMDB_API_KEY || '');
    url.searchParams.append('language', 'ru-RU');

    const response = await fetch(url.toString(), {
      headers: { 'accept': 'application/json' },
      next: { revalidate: 86400, tags: ['movie-details'] },
    });

    if (!response.ok) return null;
    return await response.json();
  } catch (error) {
    return null;
  }
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Требуется аутентификация' }, { status: 401 });
    }

    const userId = session.user.id;
    const cacheKey = `user:${userId}:collections:count`;

    const fetchCount = async () => {
      const watchedMovies = await prisma.watchList.findMany({
        where: {
          userId,
          statusId: { in: [MOVIE_STATUS_IDS.WATCHED, MOVIE_STATUS_IDS.REWATCHED] },
        },
        select: { tmdbId: true, mediaType: true },
      });

      if (watchedMovies.length === 0) {
        return { count: 0 };
      }

      const collectionIds = new Set<number>();

      const BATCH_SIZE = 10;
      for (let i = 0; i < watchedMovies.length; i += BATCH_SIZE) {
        const batch = watchedMovies.slice(i, i + BATCH_SIZE);
        
        const results = await Promise.all(
          batch.map(async (movie) => {
            if (movie.mediaType !== 'movie') return null;
            return await fetchMovieWithCollection(movie.tmdbId);
          })
        );

        for (const details of results) {
          if (details?.belongs_to_collection) {
            collectionIds.add(details.belongs_to_collection.id);
          }
        }

        if (i + BATCH_SIZE < watchedMovies.length) {
          await new Promise(resolve => setTimeout(resolve, 15));
        }
      }

      return { count: collectionIds.size };
    };

    const result = await withCache(cacheKey, fetchCount, 3600);
    return NextResponse.json(result);

  } catch (error) {
    logger.error('Ошибка при получении количества коллекций', { 
      error: error instanceof Error ? error.message : String(error),
      context: 'CollectionsCountAPI'
    });
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 });
  }
}
