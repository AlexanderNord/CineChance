// src/app/my-movies/page.tsx
import Link from 'next/link';
import { Suspense } from 'react';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import MyMoviesClient from './MyMoviesClient';
import { fetchMoviesByStatus, getMoviesCounts } from './actions';
import LoaderSkeleton from '@/app/components/LoaderSkeleton';

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

  // Загружаем первые страницы для всех вкладок (с сортировкой по рейтингу по умолчанию)
  // Для watched показываем и "Просмотрено" и "Пересмотрено"
  const [watchedData, wantToWatchData, droppedData, hiddenData, counts] = await Promise.all([
    fetchMoviesByStatus(userId, ['Просмотрено', 'Пересмотрено'], false, 1, 'rating', 'desc'),
    fetchMoviesByStatus(userId, 'Хочу посмотреть', false, 1, 'rating', 'desc'),
    fetchMoviesByStatus(userId, 'Брошено', false, 1, 'rating', 'desc'),
    fetchMoviesByStatus(userId, null, true, 1, 'rating', 'desc'),
    getMoviesCounts(userId),
  ]);

  // Получаем параметр tab из URL
  const { tab } = await searchParams;
  const validTabs = ['watched', 'wantToWatch', 'dropped', 'hidden'];
  const initialTab = validTabs.includes(tab || '') ? tab as 'watched' | 'wantToWatch' | 'dropped' | 'hidden' : undefined;

  return (
    <MyMoviesClient
      initialWatched={watchedData.movies}
      initialWantToWatch={wantToWatchData.movies}
      initialDropped={droppedData.movies}
      initialHidden={hiddenData.movies}
      counts={counts}
      userId={userId}
      initialTab={initialTab}
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
