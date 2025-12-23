```md
# Copilot / AI-инструкции для проекта CineChance

Коротко и по делу — что важно знать, чтобы быстро вносить изменения в этот репозиторием.

- **Архитектура:** Next.js (app router) + React (TypeScript). Серверные и клиентские части находятся в `src/app/` — используются Server Components и Route Handlers. БД — Postgres с Prisma (Neon adapter).

- **Ключевые файлы и точки входа:**
  - `src/app/layout.tsx`, `src/app/page.tsx` — основной UI и провайдеры.
  - `src/app/api/` — Route Handlers (создавайте `route.ts` и экспортируйте `GET/POST`). Пример: `src/app/api/auth/[...nextauth]/route.ts`.
  - `src/lib/prisma.ts` — единый экспорт `prisma`; импортируйте его всегда отсюда.
  - `src/auth.ts` — конфигурация `authOptions` для NextAuth и helper `getServerAuthSession()`.
  - `src/lib/tmdb.ts` — TMDB helper (проверка `TMDB_API_KEY`, обработка ошибок).
  - `prisma/schema.prisma` и `prisma/migrations/` — схема и миграции.

- **Запуск и основные команды:**
  - `npm run dev` — запуск в dev режиме (Next).
  - `npm run build` — сборка.
  - `npm run start` — запуск продакшн.
  - `postinstall` выполняет `prisma generate` (см. `package.json`).

- **Обязательные переменные окружения:**
  - `DATABASE_URL` (Neon / Postgres)
  - `NEXTAUTH_SECRET`
  - `NEXTAUTH_URL`
  - `TMDB_API_KEY`

- **Prisma / миграции:**
  - Не создавайте новые `PrismaClient` — импортируйте `prisma` из `src/lib/prisma.ts`.
  - Миграции находятся в `prisma/migrations/`. Для локальной разработки используйте `npx prisma migrate dev`, в проде — `npx prisma migrate deploy`.

- **Аутентификация:**
  - NextAuth настроен в `src/auth.ts` (CredentialsProvider). Пароли — в `User.hashedPassword`, сравнение — `bcryptjs`.
  - Route handler: `src/app/api/auth/[...nextauth]/route.ts`.
  - Для серверной сессии используйте `getServerAuthSession()`.

- **TMDB и внешние API:**
  - Используйте `src/lib/tmdb.ts` (функции `searchMedia`, `fetchTrendingMovies` и т.п.). Проверяйте обёртку и обработку ошибок, особенно когда `TMDB_API_KEY` отсутствует.

- **Кодовые паттерны для ИИ-агентов:**
  - По умолчанию файлы в `src/app/` — Server Components. Для client components добавляйте `'use client'` вверху файла.
  - API: Route Handlers (`route.ts`) экспортируют методы (`GET`, `POST`).
  - Повторное использование общих клиентов/хелперов — через `src/lib/*`.

- **Частые изменения — где править:**
  - Добавить API-эндпоинт: `src/app/api/<path>/route.ts` → импорт `prisma` из `src/lib/prisma.ts` → валидация входа (например, `zod`) → вернуть json/статус.
  - Интеграция с TMDB: добавить/переиспользовать функции в `src/lib/tmdb.ts`.
  - Работа с пользователем/сессией: `getServerAuthSession()` / `src/auth.ts`.

- **Отладка и рекомендации:**
  - Логи в `npm run dev` видны в терминале.
  - После изменений в `prisma/schema.prisma` запустите `npx prisma generate` и/или `npx prisma migrate dev`.

Если нужно, добавлю секции про CI, deploy или конкретные примеры изменений. Оставьте список желаемых примеров — быстро допишу.

```
