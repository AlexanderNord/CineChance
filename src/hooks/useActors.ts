// src/hooks/useActors.ts
'use client';

import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';

export interface ActorAchievement {
  id: number;
  name: string;
  profile_path: string | null;
  watched_movies: number;
  total_movies: number;
  progress_percent: number;
  average_rating: number | null;
}

interface ActorsResults {
  actors: ActorAchievement[];
  hasMore: boolean;
  totalCount: number;
}

const ITEMS_PER_PAGE = 12;

const fetchActors = async (
  pageParam: number
): Promise<ActorsResults> => {
  const params = new URLSearchParams({
    page: String(pageParam),
    limit: String(ITEMS_PER_PAGE),
  });

  const response = await fetch(`/api/user/actors?${params.toString()}`);

  if (!response.ok) {
    throw new Error('Failed to fetch actors');
  }

  return response.json();
};

export const useActors = () => {
  const queryClient = useQueryClient();

  const query = useInfiniteQuery({
    queryKey: ['actors'] as const,
    queryFn: ({ pageParam = 1 }) => fetchActors(pageParam),
    getNextPageParam: (lastPage, allPages) => {
      const currentPage = allPages.length;
      if (lastPage.actors.length === 0) return undefined;
      if (!lastPage.hasMore) return undefined;
      return currentPage + 1;
    },
    initialPageParam: 1,
    staleTime: 60 * 1000, // 1 minute - actors don't change often
    gcTime: 5 * 60 * 1000, // 5 minutes
    placeholderData: (previousData) => previousData,
  });

  // Flatten all pages into a single array
  const actors = query.data?.pages.flatMap(page => page.actors) ?? [];

  const totalCount = query.data?.pages[0]?.totalCount ?? 0;

  return {
    ...query,
    actors,
    totalCount,
    refetch: () => {
      queryClient.invalidateQueries({ queryKey: ['actors'] });
    },
  };
};
