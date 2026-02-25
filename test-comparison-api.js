#!/usr/bin/env node

/**
 * Test script for taste map comparison API
 * Tests the async params handling and compares two users
 */

const BASE_URL = 'http://localhost:3000';

async function testComparisonAPI() {
  console.log('🧪 Testing Taste Map Comparison API...\n');

  try {
    // First, let's test the twin-tasters endpoint to get a valid user ID
    console.log('1️⃣  Fetching similar users...');
    const similarsRes = await fetch(`${BASE_URL}/api/user/similar-users`);
    
    if (!similarsRes.ok) {
      console.error('❌ Failed to fetch similar users:', similarsRes.status);
      return;
    }

    const similarsData = await similarsRes.json();
    console.log(`✅ Got ${similarsData.similarUsers?.length || 0} similar users`);

    if (!similarsData.similarUsers || similarsData.similarUsers.length === 0) {
      console.log('ℹ️  No similar users found, cannot test comparison API');
      return;
    }

    // Now test the comparison API with the first similar user
    const firstUser = similarsData.similarUsers[0];
    const comparedUserId = firstUser.userId;
    
    console.log(`\n2️⃣  Testing comparison API with user: ${comparedUserId}`);
    console.log(`   (Match: ${(firstUser.overallMatch * 100).toFixed(1)}%)`);

    const comparisonRes = await fetch(
      `${BASE_URL}/api/user/taste-map-comparison/${comparedUserId}`,
      { 
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (!comparisonRes.ok) {
      console.error(`❌ Comparison API returned ${comparisonRes.status}`);
      const errorData = await comparisonRes.json().catch(() => ({}));
      console.error('Error details:', errorData);
      return;
    }

    const comparisonData = await comparisonRes.json();
    console.log('✅ Successfully retrieved comparison data');
    console.log('\n📊 Comparison Metrics:');
    console.log(`   Taste Similarity: ${(comparisonData.metrics.tasteSimilarity * 100).toFixed(1)}%`);
    console.log(`   Rating Correlation: ${(comparisonData.metrics.ratingCorrelation * 100).toFixed(1)}%`);
    console.log(`   Person Overlap: ${(comparisonData.metrics.personOverlap * 100).toFixed(1)}%`);
    console.log(`   Overall Match: ${(comparisonData.metrics.overallMatch * 100).toFixed(1)}%`);
    
    console.log('\n📈 Watch Statistics:');
    console.log(`   Your watched movies: ${comparisonData.myWatchedCount}`);
    console.log(`   Their watched movies: ${comparisonData.theirWatchedCount}`);
    console.log(`   Shared movies: ${comparisonData.commonWatchedCount}`);
    console.log(`   Shared movies in response: ${comparisonData.sharedMovies?.length || 0}`);

    if (comparisonData.sharedMovies && comparisonData.sharedMovies.length > 0) {
      console.log('\n🎬 Sample shared movies:');
      comparisonData.sharedMovies.slice(0, 3).forEach((movie) => {
        console.log(`   - ${movie.title || `Movie ${movie.tmdbId}`}`);
        console.log(`     Your rating: ${movie.myRating}/10, Their rating: ${movie.theirRating}/10`);
        console.log(`     Difference: ${(movie.difference > 0 ? '+' : '')}${movie.difference.toFixed(1)}`);
      });
    }

    console.log('\n✅ API test completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Make sure the development server is running on port 3000');
    console.error('Run: npm run dev');
  }
}

testComparisonAPI();
