# Деплой CineChance

## Обзор

CineChance спроектирован для деплоя на serverless платформах с автоматическим масштабированием. Основная платформа деплоя - Vercel, но также поддерживаются другие варианты.

## Vercel деплой (рекомендуется)

### Подготовка

#### 1. Настройка переменных окружения
```bash
# В Vercel Dashboard → Settings → Environment Variables
DATABASE_URL=postgresql://...
NEXTAUTH_SECRET=<random-32-chars>
NEXTAUTH_URL=https://your-domain.vercel.app
TMDB_API_KEY=your-tmdb-key
REDIS_REST_URL=your-upstash-redis-url
REDIS_REST_TOKEN=your-upstash-token
```

#### 2. Настройка домена
```bash
# В Vercel Dashboard → Domains
# Добавьте ваш домен и настройте DNS записи
```

### Деплой процесса

#### Автоматический деплой через GitHub
```yaml
# .github/workflows/vercel.yml
name: Deploy to Vercel

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Run tests
        run: npm test
        
      - name: Build application
        run: npm run build
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
          NEXTAUTH_SECRET: ${{ secrets.NEXTAUTH_SECRET }}
          
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.ORG_ID }}
          vercel-project-id: ${{ secrets.PROJECT_ID }}
          vercel-args: '--prod'
```

#### Ручной деплой
```bash
# Установка Vercel CLI
npm i -g vercel

# Логин в Vercel
vercel login

# Деплой проекта
vercel --prod

# Деплой с кастомным доменом
vercel --prod --name=cinechance
```

### Конфигурация Vercel

#### vercel.json
```json
{
  "version": 2,
  "builds": [
    {
      "src": "package.json",
      "use": "@vercel/next"
    }
  ],
  "env": {
    "NEXTAUTH_URL": {
      "value": "@nextauth_url"
    }
  },
  "functions": {
    "src/app/api/**/*.ts": {
      "maxDuration": 30
    }
  },
  "headers": [
    {
      "source": "/api/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "no-store, must-revalidate"
        }
      ]
    }
  ]
}
```

## Альтернативные платформы

### Netlify

#### Настройка
```bash
# Установка Netlify CLI
npm install -g netlify-cli

# Логин
netlify login

# Деплой
netlify deploy --prod
```

#### netlify.toml
```toml
[build]
  command = "npm run build"
  publish = ".next"

[build.environment]
  NEXT_TELEMETRY_DISABLED = "1"
  NODE_VERSION = "18"

[[redirects]]
  from = "/api/*"
  to = "/.netlify/functions/:splat"
  status = 200

[[headers]]
  for = "/api/*"
  [headers.values]
    Cache-Control = "no-store, must-revalidate"
```

### Railway

#### railway.json
```json
{
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "npm start",
    "healthcheckPath": "/api/health"
  }
}
```

#### Dockerfile
```dockerfile
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --only=production

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT 3000

CMD ["node", "server.js"]
```

### AWS Amplify

#### amplify.yml
```yaml
version: 1
frontend:
  phases:
    preBuild:
      commands:
        - npm ci
    build:
      commands:
        - npm run build
  artifacts:
    baseDirectory: .next
    files:
      - '**/*'
  cache:
    paths:
      - node_modules/**/*
```

## База данных

### Neon (рекомендуется)

#### Создание проекта
```bash
# Через Neon Console или CLI
npm install -g @neondatabase/serverless
neonctl auth auth

# Создание проекта
neonctl projects create --name cinechance

# Получение connection string
neonctl connection-string --project-id your-project-id
```

#### Миграции
```bash
# Локальные миграции
npx prisma migrate dev --name init

# Production миграции
npx prisma migrate deploy

# Seed данные
npm run seed
```

### PostgreSQL на AWS RDS

#### Terraform конфигурация
```hcl
resource "aws_db_instance" "postgres" {
  identifier     = "cinechance-db"
  engine         = "postgres"
  engine_version = "14.9"
  instance_class = "db.t3.micro"
  
  allocated_storage     = 20
  max_allocated_storage = 100
  storage_encrypted    = true
  
  db_name  = "cinechance"
  username = var.db_username
  password = var.db_password
  
  vpc_security_group_ids = [aws_security_group.rds.id]
  db_subnet_group_name   = aws_db_subnet_group.main.name
  
  backup_retention_period = 7
  backup_window          = "03:00-04:00"
  maintenance_window     = "sun:04:00-sun:05:00"
  
  skip_final_snapshot = true
  
  tags = {
    Name = "cinechance-db"
  }
}
```

## CDN и кэширование

### Vercel Edge Network

#### Кэширование API
```typescript
// src/app/api/trending/route.ts
export async function GET() {
  const data = await fetchTrendingMovies();
  
  return NextResponse.json(data, {
    headers: {
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
      'CDN-Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    }
  });
}
```

