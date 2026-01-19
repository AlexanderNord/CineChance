# Copilot / AI-инструкции для проекта CineChance

**CineChance** — кинотрекер на Next.js 16+ с персонализированными рекомендациями, интеграцией TMDB и рейтинговой системой.

## Архитектура (Big Picture)

- **Tech stack:** Next.js 16 (App Router) + React 19 + TypeScript + Tailwind CSS
- **Database:** PostgreSQL (Neon) + Prisma 7.2 (адаптер `@prisma/adapter-neon`)
- **Auth:** NextAuth 4.24 с CredentialsProvider (JWT стратегия, макс 30 дней)
- **Внешние API:** TMDB (поиск/тренды с ISR кэшированием 1 час), Upstash Redis (rate limiting)
- **Структура кода:** Server Components по умолчанию; клиентские компоненты помечаются `'use client'` на вершине файла

## Ключевые файлы и точки входа

| Файл | Назначение |
|------|-----------|
| `src/app/layout.tsx` | Root layout с React Query провайдером (LayoutClient) |
| `src/app/page.tsx` | Главная страница, использует Server Components для данных |
| `src/app/api/*/route.ts` | Route Handlers (экспортируйте `GET`, `POST`, `DELETE` и т.п.) |
| `src/lib/prisma.ts` | **Единственный** Prisma singleton (Neon адаптер) |
| `src/auth.ts` | NextAuth конфиг, `authOptions`, `getServerAuthSession()` |
| `src/lib/tmdb.ts` | TMDB обёртки: `fetchTrendingMovies()`, `searchMedia()` и др. |
| `prisma/schema.prisma` | Данные модели: User, WatchList, RecommendationLog, Invitation и т.п. |
| `src/lib/movieStatus.ts` | Логика статусов контента (want/watched/dropped) |
| `src/middleware/rateLimit.ts` | Rate limiting для API через Upstash Redis |

## Обязательные переменные окружения

```
DATABASE_URL=postgresql://...       # Neon PostgreSQL
NEXTAUTH_SECRET=<random-32-chars>   # JWT signing key (обязателен!)
NEXTAUTH_URL=http://localhost:3000  # Для локальной разработки
TMDB_API_KEY=...                    # TMDB v3 API key (может отсутствовать в dev)
```

## Критические конвенции кодирования

1. **Prisma**: Всегда `import { prisma } from '@/lib/prisma'` — никогда не создавайте новый `PrismaClient()`
2. **Auth**: Проверяйте сессию в Route Handlers через `const session = await getServerAuthSession(authOptions)`
3. **API эндпоинты**: 
   - Возвращают `NextResponse.json()` или `NextResponse(..., { status: 401 })`
   - Применяют rate limiting: `const { success } = await rateLimit(request, '/api/path')`
   - Проверяют возраст через `isUnder18()` для adult контента в `src/app/api/search/route.ts`
4. **TMDB**: Вызовы в `src/lib/tmdb.ts`, используют ISR кэширование (теги: `trending-movies`, `home-page`), код обрабатывает отсутствие `TMDB_API_KEY`
5. **Компоненты**: Server Components хранят логику (поиск, фильтрация, БД запросы), малые клиентские компоненты только для интерактивности

## Основные модели данных

- **User**: `id`, `email`, `hashedPassword` (bcryptjs), `birthDate` (для age-gating), `agreedToTerms`, `recommendationStats`, `preferencesSnapshot`
- **WatchList**: статусы фильмов (want/watched/dropped), оценки, метаданные
- **RecommendationLog**: источник правды о взаимодействиях с рекомендациями
- **Tag**: пользовательские теги для фильмов
- **RatingHistory**: история оценок
- **Invitation**: система приглашений с токенами и сроком действия

## Быстрый старт: добавление функциональности

**Пример нового Route Handler:**

```typescript
// src/app/api/my-feature/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import { prisma } from '@/lib/prisma';
import { rateLimit } from '@/middleware/rateLimit';

export async function GET(request: Request) {
  const { success } = await rateLimit(request, '/api/my-feature');
  if (!success) {
    return NextResponse.json({ error: 'Rate limited' }, { status: 429 });
  }

  const session = await getServerAuthSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = await prisma.user.findUnique({ 
    where: { id: session.user.id },
    include: { watchList: true }
  });

  return NextResponse.json(user);
}
```

## Рабочие команды

```bash
npm run dev              # Next.js dev сервер (port 3000)
npm run build            # Production build
npm run start            # Запуск production сервера
npm run seed             # Seeding БД (ts-node prisma/seed.ts)
npm run lint             # ESLint проверка

# Prisma команды (важно!)
npx prisma generate     # После изменения schema.prisma (выполняется в postinstall)
npx prisma migrate dev --name <name>  # Создать локальную миграцию
npx prisma db push      # Применить schema без создания миграции (dev только!)
```

## Интеграции и критические потоки

### TMDB интеграция
- Все вызовы в `src/lib/tmdb.ts` с централизованной обработкой ошибок
- ISR кэширование 1 час для trending/popular фильмов
- Код ожидает `TMDB_API_KEY` может отсутствовать — обработайте gracefully

### Auth flow
- `src/app/api/auth/[...nextauth]/` ← Next.js auto-route для NextAuth
- `src/auth.ts` ← конфиг с CredentialsProvider, JWT callbacks
- Пароли: `bcryptjs.hash()` при регистрации, `bcryptjs.compare()` при логине
- Сессия: `getServerAuthSession()` в Server Components/Route Handlers

### Rate limiting
- `src/middleware/rateLimit.ts` использует Upstash Redis
- Вызывайте в начале Route Handlers: `const { success } = await rateLimit(request, '/api/path')`
- Возвращайте `{ status: 429 }` если rate limited

### Watchlist / статусы фильмов
- `src/lib/movieStatus.ts` текущая логика статусов
- `src/app/api/watchlist/` обработка add/remove/update

## Практические рекомендации для AI-агентов

- **Server-side logic:** Route Handlers в `src/app/api/` для всех серверных операций
- **UI changes:** Следуйте структуре компонентов в `src/app/components/` и `src/app/[feature]/page.tsx`
- **Переиспользование:** Проверьте `src/lib/*` на наличие общих функций перед созданием новых утилит
- **DB changes:** Обновите `prisma/schema.prisma` → `npx prisma generate` → `npx prisma migrate dev --name desc`
- **New features:** Смотрите на примеры в `src/app/api/search/route.ts` для структуры error handling + auth checks
