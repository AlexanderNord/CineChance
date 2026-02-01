# Руководство по разработке CineChance

## Начало работы

### Требования
- Node.js 18+
- PostgreSQL (рекомендуется Neon)
- Git
- VS Code или Windsurf IDE

### Установка
```bash
# Клонирование репозитория
git clone <repository-url>
cd CineChance

# Установка зависимостей
npm install

# Настройка переменных окружения
cp .env.example .env.local
# Заполните .env.local необходимыми значениями

# Генерация Prisma клиента
npx prisma generate

# Запуск миграций
npx prisma migrate dev

# Запуск сервера разработки
npm run dev
```

## Структура проекта

### Директории
```
src/
├── app/                    # Next.js App Router
│   ├── api/               # API Routes
│   │   ├── auth/          # Аутентификация
│   │   ├── watchlist/     # Управление списками
│   │   ├── recommendations/ # Рекомендации
│   │   ├── search/        # Поиск фильмов
│   │   └── admin/         # Админ функции
│   ├── components/        # Реиспользуемые компоненты
│   ├── [feature]/         # Фичи (my-movies, profile, etc.)
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Главная страница
├── lib/                   # Утилиты и конфигурации
│   ├── prisma.ts         # Prisma клиент
│   ├── tmdb.ts           # TMDB API обертки
│   ├── movieStatus.ts    # Логика статусов
│   └── utils.ts          # Общие утилиты
├── auth.ts               # NextAuth конфигурация
├── middleware/           # Middleware функции
└── hooks/               # React хуки
```

### Ключевые файлы
- `src/app/layout.tsx` - Root layout с провайдерами
- `src/app/page.tsx` - Главная страница
- `src/lib/prisma.ts` - Единственный Prisma клиент
- `src/auth.ts` - NextAuth конфигурация
- `prisma/schema.prisma` - Схема базы данных

## Конвенции кодирования

### TypeScript
- Использовать строгий режим TypeScript
- Предпочитать `interface` для объектов, `type` для примитивов
- Использовать `const assertions` где возможно

```typescript
// Правильно
interface User {
  id: string;
  email: string;
  name?: string;
}

type MovieStatus = 'want' | 'watched' | 'dropped';

const MOVIE_STATUSES = ['want', 'watched', 'dropped'] as const;
```

### React компоненты
```typescript
// Server Component (по умолчанию)
export default function MovieList({ userId }: { userId: string }) {
  const movies = await getMovies(userId);
  return <div>{/* JSX */}</div>;
}

// Client Component (для интерактивности)
'use client';

export default function InteractiveMovieCard({ movie }: { movie: Movie }) {
  const [isLiked, setIsLiked] = useState(false);
  return <div>{/* Interactive JSX */}</div>;
}
```

### API Routes
```typescript
// src/app/api/movies/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import { prisma } from '@/lib/prisma';
import { rateLimit } from '@/middleware/rateLimit';

export async function GET(request: Request) {
  // Rate limiting
  const { success } = await rateLimit(request, '/api/movies');
  if (!success) {
    return NextResponse.json({ error: 'Rate limited' }, { status: 429 });
  }

  // Аутентификация
  const session = await getServerAuthSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const movies = await prisma.watchList.findMany({
      where: { userId: session.user.id },
      include: { movie: true }
    });

    return NextResponse.json(movies);
  } catch (error) {
    console.error('Error fetching movies:', error);
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
}
```

## Работа с базой данных

### Prisma лучшие практики
```typescript
// Всегда импортировать singleton
import { prisma } from '@/lib/prisma';

// Использовать транзакции для сложных операций
const result = await prisma.$transaction(async (tx) => {
  const user = await tx.user.create({ data: userData });
  const watchlist = await tx.watchList.create({ 
    data: { userId: user.id, ...watchlistData } 
  });
  return { user, watchlist };
});

// Оптимизированные запросы
const movies = await prisma.watchList.findMany({
  where: { userId: session.user.id },
  select: {
    id: true,
    tmdbId: true,
    status: true,
    userRating: true,
    movie: {
      select: {
        title: true,
        posterPath: true,
        voteAverage: true
      }
    }
  },
  orderBy: { addedAt: 'desc' }
});
```

### Миграции
```bash
# Создать новую миграцию
npx prisma migrate dev --name add_movie_ratings

# Применить миграции в production
npx prisma migrate deploy

# Сбросить базу (только для разработки!)
npx prisma migrate reset
```

## Аутентификация

### NextAuth конфигурация
```typescript
// src/auth.ts
import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email }
        });

        if (!user || !user.hashedPassword) {
          return null;
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.hashedPassword
        );

        if (!isPasswordValid) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name
        };
      }
    })
  ],
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 дней
  },
  // ... остальная конфигурация
};
```

### Проверка сессии
```typescript
// Server Components
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';

export default async function ProfilePage() {
  const session = await getServerAuthSession(authOptions);
  
  if (!session?.user) {
    redirect('/login');
  }
  
  // ... остальной код
}

// API Routes
const session = await getServerAuthSession(authOptions);
if (!session?.user?.id) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
```

## Работа с внешними API

