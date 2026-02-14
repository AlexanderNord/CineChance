import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import { prisma } from '@/lib/prisma';
import { MOVIE_STATUS_IDS } from '@/lib/movieStatusConstants';
import { withCache } from '@/lib/redis';
import { logger } from '@/lib/logger';

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const BASE_URL = 'https://api.themoviedb.org/3';

interface TMDBMovieCredits {
  id: number;
  cast: Array<{
    id: number;
    name: string;
    profile_path: string | null;
  }>;
}

async function fetchMovieCredits(tmdbId: number, mediaType: 'movie' | 'tv') {
  try {
    const url = new URL(`${BASE_URL}/${mediaType}/${tmdbId}/credits`);
    url.searchParams.append('api_key', TMDB_API_KEY || '');
    url.searchParams.append('language', 'ru-RU');

    const response = await fetch(url.toString(), {
      headers: { 'accept': 'application/json' },
      next: { revalidate: 86400, tags: [`${mediaType}-credits`] },
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
    const cacheKey = `user:${userId}:actors:count`;

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

      const actorIds = new Set<number>();

      const BATCH_SIZE = 10;
      for (let i = 0; i < watchedMovies.length; i += BATCH_SIZE) {
        const batch = watchedMovies.slice(i, i + BATCH_SIZE);
        
        const results = await Promise.all(
          batch.map(async (movie) => {
            return await fetchMovieCredits(movie.tmdbId, movie.mediaType as 'movie' | 'tv');
          })
        );

        for (const credits of results) {
          if (credits?.cast) {
            for (const actor of credits.cast.slice(0, 10)) {
              if (actor.id && actor.profile_path) {
                actorIds.add(actor.id);
              }
            }
          }
        }

        if (i + BATCH_SIZE < watchedMovies.length) {
          await new Promise(resolve => setTimeout(resolve, 15));
        }
      }

      return { count: actorIds.size };
    };

    const result = await withCache(cacheKey, fetchCount, 3600);
    return NextResponse.json(result);

  } catch (error) {
    logger.error('Ошибка при получении количества актеров', { 
      error: error instanceof Error ? error.message : String(error),
      context: 'ActorsCountAPI'
    });
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 });
  }
}
