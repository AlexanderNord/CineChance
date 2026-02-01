# Troubleshooting Guide

This guide covers common issues and their solutions for CineChance development and deployment.

## 🚀 Quick Fixes

### Most Common Issues

#### 1. Database Connection Issues
```bash
# Error: "Can't reach database server"
# Solution: Check DATABASE_URL and network connectivity
echo $DATABASE_URL
# Verify the URL format: postgresql://username:password@host:port/database

# Test connection
npx prisma db pull
```

#### 2. NextAuth Session Issues
```bash
# Error: "NEXTAUTH_SECRET is required"
# Solution: Add NEXTAUTH_SECRET to .env.local
openssl rand -base64 32
# Add the output to .env.local as NEXTAUTH_SECRET
```

#### 3. TMDB API Issues
```bash
# Error: "TMDB API key not found"
# Solution: Add TMDB_API_KEY to .env.local
# Get key from https://www.themoviedb.org/settings/api
```

#### 4. Build Errors
```bash
# Error: "Module not found"
# Solution: Clean install dependencies
rm -rf node_modules package-lock.json
npm install
```

## 🛠 Development Issues

### Environment Setup

#### Node.js Version Issues
```bash
# Error: "Unsupported Node.js version"
# Solution: Use Node.js 18+
node --version  # Should be 18.x or higher

# Using nvm to manage versions
nvm install 18
nvm use 18
nvm alias default 18
```

#### Prisma Issues
```bash
# Error: "Prisma Client is not configured"
# Solution: Generate Prisma client
npx prisma generate

# Error: "Database schema is out of date"
# Solution: Run migrations
npx prisma migrate dev

# Error: "Foreign key constraint violation"
# Solution: Reset database (dev only)
npx prisma migrate reset
```

#### Dependency Issues
```bash
# Error: "Peer dependency conflicts"
# Solution: Use --force or --legacy-peer-deps
npm install --force

# Error: "Cannot resolve module"
# Solution: Clear Next.js cache
rm -rf .next
npm run dev
```

### Runtime Issues

#### Port Already in Use
```bash
# Error: "Port 3000 is already in use"
# Solution: Kill process or use different port
# Find process
lsof -ti:3000
# Kill process
kill -9 $(lsof -ti:3000)
# Or use different port
npm run dev -- -p 3001
```

#### Memory Issues
```bash
# Error: "JavaScript heap out of memory"
# Solution: Increase Node.js memory limit
export NODE_OPTIONS="--max-old-space-size=4096"
npm run dev

# Or in package.json
"scripts": {
  "dev": "NODE_OPTIONS='--max-old-space-size=4096' next dev"
}
```

#### Hot Reload Issues
```bash
# Solution: Restart development server
npm run dev

# Clear all caches
rm -rf .next node_modules
npm install
npm run dev
```

## 🌐 API Issues

### Authentication Problems

#### Session Not Working
```typescript
// Check session in API route
const session = await getServerAuthSession(authOptions);
console.log('Session:', session); // Debug log

// Check NextAuth configuration
// Ensure NEXTAUTH_URL is correct
// For local dev: http://localhost:3000
// For production: https://your-domain.com
```

#### CORS Issues
```typescript
// next.config.ts
module.exports = {
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: '*',
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, POST, PUT, DELETE, OPTIONS',
          },
        ],
      },
    ];
  },
};
```

### Rate Limiting Issues

#### Upstash Redis Connection
```bash
# Check Redis configuration
echo $REDIS_REST_URL
echo $REDIS_REST_TOKEN

# Test connection
curl -X GET "$REDIS_REST_URL/ping" -H "Authorization: Bearer $REDIS_REST_TOKEN"
```

#### Rate Limit Errors
```typescript
// Check rate limiting implementation
const { success } = await rateLimit(request, '/api/endpoint');
if (!success) {
  console.log('Rate limited for IP:', request.ip);
  return NextResponse.json({ error: 'Rate limited' }, { status: 429 });
}
```

## 🗄 Database Issues

### Connection Problems

#### Neon Database Issues
```bash
# Check connection string format
# postgresql://username:password@host:port/database?sslmode=require

# Test connection with psql
psql $DATABASE_URL

# Check Neon console for connection status
```

