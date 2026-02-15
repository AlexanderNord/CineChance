// src/app/my-movies/page.tsx
import Link from 'next/link';
import { Suspense } from 'react';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import MyMoviesContentClient from './MyMoviesContentClient';
import LoaderSkeleton from '@/app/components/LoaderSkeleton';
import { prisma } from '@/lib/prisma';
import { MOVIE_STATUS_IDS } from '@/lib/movieStatusConstants';

async function getMoviesCounts(userId: string) {
  const [watched, wantToWatch, dropped, hidden] = await Promise.all([
    prisma.watchList.count({
      where: {
        userId,
        statusId: { in: [MOVIE_STATUS_IDS.WATCHED, MOVIE_STATUS_IDS.REWATCHED] },
      },
    }),
    prisma.watchList.count({ where: { userId, statusId: MOVIE_STATUS_IDS.WANT_TO_WATCH } }),
    prisma.watchList.count({ where: { userId, statusId: MOVIE_STATUS_IDS.DROPPED } }),
    prisma.blacklist.count({ where: { userId } }),
  ]);
  return { watched, wantToWatch, dropped, hidden };
}

interface PageProps {
  searchParams: Promise<{ tab?: string }>;
}

function MyMoviesContent({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  return <MyMoviesClientWrapper searchParams={searchParams} />;
}

async function MyMoviesClientWrapper({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-white text-lg mb-6">Войдите, чтобы управлять своими списками фильмов</p>
          <Link href="/" className="text-blue-400 hover:underline">← На главную</Link>
        </div>
      </div>
    );
  }

  const userId = session.user.id;
  const counts = await getMoviesCounts(userId);

  // Получаем параметр tab из URL
  const { tab } = await searchParams;
  const validTabs = ['watched', 'wantToWatch', 'dropped', 'hidden'];
  const initialTab = validTabs.includes(tab || '') ? tab as 'watched' | 'wantToWatch' | 'dropped' | 'hidden' : undefined;

  return (
    <MyMoviesContentClient
      userId={userId}
      initialTab={initialTab}
      initialCounts={counts}
    />
  );
}

export default async function MyMoviesPage({ searchParams }: PageProps) {
  return (
    <Suspense fallback={<LoaderSkeleton variant="full" text="Загрузка списка фильмов..." />}>
      <MyMoviesContent searchParams={searchParams} />
    </Suspense>
  );
}
