/**
 * TasteMap Similarity Calculation
 * 
 * Functions for computing similarity between user taste maps.
 * Uses cosine similarity for genre vectors, Pearson correlation for ratings,
 * and Jaccard similarity for person overlap.
 * 
 * Also analyzes three rating match patterns:
 * 1. Perfect match (same movie, status, rating within tolerance)
 * 2. Close match (same movie, status, rating difference analyzed)
 * 3. Intensity (average rating showing taste intensity - positive/negative/epic)
 */

import { getRedis } from '@/lib/redis';
import { logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';
import { MOVIE_STATUS_IDS } from '@/lib/movieStatusConstants';
import type { GenreProfile, PersonProfiles } from './types';
import { getTasteMap } from './redis';
import { computeTasteMap } from './compute';

// TTL: 24 hours in seconds
export const TTL_24H = 86400;

// Completed status IDs (watched + rewatched) for comparing taste
const COMPLETED_STATUS_IDS = [MOVIE_STATUS_IDS.WATCHED, MOVIE_STATUS_IDS.REWATCHED];

// Dropped status - excluded from rating analysis
const DROPPED_STATUS_ID = MOVIE_STATUS_IDS.DROPPED;

// Rating thresholds for pattern analysis
export const RATING_THRESHOLDS = {
  // "Хуже некуда" to "Очень плохо"
  VERY_BAD: { min: 1, max: 3, label: 'Очень плохо', color: '🔴', signal: 'Разочарует' },
  // "Плохо" to "Более-менее"
  BAD: { min: 4, max: 5, label: 'Плохо', color: '🟡', signal: 'Сойдёт' },
  // "Нормально" to "Хорошо"
  NEUTRAL: { min: 6, max: 7, label: 'Нормально', color: '🟢', signal: 'Приятный просмотр' },
  // "Отлично" to "Великолепно"
  GOOD: { min: 8, max: 9, label: 'Отлично', color: '🔥', signal: 'Стоит времени' },
  // "Эпик вин!"
  EPIC: { min: 10, max: 10, label: 'Эпик вин!', color: '⚡', signal: 'Пересмотр!' },
} as const;

// Weights for overall match from CONTEXT.md
const WEIGHTS = {
  tasteSimilarity: 0.5,
  ratingCorrelation: 0.3,
  personOverlap: 0.2,
};

// Similarity threshold from CONTEXT.md
const SIMILARITY_THRESHOLD = 0.7;

/**
 * Rating match patterns showing how aligned users' taste are
 */
export interface RatingMatchPatterns {
  // Pattern 1: Полное совпадение оценок (в пределах ±1, ±2)
  perfectMatches: number;      // Фильм + статус + оценка полностью совпали
  closeMatches: number;        // Фильм + статус совпали, оценка ±1
  moderateMatches: number;     // Фильм + статус совпали, оценка ±2
  
  // Pattern 2: Анализ разницы оценок по категориям
  sameCategory: number;        // Обе оценки в одной категории (1-3, 4-5, 6-7, 8-9)
  differentIntensity: number;  // Оценки в разных категориях интенсивности
  
  // Pattern 3: Интенсивность оценок (средняя)
  avgRatingUser1: number;      // Средняя оценка пользователя 1 по общим фильмам
  avgRatingUser2: number;      // Средняя оценка пользователя 2 по общим фильмам
  intensityMatch: number;      // 0-1, где 1 = обе оценки в похожих категориях интенсивности
  
  // Overall correlation
  pearsonCorrelation: number;  // Pearson correlation (-1 to 1) as before
  totalSharedMovies: number;   // Total shared watched movies
  
  // Movie alignment metrics
  avgRatingDifference: number;        // Средняя разница оценок по всем общим фильмам
  positiveRatingsPercentage: number;  // % фильмов где оба дали 8-10
  bothRewatchedCount: number;         // Количество фильмов оба пересмотрели
  overallMovieMatch: number;          // Итоговая метрика совпадения по фильмам (0-1)
}

/**
 * Result of similarity calculation between two users
 */
export interface SimilarityResult {
  tasteSimilarity: number;     // Cosine similarity (0-1)
  ratingCorrelation: number;   // Pearson correlation (-1 to 1)
  personOverlap: number;        // Jaccard similarity (0-1)
  overallMatch: number;        // Weighted sum (0-1)
  genreRatingSimilarity?: number;  // Genre rating alignment (0-1) - based on rating differences per genre
  ratingPatterns?: RatingMatchPatterns;  // Optional: detailed rating analysis
}

/**
 * Similar user with match score
 */
export interface SimilarUser {
  userId: string;
  overallMatch: number;
}

/**
 * Get rating category for a given rating
 */
export function getRatingCategory(rating: number): keyof typeof RATING_THRESHOLDS {
  if (rating >= 10) return 'EPIC';
  if (rating >= 8) return 'GOOD';
  if (rating >= 6) return 'NEUTRAL';
  if (rating >= 4) return 'BAD';
  return 'VERY_BAD';
}

/**
 * Calculate intensity match between two average ratings
 * Returns 1 if in same category, decreases based on distance
 */
export function calculateIntensityMatch(avgRating1: number, avgRating2: number): number {
  const cat1 = getRatingCategory(avgRating1);
  const cat2 = getRatingCategory(avgRating2);
  
  if (cat1 === cat2) return 1; // Same category = perfect match
  
  // Different categories - calculate distance
  const categories = ['VERY_BAD', 'BAD', 'NEUTRAL', 'GOOD', 'EPIC'] as const;
  const idx1 = categories.indexOf(cat1);
  const idx2 = categories.indexOf(cat2);
  const distance = Math.abs(idx1 - idx2);
  
  // Distance: 1 = 0.75, 2 = 0.5, 3 = 0.25, 4+ = 0
  return Math.max(0, 1 - distance * 0.25);
}

/**
 * Normalize two genre profiles to the same genre set
 * Returns arrays aligned to the same genre keys
 */
export function normalizeVectors(
  profileA: GenreProfile,
  profileB: GenreProfile
): [number[], number[], string[]] {
  // Get all unique genres from both profiles
  const allGenres = new Set([
    ...Object.keys(profileA),
    ...Object.keys(profileB),
  ]);
  
  const genreList = Array.from(allGenres);
  
  // Create vectors with 0 for missing genres
  const vecA = genreList.map(genre => profileA[genre] || 0);
  const vecB = genreList.map(genre => profileB[genre] || 0);
  
  return [vecA, vecB, genreList];
}

/**
 * Compute cosine similarity between two genre profiles
 * Returns value between 0 and 1 (1 = identical profiles)
 * 
 * Formula: cos(A, B) = (A · B) / (||A|| × ||B||)
 */
export function cosineSimilarity(
  profileA: GenreProfile,
  profileB: GenreProfile
): number {
  // Handle empty profiles
  if (Object.keys(profileA).length === 0 && Object.keys(profileB).length === 0) {
    return 0;
  }
  
  // Normalize vectors to same genre set
  const [vecA, vecB] = normalizeVectors(profileA, profileB);
  
  // Compute dot product
  const dotProduct = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
  
  // Compute magnitudes
  const magnitudeA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
  const magnitudeB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));
  
  // Handle division by zero
  if (magnitudeA === 0 || magnitudeB === 0) {
    return 0;
  }
  
  return dotProduct / (magnitudeA * magnitudeB);
}

