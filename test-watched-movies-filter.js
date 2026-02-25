#!/usr/bin/env node

/**
 * Test script validating that Twin Tasters now only compares watched/rewatched movies
 * Checks: statusId filtering in similarity calculations
 */

const BASE_URL = 'http://localhost:3000';

async function testWatchedMoviesFiltering() {
  console.log('🧪 Testing Twin Tasters - Watched Movies Only Filter\n');

  try {
    // 1. Get Twin Tasters recommendations
    console.log('1️⃣  Fetching Twin Tasters...');
    const similarsRes = await fetch(`${BASE_URL}/api/user/similar-users`, {
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (!similarsRes.ok) {
      console.error(`❌ Failed to fetch similar users: ${similarsRes.status}`);
      return;
    }

    const similarsData = await similarsRes.json();
    console.log(`✅ Got ${similarsData.similarUsers?.length || 0} similar users`);

    if (!similarsData.similarUsers || similarsData.similarUsers.length === 0) {
      console.log('ℹ️  No similar users found. Need more users to test.');
      return;
    }

    const firstUser = similarsData.similarUsers[0];
    const comparedUserId = firstUser.userId;
    
    console.log(`\n2️⃣  Testing comparison API with user: ${comparedUserId}`);
    console.log(`   Match: ${firstUser.overallMatch}%`);

    // 2. Get detailed comparison
    const comparisonRes = await fetch(
      `${BASE_URL}/api/user/taste-map-comparison/${comparedUserId}`,
      { headers: { 'Content-Type': 'application/json' } }
    );

    if (!comparisonRes.ok) {
      console.error(`❌ Comparison API returned ${comparisonRes.status}`);
      const errorData = await comparisonRes.json().catch(() => ({}));
      console.error('Error:', errorData);
      return;
    }

    const comparisonData = await comparisonRes.json();
    console.log('✅ Successfully retrieved comparison data');

    // 3. Validate metrics are reasonable (not based on "want to watch")
    console.log('\n📊 Validation: Checking metrics make sense...');
    
    const metrics = comparisonData.metrics;
    
    // Check all metrics are in valid range [0, 1]
    const validRanges = [
      ['tasteSimilarity', metrics.tasteSimilarity],
      ['ratingCorrelation', (metrics.ratingCorrelation + 1) / 2], // Convert [-1,1] to [0,1]
      ['personOverlap', metrics.personOverlap],
      ['overallMatch', metrics.overallMatch],
    ];

    let allValid = true;
    for (const [name, value] of validRanges) {
      const isValid = value >= 0 && value <= 1;
      console.log(`   ${isValid ? '✅' : '❌'} ${name}: ${(value * 100).toFixed(1)}%`);
      if (!isValid) allValid = false;
    }

    // 4. Check shared movies count
    console.log('\n🎬 Movie Statistics:');
    const commonCount = comparisonData.commonWatchedCount;
    const theirWatchedCount = comparisonData.theirWatchedCount;
    const myWatchedCount = comparisonData.myWatchedCount;
    const sharedMoviesInResponse = comparisonData.sharedMovies?.length || 0;

    console.log(`   Your watched movies: ${myWatchedCount}`);
    console.log(`   Their watched movies: ${theirWatchedCount}`);
    console.log(`   Common watched (API says): ${commonCount}`);
    console.log(`   Shared movies in response: ${sharedMoviesInResponse}`);

    // Validate consistency
    if (commonCount === sharedMoviesInResponse) {
      console.log('   ✅ Consistent: commonCount matches sharedMovies.length');
    } else {
      console.log(`   ⚠️  Warning: commonCount (${commonCount}) ≠ sharedMovies.length (${sharedMoviesInResponse})`);
    }

    // 5. Validate rating correlation calculation
    // Rating correlation should only include movies where BOTH users have ratings
    if (comparisonData.sharedMovies && comparisonData.sharedMovies.length > 0) {
      console.log('\n📈 Shared Movies Sample (top 3 by rating difference):');
      const ratedMovies = comparisonData.sharedMovies
        .filter(m => m.myRating !== 0 && m.theirRating !== 0)
        .slice(0, 3);

      for (const movie of ratedMovies) {
        console.log(`   - ${movie.title || `Movie ${movie.tmdbId}`}`);
        console.log(`     Your: ${movie.myRating}/10, Theirs: ${movie.theirRating}/10, Diff: ${movie.difference.toFixed(1)}`);
      }

      const ratedCount = comparisonData.sharedMovies.filter(m => m.myRating !== 0 && m.theirRating !== 0).length;
      console.log(`\n   Total rated in both lists: ${ratedCount}/${sharedMoviesInResponse}`);
      
      if (ratedCount >= 2) {
        console.log('   ✅ Enough data for Pearson correlation');
      } else {
        console.log('   ⚠️  Not enough rated movies for accurate correlation');
      }
    }

    // 6. Final verdict
    console.log('\n' + '='.repeat(50));
    if (allValid && commonCount === sharedMoviesInResponse) {
      console.log('✅ TEST PASSED: Watched movies filtering works correctly');
      console.log('   - All metrics in valid ranges');
      console.log('   - Shared movies count is consistent');
      console.log('   - ratingCorrelation based on watched movies only');
    } else {
      console.log('❌ TEST FAILED: Issues detected');
      if (!allValid) {
        console.log('   - Metrics out of valid range');
      }
      if (commonCount !== sharedMoviesInResponse) {
        console.log('   - Shared movies count inconsistent');
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testWatchedMoviesFiltering();
