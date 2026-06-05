'use client';

import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { orgaosService } from '../lib/orgaosService';
import type { OrgaoFilters } from '@/shared/types/orgao';

export function useOrgaos(filters: OrgaoFilters) {
  return useQuery({
    queryKey: ['orgaos', filters],
    queryFn: () => orgaosService.list(filters),
    placeholderData: keepPreviousData,
  });
}
