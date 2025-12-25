import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import { prisma } from '@/lib/prisma';

// Reuse mappings from watchlist route
const STATUS_FROM_DB: Record<string, string> = {
  'Хочу посмотреть': 'want',
  'Просмотрено': 'watched',
  'Брошено': 'dropped',
};

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const body = await req.json();

    // Expect body.items: Array<{ tmdbId: number, mediaType: string }>
    const items = Array.isArray(body?.items) ? body.items : [];

    if (!items.length) {
      return NextResponse.json({ error: 'Missing items' }, { status: 400 });
    }

    // If no user session, return nulls for each item
    if (!session?.user?.id) {
      const empty = Object.fromEntries(items.map((it: any) => [`${it.tmdbId}:${it.mediaType}`, { status: null, userRating: null, watchedDate: null }]));
      return NextResponse.json({ results: empty });
    }

    const tmdbIds = items.map((i: any) => i.tmdbId);

    // Fetch watchlist rows for current user and tmdbIds
    const rows = await prisma.watchList.findMany({
      where: { userId: session.user.id, tmdbId: { in: tmdbIds } },
      include: { status: true },
    });

    const map = new Map<string, any>();
    rows.forEach(r => {
      const key = `${r.tmdbId}:${r.mediaType}`;
      map.set(key, {
        status: r.status ? (STATUS_FROM_DB[r.status.name] ?? null) : null,
        userRating: r.userRating ?? null,
        watchedDate: r.watchedDate ?? null,
      });
    });

    // Build results for requested items
    const results = Object.fromEntries(items.map((it: any) => {
      const key = `${it.tmdbId}:${it.mediaType}`;
      return [key, map.get(key) ?? { status: null, userRating: null, watchedDate: null }];
    }));

    return NextResponse.json({ results });
  } catch (error) {
    console.error('WatchList batch POST error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
