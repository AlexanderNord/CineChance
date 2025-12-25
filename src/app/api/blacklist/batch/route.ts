import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const items: { tmdbId: number; mediaType: string }[] = body.items || [];

    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;

    const results: Record<string, boolean> = {};
    // default to false
    items.forEach((it) => { results[`${it.tmdbId}:${it.mediaType}`] = false; });

    if (!userId || items.length === 0) {
      return NextResponse.json({ results });
    }

    const ids = items.map(i => i.tmdbId);
    const rows = await prisma.blacklist.findMany({ where: { userId, tmdbId: { in: ids } } });
    rows.forEach(r => { results[`${r.tmdbId}:${r.mediaType}`] = true; });

    return NextResponse.json({ results });
  } catch (error) {
    console.error('Error in /api/blacklist/batch:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}
