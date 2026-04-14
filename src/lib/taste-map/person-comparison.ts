/**
 * Person Comparison Functions
 * 
 * Functions for comparing actors and directors between two users.
 * Returns detailed information about overlapping favorite persons.
 */

import type { PersonProfiles } from './types';

export interface PersonOverlapDetail {
  name: string;
  userScore: number;
  comparedScore: number;
  average: number;
}

export interface PersonComparisonResult {
  actors: {
    mutual: PersonOverlapDetail[];      // Actors both users like
    onlyInUser: PersonOverlapDetail[];  // Actors only current user likes
    onlyInCompared: PersonOverlapDetail[]; // Actors only compared user likes
    jaccardIndex: number;               // 0-1, 1 = identical
  };
  directors: {
    mutual: PersonOverlapDetail[];
    onlyInUser: PersonOverlapDetail[];
    onlyInCompared: PersonOverlapDetail[];
    jaccardIndex: number;
  };
  overallMatch: number; // Average between actors and directors Jaccard
}

/**
 * Compare person profiles (actors and directors) between two users
 * Returns detailed breakdown of overlapping and unique preferences
 */
export function comparePersonProfiles(
  userProfiles: PersonProfiles,
  comparedProfiles: PersonProfiles
): PersonComparisonResult {
  const actorsResult = comparePersonSet(
    userProfiles.actors,
    comparedProfiles.actors
  );

  const directorsResult = comparePersonSet(
    userProfiles.directors,
    comparedProfiles.directors
  );

  return {
    actors: actorsResult,
    directors: directorsResult,
    overallMatch: (actorsResult.jaccardIndex + directorsResult.jaccardIndex) / 2,
  };
}

/**
 * Compare a single person set (actors or directors)
 * Returns mutual, unique to each user, and Jaccard index
 */
function comparePersonSet(
  personSetA: Record<string, number>,
  personSetB: Record<string, number>
): {
  mutual: PersonOverlapDetail[];
  onlyInUser: PersonOverlapDetail[];
  onlyInCompared: PersonOverlapDetail[];
  jaccardIndex: number;
} {
  const entriesA = Object.entries(personSetA).filter(([, score]) => score > 0);
  const entriesB = Object.entries(personSetB).filter(([, score]) => score > 0);

  const setA = new Set(entriesA.map(([name]) => name));
  const setB = new Set(entriesB.map(([name]) => name));

  // Handle empty profiles - early return
  if (setA.size === 0 && setB.size === 0) {
    return { mutual: [], onlyInUser: [], onlyInCompared: [], jaccardIndex: 1 };
  }

  // Early return if one set is empty
  if (setA.size === 0) {
    return buildOnlyInCompared(entriesB, setB);
  }
  if (setB.size === 0) {
    return buildOnlyInUser(entriesA, setA);
  }

  // Build maps for quick lookup
  const mapA = new Map(entriesA);
  const mapB = new Map(entriesB);

  // Find mutual persons - single iteration using set intersection
  const mutual = findMutualPersons(setA, setB, mapA, mapB);

  // Find unique to user A
  const onlyInUser = findOnlyInUser(setA, setB, mapA);

  // Find unique to user B
  const onlyInCompared = findOnlyInCompared(setA, setB, mapB);

  // Calculate Jaccard index
  const intersectionSize = mutual.length;
  const unionSize = setA.size + setB.size - intersectionSize;
  const jaccardIndex = unionSize === 0 ? 0 : intersectionSize / unionSize;

  return { mutual, onlyInUser, onlyInCompared, jaccardIndex };
}

/**
 * Build result for when only setB has entries
 */
function buildOnlyInCompared(
  entriesB: [string, number][],
  setB: Set<string>
): {
  mutual: PersonOverlapDetail[];
  onlyInUser: PersonOverlapDetail[];
  onlyInCompared: PersonOverlapDetail[];
  jaccardIndex: number;
} {
  const onlyInCompared = entriesB.map(([name, score]) => ({
    name,
    userScore: 0,
    comparedScore: score,
    average: score / 2,
  }));
  onlyInCompared.sort((a, b) => b.comparedScore - a.comparedScore);

  return { mutual: [], onlyInUser: [], onlyInCompared, jaccardIndex: 0 };
}

/**
 * Build result for when only setA has entries
 */
function buildOnlyInUser(
  entriesA: [string, number][],
  setA: Set<string>
): {
  mutual: PersonOverlapDetail[];
  onlyInUser: PersonOverlapDetail[];
  onlyInCompared: PersonOverlapDetail[];
  jaccardIndex: number;
} {
  const onlyInUser = entriesA.map(([name, score]) => ({
    name,
    userScore: score,
    comparedScore: 0,
    average: score / 2,
  }));
  onlyInUser.sort((a, b) => b.userScore - a.userScore);

  return { mutual: [], onlyInUser, onlyInCompared: [], jaccardIndex: 0 };
}

/**
 * Find mutual persons using set intersection
 */
function findMutualPersons(
  setA: Set<string>,
  setB: Set<string>,
  mapA: Map<string, number>,
  mapB: Map<string, number>
): PersonOverlapDetail[] {
  const mutual: PersonOverlapDetail[] = [];
  for (const name of setA) {
    // Early continue if not in B
    if (!setB.has(name)) continue;

    const userScore = mapA.get(name) || 0;
    const comparedScore = mapB.get(name) || 0;
    mutual.push({ name, userScore, comparedScore, average: (userScore + comparedScore) / 2 });
  }
  mutual.sort((a, b) => b.average - a.average);
  return mutual;
}

/**
 * Find persons only in set A
 */
function findOnlyInUser(
  setA: Set<string>,
  setB: Set<string>,
  mapA: Map<string, number>
): PersonOverlapDetail[] {
  const onlyInUser: PersonOverlapDetail[] = [];
  for (const name of setA) {
    // Early continue if also in B
    if (setB.has(name)) continue;

    const userScore = mapA.get(name) || 0;
    onlyInUser.push({ name, userScore, comparedScore: 0, average: userScore / 2 });
  }
  onlyInUser.sort((a, b) => b.userScore - a.userScore);
  return onlyInUser;
}

/**
 * Find persons only in set B
 */
function findOnlyInCompared(
  setA: Set<string>,
  setB: Set<string>,
  mapB: Map<string, number>
): PersonOverlapDetail[] {
  const onlyInCompared: PersonOverlapDetail[] = [];
  for (const name of setB) {
    // Early continue if also in A
    if (setA.has(name)) continue;

    const comparedScore = mapB.get(name) || 0;
    onlyInCompared.push({ name, userScore: 0, comparedScore, average: comparedScore / 2 });
  }
  onlyInCompared.sort((a, b) => b.comparedScore - a.comparedScore);
  return onlyInCompared;
}
