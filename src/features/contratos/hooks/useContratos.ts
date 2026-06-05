'use client';

import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { contratosService } from '../lib/contratosService';
import type { ContratoFilters } from '../types/contrato';

export function useContratos(filters: ContratoFilters) {
  return useQuery({
    queryKey: ['contratos', filters],
    queryFn: () => contratosService.list(filters),
    placeholderData: keepPreviousData,
  });
}

export function useContratoFilterOptions() {
  return useQuery({
    queryKey: ['contratos', 'filter-options'],
    queryFn: () => contratosService.getFilterOptions(),
    staleTime: 30 * 60 * 1_000, // 30 min — reference data
  });
}
