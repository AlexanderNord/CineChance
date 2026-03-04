# 🧪 Testing Guide: Similar Users Bug Fix

**Date Created:** 2026-02-24  
**Bug Fixed:** Similar Users Not Found despite 300+ watched movies

---

## Quick Start

### 1. Start Dev Server
```bash
cd /workspaces/CineChance
npm run dev
```

### 2. Test via Web UI
```
Open: http://localhost:3000/profile/taste-map
Expected: Should see "Ваши близнецы вкуса" section with similar users
```

### 3. Test via API
```bash
curl "http://localhost:3000/api/user/similar-users?limit=5"
```

---

## Full Test Suite

### Test 1: Web UI Similar Users Display

**Preconditions:**
- Dev server running
- At least 2 users with 5+ watched movies each
- Some overlap in watched content or shared actors

**Steps:**
1. Go to http://localhost:3000/profile/taste-map
2. Scroll to "Ваши близнецы вкуса" section
3. Check for similar users listed

**Expected Result:**
```
✅ Shows list of similar users
✅ Each user shows: avatar, name, match %, watch count
✅ No "No similar users found" message (unless truly none exist)
```

**Failure Indication:**
- ❌ Empty section with "No similar users found"
- ❌ Error message in browser console
- ❌ 500 error in Network tab

---

### Test 2: API Endpoint Basic Call

**Command:**
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:3000/api/user/similar-users?limit=5" \
  | jq
```

**Expected Response:**
```json
{
  "similarUsers": [
    {
      "userId": "user_id_123",
      "userName": "Movie Enthusiast",
      "userAvatar": "https://...",
      "overallMatch": 75.5,
      "watchCount": 145,
      "memberSince": "2025-06-15T10:30:00Z"
    }
  ],
  "cached": false,
  "message": "Found 1 similar user(s)"
}
```

**If Empty (Bad):**
```json
{
  "similarUsers": [],
  "cached": false,
  "message": "No similar users found"
}
```

---

### Test 3: Debug Endpoint - Detailed Metrics

**URL:**
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:3000/api/user/similar-users/debug?limit=10&details=true" \
  | jq
```

**Expected Response (showing internal metrics):**
```json
{
  "requestingUserId": "your_user_id",
  "debugInfo": {
    "totalAnalyzed": 10,
    "candidates": [
      {
        "userId": "candidate_id_1",
        "metrics": {
          "tasteSimilarity": 0.45,
          "ratingCorrelation": 0.82,
          "personOverlap": 0.68,
          "overallMatch": 0.5543,
          "passed": true
        },
        "watchCount": 120,
        "reason": "Overall match: 0.5543 > 0.5 ✓"
      },
      {
        "userId": "candidate_id_2",
        "metrics": {
          "tasteSimilarity": 0.32,
          "ratingCorrelation": 0.45,
          "personOverlap": 0.38,
          "overallMatch": 0.3840,
          "passed": false
        },
        "watchCount": 75,
        "reason": "Overall match: 0.3840 < 0.5 ✗"
      }
    ],
    "summary": {
      "totalAnalyzed": 10,
      "passedThreshold": 1,
      "failedThreshold": 9,
      "computationErrors": 0
    }
  },
  "cached": false
}
```

**What to Look For:**
- ✅ `passed: true` for candidates with `overallMatch > 0.5`
- ✅ Mix of metrics (not all 0 or 1)
- ✅ `computationErrors: 0`

---

### Test 4: Metrics Validation

**Check that three metrics are used (not just genre):**

```bash
curl -s -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:3000/api/user/similar-users/debug?limit=20" \
  | jq '.debugInfo.candidates[] | 
    select(.passed == true) | 
    {
      userId: .userId,
      taste: .metrics.tasteSimilarity, 
      rating: .metrics.ratingCorrelation, 
      person: .metrics.personOverlap
    }'
```

**Expected Output (should have variety):**
```json
{
  "userId": "user1",
  "taste": 0.35,
  "rating": 0.92,
  "person": 0.71
}
{
  "userId": "user2",
  "taste": 0.68,
  "rating": 0.55,
  "person": 0.42
}
```

**If all metrics are ~0 or all 1.0, something is wrong.** ❌

---

### Test 5: Cache Verification

**First call should have `"cached": false`:**
```bash
curl -s -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:3000/api/user/similar-users?limit=5" \
  | jq '.cached'

# Output: false
```

**Second call within 24 hours should have `"cached": true`:**
```bash
curl -s -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:3000/api/user/similar-users?limit=5" \
  | jq '.cached'

# Output: true
```

If cache always shows false, check Redis connection.

---

### Test 6: Edge Cases

#### Test 6a: New User (No Other Users)
```bash
# Create new test user
# Call API
curl -H "Authorization: Bearer NEW_USER_TOKEN" \
  "http://localhost:3000/api/user/similar-users"

# Expected:
# {
#   "similarUsers": [],
#   "message": "No similar users found"
# }
```

#### Test 6b: User With Same Movies
```bash
# Two users watching identical movies should have high match
# Check debug endpoint:
curl -H "Authorization: Bearer USER1_TOKEN" \
  "http://localhost:3000/api/user/similar-users/debug?limit=100" \
  | jq '.debugInfo.candidates[] | 
    select(.userId == "USER2_ID") | 
    .metrics.overallMatch'

# Should be high (>0.7 typically)
```

#### Test 6c: Different Genres, Same Ratings
```bash
# User A: Watches Drama (9/10 ratings)
# User B: Watches Action (9/10 ratings)
#
# Debug should show:
# - tasteSimilarity: LOW (different genres)
# - ratingCorrelation: HIGH (same ratings)
# - overallMatch: MEDIUM (combination)
#
# Should PASS if overallMatch > 0.5 ✅
# (OLD BUG would FAIL ❌)
```