#### Статичные ассеты
```typescript
// next.config.ts
module.exports = {
  images: {
    domains: ['image.tmdb.org'],
    loader: 'custom',
    loaderFile: './lib/image-loader.js',
  },
  async headers() {
    return [
      {
        source: '/images/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
};
```

### Cloudflare

#### Workers для кэширования
```javascript
// cloudflare-worker.js
addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
  const url = new URL(request.url);
  
  // Кэширование TMDB запросов
  if (url.pathname.startsWith('/api/tmdb')) {
    const cacheKey = new Request(url.toString(), request);
    const cache = caches.default;
    
    let response = await cache.match(cacheKey);
    
    if (!response) {
      response = await fetch(request);
      
      // Кэшировать на 1 час
      response = new Response(response.body, response);
      response.headers.set('Cache-Control', 'public, max-age=3600');
      
      event.waitUntil(cache.put(cacheKey, response.clone()));
    }
    
    return response;
  }
  
  return fetch(request);
}
```

## Мониторинг и логирование

### Vercel Analytics

#### Настройка
```bash
# Установка
npm install @vercel/analytics

# В _app.tsx или layout.tsx
import { Analytics } from '@vercel/analytics/react';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
```

#### Кастомные метрики
```typescript
import { getAnalytics } from '@vercel/analytics/server';

export async function GET() {
  const analytics = getAnalytics();
  
  // Отслеживание пользовательских событий
  await analytics.track('movie_search', {
    query_length: 10,
    results_count: 25
  });
  
  return NextResponse.json(data);
}
```

### Sentry для error tracking

#### Настройка
```bash
npm install @sentry/nextjs
```

```typescript
// sentry.client.config.ts
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
});
```

```typescript
// next.config.ts
const { withSentryConfig } = require('@sentry/nextjs');

module.exports = withSentryConfig({
  // Ваша конфигурация Next.js
}, {
  silent: true,
});
```

### Логирование

#### Winston логгер
```typescript
// src/lib/logger.ts
import winston from 'winston';

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
  ],
});

// В production добавить внешние сервисы
if (process.env.NODE_ENV === 'production') {
  logger.add(new winston.transports.Http({
    host: 'your-log-service.com',
    port: 80,
    path: '/logs'
  }));
}
```

## Безопасность

### HTTPS и SSL

#### Vercel автоматический SSL
```bash
# Vercel автоматически предоставляет SSL для всех доменов
# Для кастомных доменов настройте DNS записи:
# CNAME: your-domain.com -> cname.vercel-dns.com
```

#### Security headers
```typescript
// next.config.ts
const securityHeaders = [
  {
    key: 'X-DNS-Prefetch-Control',
    value: 'on'
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload'
  },
  {
    key: 'X-XSS-Protection',
    value: '1; mode=block'
  },
  {
    key: 'X-Frame-Options',
    value: 'DENY'
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff'
  },
  {
    key: 'Referrer-Policy',
    value: 'origin-when-cross-origin'
  }
];

module.exports = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ];
  },
};
```

### Rate limiting

#### Upstash Redis
```typescript
// src/middleware/rateLimit.ts
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.REDIS_REST_URL!,
  token: process.env.REDIS_REST_TOKEN!,
});

export async function rateLimit(
  request: Request,
  endpoint: string,
  limit = 10,
  window = 60
) {
  const ip = request.headers.get('x-forwarded-for') ?? 'unknown';
  const key = `rate_limit:${endpoint}:${ip}`;
  
  const current = await redis.incr(key);
  
  if (current === 1) {
    await redis.expire(key, window);
  }
  
  const success = current <= limit;
  
  return {
    success,
    remaining: Math.max(0, limit - current),
    reset: await redis.ttl(key)
  };
}
```

## Performance оптимизация

### Bundle анализ

#### Webpack Bundle Analyzer
```bash
# Анализ размера бандла
npm run build:analyze

# В package.json
{
  "scripts": {
    "build:analyze": "ANALYZE=true next build"
  }
}
```

#### Оптимизация импортов
```typescript
// Динамические импорты для тяжелых компонентов
const HeavyChart = dynamic(() => import('./HeavyChart'), {
  loading: () => <div>Loading chart...</div>,
  ssr: false
});

// Tree shaking для утилит
import { debounce } from 'lodash-es/debounce';
```

### Оптимизация изображений

#### Next.js Image optimization
```typescript
// next.config.ts
module.exports = {
  images: {
    domains: ['image.tmdb.org'],
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
};
```

## CI/CD

### GitHub Actions

#### Полный пайплайн
```yaml
# .github/workflows/deploy.yml
name: Build and Deploy

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

env:
  NODE_VERSION: '18'
  CACHE_VERSION: 'v1'

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Run linting
        run: npm run lint
        
      - name: Run tests
        run: npm test -- --coverage
        
      - name: Upload coverage
        uses: codecov/codecov-action@v3

  build:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Build application
        run: npm run build
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
          NEXTAUTH_SECRET: ${{ secrets.NEXTAUTH_SECRET }}
          
      - name: Run E2E tests
        run: npm run test:e2e
        
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.ORG_ID }}
          vercel-project-id: ${{ secrets.PROJECT_ID }}
          vercel-args: '--prod'
```

