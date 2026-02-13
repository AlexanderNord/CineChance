# Исправление статистики профиля

**Дата:** 13 февраля 2026  
**Проблема:** Неверный расчёт статистики на странице профиля после оптимизации кэширования  
**Статус:** Исправлена

## Проблема 1: Средняя оценка

После внедрения Redis-кэширования для API `/api/user/stats` средняя оценка отображалась неверно. Причина - в запросе Prisma отсутствовала фильтрация по статусам.

### Решение

Добавлена корректная фильтрация по статусам:

```typescript
// Средняя оценка - для всех статусов с оценкой
const avgRatingResult = await prisma.watchList.aggregate({
  where: {
    userId,
    statusId: { in: [MOVIE_STATUS_IDS.WATCHED, MOVIE_STATUS_IDS.REWATCHED, MOVIE_STATUS_IDS.DROPPED] },
    userRating: { not: null },
  },
  // ...
});
```

## Проблема 2: Распределение оценок

Бары с количеством фильмов по оценкам не учитывали статус "Брошено".

### Решение

Добавлен DROPPED в запрос groupBy:

```typescript
// Распределение оценок - для всех статусов с оценкой
const ratingGroups = await prisma.watchList.groupBy({
  by: ['userRating'],
  where: {
    userId,
    statusId: { in: [MOVIE_STATUS_IDS.WATCHED, MOVIE_STATUS_IDS.REWATCHED, MOVIE_STATUS_IDS.DROPPED] },
    userRating: { not: null },
  },
  // ...
});
```

## Измененные файлы

### `src/app/api/user/stats/route.ts`
- Исправлен запрос средней оценки - добавлена фильтрация по статусам
- Средняя оценка теперь считается для всех фильмов с оценкой (WATCHED, REWATCHED, DROPPED)

### `src/lib/redis.ts`
- Добавлено логирование для диагностики кэширования
- Используется SCAN вместо KEYS для инвалидации (надежнее для больших数据集)

### `src/app/api/watchlist/route.ts`
- Добавлена автоматическая инвалидация кэша при изменении watchlist

### `src/app/api/admin/clear-cache/route.ts` (новый)
- API для очистки кэша профиля пользователей

## Кэширование профиля

| API Endpoint | TTL | Описание |
|--------------|-----|---------|
| `/api/user/stats` | 1 час | Статистика пользователя |
| `/api/user/achiev_collection` | 1 час | Коллекции (франшизы) |
| `/api/user/achiev_actors` | 1 час | Любимые актеры |
| `/api/user/tag-usage` | 30 мин | Теги пользователя |
| `/api/user/genres` | 30 мин | Жанры пользователя |

## Очистка кэша

Кэш автоматически очищается при:
- Изменении статуса фильма
- Добавлении/удалении фильма
- Изменении оценки

Ручная очистка:
```bash
curl -X POST http://localhost:3000/api/admin/clear-cache \
  -H "Content-Type: application/json" \
  -d '{"secret": "dev-secret"}'
```

## Предотвращение

При добавлении новых данных в кэш:
1. Всегда проверять логику расчёта
2. Добавлять тестовые случаи
3. Проверять на реальных данных после деплоя