---

## Automated Test Commands

### Comprehensive Check Script
```bash
#!/bin/bash

echo "🧪 Testing Twin Tasters Bug Fix..."

# Set your token
TOKEN="your_jwt_token_here"
BASE_URL="http://localhost:3000"

echo ""
echo "1️⃣ Checking API responsiveness..."
curl -s -w "\nHTTP Status: %{http_code}\n" \
  -H "Authorization: Bearer $TOKEN" \
  "$BASE_URL/api/user/similar-users?limit=1" > /dev/null

echo ""
echo "2️⃣ Checking for results..."
RESULTS=$(curl -s -H "Authorization: Bearer $TOKEN" \
  "$BASE_URL/api/user/similar-users?limit=10")

COUNT=$(echo "$RESULTS" | jq '.similarUsers | length')
echo "Found $COUNT similar users"

echo ""
echo "3️⃣ Checking metrics..."
curl -s -H "Authorization: Bearer $TOKEN" \
  "$BASE_URL/api/user/similar-users/debug?limit=5" \
  | jq '.debugInfo.summary'

echo ""
echo "✅ Tests complete!"
```

---

## Debugging Problems

### Problem: Still Shows "No similar users found"

**Debug Steps:**
1. Check debug endpoint (Test 6):
   ```bash
   curl "http://localhost:3000/api/user/similar-users/debug?limit=100"
   ```

2. Look for:
   - ❌ `computationErrors` - if > 0, computation failed
   - ❌ `passedThreshold: 0` but `failedThreshold > 0` - threshold too high
   - ❌ `totalAnalyzed: 0` - not finding candidate users

3. Check Redis cache:
   ```bash
   redis-cli
   > KEYS "*twin*"
   > FLUSHDB  # Clear if suspicious
   ```

4. Check logs:
   ```bash
   tail -f ~/.pm2/logs/next-app-error.log
   # Look for "Error computing similarity"
   ```

---

### Problem: Debug endpoint shows `passed: false` for everyone

**This means overallMatch < 0.5 for all candidates.**

Check if metrics are computing correctly:

```bash
curl "http://localhost:3000/api/user/similar-users/debug?limit=5&details=true" \
  | jq '.debugInfo.candidates[] | .metrics'
```

If all zeros:
```json
{
  "tasteSimilarity": 0,
  "ratingCorrelation": 0,
  "personOverlap": 0,
  "overallMatch": 0
}
```

This indicates **computation error**. Check:
- Prisma connection (can it fetch watchlists?)
- TMDB data (are movie genres loaded?)
- Actor/director data (are they populated?)

---

### Problem: Error 401 Unauthorized

**Solution:**
1. Check token validity:
   ```bash
   # Get token from browser:
   # Open DevTools → Application → Cookies → nextauth.session-token
   ```

2. Pass token correctly:
   ```bash
   curl -H "Authorization: Bearer YOUR_TOKEN" \
     "http://localhost:3000/api/user/similar-users"
   ```

---

## Performance Baseline

**Expected Response Times:**
- First call: 500ms - 2s (computes for 100 candidates)
- Cached call: 10-50ms
- Debug call: 1-3s (more computations)

**If slower:**
- Check database performance: `SELECT COUNT(*) FROM "WatchList"`
- Check Redis connection
- Check TMDB API rate limits

---

## Before/After Comparison

### BEFORE (Bug Present)
```bash
User with 550 movies (300+ watched):
curl "http://localhost:3000/api/user/similar-users"

Response:
{
  "similarUsers": [],
  "message": "No similar users found"  ❌
}
```

### AFTER (Bug Fixed)
```bash
Same user:
curl "http://localhost:3000/api/user/similar-users"

Response:
{
  "similarUsers": [
    { "userId": "...", "overallMatch": 72.3, "watchCount": 145 },
    { "userId": "...", "overallMatch": 68.9, "watchCount": 112 },
    { "userId": "...", "overallMatch": 64.1, "watchCount": 98 }
  ],
  "message": "Found 3 similar user(s)"  ✅
}
```

---

## Verification Checklist

Use this checklist after deploying fix:

- [ ] Web UI shows similar users (not empty)
- [ ] API endpoint returns `"message": "Found X similar user(s)"`
- [ ] Debug shows mix of high and low metrics
- [ ] Debug shows some users with `"passed": true`
- [ ] Cache works (second call faster)
- [ ] No 500 errors in logs
- [ ] No "Error computing similarity" messages
- [ ] Response times within baseline

---

## Rollback Plan

If something goes wrong, revert these files:
```bash
git checkout HEAD -- src/lib/taste-map/similarity.ts
git checkout HEAD -- src/lib/recommendation-algorithms/taste-match.ts
git checkout HEAD -- src/lib/recommendation-algorithms/want-overlap.ts
git checkout HEAD -- src/lib/recommendation-algorithms/drop-patterns.ts

npm run dev
```

Then the system will use `tasteSimilarity > 0.7` again (old bug).

---

## Questions?

Check:
1. [BUG_FIX_SUMMARY.md](./BUG_FIX_SUMMARY.md) - What changed and why
2. [docs/bugs/2026-02-24-similar-users-not-found.md](./docs/bugs/2026-02-24-similar-users-not-found.md) - Full technical details
3. Navigate to `/api/user/similar-users/debug` directly in browser for visual output

---

**Last Updated:** 2026-02-24  
**Status:** Ready for Testing ✅