/**
 * Compute genre rating similarity based on average rating differences per genre
 * This measures how similarly two users rate each genre (average movie ratings in that genre)
 * 
 * Returns value between 0 and 1 (1 = identical ratings across genres)
 * 
 * Formula for each genre:
 * - similarity = max(0, 100 - |ratingUserA - ratingUserB| * 10) / 100
 * - Then average across all common genres
 */
export function genreRatingSimilarity(
  profileA: GenreProfile,
  profileB: GenreProfile
): number {
  // Find common genres (both users have rated this genre)
  const commonGenres = Object.keys(profileA).filter(
    genre => genre in profileB
  );
  
  // No common genres = 0 similarity
  if (commonGenres.length === 0) {
    return 0;
  }
  
  // Calculate similarity for each common genre
  const similarities = commonGenres.map(genre => {
    const ratingA = (profileA[genre] ?? 0) / 10; // Convert 0-100 to 0-10 scale
    const ratingB = (profileB[genre] ?? 0) / 10; // Convert 0-100 to 0-10 scale
    const diff = Math.abs(ratingA - ratingB);
    
    // Normalize difference to 0-1 range (max difference = 10, so divide by 10)
    // Then subtract from 1 to get similarity (max diff = 0 similarity, no diff = 1 similarity)
    return Math.max(0, 1 - diff / 10);
  });
  
  // Return average similarity across all common genres
  return similarities.reduce((sum, sim) => sum + sim, 0) / similarities.length;
}

