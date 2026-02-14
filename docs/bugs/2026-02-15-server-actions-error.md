# Server Actions Error - Invalid Server Actions Request

## Описание
Ошибка `Invalid Server Actions request` возникала на нескольких страницах приложения при использовании динамического импорта Server Actions внутри `useEffect`.

## Симптомы
- Ошибка в консоли: "Invalid Server Actions request"
- Страницы не загружались или работали некорректно
- Затронутые страницы: my-movies, profile/stats, profile/tags, profile/ratings

## Причина
При использовании динамического импорта Server Actions (`await import('./actions')`) внутри `useEffect` в клиентских компонентах, Next.js выдавал ошибку "Invalid Server Actions request".

**Неправильный подход:**
```typescript
useEffect(() => {
  const fetchData = async () => {
    const { getUserGenres } = await import('./actions');
    const genres = await getUserGenres(userId);
    // ...
  };
  fetchData();
}, [userId]);
```

## Решение

### 1. Замена на API вызовы
Вместо Server Actions использовать обычные `fetch` запросы к API эндпоинтам:

```typescript
useEffect(() => {
  const fetchData = async () => {
    const genresRes = await fetch('/api/user/genres?statuses=watched,rewatched&limit=100');
    if (genresRes.ok) {
      const genresData = await genresRes.json();
      setAvailableGenres(genresData.genres || []);
    }
    // ...
  };
  fetchData();
}, [userId]);
```

### 2. Для Server Actions в Server Components
Если Server Action вызывается из серверного компонента (page.tsx), можно импортировать напрямую, так как это происходит на сервере:

```typescript
// В page.tsx (Server Component) - это работает
import { getMoviesCounts } from './actions';
```

### 3. Добавление POST методов в API routes
Для операций, которые требуют изменения данных (update, delete), добавить POST методы в существующие API route файлы:

```typescript
// src/app/api/my-movies/route.ts
export async function POST(request: NextRequest) {
  // Обработка action
}
```

## Затронутые файлы

### Исправлено:
- `src/app/my-movies/page.tsx` - убран импорт Server Action
- `src/app/my-movies/MyMoviesContentClient.tsx` - заменен getUserTags на API вызов
- `src/app/stats/genres/[genre]/GenreDetailClient.tsx` - заменены Server Actions на API
- `src/app/stats/tags/[tagId]/TagDetailClient.tsx` - заменены Server Actions на API
- `src/app/stats/ratings/[rating]/RatingDetailClient.tsx` - заменены Server Actions на API
- `src/app/api/my-movies/route.ts` - добавлен POST метод для updateWatchStatus и getMoviesCounts

### Рекомендации по предотвращению
1. Не использовать динамический импорт Server Actions в клиентских компонентах
2. Всегда использовать API вызовы (`fetch`) из клиентских компонентов
3. Server Actions импортировать только в Server Components или Server Actions файлах
4. Для сложных операций создавать API endpoints с POST методами

## Дата
2026-02-15
