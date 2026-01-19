// src/app/api/user/blacklist/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from "@/auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { rateLimit } from '@/middleware/rateLimit';

// GET: Получить все заблокированные фильмы пользователя
export async function GET(req: Request) {
  const { success } = await rateLimit(req, '/api/user');
  if (!success) {
    return NextResponse.json({ error: 'Too Many Requests' }, { status: 429 });
  }
  
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json([]);
    }

    const blacklist = await prisma.blacklist.findMany({
      where: {
        userId: session.user.id,
      },
      select: {
        tmdbId: true,
        mediaType: true,
      },
    });

    return NextResponse.json(blacklist);
  } catch (error) {
    logger.error('User blacklist GET error', { 
      error: error instanceof Error ? error.message : String(error),
      context: 'UserBlacklist'
    });
    return NextResponse.json([]);
  }
}
