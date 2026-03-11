// filepath: src/lib/taste-map/person-profile-v2.ts
/**
 * PersonProfile v2 - Manages persistent storage of top-50 actors/directors
 * Built from top-5 persons from each watched movie
 * Handles both full recalculation and incremental updates
 */

import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { getActorWeightedRating, getTopRatedPersons } from './actor-rating';
import { MOVIE_STATUS_IDS } from '@/lib/movieStatusConstants';
import { getMediaCredits } from '@/lib/tmdb';

const COMPLETED_STATUS_IDS = [MOVIE_STATUS_IDS.WATCHED, MOVIE_STATUS_IDS.REWATCHED];
const TOP_PERSONS_LIMIT = 50;

export interface PersonData {
  tmdbPersonId: number;
  name: string;
  count: number; // How many movies they appear in
  avgWeightedRating: number; // Weighted by watchCount
  profile_path: string | null;
  watched_movies: number;
  rewatched_movies: number;
  dropped_movies: number;
  total_movies: number;
  progress_percent: number;
  actor_score: number;
}

/**
 * Calculate actor score based on multiple factors
 * Combines quality, progress, volume, and watched count bonuses
 */
export function calculateActorScore(actor: PersonData): number {
  const baseRating = actor.avgWeightedRating || 0;
  const qualityBonus = Math.max(0, Math.min(10,
    baseRating + (actor.rewatched_movies * 0.2) - (actor.dropped_movies * 0.3)
  ));
  const progressBonus = actor.total_movies > 0
    ? Math.log(actor.total_movies + 1) * (actor.progress_percent / 100)
    : 0;
  const volumeBonus = actor.total_movies > 0
    ? Math.log(actor.total_movies + 1) / Math.log(200)
    : 0;
  const watchedCountBonus = actor.watched_movies > 0
    ? Math.log(actor.watched_movies + 1) / Math.log(50)
    : 0;

  return (qualityBonus * 0.35) + (progressBonus * 0.25) + (volumeBonus * 0.15) + (watchedCountBonus * 0.15);
}

/**
 * Ensure that MoviePersonCache has top-5 for a specific movie
 * If not cached, fetch from TMDB and store
 */
export async function ensureMoviePersonCacheExists(
  tmdbId: number,
  mediaType: 'movie' | 'tv'
): Promise<void> {
  try {
    // Check if already cached
    const existing = await prisma.moviePersonCache.findUnique({
      where: {
        tmdbId_mediaType: { tmdbId, mediaType },
      },
    });

    if (existing) {
      return; // Already cached
    }

    // Fetch from TMDB API
    const credits = await getMediaCredits(tmdbId, mediaType);
    
    if (!credits) {
      // If can't fetch from TMDB, create empty cache to avoid repeated attempts
      await prisma.moviePersonCache.create({
        data: {
          tmdbId,
          mediaType,
          topActors: [],
          topDirectors: [],
        },
      });
      return;
    }

    // Store in database
    await prisma.moviePersonCache.create({
      data: {
        tmdbId,
        mediaType,
        topActors: credits.topActors,
        topDirectors: credits.topDirectors,
      },
    });

    logger.info('Created movie person cache', {
      tmdbId,
      mediaType,
      actorsCount: credits.topActors.length,
      directorsCount: credits.topDirectors.length,
    });
  } catch (error) {
    logger.error('Error ensuring movie person cache', {
      error: error instanceof Error ? error.message : String(error),
      tmdbId,
      mediaType,
    });
    // Don't throw - this is non-critical
  }
}

// In-memory cache for person credits from TMDB
const personCreditsCache = new Map<number, { data: unknown; timestamp: number }>();
const CACHE_DURATION = 86400000; // 24 hours
const TMDB_API_KEY = process.env.TMDB_API_KEY;

/**
 * Fetch person credits from TMDB with caching
 */
