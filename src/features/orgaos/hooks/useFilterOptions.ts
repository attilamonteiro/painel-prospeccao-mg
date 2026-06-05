'use client';

import { useQuery } from '@tanstack/react-query';
import { filterService } from '../lib/filterService';

export function useFilterOptions() {
  return useQuery({
    queryKey: ['filter-options'],
    queryFn: filterService.getOptions,
    staleTime: 300_000, // 5 min
  });
}
