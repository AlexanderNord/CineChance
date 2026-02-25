#!/usr/bin/env node

/**
 * Test for genreRatingSimilarity calculation
 * 
 * Formula: For each common genre: similarity = max(0, 1 - |diff|/10)
 * Where diff = |ratingA - ratingB| (in 0-10 scale, so convert from 0-100)
 */

function genreRatingSimilarity(profileA, profileB) {
  const commonGenres = Object.keys(profileA).filter(g => g in profileB);
  
  console.log('Common genres:', commonGenres);
  
  if (commonGenres.length === 0) return 0;
  
  const similarities = commonGenres.map(genre => {
    const ratingA = (profileA[genre] ?? 0) / 10;  // 0-100 → 0-10
    const ratingB = (profileB[genre] ?? 0) / 10;  // 0-100 → 0-10
    const diff = Math.abs(ratingA - ratingB);
    const similarity = Math.max(0, 1 - diff / 10);  // Normalize to 0-1
    
    console.log(`  ${genre}: user1=${ratingA}/10, user2=${ratingB}/10, diff=${diff.toFixed(2)}, similarity=${(similarity * 100).toFixed(1)}%`);
    
    return similarity;
  });
  
  const result = similarities.reduce((sum, sim) => sum + sim, 0) / similarities.length;
  return result;
}

// Test Case 1: Identical ratings
console.log('\n=== Test 1: Identical ratings ===');
const profile1 = { Action: 75, Comedy: 80, Drama: 85 };
const profile2 = { Action: 75, Comedy: 80, Drama: 85 };
const result1 = genreRatingSimilarity(profile1, profile2);
console.log(`Result: ${(result1 * 100).toFixed(1)}% (expected 100%)\n`);

// Test Case 2: Small differences
console.log('=== Test 2: Small differences (±5 points) ===');
const profile3 = { Action: 75, Comedy: 80, Drama: 85 };
const profile4 = { Action: 80, Comedy: 75, Drama: 90 };
const result2 = genreRatingSimilarity(profile3, profile4);
console.log(`Result: ${(result2 * 100).toFixed(1)}% (expected ~95%)\n`);

// Test Case 3: Large differences
console.log('=== Test 3: Large differences (±30 points) ===');
const profile5 = { Action: 75, Comedy: 80, Drama: 85 };
const profile6 = { Action: 45, Comedy: 50, Drama: 55 };
const result3 = genreRatingSimilarity(profile5, profile6);
console.log(`Result: ${(result3 * 100).toFixed(1)}% (expected ~70%)\n`);

// Test Case 4: Extreme differences
console.log('=== Test 4: Extreme differences (opposite ratings) ===');
const profile7 = { Action: 90, Comedy: 80, Drama: 70 };
const profile8 = { Action: 10, Comedy: 20, Drama: 30 };
const result4 = genreRatingSimilarity(profile7, profile8);
console.log(`Result: ${(result4 * 100).toFixed(1)}% (expected 0%)\n`);

// Test Case 5: Partial overlap
console.log('=== Test 5: Partial genre overlap ===');
const profile9 = { Action: 75, Comedy: 80, Drama: 85 };
const profile10 = { Action: 75, Thriller: 80, Drama: 85 };  // Comedy vs Thriller is different
const result5 = genreRatingSimilarity(profile9, profile10);
console.log(`Result: ${(result5 * 100).toFixed(1)}% (expected 100% - only common genres count)\n`);
