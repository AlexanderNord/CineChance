import { NextResponse } from 'next/server';
import { rateLimit } from '@/middleware/rateLimit';
import { Redis } from '@upstash/redis';
import { logger } from '@/lib/logger';
import { getFanartTvPoster } from '@/lib/tmdb';

// Redis клиент для кэширования (инициализируется с проверкой)
let redisClient: Redis | null = null;

function getRedisClient(): Redis | null {
  if (redisClient) return redisClient;
  
  try {
    redisClient = Redis.fromEnv();
    return redisClient;
  } catch (error) {
    logger.error('Failed to initialize Redis for image proxy', { 
      error: error instanceof Error ? error.message : String(error)
    });
    return null;
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const imageUrl = searchParams.get('url');
  const fallbackUrl = searchParams.get('fallback');
  const tmdbId = searchParams.get('tmdbId') ? parseInt(searchParams.get('tmdbId')!, 10) : null;
  const mediaType = (searchParams.get('mediaType') as 'movie' | 'tv') || 'movie';

  if (!imageUrl) {
    return NextResponse.json({ error: 'Missing URL parameter' }, { status: 400 });
  }

  // Создаем ключ для кэша
  const cacheKey = `image-proxy:${Buffer.from(imageUrl).toString('base64')}`;
  
  try {
    // Проверяем кэш ДО rate limiting - кешированные результаты не должны считаться в лимит
    const redis = getRedisClient();
    if (redis) {
      try {
        const cachedImage = await redis.get(cacheKey);
        if (cachedImage) {
          console.log('🎯 Cache HIT for image-proxy:', imageUrl.substring(0, 40));
          
          let cacheData: { data: string, contentType: string };
          
          // Обработка случауе если Redis вернула строку вместо объекта
          if (typeof cachedImage === 'string') {
            try {
              cacheData = JSON.parse(cachedImage);
            } catch (parseError) {
              console.error('⚠️ Failed to parse cached image JSON:', parseError);
              throw new Error('Invalid cache data format');
            }
          } else {
            cacheData = cachedImage as { data: string, contentType: string };
          }
          
          const { data, contentType } = cacheData;
          
          if (!data || !contentType) {
            console.warn('⚠️ Cache data incomplete:', { hasData: !!data, hasContentType: !!contentType });
            throw new Error('Invalid cache data');
          }

          const buffer = Buffer.from(data, 'base64');
          console.log('📦 Returning cached image:', { size: buffer.length, contentType });
      
          return new NextResponse(buffer, {
            headers: {
              'Content-Type': contentType,
              'Cache-Control': 'public, max-age=3600, immutable',
              'Access-Control-Allow-Origin': '*',
              'Access-Control-Allow-Methods': 'GET',
              'Access-Control-Allow-Headers': 'Content-Type',
              'X-Cache': 'HIT',
            },
          });
        } else {
          console.log('❌ Cache MISS for:', imageUrl.substring(0, 40));
        }
      } catch (redisError) {
        console.error('❌ Redis error:', redisError instanceof Error ? redisError.message : String(redisError));
        logger.warn('Redis cache check failed, continuing without cache', {
          error: redisError instanceof Error ? redisError.message : String(redisError),
        });
      }
    }

    // Кеш miss - применяем rate limiting только для новых запросов
    const { success } = await rateLimit(req, '/api/image-proxy');
    if (!success) {
      // Возвращаем placeholder SVG вместо JSON ошибки
      // (JSON вызывает ошибку загрузки картинки в браузере)
      console.warn('⏱️ Rate limit exceeded for:', imageUrl.substring(0, 40));
      
      const placeholderSvg = '<svg width="500" height="750" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#374151"/><text x="50%" y="50%" font-family="Arial" font-size="20" fill="#9CA3AF" text-anchor="middle" dominant-baseline="middle">Rate limit</text></svg>';
      const placeholderBuffer = Buffer.from(placeholderSvg, 'utf-8');
      
      return new NextResponse(placeholderBuffer, {
        status: 200, // Возвращаем 200, чтобы браузер не считал это ошибкой
        headers: {
          'Content-Type': 'image/svg+xml',
          'Cache-Control': 'no-cache, no-store, must-revalidate', // Не кешируем ошибку!
          'Pragma': 'no-cache',
          'Expires': '0',
          'Access-Control-Allow-Origin': '*',
          'X-Cache': 'RATE_LIMITED',
        },
      });
    }

    console.log('Cache miss, fetching:', imageUrl);
    
    // Пробуем основной URL с таймаутом
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 секунд таймаут

    const response = await fetch(imageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
      },
      cache: 'no-store',
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const imageBuffer = await response.arrayBuffer();
    const base64Data = Buffer.from(imageBuffer).toString('base64');
    
    // Определяем content type
    const contentType = response.headers.get('content-type') || 
      (imageUrl.includes('.jpg') || imageUrl.includes('.jpeg') ? 'image/jpeg' :
       imageUrl.includes('.png') ? 'image/png' :
       imageUrl.includes('.webp') ? 'image/webp' : 'image/jpeg');

    console.log('✅ Image fetched successfully:', {
      url: imageUrl.substring(0, 40),
      size: imageBuffer.byteLength,
      contentType,
      fromTMDB: imageUrl.includes('image.tmdb.org')
    });

    // Сохраняем в кэш на 6 часов для баланса между свежестью и производительностью
    const redisForCache = getRedisClient();
    if (redisForCache) {
      try {
        const cachePayload = JSON.stringify({
          data: base64Data,
          contentType: contentType
        });
        
        await redisForCache.setex(cacheKey, 21600, cachePayload);
        console.log('💾 Image cached:', {
          url: imageUrl.substring(0, 40),
          cacheKeyLength: cacheKey.length,
          payloadSize: cachePayload.length,
          ttl: 21600
        });
      } catch (cacheError) {
        console.error('❌ Redis cache failed:', cacheError instanceof Error ? cacheError.message : String(cacheError));
        logger.warn('Failed to cache image in Redis', {
          error: cacheError instanceof Error ? cacheError.message : String(cacheError)
        });
      }
    }

    return new NextResponse(imageBuffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=3600, immutable',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Content-Type',
        'X-Cache': 'MISS',
      },
    });

  } catch (error) {
    // Не логируем таймауты как ошибки - это ожидаемое поведение при проблемах с сетью
    const errorMessage = error instanceof Error ? error.message : String(error);
    const isTimeout = errorMessage.includes('timed out') || errorMessage.includes('ETIMEDOUT') || errorMessage.includes('abort');
    
    if (!isTimeout) {
      console.error('Image proxy error:', error);
    }
    
    // Если у нас есть TMDB ID, пробуем получить постер из FANART_TV как fallback
    if (tmdbId && tmdbId > 0) {
      try {
        const fanartUrl = await getFanartTvPoster(tmdbId, mediaType);
        if (fanartUrl) {
          logger.info('Using FANART_TV fallback', { tmdbId, mediaType, fanartUrl: fanartUrl.substring(0, 50) });
          
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 5000);
          
          const fanartResponse = await fetch(fanartUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
              'Accept': 'image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
            },
            signal: controller.signal,
          });
          
          clearTimeout(timeoutId);
          
          if (fanartResponse.ok) {
            const fanartBuffer = await fanartResponse.arrayBuffer();
            const fanartBase64 = Buffer.from(fanartBuffer).toString('base64');
            const fanartContentType = fanartResponse.headers.get('content-type') || 'image/jpeg';
            
            // Кэшируем FANART_TV источник на 6 часов
            const fanartCacheKey = `image-proxy:fanart:${tmdbId}`;
            const redisForFanart = getRedisClient();
            if (redisForFanart) {
              try {
                const fanartPayload = JSON.stringify({
                  data: fanartBase64,
                  contentType: fanartContentType
                });
                await redisForFanart.setex(fanartCacheKey, 21600, fanartPayload);
                console.log('💾 FANART cached:', { tmdbId, cacheKeyLength: fanartCacheKey.length });
              } catch (cacheError) {
                console.error('❌ FANART cache failed:', cacheError instanceof Error ? cacheError.message : String(cacheError));
                logger.warn('Failed to cache FANART_TV image', {
                  error: cacheError instanceof Error ? cacheError.message : String(cacheError)
                });
              }
            }
            
            return new NextResponse(fanartBuffer, {
              headers: {
                'Content-Type': fanartContentType,
                'Cache-Control': 'public, max-age=3600, immutable',
                'Access-Control-Allow-Origin': '*',
                'X-Cache': 'MISS-FANART',
              },
            });
          }
        }
      } catch (fanartError) {
        logger.warn('FANART_TV fallback failed', {
          error: fanartError instanceof Error ? fanartError.message : String(fanartError),
          tmdbId
        });
      }
    }
    
    // Если есть fallback URL, пробуем его
    if (fallbackUrl) {
      try {
        const fallbackCacheKey = `image-proxy:${Buffer.from(fallbackUrl).toString('base64')}`;
        const redisForFallback = getRedisClient();
        const cachedFallback = redisForFallback ? await redisForFallback.get(fallbackCacheKey) : null;
        
        if (cachedFallback) {
          let fallbackData: { data: string, contentType: string };
          
          if (typeof cachedFallback === 'string') {
            try {
              fallbackData = JSON.parse(cachedFallback);
            } catch {
              console.warn('⚠️ Invalid fallback cache format, skipping');
              fallbackData = { data: '', contentType: '' };
            }
          } else {
            fallbackData = cachedFallback as { data: string, contentType: string };
          }
          
          if (fallbackData.data && fallbackData.contentType) {
            console.log('💾 Returning cached fallback');
            return new NextResponse(Buffer.from(fallbackData.data, 'base64'), {
              headers: {
                'Content-Type': fallbackData.contentType,
                'Cache-Control': 'public, max-age=3600, immutable',
                'Access-Control-Allow-Origin': '*',
                'X-Cache': 'HIT-FALLBACK',
              },
            });
          }
        }

        const fallbackResponse = await fetch(fallbackUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
          },
        });

        if (fallbackResponse.ok) {
          const fallbackBuffer = await fallbackResponse.arrayBuffer();
          const fallbackBase64 = Buffer.from(fallbackBuffer).toString('base64');
          const fallbackContentType = fallbackResponse.headers.get('content-type') || 'image/jpeg';
          
          // Кэшируем fallback на 6 часов
          if (redisForFallback) {
            try {
              const fallbackPayload = JSON.stringify({
                data: fallbackBase64,
                contentType: fallbackContentType
              });
              await redisForFallback.setex(fallbackCacheKey, 21600, fallbackPayload);
              console.log('💾 Fallback cached:', { cacheKeyLength: fallbackCacheKey.length });
            } catch (cacheError) {
              console.error('❌ Fallback cache failed:', cacheError instanceof Error ? cacheError.message : String(cacheError));
              logger.warn('Failed to cache fallback image', {
                error: cacheError instanceof Error ? cacheError.message : String(cacheError)
              });
            }
          }

          return new NextResponse(fallbackBuffer, {
            headers: {
              'Content-Type': fallbackContentType,
              'Cache-Control': 'public, max-age=3600, immutable',
              'Access-Control-Allow-Origin': '*',
              'X-Cache': 'MISS-FALLBACK',
            },
          });
        }
      } catch (fallbackError) {
        console.error('Fallback image error:', fallbackError);
      }
    }

    // Если все failed, возвращаем placeholder SVG
    try {
      const placeholderSvg = '<svg width="500" height="750" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#374151"/><text x="50%" y="50%" font-family="Arial" font-size="24" fill="#9CA3AF" text-anchor="middle" dominant-baseline="middle">Постер отсутствует</text></svg>';
      const placeholderBuffer = Buffer.from(placeholderSvg, 'utf-8');
      
      return new NextResponse(placeholderBuffer, {
        headers: {
          'Content-Type': 'image/svg+xml',
          'Cache-Control': 'no-cache, no-store, must-revalidate', // НЕ кешируем placeholder! Пусть браузер повторяет попытку
          'Pragma': 'no-cache',
          'Expires': '0',
          'Access-Control-Allow-Origin': '*',
          'X-Cache': 'PLACEHOLDER',
        },
      });
    } catch (placeholderError) {
      console.error('Placeholder error:', placeholderError);
    }

    return NextResponse.json({ error: 'Failed to fetch image' }, { status: 500 });
  }
}