/**
 * Compute Pearson correlation coefficient between two rating arrays
 * Returns value between -1 and 1
 * - 1 = perfect positive correlation
 * - 0 = no correlation
 * - -1 = perfect negative correlation
 * 
 * Requires both arrays to have same length and at least 2 data points
 */
export function ratingCorrelation(
  ratingsA: number[],
  ratingsB: number[]
): number {
  // Handle insufficient data
  if (ratingsA.length < 2 || ratingsB.length !== ratingsA.length) {
    return 0;
  }
  
  // Calculate means
  const n = ratingsA.length;
  const meanA = ratingsA.reduce((a, b) => a + b, 0) / n;
  const meanB = ratingsB.reduce((a, b) => a + b, 0) / n;
  
  // Calculate Pearson correlation
  let numerator = 0;
  let denomA = 0;
  let denomB = 0;
  
  for (let i = 0; i < n; i++) {
    const diffA = ratingsA[i] - meanA;
    const diffB = ratingsB[i] - meanB;
    numerator += diffA * diffB;
    denomA += diffA * diffA;
    denomB += diffB * diffB;
  }
  
  // Handle division by zero (all ratings are the same)
  const denominator = Math.sqrt(denomA * denomB);
  if (denominator === 0) {
    return 0;
  }
  
  return numerator / denominator;
}

/**
 * Compute Jaccard similarity between two person profiles
 * Returns value between 0 and 1 (1 = identical favorite persons)
 * 
 * Jaccard = |intersection| / |union|
 */
export function personOverlap(
  personsA: Record<string, number>,
  personsB: Record<string, number>
): number {
  // Get sets of person names (non-zero means favorite)
  const entriesA = Object.entries(personsA).filter(([, score]) => score > 0);
  const entriesB = Object.entries(personsB).filter(([, score]) => score > 0);
  
  const setA = new Set(entriesA.map(([name]) => name));
  const setB = new Set(entriesB.map(([name]) => name));
  
  // Handle empty profiles
  if (setA.size === 0 && setB.size === 0) {
    return 0;
  }
  
  // Calculate intersection and union
  const intersectionSize = entriesA.filter(([name]) => setB.has(name)).length;
  const unionSize = setA.size + setB.size - intersectionSize;
  
  return intersectionSize / unionSize;
}

/**
 * Compute overall match score from similarity result
 * Uses weights from CONTEXT.md: tasteSimilarity: 0.5, ratingCorrelation: 0.3, personOverlap: 0.2
 * Note: ratingCorrelation is normalized from [-1, 1] to [0, 1] for weighting
 */
export function computeOverallMatch(result: SimilarityResult): number {
  // Normalize rating correlation from [-1, 1] to [0, 1]
  const normalizedCorrelation = (result.ratingCorrelation + 1) / 2;
  
  return (
    result.tasteSimilarity * WEIGHTS.tasteSimilarity +
    normalizedCorrelation * WEIGHTS.ratingCorrelation +
    result.personOverlap * WEIGHTS.personOverlap
  );
}

/**
 * Check if two users are similar based on similarity threshold
 * Returns true if overallMatch > 0.5 (combining all three metrics)
 * Previously only checked tasteSimilarity which was too restrictive
 */
export function isSimilar(result: SimilarityResult): boolean {
  return result.overallMatch > 0.5;
}

// Redis key patterns for similarity data
const SIMILAR_KEYS = {
  similarUsers: (userId: string) => `similar-users:${userId}`,
  similarityPair: (userId: string, otherUserId: string) => `similarity:${userId}:${otherUserId}`,
};

/**
 * Store similar users list to Redis
 */
