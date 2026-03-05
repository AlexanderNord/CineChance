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

## Критические файлы
- prisma/schema.prisma — 20+ моделей, композитные ключи
- src/lib/prisma.ts — singleton PrismaClient
- src/auth.ts — NextAuth конфигурация
- src/middleware/rateLimit.ts — rate limiting архитектура

## Известные риски
- TypeScript: strict: false, noImplicitAny: false — потенциальные runtime errors
- ESLint: no-unused-vars: off, no-explicit-any: off — грязный код
- next.config.ts: ignoreBuildErrors: true — скрывает реальные проблемы
- Тестовое покрытие: только 74 теста, нет интеграционных
- Смешение русского/английского в статусах ('Хочу посмотреть')

## Зависимости и интеграции
- Frontend: Next.js 16 → React 19 → Tailwind CSS 4
- Backend: PostgreSQL (Neon) → Prisma 7.2 → NextAuth 4.24
- ML: 7 алгоритмов рекомендаций в src/lib/recommendation-algorithms/
- Кэширование: Upstash Redis + TMDB ISR
- Auth flow: User → Session → WatchList → RatingHistory → RecommendationLog

## Решения и почему
- [2026-03-05] GSD + TDD интеграция — для качественного test-driven development
- Vitest выбран как test runner — нативный ESM, быстрый watch-режим

## Типы и интерфейсы
- Movie, TVShow, Person — TMDB типы
- WatchList, RatingHistory, RecommendationLog — DB модели
- AlgorithmExperiment — A/B тесты алгоритмов
- PredictionOutcome — ML feedback loop

## История фаз
- v3.0: Интеграция GSD + TDD с модельной стратификацией
- v3.1: Добавлена живая карта проекта knowledge.md
- v3.3: Переход на структуру .planning/, обновлены агенты и протокол
