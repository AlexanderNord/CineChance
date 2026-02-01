# API Документация CineChance

## Обзор

API CineChance построено на Next.js API Routes и следует RESTful принципам. Все эндпоинты требуют аутентификации (кроме auth).

## Аутентификация

### JWT сессии
- Используется NextAuth.js для управления сессиями
- JWT токены передаются автоматически в cookies
- Максимальный срок действия - 30 дней

### Проверка сессии
```typescript
const session = await getServerAuthSession(authOptions);
if (!session?.user?.id) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
```

## Rate Limiting

Все API эндпоинты защищены rate limiting через Upstash Redis:

```typescript
const { success } = await rateLimit(request, '/api/endpoint');
if (!success) {
  return NextResponse.json({ error: 'Rate limited' }, { status: 429 });
}
```

## Эндпоинты

### Аутентификация `/api/auth/[...nextauth]`

**NextAuth.js автоматический роутер**

Поддерживаемые провайдеры:
- `CredentialsProvider` - email/пароль
- `GoogleProvider` - OAuth (если настроен)

### Пользователи

#### GET `/api/users/me`
Получить информацию о текущем пользователе

**Response:**
```json
{
  "id": "user_id",
  "email": "user@example.com",
  "name": "User Name",
  "image": "avatar_url",
  "birthDate": "1990-01-01",
  "createdAt": "2024-01-01T00:00:00Z"
}
```

### Фильмы и сериалы

#### GET `/api/search`
Поиск фильмов и сериалов через TMDB

**Query Parameters:**
- `query` (string) - поисковый запрос
- `page` (number) - страница результатов (default: 1)

**Response:**
```json
{
  "results": [
    {
      "id": 123,
      "title": "Movie Title",
      "overview": "Description",
      "poster_path": "/poster.jpg",
      "release_date": "2024-01-01",
      "vote_average": 8.5,
      "media_type": "movie"
    }
  ],
  "total_pages": 10,
  "total_results": 200
}
```

#### GET `/api/trending`
Популярные фильмы и сериалы

**Query Parameters:**
- `page` (number) - страница (default: 1)

**Response:** аналогично `/api/search`

### Списки просмотра

#### GET `/api/watchlist`
Получить список фильмов пользователя

**Query Parameters:**
- `status` (string) - фильтр по статусу (`want`|`watched`|`dropped`)
- `page` (number) - страница

**Response:**
```json
{
  "movies": [
    {
      "id": "watchlist_id",
      "tmdbId": 123,
      "title": "Movie Title",
      "status": "watched",
      "userRating": 8,
      "addedAt": "2024-01-01T00:00:00Z",
      "watchedDate": "2024-01-02T00:00:00Z",
      "note": "User note"
    }
  ],
  "total": 25,
  "page": 1
}
```

#### POST `/api/watchlist`
Добавить фильм в список

**Body:**
```json
{
  "tmdbId": 123,
  "mediaType": "movie",
  "title": "Movie Title",
  "status": "want",
  "userRating": 8,
  "note": "Optional note"
}
```

#### PUT `/api/watchlist/[id]`
Обновить запись в списке

**Body:** аналогично POST

#### DELETE `/api/watchlist/[id]`
Удалить фильм из списка

### Рекомендации

#### GET `/api/recommendations`
Получить персональные рекомендации

**Query Parameters:**
- `algorithm` (string) - алгоритм рекомендаций
- `limit` (number) - количество рекомендаций (default: 10)

**Response:**
```json
{
  "recommendations": [
    {
      "tmdbId": 123,
      "title": "Movie Title",
      "score": 0.95,
      "algorithm": "smart_v2",
      "reason": "Based on your interest in similar movies"
    }
  ],
  "algorithm": "smart_v2",
  "generated_at": "2024-01-01T00:00:00Z"
}
```

#### POST `/api/recommendations/feedback`
Обратная связь по рекомендации

**Body:**
```json
{
  "recommendationLogId": "log_id",
  "action": "accepted",
  "feedback": "Great recommendation!"
}
```

### Теги

#### GET `/api/tags`
Получить теги пользователя

**Response:**
```json
{
  "tags": [
    {
      "id": "tag_id",
      "name": "Шедевр",
      "usageCount": 15,
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ]
}
```

#### POST `/api/tags`
Создать новый тег

**Body:**
```json
{
  "name": "Новый тег"
}
```

#### POST `/api/watchlist/[id]/tags`
Добавить тег к фильму

**Body:**
```json
{
  "tagId": "tag_id"
}
```

### Черный список

#### GET `/api/blacklist`
Получить черный список

**Response:**
```json
{
  "blacklist": [
    {
      "id": 1,
      "tmdbId": 123,
      "mediaType": "movie",
      "title": "Movie Title",
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ]
}
```

#### POST `/api/blacklist`
Добавить в черный список

**Body:**
```json
{
  "tmdbId": 123,
  "mediaType": "movie"
}
```

#### DELETE `/api/blacklist/[id]`
Удалить из черного списка

### Админ панель

#### GET `/api/admin/users`
Получить список пользователей (только для админов)

**Response:**
```json
{
  "users": [
    {
      "id": "user_id",
      "email": "user@example.com",
      "name": "User Name",
      "createdAt": "2024-01-01T00:00:00Z",
      "movieCount": 25
    }
  ],
  "total": 100,
  "page": 1
}
```

#### GET `/api/admin/invitations`
Управление приглашениями

#### POST `/api/admin/invitations`
Создать новое приглашение

## Обработка ошибок

### Стандартные HTTP статусы
- `200` - OK
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `429` - Rate Limited
- `500` - Internal Server Error

### Формат ошибок
```json
{
  "error": "Error description",
  "code": "ERROR_CODE",
  "details": {}
}
```

## Валидация данных

### Входные данные
- Все входные данные валидируются
- Используется встроенная валидация Next.js
- Дополнительные проверки в бизнес-логике

### Age Gates
- Контент 18+ фильтруется по дате рождения
- `isUnder18()` утилита для проверки возраста
- Отдельные логики для разных возрастных групп

## Кэширование

### ISR кэширование
- TMDB запросы кэшируются на 1 час
- Теги кэширования: `trending-movies`, `home-page`
- Автоматическая инвалидация кэша

### Redis кэш
- Rate limiting данные
- Временные сессии
- Кэш рекомендаций

## Примеры использования

### Добавление фильма в список
```javascript
const response = await fetch('/api/watchlist', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    tmdbId: 123,
    mediaType: 'movie',
    title: 'Inception',
    status: 'want',
    userRating: 9
  })
});
```

### Поиск фильмов
```javascript
const response = await fetch('/api/search?query=inception&page=1');
const data = await response.json();
```

### Получение рекомендаций
```javascript
const response = await fetch('/api/recommendations?algorithm=smart_v2&limit=10');
const data = await response.json();
```