export async function storeSimilarUsers(
  userId: string,
  similarUsers: SimilarUser[]
): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  
  try {
    await redis.set(
      SIMILAR_KEYS.similarUsers(userId),
      JSON.stringify(similarUsers),
      { ex: TTL_24H }
    );
  } catch (error) {
    logger.error('Failed to store similar users', {
      error: error instanceof Error ? error.message : String(error),
      userId,
      context: 'SimilarityRedis'
    });
  }
}

/**
 * Get similar users from Redis
 */
export async function getSimilarUsers(userId: string): Promise<SimilarUser[]> {
  const redis = getRedis();
  if (!redis) return [];
  
  try {
    const cached = await redis.get<string>(SIMILAR_KEYS.similarUsers(userId));
    if (cached) {
      return JSON.parse(cached) as SimilarUser[];
    }
  } catch (error) {
    logger.error('Failed to get similar users', {
      error: error instanceof Error ? error.message : String(error),
      userId,
      context: 'SimilarityRedis'
    });
  }
  
  return [];
}

/**
 * Store similarity score for a user pair
 */
export async function storeSimilarityPair(
  userId: string,
  otherUserId: string,
  score: number
): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  
  try {
    await redis.set(
      SIMILAR_KEYS.similarityPair(userId, otherUserId),
      JSON.stringify(score),
      { ex: TTL_24H }
    );
  } catch (error) {
    logger.error('Failed to store similarity pair', {
      error: error instanceof Error ? error.message : String(error),
      userId,
      otherUserId,
      context: 'SimilarityRedis'
    });
  }
}

/**
 * Get similarity score for a user pair
 */
export async function getSimilarityPair(
  userId: string,
  otherUserId: string
): Promise<number | null> {
  const redis = getRedis();
  if (!redis) return null;
  
  try {
    const cached = await redis.get<string>(SIMILAR_KEYS.similarityPair(userId, otherUserId));
    if (cached) {
      return JSON.parse(cached) as number;
    }
  } catch (error) {
    logger.error('Failed to get similarity pair', {
      error: error instanceof Error ? error.message : String(error),
      userId,
      otherUserId,
      context: 'SimilarityRedis'
    });
  }
  
  return null;
}

/**
 * Compute detailed rating match patterns between two users
 * 
 * Analyzes three patterns:
 * 1. Perfect/Close matches: exact rating match, ±1, ±2
 * 2. Category alignment: ratings in same intensity category
 * 3. Intensity: average rating showing taste direction
 * 
 * IMPORTANT: Excludes DROPPED movies from all calculations
 * Returns Pearson correlation + detailed pattern analysis
 */