#### Migration Issues
```bash
# Error: "Migration already applied"
# Solution: Reset migration status
npx prisma migrate resolve --rolled-back <migration-name>

# Error: "Migration failed"
# Solution: Check migration SQL and fix issues
npx prisma migrate dev --name fix-migration
```

### Performance Issues

#### Slow Queries
```sql
-- Identify slow queries
SELECT query, mean_time, calls 
FROM pg_stat_statements 
ORDER BY mean_time DESC 
LIMIT 10;

-- Check missing indexes
SELECT schemaname, tablename, attname, n_distinct, correlation 
FROM pg_stats 
WHERE schemaname = 'public';
```

#### Connection Pool Issues
```typescript
// prisma/schema.prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  // Add connection pool settings
  directUrl = env("DIRECT_URL") // For migrations
}

// In code
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
  log: ['query', 'info', 'warn', 'error'],
});
```

## 🎨 Frontend Issues

### Styling Problems

#### TailwindCSS Not Working
```bash
# Check Tailwind configuration
npx tailwindcss --help

# Rebuild CSS
npm run build

# Check PostCSS configuration
cat postcss.config.js
```

#### Image Optimization Issues
```typescript
// next.config.ts
module.exports = {
  images: {
    domains: ['image.tmdb.org'],
    formats: ['image/webp', 'image/avif'],
    // Add these for debugging
    unoptimized: false,
    dangerouslyAllowSVG: true,
  },
};
```

### Component Issues

#### Hydration Mismatch
```typescript
// Error: "Text content does not match"
// Solution: Use dynamic imports for client components
import dynamic from 'next/dynamic';

const ClientComponent = dynamic(() => import('./ClientComponent'), {
  ssr: false,
});
```

#### State Management Issues
```typescript
// Use React Query for server state
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// Proper error handling
const { data, error, isLoading } = useQuery({
  queryKey: ['movies', userId],
  queryFn: () => fetchMovies(userId),
  retry: 3,
  onError: (error) => {
    console.error('Failed to fetch movies:', error);
  },
});
```

## 🚀 Deployment Issues

### Vercel Deployment

#### Build Failures
```bash
# Check build logs
vercel logs <deployment-url>

# Common issues:
# 1. Missing environment variables
# 2. TypeScript errors
# 3. Import/export issues

# Local build test
npm run build
```

#### Environment Variables
```bash
# Check Vercel environment variables
vercel env ls

# Pull environment variables locally
vercel env pull .env.production

# Test with production variables
npm run build
```

#### Database Connection in Production
```bash
# Check DATABASE_URL format
# Must include sslmode=require for production
DATABASE_URL="postgresql://user:pass@host:5432/db?sslmode=require"

# Test connection
npx prisma db pull --preview-feature
```

### Docker Issues

#### Build Failures
```dockerfile
# Multi-stage build for better caching
FROM node:18-alpine AS base
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM base AS builder
COPY . .
RUN npm run build

FROM base AS runner
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
CMD ["npm", "start"]
```

#### Container Issues
```bash
# Debug container
docker run -it --entrypoint /bin/sh your-image

# Check logs
docker logs <container-id>

# Check environment variables
docker exec <container-id> env
```

## 🔍 Debugging Tools

### Browser DevTools

#### Network Issues
```javascript
// Check API responses in Network tab
// Look for:
// - Status codes (200, 401, 500)
// - Response payloads
// - Request headers

// Debug fetch requests
fetch('/api/movies')
  .then(response => {
    console.log('Response status:', response.status);
    return response.json();
  })
  .then(data => console.log('Response data:', data))
  .catch(error => console.error('Fetch error:', error));
```

#### Console Debugging
```javascript
// Debug React components
console.log('Component props:', props);
console.log('Component state:', state);

// Debug async operations
async function debugAsync() {
  try {
    const result = await someAsyncOperation();
    console.log('Async result:', result);
  } catch (error) {
    console.error('Async error:', error);
  }
}
```

### Server Debugging

