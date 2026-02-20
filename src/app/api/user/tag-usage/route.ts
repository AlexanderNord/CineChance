import { NextRequest, NextResponse } from 'next/server';
 
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import { prisma } from '@/lib/prisma';
import { MOVIE_STATUS_IDS } from '@/lib/movieStatusConstants';
import { withCache } from '@/lib/redis';
import { logger } from '@/lib/logger';

const TMDB_API_KEY = process.env.TMDB_API_KEY;

function isAnime(movie: unknown): boolean {
  if (!movie || typeof movie !== 'object') return false;
  const m = movie as Record<string, unknown>;
  const genres = m.genres as Array<{ id: number }> | undefined;
  const hasAnimeGenre = genres?.some((g) => g.id === 16) ?? false;
  const isJapanese = m.original_language === 'ja';
  return hasAnimeGenre && isJapanese;
}

function isCartoon(movie: unknown): boolean {
  if (!movie || typeof movie !== 'object') return false;
  const m = movie as Record<string, unknown>;
  const genres = m.genres as Array<{ id: number }> | undefined;
  const hasAnimationGenre = genres?.some((g) => g.id === 16) ?? false;
  const isNotJapanese = m.original_language !== 'ja';
  return hasAnimationGenre && isNotJapanese;
}

async function fetchMediaDetailsBatch(
  records: Array<{ tmdbId: number; mediaType: string }>
): Promise<Map<string, unknown>> {
  const results = new Map<string, unknown>();
  
  if (!TMDB_API_KEY) {
    return results;
  }

  for (const record of records) {
    const key = `${record.mediaType}:${record.tmdbId}`;
    const url = `https://api.themoviedb.org/3/${record.mediaType}/${record.tmdbId}?api_key=${TMDB_API_KEY}&language=ru-RU`;
    
    try {
      const res = await fetch(url, { next: { revalidate: 86400 } });
      if (res.ok) {
        const data = await res.json();
        results.set(key, data);
      }
    } catch {
      // Silently fail for individual requests
    }
  }

  return results;
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const searchParams = request.nextUrl.searchParams;
    const limitParam = searchParams.get('limit');
    const statusesParam = searchParams.get('statuses');
    const mediaFilter = searchParams.get('media');
    const validMedia = ['movie', 'tv', 'cartoon', 'anime'].includes(mediaFilter || '') ? mediaFilter : null;
    
    const _limit = limitParam ? parseInt(limitParam, 10) : 10;
    
    const cacheKey = `user:${userId}:tag_usage:${validMedia || 'all'}:${statusesParam || 'default'}`;

    const fetchTags = async () => {
      // По умолчанию включаем все значимые статусы для статистики
      let statusFilter = {
        statusId: { in: [MOVIE_STATUS_IDS.WATCHED, MOVIE_STATUS_IDS.REWATCHED, MOVIE_STATUS_IDS.DROPPED] }
      };
      if (statusesParam) {
        const statusList = statusesParam.split(',').map(s => s.trim().toLowerCase());
        
        if (statusList.includes('watched') || statusList.includes('rewatched')) {
          statusFilter = {
            statusId: { in: [MOVIE_STATUS_IDS.WATCHED, MOVIE_STATUS_IDS.REWATCHED] }
          };
        }
      }

      // Получаем все теги пользователя без лимита
      const tags = await prisma.tag.findMany({
        where: {
          userId,
        },
        orderBy: {
          usageCount: 'desc'
        },
      });

      const tagIds = tags.map(t => t.id);
      
      const tagUsageCounts: Record<string, number> = {};
      
      if (tagIds.length > 0) {
        // Build base query conditions
        const baseWhere = {
          userId,
          tags: {
            some: {
              id: { in: tagIds }
            }
          },
          ...statusFilter
        };

        // For movie/tv, we can filter at DB level
        // For cartoon/anime, we need in-memory filtering
        // For no filter, we need tmdbId and mediaType for type breakdown
        const needsMediaFiltering = validMedia === 'cartoon' || validMedia === 'anime';
        
        const watchListsWithTags = await prisma.watchList.findMany({
          where: {
            ...baseWhere,
            // Add DB-level filter for movie/tv
            ...(validMedia === 'movie' || validMedia === 'tv' ? { mediaType: validMedia } : {}),
          },
          select: {
            tags: true,
            tmdbId: true,
            mediaType: true,
          }
        });

        // If filtering by cartoon/anime, we need to check TMDB data
        if (needsMediaFiltering && watchListsWithTags.length > 0) {
          const tmdbDataMap = await fetchMediaDetailsBatch(
            watchListsWithTags.map(r => ({ tmdbId: r.tmdbId, mediaType: r.mediaType }))
          );

          for (const item of watchListsWithTags) {
            const key = `${item.mediaType}:${item.tmdbId}`;
            const tmdbData = tmdbDataMap.get(key);
            
            const isAnimeContent = isAnime(tmdbData);
            const isCartoonContent = isCartoon(tmdbData);
            
            // Only count tags for matching media type
            const matchesFilter = 
              (validMedia === 'anime' && isAnimeContent) ||
              (validMedia === 'cartoon' && isCartoonContent);
            
            if (matchesFilter) {
              for (const tag of item.tags) {
                tagUsageCounts[tag.id] = (tagUsageCounts[tag.id] || 0) + 1;
              }
            }
          }
        } else {
          // No in-memory filtering needed
          for (const item of watchListsWithTags) {
            for (const tag of item.tags) {
              tagUsageCounts[tag.id] = (tagUsageCounts[tag.id] || 0) + 1;
            }
          }
        }
      }

      const formattedTags = tags
        .map(tag => ({
          id: tag.id,
          name: tag.name,
          count: tagUsageCounts[tag.id] || 0,
        }))
        .filter(tag => tag.count > 0)
        .sort((a, b) => b.count - a.count);

      return { tags: formattedTags };
    };

    const result = await withCache(cacheKey, fetchTags, 1800);
    return NextResponse.json(result);
  } catch (error) {
    logger.error('Error fetching tag usage', { 
      error: error instanceof Error ? error.message : String(error),
      context: 'TagUsageAPI'
    });
    return NextResponse.json(
      { error: 'Failed to fetch tag usage' },
      { status: 500 }
    );
  }
}