### Docker деплой

#### Multi-stage Dockerfile
```dockerfile
# Stage 1: Install dependencies
FROM node:18-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci --only=production

# Stage 2: Build the application
FROM node:18-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED 1

RUN npm run build

# Stage 3: Production image
FROM node:18-alpine AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT 3000

CMD ["node", "server.js"]
```

#### Docker Compose для локальной разработки
```yaml
# docker-compose.yml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgresql://postgres:password@db:5432/cinechance
      - NEXTAUTH_SECRET=your-secret
      - NODE_ENV=development
    depends_on:
      - db
      - redis

  db:
    image: postgres:14-alpine
    environment:
      - POSTGRES_DB=cinechance
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

volumes:
  postgres_data:
```

## Мониторинг производительности

### Core Web Vitals

#### Измерение и отслеживание
```typescript
// src/lib/analytics.ts
export function reportWebVitals(metric: any) {
  // Отправка в аналитику
  if (process.env.NODE_ENV === 'production') {
    gtag('event', metric.name, {
      value: Math.round(metric.value),
      event_category: 'Web Vitals',
      event_label: metric.id,
      non_interaction: true,
    });
  }
}

// В _app.tsx
import { reportWebVitals } from '../lib/analytics';

export function reportWebVitals({ onPerfEntry }) {
  if (onPerfEntry && onPerfEntry instanceof Function) {
    import('web-vitals').then(({ getCLS, getFID, getFCP, getLCP, getTTFB }) => {
      getCLS(onPerfEntry);
      getFID(onPerfEntry);
      getFCP(onPerfEntry);
      getLCP(onPerfEntry);
      getTTFB(onPerfEntry);
    });
  }
}
```

### Synthetic monitoring

#### Lighthouse CI
```yaml
# .lighthouserc.js
module.exports = {
  ci: {
    collect: {
      url: ['https://your-domain.com'],
      numberOfRuns: 3
    },
    assert: {
      assertions: {
        'categories:performance': ['warn', { minScore: 0.8 }],
        'categories:accessibility': ['error', { minScore: 0.9 }],
        'categories:best-practices': ['warn', { minScore: 0.8 }],
        'categories:seo': ['warn', { minScore: 0.8 }]
      }
    },
    upload: {
      target: 'temporary-public-storage'
    }
  }
};
```

## Траблшутинг деплоя

### Частые проблемы

#### Build ошибки
```bash
# Ошибки сборки
1. Проверьте переменные окружения
2. Убедитесь что все зависимости установлены
3. Проверьте TypeScript ошибки
4. Валидные ли пути импортов

# Отладка
vercel logs your-deployment-url
```

#### Database connection errors
```bash
# Проблемы с подключением к БД
1. Проверьте DATABASE_URL
2. Убедитесь что IP адрес в whitelist
3. Проверьте SSL настройки
4. Валидные ли учетные данные
```

#### Runtime ошибки
```bash
# Ошибки в runtime
1. Проверьте логи в Vercel Dashboard
2. Убедитесь что API routes работают
3. Проверьте NextAuth конфигурацию
4. Валидные ли middleware функции
```

### Health checks

#### API health endpoint
```typescript
// src/app/api/health/route.ts
export async function GET() {
  try {
    // Проверка БД
    await prisma.$queryRaw`SELECT 1`;
    
    // Проверка внешних сервисов
    const tmdbHealth = await fetch('https://api.themoviedb.org/3/movie/550', {
      headers: { Authorization: `Bearer ${process.env.TMDB_API_KEY}` }
    });
    
    return NextResponse.json({
      status: 'healthy',
      database: 'connected',
      tmdb: tmdbHealth.ok ? 'connected' : 'disconnected',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return NextResponse.json(
      { 
        status: 'unhealthy', 
        error: error.message,
        timestamp: new Date().toISOString()
      },
      { status: 503 }
    );
  }
}
```

## Резервное копирование и восстановление

### Database backups

#### Автоматические бэкапы Neon
```bash
# Neon предоставляет автоматические бэкапы
# Point-in-time recovery до 7 дней

# Manual backup
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql
```

#### Восстановление
```bash
# Восстановление из бэкапа
psql $DATABASE_URL < backup_20240101_120000.sql

# Point-in-time recovery через Neon Console
# Выберите точку времени и восстановите
```

### Application backups

#### Vercel preview deployments
```bash
# Vercel автоматически сохраняет preview deployments
# Можно откатиться к предыдущей версии

vercel rollback [deployment-url]
```

Этот гайд покрывает все аспекты деплоя CineChance от локальной разработки до production окружения с мониторингом и безопасностью.
