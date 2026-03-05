# knowledge.md
# Живая карта проекта — обновляется автоматически после каждого /gsd-research
# НЕ редактировать вручную без необходимости

## Архитектурные паттерны
- Server Components по умолчанию, 'use client' только для интерактивных компонентов
- Централизованное логирование через @/lib/logger
- Rate limiting на каждом API endpoint через middleware
- ISR кэширование TMDB (1 час)
- Upsert паттерн для Prisma операций с композитными ключами
- Background tasks через after() в API routes
- Prisma.Json type usage with explicit casting (`as unknown as T[]`) for arrays
- Map/Set iteration requires ES2015+ target (cannot downlevel to ES5 without downlevelIteration flag)

## Критические файлы
- prisma/schema.prisma — 20+ моделей, композитные ключи
- src/lib/prisma.ts — singleton PrismaClient
- src/auth.ts — NextAuth конфигурация
- src/middleware/rateLimit.ts — rate limiting архитектура
- src/lib/taste-map/person-profile-v2.ts — Prisma.Json casting issues, requires strict type handling
- src/lib/taste-map/compute.ts — Map iteration (fixed by target es2017)
- src/lib/taste-map/similarity.ts — Set iteration + incomplete RatingMatchPatterns type
- vitest.config.ts — coverage config incompatible with Vitest 4 (moved under test namespace needed)

## Известные риски
- TypeScript: strict: false, noImplicitAny: false — потенциальные runtime errors (13 current errors, ~200 after enabling strict)
- ESLint: no-unused-vars: off, no-explicit-any: off — грязный код (194 any usages)
- next.config.ts: ignoreBuildErrors: true — скрывает реальные проблемы
- Тестовое покрытие: только 74 теста, нет интеграционных
- Смешение русского/английского в статусах ('Хочу посмотреть')
- Vitest 4: coverage config at root invalid — will cause type error after strict mode
- Prisma.Json type: Need careful casting with `as unknown as T[]` for array storage
- Any elimination: major refactoring (~15 hours) but required for production quality

## Зависимости и интеграции
- Frontend: Next.js 16 → React 19 → Tailwind CSS 4
- Backend: PostgreSQL (Neon) → Prisma 7.2 → NextAuth 4.24
- ML: 7 алгоритмов рекомендаций в src/lib/recommendation-algorithms/
- Кэширование: Upstash Redis + TMDB ISR
- Auth flow: User → Session → WatchList → RatingHistory → RecommendationLog

## Решения и почему
- [2026-03-05] GSD + TDD интеграция — для качественного test-driven development
- Vitest выбран как test runner — нативный ESM, быстрый watch-режим
- ES2017 target:required for Map/Set iteration without downlevelIteration; also modern JS features
- Prisma.Json casting: use `as unknown as T[]` pattern for arrays; Prisma doesn't infer array types from Json
- ActorData/DirectorData: reuse PersonData from person-profile-v2.ts or create type aliases
- RatingMatchPatterns: extend with all required properties (largeDifference, avgRatingDifference, etc.)
- Collection route: capture route param in outer scope to use in catch block

## Типы и интерфейсы
- Movie, TVShow, Person — TMDB типы (implicit any currently, to be defined)
- WatchList, RatingHistory, RecommendationLog — DB модели
- AlgorithmExperiment — A/B тесты алгоритмов
- PredictionOutcome — ML feedback loop
- PersonData (person-profile-v2.ts): { tmdbPersonId: number; name: string; count: number; avgWeightedRating: number }
- ActorData, DirectorData: alias or extend PersonData (needed for TasteMapClient)
- RatingMatchPatterns (similarity.ts): { perfectMatches, closeMatches, moderateMatches, sameCategory, differentIntensity, avgRatingUser1, avgRatingUser2, intensityMatch, pearsonCorrelation, totalSharedMovies, largeDifference, avgRatingDifference, positiveRatingsPercentage, bothRewatchedCount, overallMovieMatch }
- TMDbMovie, TMDbPerson: to be defined for external API typing
- RecommendationContext, RecommendationSession, RecommendationItem: from recommendation-algorithms/types.ts

## История фаз
- v3.0: Интеграция GSD + TDD с модельной стратификацией
- v3.1: Добавлена живая карта проекта knowledge.md
- v3.3: Переход на структуру .planning/, обновлены агенты и протокол
