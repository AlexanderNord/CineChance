# Bug Fix: Пагинация отсутствует на страницах подробной статистики

## Описание
На страницах подробной статистики (`/stats/genres/[genre]`, `/stats/ratings/[rating]`, `/stats/tags/[tagId]`) полностью отсутствовала пагинация после предыдущих попыток исправить баг с дублированием фильмов.

## Root Cause

После предыдущего исправления (добавление `id` в orderBy) в файлах статистики осталась сломана логика пагинации:

1. **`take = limit`** — не позволял определить есть ли еще данные (нужно запрашивать на 1 больше)
2. **Неправильный `hasMore`** — вычислялся на основе отфильтрованных данных, а не количества полученных записей из БД
3. **Отсутствие secondary sort по id** в JavaScript сортировке — приводило к неконсистентному порядку

## Решение

### 1. Исправлена логика пагинации
```typescript
// Было:
const take = limit;

// Стало:
const take = limit + 1; // Запрашиваем на 1 больше для проверки hasMore
```

### 2. Исправлен hasMore
```typescript
// Было (неправильно):
const pageStartIndex = (page - 1) * limit;
const pageEndIndex = pageStartIndex + limit;
const hasMore = sorted.length > pageEndIndex;

// Стало (правильно):
const paginatedMovies = sorted.slice(0, limit);
const hasMore = watchListRecords.length > limit;
```

### 3. Добавлен secondary sort по id в JavaScript сортировке
```typescript
// Добавлено во все файлы:
if (comparison === 0) {
  comparison = a.id - b.id; // или a.record.id - b.record.id
}
```

## Исправленные файлы

1. **`src/app/api/stats/movies-by-genre/route.ts`**
   - Исправлена логика пагинации (take = limit + 1)
   - Исправлен hasMore calculation
   - Добавлен secondary sort по id в applySorting()

2. **`src/app/api/stats/movies-by-rating/route.ts`**
   - Исправлена логика пагинации
   - Исправлен hasMore calculation
   - Добавлен secondary sort по id в сортировке

3. **`src/app/api/stats/movies-by-tag/route.ts`**
   - Исправлена логика пагинации
   - Исправлен hasMore calculation
   - Добавлен secondary sort по id в сортировке

## Логика работы

Теперь логика полностью соответствует странице "Мои фильмы":
- Первая страница загружает 20 фильмов
- При скролле подгружается еще по 20 фильмов
- hasMore определяется по количеству полученных записей из БД (если > limit, значит есть еще)
- Все фильтры работают корректно

## Status
✅ ИСПРАВЛЕНО

## Prevention
При работе с пагинацией всегда использовать паттерн:
```typescript
const skip = (page - 1) * limit;
const take = limit + 1; // +1 для проверки hasMore

// ... запрос к БД ...

const hasMore = records.length > limit;
```
