import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { rateLimit } from '@/middleware/rateLimit';
import {
  computeSimilarity,
  getSimilarUsers,
  storeSimilarUsers,
  isSimilar,
} from '@/lib/taste-map/similarity';
import { getTasteMap } from '@/lib/taste-map/redis';

const SAMPLE_ACTIVE_USERS = 100; // Sample size for performance
const MIN_USER_HISTORY = 5; // Minimum watched movies to be considered

/**
 * GET /api/user/similar-users
 *
 * Find users with similar taste profiles (taste map).
 *
 * Query parameters:
 * - limit: maximum number of similar users to return (default 10, max 50)
 * - useCache: whether to use cached results (default true)
 *
 * Returns:
 * - similarUsers: array of {userId, overallMatch, userInfo}
 * - cached: whether these results came from Redis cache
 * - computedAt: timestamp when similarities were computed
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  // Rate limiting
  const { success } = await rateLimit(request, '/api/user/similar-users');
  if (!success) {
    return NextResponse.json(
      { error: 'Too many requests' },
      { status: 429 }
    );
  }

  try {
    // Authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = session.user.id;
    const limit = Math.min(
      parseInt(searchParams.get('limit') || '10'),
      50
    );
    const useCache = searchParams.get('useCache') !== 'false';

    // Check user has minimum history
    const watchListCount = await prisma.watchList.count({
      where: { userId },
    });

    if (watchListCount < MIN_USER_HISTORY) {
      return NextResponse.json({
        similarUsers: [],
        cached: false,
        computedAt: new Date().toISOString(),
        message: 'Not enough watch history to find similar users',
      });
    }

    // Try to get cached results
    let similarUsers = useCache ? await getSimilarUsers(userId) : [];

    if (similarUsers.length === 0) {
      let candidateIds: string[] = [];

      // Try to get active users with recent activity (30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      let activeUsers = await prisma.watchList.findMany({
        where: {
          addedAt: { gte: thirtyDaysAgo },
          userId: { not: userId },
        },
        select: { userId: true },
        distinct: ['userId'],
        take: SAMPLE_ACTIVE_USERS,
      });

      candidateIds = activeUsers.map(u => u.userId);

      // If not enough active users in 30 days, expand search
      if (candidateIds.length < 10) {
        const ninetyDaysAgo = new Date();
        ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

        const expandedUsers = await prisma.watchList.findMany({
          where: {
            addedAt: { gte: ninetyDaysAgo },
            userId: { not: userId },
          },
          select: { userId: true },
          distinct: ['userId'],
          take: SAMPLE_ACTIVE_USERS,
        });

        candidateIds = expandedUsers.map(u => u.userId);
      }

      // If still not enough, get ALL users with minimum history (very permissive)
      if (candidateIds.length < 10) {
        // Get all users with count of their watchlist items
        const usersWithCounts = await prisma.user.findMany({
          select: {
            id: true,
            _count: { select: { watchList: true } },
          },
          where: { id: { not: userId } },
          take: SAMPLE_ACTIVE_USERS * 2,
        });

        // Filter to only users with minimum watch history
        candidateIds = usersWithCounts
          .filter(u => u._count.watchList >= MIN_USER_HISTORY)
          .map(u => u.id)
          .slice(0, SAMPLE_ACTIVE_USERS);
      }

      logger.info('Computing similar users', {
        userId,
        candidatesCount: candidateIds.length,
        context: 'SimilarUsersAPI',
      });

      // Compute similarities
      similarUsers = [];
      for (const candidateId of candidateIds) {
        try {
          const result = await computeSimilarity(userId, candidateId);

          if (isSimilar(result)) {
            similarUsers.push({
              userId: candidateId,
              overallMatch: result.overallMatch,
            });
          }
        } catch (error) {
          // Skip users with errors
          logger.debug('Error computing similarity', {
            error: error instanceof Error ? error.message : String(error),
            candidateId,
            context: 'SimilarUsersAPI',
          });
        }
      }

      // Sort by match score
      similarUsers.sort((a, b) => b.overallMatch - a.overallMatch);

      // Store to Redis if we found any
      if (similarUsers.length > 0) {
        await storeSimilarUsers(userId, similarUsers);
      }
    }

    // Limit results
    const results = similarUsers.slice(0, limit);

    // Fetch basic user info for display
    const userInfoMap = await prisma.user.findMany({
      where: { id: { in: results.map(u => u.userId) } },
      select: {
        id: true,
        email: true,
        createdAt: true,
        watchList: { select: { id: true } },
      },
    });

    const userInfoMapById = new Map(
      userInfoMap.map(u => [u.id, u])
    );

    const enrichedResults = results.map(u => ({
      userId: u.userId,
      overallMatch: Number((u.overallMatch * 100).toFixed(1)), // Percentage
      watchCount: userInfoMapById.get(u.userId)?.watchList.length || 0,
      memberSince: userInfoMapById.get(u.userId)?.createdAt,
    }));

    return NextResponse.json({
      similarUsers: enrichedResults,
      cached: similarUsers.length > 0 && useCache,
      computedAt: new Date().toISOString(),
      message: enrichedResults.length === 0
        ? 'No similar users found'
        : `Found ${enrichedResults.length} similar user(s)`,
    });
  } catch (error) {
    logger.error('Failed to get similar users', {
      error: error instanceof Error ? error.message : String(error),
      context: 'SimilarUsersAPI',
    });

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