### TMDB интеграция
```typescript
// src/lib/tmdb.ts
export async function fetchTrendingMovies(page = 1) {
  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) {
    console.warn('TMDB API key not found');
    return { results: [], page: 1, total_pages: 0 };
  }

  try {
    const response = await fetch(
      `https://api.themoviedb.org/3/trending/movie/week?page=${page}`,
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
        next: { revalidate: 3600, tags: ['trending-movies'] } // ISR кэш
      }
    );

    if (!response.ok) {
      throw new Error(`TMDB API error: ${response.status}`);
    }

    return response.json();
  } catch (error) {
    console.error('Error fetching trending movies:', error);
    return { results: [], page: 1, total_pages: 0 };
  }
}
```

## Стилизация

### TailwindCSS лучшие практики
```typescript
// Использовать утилитарные классы
<div className="flex flex-col gap-4 p-6 bg-gray-900 text-white rounded-lg">

// Для сложных компонентов использовать CSS модули
import styles from './MovieCard.module.css';

<div className={styles.movieCard}>
```

### Темы и цвета
```typescript
// tailwind.config.ts
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: '#e50914',      // Netflix red
        dark: {
          900: '#141414',       // Основной фон
          800: '#1f1f1f',       // Карточки
        }
      }
    }
  }
}
```

## Тестирование

### Unit тесты
```typescript
// __tests__/utils.test.ts
import { calculateRecommendationScore } from '@/lib/utils';

describe('calculateRecommendationScore', () => {
  it('should return correct score for valid inputs', () => {
    const result = calculateRecommendationScore({
      userRating: 8,
      tmdbRating: 7.5,
      popularity: 0.8
    });
    
    expect(result).toBeGreaterThan(0);
    expect(result).toBeLessThanOrEqual(1);
  });
});
```

### Интеграционные тесты
```typescript
// __tests__/api/watchlist.test.ts
import { GET } from '@/app/api/watchlist/route';
import { createMockRequest } from '@/test/utils';

describe('/api/watchlist', () => {
  it('should return user watchlist', async () => {
    const request = createMockRequest({
      method: 'GET',
      user: { id: 'test-user-id' }
    });
    
    const response = await GET(request);
    const data = await response.json();
    
    expect(response.status).toBe(200);
    expect(Array.isArray(data.movies)).toBe(true);
  });
});
```

## Производительность

### Оптимизация изображений
```typescript
import Image from 'next/image';

<Image
  src={movie.posterPath}
  alt={movie.title}
  width={300}
  height={450}
  className="object-cover"
  loading="lazy"
  placeholder="blur"
  blurDataURL="data:image/jpeg;base64,..."
/>
```

### Кэширование
```typescript
// ISR кэширование для статичных страниц
export const revalidate = 3600; // 1 час

// Динамическое кэширование
export async function generateStaticParams() {
  const movies = await getPopularMovies();
  return movies.map(movie => ({ id: movie.id.toString() }));
}
```

### Ленивая загрузка
```typescript
// Компоненты с ленивой загрузкой
import dynamic from 'next/dynamic';

const HeavyComponent = dynamic(() => import('./HeavyComponent'), {
  loading: () => <div>Loading...</div>,
  ssr: false
});
```

## Деплой

### Vercel деплой
```bash
# Сборка для production
npm run build

# Локальный тест production
npm run start

# Деплой на Vercel
vercel --prod
```

### Переменные окружения
```bash
# .env.local (для разработки)
DATABASE_URL="postgresql://..."
NEXTAUTH_SECRET="your-secret-here"
NEXTAUTH_URL="http://localhost:3000"
TMDB_API_KEY="your-tmdb-key"

# Vercel Environment Variables
# DATABASE_URL
# NEXTAUTH_SECRET
# NEXTAUTH_URL
# TMDB_API_KEY
```

## Отладка

### Логирование
```typescript
// Структурированное логирование
console.log('User action:', {
  userId: session.user.id,
  action: 'add_to_watchlist',
  movieId: movie.id,
  timestamp: new Date().toISOString()
});

// Error handling
try {
  const result = await someOperation();
  return result;
} catch (error) {
  console.error('Operation failed:', {
    error: error.message,
    stack: error.stack,
    userId: session?.user?.id,
    operation: 'someOperation'
  });
  throw error;
}
```

### Профилирование
```typescript
// Измерение производительности
console.time('database-query');
const movies = await prisma.watchList.findMany({ ... });
console.timeEnd('database-query');

// React DevTools Profiler
<Profiler id="MovieList" onRender={(id, phase, actualDuration) => {
  console.log(`${id} ${phase} took ${actualDuration}ms`);
}}>
  <MovieList movies={movies} />
</Profiler>
```

## Git workflow

### Branch naming
```bash
feature/user-authentication
bugfix/movie-rating-validation
refactor/database-optimization
hotfix/security-patch
```

### Commit сообщения
```bash
feat: add user authentication system
fix: resolve movie rating validation error
docs: update API documentation
refactor: optimize database queries
test: add unit tests for recommendation engine
```

### Pull Request шаблон
```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Manual testing completed

## Checklist
- [ ] Code follows project style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
```

## Полезные ресурсы

### Документация
- [Next.js Documentation](https://nextjs.org/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [NextAuth.js Guide](https://next-auth.js.org)
- [TailwindCSS Docs](https://tailwindcss.com/docs)

### Инструменты
- [Prisma Studio](https://www.prisma.io/studio) - GUI для базы данных
- [React DevTools](https://react.dev/learn/react-developer-tools) - отладка React
- [Vercel Analytics](https://vercel.com/analytics) - аналитика производительности

### Сообщество
- [Next.js GitHub](https://github.com/vercel/next.js)
- [Prisma Discord](https://discord.gg/prisma)
- [Stack Overflow](https://stackoverflow.com/questions/tagged/next.js)