async function computeRatingPatterns(
  userIdA: string,
  userIdB: string
): Promise<RatingMatchPatterns> {
  // Get watched movies from userA (only completed, excluding dropped)
  const watchListA = await prisma.watchList.findMany({
    where: {
      userId: userIdA,
      statusId: { in: COMPLETED_STATUS_IDS },
    },
    select: { tmdbId: true, userRating: true, statusId: true, watchCount: true },
  });

  if (watchListA.length < 2) {
    return {
      perfectMatches: 0,
      closeMatches: 0,
      moderateMatches: 0,
      sameCategory: 0,
      differentIntensity: 0,
      avgRatingUser1: 0,
      avgRatingUser2: 0,
      intensityMatch: 0,
      pearsonCorrelation: 0,
      totalSharedMovies: 0,
    };
  }

  const movieIdsA = new Set(watchListA.map(w => w.tmdbId));
  const ratingsMapA = new Map(watchListA.map(w => [w.tmdbId, w.userRating || 0]));

  // Find shared watched movies (excluding dropped)
  const watchListB = await prisma.watchList.findMany({
    where: {
      userId: userIdB,
      tmdbId: { in: Array.from(movieIdsA) },
      statusId: { in: COMPLETED_STATUS_IDS },
    },
    select: { tmdbId: true, userRating: true, statusId: true, watchCount: true },
  });

  if (watchListB.length < 2) {
    return {
      perfectMatches: 0,
      closeMatches: 0,
      moderateMatches: 0,
      sameCategory: 0,
      differentIntensity: 0,
      avgRatingUser1: 0,
      avgRatingUser2: 0,
      intensityMatch: 0,
      pearsonCorrelation: 0,
      totalSharedMovies: watchListB.length,
    };
  }

  // Collect ratings for correlation calculation
  const ratingsA: number[] = [];
  const ratingsB: number[] = [];
  let totalRatingDifference = 0;
  let positiveRatingsCount = 0;
  let bothRewatchedCount = 0;

  // Pattern counters
  let perfectMatches = 0;     // Exactly same rating
  let closeMatches = 0;       // ±1 difference
  let moderateMatches = 0;    // ±2 difference
  let sameCategory = 0;       // Same intensity category
  let differentIntensity = 0; // Different intensity categories

  // Create map of watchCounts from userA for quick lookup
  const watchCountMapA = new Map(watchListA.map(w => [w.tmdbId, w.watchCount || 0]));

  // Analyze each shared movie
  for (const movieB of watchListB) {
    const ratingA = ratingsMapA.get(movieB.tmdbId);
    const ratingB = movieB.userRating;
    const watchCountA = watchCountMapA.get(movieB.tmdbId) || 0;
    const watchCountB = movieB.watchCount || 0;

    if (ratingA === undefined || ratingA === null || ratingB === undefined || ratingB === null) {
      continue;
    }

    ratingsA.push(ratingA);
    ratingsB.push(ratingB);

    // Calculate rating difference
    const diff = Math.abs(ratingA - ratingB);
    totalRatingDifference += diff;

    // Count positive ratings (8-10 for both)
    if (ratingA >= 8 && ratingB >= 8) {
      positiveRatingsCount++;
    }

    // Count if both rewatched (watchCount > 1 for both)
    if (watchCountA > 1 && watchCountB > 1) {
      bothRewatchedCount++;
    }

    // Pattern 1: Exact and close matches
    if (diff === 0) {
      perfectMatches++;
    } else if (diff <= 1) {
      closeMatches++;
    } else if (diff <= 2) {
      moderateMatches++;
    }

    // Pattern 2: Category alignment
    const categoryA = getRatingCategory(ratingA);
    const categoryB = getRatingCategory(ratingB);
    
    if (categoryA === categoryB) {
      sameCategory++;
    } else {
      differentIntensity++;
    }
  }

  // Pattern 3: Calculate average ratings based on SHARED movies only
  // This shows how these users tend to rate movies they both watched,
  // which is the basis of taste alignment comparison
  const avgRatingUser1 = ratingsA.length > 0 ? ratingsA.reduce((a, b) => a + b, 0) / ratingsA.length : 0;
  const avgRatingUser2 = ratingsB.length > 0 ? ratingsB.reduce((a, b) => a + b, 0) / ratingsB.length : 0;
  const intensityMatch = calculateIntensityMatch(avgRatingUser1, avgRatingUser2);

  // Pearson correlation
  const pearsonCorrelation = ratingsA.length >= 2 
    ? ratingCorrelation(ratingsA, ratingsB)
    : 0;

  // Calculate movie alignment metrics
  const avgRatingDifference = ratingsA.length > 0 
    ? Math.round((totalRatingDifference / ratingsA.length) * 10) / 10
    : 0;
  
  const positiveRatingsPercentage = ratingsA.length > 0
    ? Math.round((positiveRatingsCount / ratingsA.length) * 100)
    : 0;

  // Overall movie match: based on perfect matches percentage
  const overallMovieMatch = ratingsA.length > 0
    ? perfectMatches / ratingsA.length 
    : 0;

  return {
    perfectMatches,
    closeMatches,
    moderateMatches,
    sameCategory,
    differentIntensity,
    avgRatingUser1: Math.round(avgRatingUser1 * 10) / 10,
    avgRatingUser2: Math.round(avgRatingUser2 * 10) / 10,
    intensityMatch,
    pearsonCorrelation,
    totalSharedMovies: ratingsA.length,
    avgRatingDifference,
    positiveRatingsPercentage,
    bothRewatchedCount,
    overallMovieMatch,
  };
}

/**
 * Compute rating correlation for shared watched movies between two users
 * 
 * IMPORTANT: Only compares movies that BOTH users have watched or rewatched.
 * Excludes DROPPED movies entirely.
 * This ensures we're comparing tastes based on actual viewing experiences,
 * not on "want to watch" lists which may have different rating logic.
 * 
 * Returns Pearson correlation coefficient (-1 to 1)
 */
