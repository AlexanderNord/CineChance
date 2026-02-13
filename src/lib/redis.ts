import { Redis } from '@upstash/redis';
import { logger } from '@/lib/logger';

let redisInstance: Redis | null = null;

export function getRedis(): Redis | null {
  if (redisInstance) return redisInstance;
  
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  
  if (!url || !token) {
    logger.warn('Redis environment variables not configured, caching disabled');
    return null;
  }
  
  try {
    redisInstance = new Redis({
      url,
      token,
    });
    return redisInstance;
  } catch (error) {
    logger.error('Failed to initialize Redis connection', { 
      error: error instanceof Error ? error.message : String(error),
      context: 'RedisCache'
    });
    return null;
  }
}

export async function withCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlSeconds: number = 3600
): Promise<T> {
  const redis = getRedis();
  
  if (!redis) {
    return fetcher();
  }
  
  try {
    const cached = await redis.get<string>(key);
    if (cached) {
      return JSON.parse(cached) as T;
    }
  } catch (error) {
    logger.error('Redis get failed', { 
      error: error instanceof Error ? error.message : String(error),
      key,
      context: 'RedisCache'
    });
  }
  
  const fresh = await fetcher();
  
  try {
    await redis.set(key, JSON.stringify(fresh), { ex: ttlSeconds });
  } catch (error) {
    logger.error('Redis set failed', { 
      error: error instanceof Error ? error.message : String(error),
      key,
      ttlSeconds,
      context: 'RedisCache'
    });
  }
  
  return fresh;
}

export async function invalidateCache(pattern: string): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  
  try {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
      logger.info(`Cache invalidated: ${keys.length} keys matching "${pattern}"`, {
        context: 'RedisCache'
      });
    }
  } catch (error) {
    logger.error('Redis invalidate failed', { 
      error: error instanceof Error ? error.message : String(error),
      pattern,
      context: 'RedisCache'
    });
  }
}

export async function invalidateUserCache(userId: string): Promise<void> {
  await invalidateCache(`user:${userId}:*`);
}
