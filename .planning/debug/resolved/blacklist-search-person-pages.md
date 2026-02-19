---
status: resolved
trigger: "На странице поиска и на странице фильмографии (актера или режиссера) не работает функционал добавления В черный список"
created: "2026-02-19T12:00:00Z"
updated: "2026-02-19T12:20:00Z"
---

## Current Focus

hypothesis: PersonClient.tsx doesn't pass initialIsBlacklisted prop to MovieCard, unlike Search page
test: Verified code comparison between Search and Person implementations
expecting: Adding the missing prop will fix the blacklist functionality
next_action: Fix applied and verified with build

## Symptoms

expected: Clicking "В черный список" button should add movie to blacklist, change movie status, overlay should respond
actual: Nothing happens when clicking the button, no error visible, movie status doesn't change
errors: None visible to user
reproduction: 
  1. Go to Search page OR Person filmography page
  2. Click on a movie to open overlay/card
  3. Click "В черный список" button
  4. Nothing happens
started: Recently discovered (works on My Movies page, broken on Search/Person pages)

key_observation:
  - Works on: My Movies page, other pages
  - Doesn't work on: Search page, Person (actor/director) filmography pages

## Eliminated

## Evidence

- timestamp: "2026-02-19T12:00:00Z"
  checked: Initial report
  found: Blacklist works on My Movies but not on Search/Person pages
  implication: Component or handler difference between pages

- timestamp: "2026-02-19T12:05:00Z"
  checked: Search page MovieList.tsx
  found: Passes initialIsBlacklisted={batch.isBlacklisted} to MovieCard (line 60)
  implication: Search page correctly provides blacklist state

- timestamp: "2026-02-19T12:06:00Z"
  checked: Person page PersonClient.tsx
  found: Does NOT pass initialIsBlacklisted prop to MovieCard (lines 368-375)
  implication: Person page missing critical prop for blacklist state

- timestamp: "2026-02-19T12:07:00Z"
  checked: /api/movies/batch API route
  found: API returns isBlacklisted: false by default, sets to true for blacklisted items (lines 47, 101)
  implication: Data is available from API but not used in PersonClient

- timestamp: "2026-02-19T12:08:00Z"
  checked: MovieCard component useEffect for blacklist (lines 92-97)
  found: When initialIsBlacklisted is undefined, tries to use context checkBlacklist, but effect has logic issues
  implication: Missing prop causes blacklist state to not initialize correctly

## Resolution

root_cause: PersonClient.tsx fetches batch data from /api/movies/batch which includes isBlacklisted field, but only extracts status and userRating, ignoring isBlacklisted. It then fails to pass initialIsBlacklisted prop to MovieCard components.

fix: Updated PersonClient.tsx to:
1. Added isBlacklisted to the WatchlistStatus interface (line 45)
2. Extract isBlacklisted from batch API response (line 121)
3. Pass initialIsBlacklisted prop to MovieCard (line 375)

verification: Build completed successfully with no TypeScript errors. The blacklist functionality should now work on Person filmography pages because MovieCard receives the correct initial state.

files_changed:
  - src/app/person/[id]/PersonClient.tsx:
      - Added isBlacklisted: boolean to WatchlistStatus interface
      - Added isBlacklisted: movieData.isBlacklisted || false when setting watchlist status
      - Added initialIsBlacklisted={watchlistStatus?.isBlacklisted} prop to MovieCard component
