// src/middleware/rateLimit.ts
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { logger } from '@/lib/logger';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// Конфигурация лимитов для разных эндпоинтов
const endpointLimits: Record<string, { points: number; duration: number }> = {
  '/api/search': { points: 10, duration: 60 }, // 10 запросов в минуту
  '/api/recommendations': { points: 30, duration: 60 }, // 30 запросов в минуту
  '/api/user': { points: 60, duration: 60 }, // 60 запросов в минуту
  'default': { points: 100, duration: 60 }, // 100 запросов в минуту
};

export async function rateLimit(req: Request, endpoint: string, userId?: string) {
  const ip = req.headers.get('x-forwarded-for') || 'anonymous';
  const key = userId ? `user:${userId}` : `ip:${ip}`;
  const config = endpointLimits[endpoint] || endpointLimits['default'];

  const ratelimit = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(config.points, `${config.duration} s`),
    analytics: true,
  });

  const { success, limit, remaining, reset } = await ratelimit.limit(key);

  if (!success) {
    logger.warn(`Rate limit exceeded for ${key} on ${endpoint}. Limit: ${limit}, Remaining: ${remaining}, Reset: ${reset}`);
  }

  return { success, limit, remaining, reset };
}