#### API Route Debugging
```typescript
// src/app/api/debug/route.ts
export async function GET(request: Request) {
  console.log('Request headers:', Object.fromEntries(request.headers));
  console.log('Request URL:', request.url);
  
  const session = await getServerAuthSession(authOptions);
  console.log('User session:', session);
  
  return NextResponse.json({
    timestamp: new Date().toISOString(),
    headers: Object.fromEntries(request.headers),
    session: session ? 'authenticated' : 'unauthenticated',
  });
}
```

#### Database Debugging
```typescript
// Enable query logging
const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});

// Debug specific queries
const users = await prisma.user.findMany({
  where: { email: 'test@example.com' },
});
console.log('Found users:', users);
```

## 📱 Performance Issues

### Frontend Performance

#### Slow Page Loads
```bash
# Analyze bundle size
npm run build:analyze

# Check Core Web Vitals
npm install -g lighthouse
lighthouse https://your-domain.com --output html --output-path ./lighthouse-report.html
```

#### Memory Leaks
```javascript
// Check for memory leaks in useEffect
useEffect(() => {
  const timer = setInterval(() => {
    // Some operation
  }, 1000);

  // Cleanup function
  return () => clearInterval(timer);
}, []);
```

### Backend Performance

#### Slow API Responses
```typescript
// Add timing logs
export async function GET(request: Request) {
  const start = Date.now();
  
  try {
    const data = await someSlowOperation();
    const duration = Date.now() - start;
    console.log(`Operation took ${duration}ms`);
    
    return NextResponse.json(data);
  } catch (error) {
    const duration = Date.now() - start;
    console.error(`Operation failed after ${duration}ms:`, error);
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

## 🆘 Getting Help

### Community Resources

#### GitHub Issues
- Search existing issues first
- Provide detailed reproduction steps
- Include environment information
- Add relevant error logs

#### Discord Community
- Join the CineChance Discord
- Ask questions in #help channel
- Share code snippets for context
- Be patient with responses

#### Stack Overflow
- Use tags: `next.js`, `prisma`, `typescript`
- Provide minimal reproducible example
- Include error messages and stack traces

### Professional Support

#### Debugging Services
- [Vercel Analytics](https://vercel.com/analytics) - Performance monitoring
- [Sentry](https://sentry.io/) - Error tracking
- [LogRocket](https://logrocket.com/) - Session replay

#### Consulting
- For complex issues, consider professional help
- Check the documentation for troubleshooting sections
- Review GitHub issues for similar problems

## 📋 Common Error Messages

### Prisma Errors
```
Error: "P2002: Unique constraint failed"
Solution: Check for duplicate records or missing unique constraints

Error: "P2025: Record not found"
Solution: Verify the record exists before updating/deleting

Error: "P2021: Table does not exist"
Solution: Run database migrations
```

### Next.js Errors
```
Error: "Module not found: Can't resolve 'module'"
Solution: Install missing dependency or check import path

Error: "Text content does not match server-rendered HTML"
Solution: Use dynamic imports or fix hydration mismatch

Error: "getStaticPaths is required for dynamic SSG pages"
Solution: Add getStaticPaths or use dynamic routing
```

### NextAuth Errors
```
Error: "NEXTAUTH_SECRET is required"
Solution: Add NEXTAUTH_SECRET to environment variables

Error: "Invalid callback URL"
Solution: Check NEXTAUTH_URL configuration

Error: "OAuth session expired"
Solution: Implement token refresh or re-authentication
```

---

## 🎯 Prevention Tips

### Development Best Practices
1. **Always test locally before deploying**
2. **Use TypeScript strict mode**
3. **Implement proper error handling**
4. **Add logging for debugging**
5. **Use environment-specific configurations**

### Regular Maintenance
1. **Update dependencies regularly**
2. **Monitor performance metrics**
3. **Review error logs**
4. **Test backup and recovery**
5. **Document known issues**

### Code Quality
1. **Use ESLint and Prettier**
2. **Write comprehensive tests**
3. **Conduct code reviews**
4. **Use TypeScript effectively**
5. **Follow security best practices**

---

*If you encounter an issue not covered in this guide, please open an issue on GitHub with detailed information about the problem.*