async function computeRatingCorrelation(
  userIdA: string,
  userIdB: string
): Promise<number> {
  const patterns = await computeRatingPatterns(userIdA, userIdB);
  return patterns.pearsonCorrelation;
}

/**
 * Compute similarity between two users
 * Returns full SimilarityResult
 * 
 * IMPORTANT: All metrics are based on watched/rewatched movies only:
 * - tasteSimilarity: compares genre preferences from completed watches
 * - ratingCorrelation: pearson correlation of ratings for shared watched movies
 * - personOverlap: compares favorite actors/directors from completed watches
 * 
 * This ensures accurate taste compatibility based on actual viewing experiences.
 */
export async function computeSimilarity(
  userIdA: string,
  userIdB: string,
  includePatterns?: boolean
): Promise<SimilarityResult> {
  // Get taste maps from cache (or compute fresh)
  const [tasteMapA, tasteMapB] = await Promise.all([
    getTasteMap(userIdA, () => computeTasteMap(userIdA)),
    getTasteMap(userIdB, () => computeTasteMap(userIdB)),
  ]);
  
  // Handle missing profiles
  if (!tasteMapA || !tasteMapB) {
    return {
      tasteSimilarity: 0,
      ratingCorrelation: 0,
      personOverlap: 0,
      overallMatch: 0,
    };
  }
  
  // Compute taste similarity (cosine similarity of genre vectors)
  const tasteSimilarity = cosineSimilarity(
    tasteMapA.genreProfile,
    tasteMapB.genreProfile
  );
  
  // Compute genre rating similarity (based on rating differences per genre)
  const genreRatingSimilarityValue = genreRatingSimilarity(
    tasteMapA.genreProfile,
    tasteMapB.genreProfile
  );
  
  // Compute person overlap (Jaccard similarity of actors and directors)
  const actorsOverlap = personOverlap(
    tasteMapA.personProfiles.actors,
    tasteMapB.personProfiles.actors
  );
  const directorsOverlap = personOverlap(
    tasteMapA.personProfiles.directors,
    tasteMapB.personProfiles.directors
  );
  // Average of actor and director overlap
  const personOverlapValue = (actorsOverlap + directorsOverlap) / 2;
  
  // For rating correlation, compute from shared watched movies
  const ratingCorrelationValue = await computeRatingCorrelation(userIdA, userIdB);
  
  const result: SimilarityResult = {
    tasteSimilarity,
    ratingCorrelation: ratingCorrelationValue,
    personOverlap: personOverlapValue,
    overallMatch: 0, // Will be computed below
    genreRatingSimilarity: genreRatingSimilarityValue,
  };
  
  // Optionally include detailed rating patterns (for comparison page)
  if (includePatterns) {
    result.ratingPatterns = await computeRatingPatterns(userIdA, userIdB);
  }
  
  // Compute overall match
  result.overallMatch = computeOverallMatch(result);
  
  return result;
}

/**
 * Find similar users from a list of candidate user IDs
 * Filters to only those where isSimilar() returns true
 * Stores results to Redis
 */
export async function findSimilarUsers(
  userId: string,
  candidateUserIds: string[]
): Promise<SimilarUser[]> {
  const similarUsers: SimilarUser[] = [];
  
  for (const candidateId of candidateUserIds) {
    // Skip comparing user to themselves
    if (candidateId === userId) continue;
    
    // Compute similarity
    const result = await computeSimilarity(userId, candidateId);
    
    // Store individual pair similarity to Redis
    await storeSimilarityPair(userId, candidateId, result.overallMatch);
    
    // If similar, add to results
    if (isSimilar(result)) {
      similarUsers.push({
        userId: candidateId,
        overallMatch: result.overallMatch,
      });
    }
  }
  
  // Sort by overall match (highest first)
  similarUsers.sort((a, b) => b.overallMatch - a.overallMatch);
  
  // Store to Redis
  await storeSimilarUsers(userId, similarUsers);
  
  return similarUsers;
}

/**
 * Get similar users with their match scores from Redis
 * Returns cached results if available
 */
export async function getSimilarUsersWithScores(
  userId: string
): Promise<SimilarUser[]> {
  return getSimilarUsers(userId);
}
