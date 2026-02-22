/**
 * Recommendation Algorithms - Main Entry Point
 * 
 * Exports all recommendation pattern algorithms for use in API endpoints.
 * Each algorithm implements IRecommendationAlgorithm interface.
 */

import { tasteMatch } from './recommendation-algorithms/taste-match';
import { wantOverlap } from './recommendation-algorithms/want-overlap';

// Re-export types and interface
export type {
  IRecommendationAlgorithm,
  RecommendationContext,
  RecommendationSession,
  RecommendationResult,
  RecommendationItem,
  RecommendationMetrics,
} from './recommendation-algorithms/interface';

export {
  normalizeScore,
  normalizeScores,
  DEFAULT_COOLDOWN,
} from './recommendation-algorithms/interface';

// Export individual algorithms
export { tasteMatch } from './recommendation-algorithms/taste-match';
export { wantOverlap } from './recommendation-algorithms/want-overlap';

/**
 * All available recommendation algorithms
 * 
 * Algorithms are ordered by priority - first algorithms are preferred
 * for users with sufficient history.
 */
export const recommendationAlgorithms = [
  tasteMatch,
  wantOverlap,
  // Additional algorithms (drop-patterns, type-twins) will be added in Phase 11-02
];

/**
 * Get algorithm by name
 */
export function getAlgorithmByName(name: string) {
  return recommendationAlgorithms.find(algo => algo.name === name);
}

/**
 * Default export for convenience
 */
export default recommendationAlgorithms;
