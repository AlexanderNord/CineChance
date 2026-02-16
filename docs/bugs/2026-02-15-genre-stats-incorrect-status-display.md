# 2026-02-15-genre-stats-incorrect-status-display

## Описание проблемы

На страницах подробной статистики (по жанрам, тегам, рейтингам) все фильмы отображались как "Просмотренные", независимо от их реального статуса:
- Фильмы со статусом "Пересмотрено" показывали иконку "Просмотрено"
- Фильмы со статусом "Брошено" показывали иконку "Просмотрено"

## Причина

1. **API не возвращали statusId/statusName** - в файлах `movies-by-genre`, `movies-by-tag`, `movies-by-rating` данные о статусе фильма не передавались в ответе
2. **Клиентские компоненты не передавали getInitialStatus** - компоненты GenreDetailClient, TagDetailClient, RatingDetailClient не передавали функцию `getInitialStatus` в FilmGridWithFilters

## Решение

1. **Обновлены API** (`src/app/api/stats/movies-by-genre/route.ts`, `movies-by-tag/route.ts`, `movies-by-rating/route.ts`):
   - Добавлен `statusId` в выборку Prisma
   - Добавлен `statusName` в ответ API (через `getStatusNameById`)

2. **Обновлены клиентские компоненты**:
   - `src/app/stats/genres/[genre]/GenreDetailClient.tsx`
   - `src/app/stats/tags/[tagId]/TagDetailClient.tsx`
   - `src/app/stats/ratings/[rating]/RatingDetailClient.tsx`
   
   Добавлена функция `getInitialStatus`:
   ```typescript
   getInitialStatus={(movie) => {
     const statusName = (movie as any).statusName;
     if (statusName === 'Пересмотрено') return 'rewatched';
     if (statusName === 'Просмотрено') return 'watched';
     if (statusName === 'Хочу посмотреть') return 'want';
     if (statusName === 'Брошено') return 'dropped';
     return 'watched';
   }}
   ```

## Предотвращение

- Все страницы статистики теперь корректно отображают статус фильма
- Аналогичная проблема была ранее исправлена на странице "Мои фильмы" (2026-02-13-my-movies-incorrect-status-display)
