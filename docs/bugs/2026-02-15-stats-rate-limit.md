# Bug: Rate limit в статистических API использовал IP вместо userId

## Дата
2026-02-15

## Описание
При пагинации на страницах детальной статистики (жанры, рейтинги, теги) возникала ошибка 429 "Rate limited", в то время как страница "Мои фильмы" работала корректно.

## Причина
В статистических API (`/api/stats/movies-by-genre`, `/api/stats/movies-by-rating`, `/api/stats/movies-by-tag`) функция `rateLimit` вызывалась **до** получения `session.user.id`:

```typescript
// БЫЛО - неправильно
const { success } = await rateLimit(request, '/api/stats/movies-by-genre'); // без userId
const session = await getServerSession(authOptions);
const userId = session.user.id;
```

Из-за этого:
- Rate limit использовал `ip:${ip}` вместо `user:${userId}`
- Все пользователи за одним NAT (провайдер, корпоративная сеть)共用同一个 лимит
- При пагинации запросы к TMDB накапливались и быстро достигали лимита

## Решение
Изменён порядок: сначала получаем session и userId, затем вызываем rateLimit с userId:

```typescript
// СТАЛО - правильно
const session = await getServerSession(authOptions);
const userId = session.user.id;
const { success } = await rateLimit(request, '/api/stats', userId); // с userId
```

## Затронутые файлы
- `src/app/api/stats/movies-by-genre/route.ts`
- `src/app/api/stats/movies-by-rating/route.ts`
- `src/app/api/stats/movies-by-tag/route.ts`

## Предотвращение
Все API эндпоинты должны использовать userId для rate limiting, а не IP, чтобы:
- Каждый пользователь имел персональный лимит
- Избежать проблем с NAT/провайдерами
