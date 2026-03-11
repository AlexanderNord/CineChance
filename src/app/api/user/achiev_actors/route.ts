import { NextResponse } from 'next/server';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import { getUserPersonProfile, PersonData } from '@/lib/taste-map/person-profile-v2';
import { logger } from '@/lib/logger';

export async function GET(request: Request) {
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
    const targetUserId = searchParams.get('userId') || userId;
    
    const limit = Math.min(parseInt(searchParams.get('limit') || '24'), 50);
    const offset = Math.max(parseInt(searchParams.get('offset') || '0'), 0);
    const singleLoad = searchParams.get('singleLoad') === 'true';

    // Use precomputed PersonProfile data
    let personProfile: PersonData[];
    try {
      personProfile = await getUserPersonProfile(targetUserId, 'actor');
    } catch {
      // If computation fails (e.g., no data), return empty result
      personProfile = [];
    }

    if (!personProfile || personProfile.length === 0) {
      return NextResponse.json({
        actors: [],
        hasMore: false,
        total: 0,
        singleLoad,
      });
    }

    // Map PersonData to response format
    const actors = personProfile.map((person: PersonData) => ({
      tmdbPersonId: person.tmdbPersonId,
      id: person.tmdbPersonId,
      name: person.name,
      profile_path: person.profile_path,
      watched_movies: person.watched_movies,
      rewatched_movies: person.rewatched_movies,
      dropped_movies: person.dropped_movies,
      total_movies: person.total_movies,
      progress_percent: person.progress_percent,
      average_rating: person.avgWeightedRating,
      avgWeightedRating: person.avgWeightedRating,
      count: person.count,
      actor_score: person.actor_score,
    }));

    // For singleLoad, return first 'limit' actors and set hasMore: false
    if (singleLoad) {
      return NextResponse.json({
        actors: actors.slice(0, limit),
        hasMore: false,
        total: actors.length,
        singleLoad: true,
      });
    }

    // For paginated, calculate hasMore
    const hasMore = offset + limit < actors.length;

    return NextResponse.json({
      actors: actors.slice(offset, offset + limit),
      hasMore,
      total: actors.length,
      singleLoad: false,
    });

  } catch (error) {
    logger.error('Ошибка при получении актеров', { 
      error: error instanceof Error ? error.message : String(error),
      context: 'AchievActorsAPI'
    });
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}
