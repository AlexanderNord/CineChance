/**
 * Shared Twins Utilities
 *
 * Common utilities shared between genre-twins and type-twins algorithms.
 * DRY principle: extract common logic to avoid duplication.
 */

import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import type { CandidateMovie } from './types';

/**
 * Get status IDs for watched content
 * Shared utility used by multiple recommendation algorithms
 */
export async function getWatchedStatusIds(): Promise<number[]> {
  try {
    const statuses = await prisma.movieStatus.findMany({
      where: {
        OR: [
          { name: 'Просмотрено' },
          { name: 'Пересмотрено' },
        ],
      },
      select: { id: true },
    });

    return statuses.map(s => s.id);
  } catch (error) {
    logger.error('getWatchedStatusIds: failed to fetch status IDs', {
      error: error instanceof Error ? error.message : String(error),
      context: 'TwinsUtils',
    });
    return [];
  }
}

/**
 * Get status ID for a specific status name
 */
export async function getStatusIdByName(statusName: string): Promise<number | null> {
  try {
    const status = await prisma.movieStatus.findFirst({
      where: { name: statusName },
      select: { id: true },
    });
    return status?.id ?? null;
  } catch (error) {
    logger.error('getStatusIdByName: failed to fetch status ID', {
      error: error instanceof Error ? error.message : String(error),
      statusName,
      context: 'TwinsUtils',
    });
    return null;
  }
}

/**
 * Build a movie map from twin users' watchlist entries
 * Merges duplicates and aggregates cooccurrence data
 */
export function buildMovieMapFromTwins<T extends CandidateMovie>(
  entries: Array<{
    tmdbId: number;
    mediaType: string;
    title: string | null;
    userRating: number | null;
    voteAverage: number | null;
    similarityScore: number;
    sourceUserId: string;
  }>,
  existingMap: Map<string, T>
): Map<string, T> {
  const movieMap = new Map(existingMap);

  for (const entry of entries) {
    const key = `${entry.tmdbId}_${entry.mediaType}`;
    const title = entry.title || `Movie ${entry.tmdbId}`;

    const existing = movieMap.get(key);
    if (existing) {
      // Update existing entry
      existing.cooccurrenceCount += 1;
      existing.sourceUserIds.push(entry.sourceUserId);
      // Update similarity score to average
      const totalSimilarity =
        existing.similarityScore * (existing.cooccurrenceCount - 1) + entry.similarityScore;
      existing.similarityScore = totalSimilarity / existing.cooccurrenceCount;
    } else {
      // Create new entry
      movieMap.set(key, {
        tmdbId: entry.tmdbId,
        mediaType: entry.mediaType,
        title,
        userRating: entry.userRating,
        voteAverage: entry.voteAverage || 0,
        similarityScore: entry.similarityScore,
        cooccurrenceCount: 1,
        sourceUserIds: [entry.sourceUserId],
      } as T);
    }
  }

  return movieMap;
}

/**
 * Weights configuration for twins algorithms
 */
export const TWINS_WEIGHTS = {
  similarity: 0.5,
  rating: 0.3,
  cooccurrence: 0.2,
} as const;

/**
 * Calculate weighted scores for twin candidates
 */
export function calculateTwinsScore(
  similarityScore: number,
  userRating: number | null,
  voteAverage: number,
  cooccurrenceCount: number,
  maxCooccurrence: number
): number {
  // Normalize components
  const similarityNorm = similarityScore; // Already 0-1
  const ratingNorm = (userRating ?? voteAverage / 2) / 10; // 0-1 scale
  const cooccurrenceNorm = cooccurrenceCount / maxCooccurrence; // 0-1 relative

  // Weighted sum
  return (
    similarityNorm * TWINS_WEIGHTS.similarity +
    ratingNorm * TWINS_WEIGHTS.rating +
    cooccurrenceNorm * TWINS_WEIGHTS.cooccurrence
  );
}

/**
 * Default configuration for twins algorithms
 */
export const TWINS_CONFIG = {
  MIN_USER_HISTORY: 10,
  SIMILARITY_THRESHOLD: 0.6,
  MAX_TWINS: 15,
  TOP_MOVIES_PER_USER: 10,
  MAX_RECOMMENDATIONS: 12,
  MIN_RATING_THRESHOLD: 7,
} as const;