async function fetchPersonCredits(actorId: number): Promise<unknown | null> {
  const cached = personCreditsCache.get(actorId);
  const now = Date.now();

  if (cached && (now - cached.timestamp) < CACHE_DURATION) {
    return cached.data;
  }

  if (!TMDB_API_KEY) return null;

  try {
    const url = new URL(`https://api.themoviedb.org/3/person/${actorId}/combined_credits`);
    url.searchParams.append('api_key', TMDB_API_KEY);
    url.searchParams.append('language', 'ru-RU');

    const response = await fetch(url.toString(), {
      headers: { 'accept': 'application/json' },
      next: { revalidate: 86400 },
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    personCreditsCache.set(actorId, { data, timestamp: now });
    return data;
  } catch {
    return null;
  }
}

/**
 * Full computation: recalculate top-50 persons for a user
 * Based on all their watched/rewatched movies and associated cast/crew
 */
export async function computeUserPersonProfile(
  userId: string,
  personType: 'actor' | 'director'
): Promise<PersonData[]> {
  try {
    logger.info('Starting person profile computation', {
      userId,
      personType,
    });

    // First, ensure MoviePersonCache is populated for all user's movies
    const userMovies = await prisma.watchList.findMany({
      where: {
        userId,
        statusId: { in: COMPLETED_STATUS_IDS },
      },
      select: {
        tmdbId: true,
        mediaType: true,
      },
      distinct: ['tmdbId', 'mediaType'],
    });

    // Ensure cache exists for all movies (non-blocking)
    await Promise.all(
      userMovies.map((movie) =>
        ensureMoviePersonCacheExists(movie.tmdbId, movie.mediaType as 'movie' | 'tv')
      )
    );

    // Get top-rated persons (already calculates weighted ratings)
    const topPersons = await getTopRatedPersons(
      userId,
      personType,
      TOP_PERSONS_LIMIT
    );

    if (topPersons.length === 0) {
      // Save empty profile to database
      await prisma.personProfile.upsert({
        where: {
          userId_personType: { userId, personType },
        },
        update: {
          topPersons: [],
          totalMoviesAnalyzed: 0,
          computedAt: new Date(),
          computationMethod: 'full',
        },
        create: {
          userId,
          personType,
          topPersons: [],
          totalMoviesAnalyzed: 0,
          computationMethod: 'full',
        },
      });
      return [];
    }

    // Get actor IDs for querying watchlist counts
    const actorIds = topPersons.map(p => p.tmdbId);

    // Query watchlist counts by status for these actors using raw SQL
    // We'll use a simpler approach without the IN clause - filter in JS
    const watchedCounts = await prisma.$queryRaw<Array<{ person_id: number; count: bigint }>>`
      SELECT 
        (person->>'id')::INT as person_id,
        COUNT(*)::BIGINT as count
      FROM "MoviePersonCache" mpc,
        jsonb_array_elements(mpc."topActors") as person
      WHERE EXISTS (
        SELECT 1 FROM "WatchList" wl
        WHERE wl."userId" = ${userId}
          AND wl."statusId" = ${MOVIE_STATUS_IDS.WATCHED}
          AND wl."tmdbId" = mpc."tmdbId"
          AND wl."mediaType" = mpc."mediaType"
      )
      GROUP BY person_id
    `;

    const rewatchedCounts = await prisma.$queryRaw<Array<{ person_id: number; count: bigint }>>`
      SELECT 
        (person->>'id')::INT as person_id,
        COUNT(*)::BIGINT as count
      FROM "MoviePersonCache" mpc,
        jsonb_array_elements(mpc."topActors") as person
      WHERE EXISTS (
        SELECT 1 FROM "WatchList" wl
        WHERE wl."userId" = ${userId}
          AND wl."statusId" = ${MOVIE_STATUS_IDS.REWATCHED}
          AND wl."tmdbId" = mpc."tmdbId"
          AND wl."mediaType" = mpc."mediaType"
      )
      GROUP BY person_id
    `;

    const droppedCounts = await prisma.$queryRaw<Array<{ person_id: number; count: bigint }>>`
      SELECT 
        (person->>'id')::INT as person_id,
        COUNT(*)::BIGINT as count
      FROM "MoviePersonCache" mpc,
        jsonb_array_elements(mpc."topActors") as person
      WHERE EXISTS (
        SELECT 1 FROM "WatchList" wl
        WHERE wl."userId" = ${userId}
          AND wl."statusId" = ${MOVIE_STATUS_IDS.DROPPED}
          AND wl."tmdbId" = mpc."tmdbId"
          AND wl."mediaType" = mpc."mediaType"
      )
      GROUP BY person_id
    `;

    // Filter counts to only include actors we're interested in
    const watchedMap = new Map(
      watchedCounts
        .filter(r => actorIds.includes(r.person_id))
        .map(r => [r.person_id, Number(r.count)])
    );
    const rewatchedMap = new Map(
      rewatchedCounts
        .filter(r => actorIds.includes(r.person_id))
        .map(r => [r.person_id, Number(r.count)])
    );
    const droppedMap = new Map(
      droppedCounts
        .filter(r => actorIds.includes(r.person_id))
        .map(r => [r.person_id, Number(r.count)])
    );

    // Transform to enriched PersonData format
    const personDataPromises = topPersons.map(async (p) => {
      const watchedMovies = watchedMap.get(p.tmdbId) || 0;
      const rewatchedMovies = rewatchedMap.get(p.tmdbId) || 0;
      const droppedMovies = droppedMap.get(p.tmdbId) || 0;

      // Fetch person credits from TMDB to get total movies and profile
      let profilePath: string | null = null;
      let totalMovies = 0;

      try {
        const credits = await fetchPersonCredits(p.tmdbId) as { cast?: Array<{ id: number; name: string; profile_path: string | null }> } | null;
        if (credits?.cast) {
          // Get profile path from first cast entry (most prominent role)
          const firstCast = credits.cast[0];
          profilePath = firstCast?.profile_path || null;
          totalMovies = credits.cast.length;
        }
      } catch {
        // Use defaults if TMDB call fails
        totalMovies = p.count;
      }

      const progressPercent = totalMovies > 0
        ? Math.round((watchedMovies / totalMovies) * 100)
        : 0;

      const personData: PersonData = {
        tmdbPersonId: p.tmdbId,
        name: p.name,
        count: p.count,
        avgWeightedRating: p.avgRating,
        profile_path: profilePath,
        watched_movies: watchedMovies,
        rewatched_movies: rewatchedMovies,
        dropped_movies: droppedMovies,
        total_movies: totalMovies,
        progress_percent: progressPercent,
        actor_score: 0, // Will be calculated below
      };

      // Calculate actor score
      personData.actor_score = calculateActorScore(personData);

      return personData;
    });

    let personData: PersonData[] = await Promise.all(personDataPromises);

    // Sort by actor_score descending
    personData.sort((a, b) => b.actor_score - a.actor_score);

    // Count analyzed movies
    const analyzedCount = await prisma.watchList.count({
      where: {
        userId,
        statusId: { in: COMPLETED_STATUS_IDS },
      },
    });

    // Save to database
    await prisma.personProfile.upsert({
      where: {
        userId_personType: { userId, personType },
      },
      update: {
        // @ts-expect-error: PersonData[] is JSON-serializable and acceptable for Json field
        topPersons: personData,
        totalMoviesAnalyzed: analyzedCount,
        computedAt: new Date(),
        computationMethod: 'full',
      },
      create: {
        userId,
        personType,
        // @ts-expect-error: PersonData[] is JSON-serializable and acceptable for Json field
        topPersons: personData,
        totalMoviesAnalyzed: analyzedCount,
        computationMethod: 'full',
      },
    });

    logger.info('Completed person profile computation', {
      userId,
      personType,
      personsCount: personData.length,
      moviesAnalyzed: analyzedCount,
    });

    return personData;

    return personData;
  } catch (error) {
    logger.error('Error computing person profile', {
      error: error instanceof Error ? error.message : String(error),
      userId,
      personType,
    });
    throw error;
  }
}

/**
 * Get cached person profile if fresh, otherwise recalculate
 * Considers profiles older than maxAgeHours as stale
 */
export async function getUserPersonProfile(
  userId: string,
  personType: 'actor' | 'director',
  maxAgeHours: number = 7 * 24 // 7 days
): Promise<PersonData[]> {
  try {
    const profile = await prisma.personProfile.findUnique({
      where: {
        userId_personType: { userId, personType },
      },
    });

    // Check freshness
    if (profile) {
      const ageHours = (Date.now() - profile.computedAt.getTime()) / (1000 * 60 * 60);
       if (ageHours < maxAgeHours) {
         return profile.topPersons as unknown as PersonData[];
       }
    }

    // Recalculate if not found or stale
    return computeUserPersonProfile(userId, personType);
  } catch (error) {
    logger.error('Error getting user person profile', {
      error: error instanceof Error ? error.message : String(error),
      userId,
      personType,
    });
    return [];
  }
}

/**
 * Incrementally update person profile when user adds/removes a movie
 * More efficient than full recalculation for single changes
 */
export async function incrementallyUpdatePersonProfile(
  userId: string,
  tmdbId: number,
  mediaType: 'movie' | 'tv',
  action: 'add' | 'remove' = 'add'
): Promise<void> {
  try {
    // Ensure movie persons are cached
    await ensureMoviePersonCacheExists(tmdbId, mediaType);

    // For now, do full recalculation if profile exists
    // In future, could optimize to update existing array
    const profile = await prisma.personProfile.findUnique({
      where: {
        userId_personType: { userId, personType: 'actor' },
      },
    });

    // If profile exists and has many updates, do full recalc after certain threshold
    if (profile && action === 'add') {
      // For incremental: could update array directly
      // For now: trigger full recompute periodically
      const hoursOld = (Date.now() - profile.computedAt.getTime()) / (1000 * 60 * 60);
      if (hoursOld > 24) {
        // Recompute daily
        await computeUserPersonProfile(userId, 'actor');
        await computeUserPersonProfile(userId, 'director');
      }
    } else if (!profile && action === 'add') {
      // Create new profile
      await computeUserPersonProfile(userId, 'actor');
      await computeUserPersonProfile(userId, 'director');
    }

    logger.info('Incrementally updated person profile', {
      userId,
      tmdbId,
      action,
    });
  } catch (error) {
    logger.error('Error in incremental person profile update', {
      error: error instanceof Error ? error.message : String(error),
      userId,
      tmdbId,
      action,
    });
    // Don't throw - this is non-critical
  }
}

/**
 * Get statistics about person profiles
 */
export async function getPersonProfileStats(): Promise<{
  totalProfiles: number;
  byPersonType: { actor: number; director: number };
  avgPersonsPerProfile: number;
  lastComputedAt: Date | null;
}> {
  try {
    const profiles = await prisma.personProfile.findMany({
      select: { personType: true, topPersons: true, computedAt: true },
    });

    const stats = {
      totalProfiles: profiles.length,
      byPersonType: {
        actor: profiles.filter((p) => p.personType === 'actor').length,
        director: profiles.filter((p) => p.personType === 'director').length,
      },
       avgPersonsPerProfile:
         profiles.length > 0
           ? profiles.reduce((sum, p) => sum + (p.topPersons as unknown as PersonData[]).length, 0) /
             profiles.length
           : 0,
      lastComputedAt: profiles.length > 0 ? profiles[0].computedAt : null,
    };

    return stats;
  } catch (error) {
    logger.error('Error getting person profile stats', {
      error: error instanceof Error ? error.message : String(error),
    });
    return {
      totalProfiles: 0,
      byPersonType: { actor: 0, director: 0 },
      avgPersonsPerProfile: 0,
      lastComputedAt: null,
    };
  }
}
