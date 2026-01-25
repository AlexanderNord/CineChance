// src/hooks/useCollections.ts
'use client';

import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';

export interface CollectionAchievement {
  id: number;
  name: string;
  poster_path: string | null;
  total_movies: number;
  watched_movies: number;
  added_movies: number;
  progress_percent: number;
  average_rating: number | null;
}

interface CollectionsResults {
  collections: CollectionAchievement[];
  hasMore: boolean;
  totalCount: number;
}

const ITEMS_PER_PAGE = 12;

const fetchCollections = async (
  pageParam: number
): Promise<CollectionsResults> => {
  const params = new URLSearchParams({
    page: String(pageParam),
    limit: String(ITEMS_PER_PAGE),
  });

  const response = await fetch(`/api/user/collections?${params.toString()}`);

  if (!response.ok) {
    throw new Error('Failed to fetch collections');
  }

  return response.json();
};

export const useCollections = () => {
  const queryClient = useQueryClient();

  const query = useInfiniteQuery({
    queryKey: ['collections'] as const,
    queryFn: ({ pageParam = 1 }) => fetchCollections(pageParam),
    getNextPageParam: (lastPage, allPages) => {
      const currentPage = allPages.length;
      if (lastPage.collections.length === 0) return undefined;
      if (!lastPage.hasMore) return undefined;
      return currentPage + 1;
    },
    initialPageParam: 1,
    staleTime: 60 * 1000, // 1 minute - collections don't change often
    gcTime: 5 * 60 * 1000, // 5 minutes
    placeholderData: (previousData) => previousData,
  });

  // Flatten all pages into a single array
  const collections = query.data?.pages.flatMap(page => page.collections) ?? [];

  const totalCount = query.data?.pages[0]?.totalCount ?? 0;

  return {
    ...query,
    collections,
    totalCount,
    refetch: () => {
      queryClient.invalidateQueries({ queryKey: ['collections'] });
    },
  };
};
