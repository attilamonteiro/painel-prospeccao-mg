'use client';

import { useCallback, useState } from 'react';
import { ContratoFilters } from '@/features/contratos/components/ContratoFilters';
import { ContratosTable } from '@/features/contratos/components/ContratosTable';
import { useContratos } from '@/features/contratos/hooks/useContratos';
import { usePagination } from '@/shared/hooks/usePagination';
import { CONTRATOS_ORDER_BY_DEFAULT } from '@/shared/lib/constants';
import type { PageSize } from '@/shared/lib/constants';

interface FilterValues {
  search: string;
  modalidade: string;
  valorMin: string;
  valorMax: string;
  dataInicio: string;
  dataFim: string;
}

const INITIAL_FILTERS: FilterValues = {
  search: '',
  modalidade: '',
  valorMin: '',
  valorMax: '',
  dataInicio: '',
  dataFim: '',
};

export default function ContratosPage() {
  const [filterValues, setFilterValues] = useState<FilterValues>(INITIAL_FILTERS);

  const pagination = usePagination({
    initialOrderBy: CONTRATOS_ORDER_BY_DEFAULT,
    initialOrderDir: 'desc',
    initialPageSize: 25,
  });

  const handleFilterChange = useCallback(
    (partial: Partial<FilterValues>) => {
      setFilterValues((prev) => ({ ...prev, ...partial }));
      pagination.resetPage();
    },
    [pagination],
  );

  const filters = {
    p_search: filterValues.search || undefined,
    p_modalidade: filterValues.modalidade || undefined,
    p_valor_min: filterValues.valorMin ? Number(filterValues.valorMin) : undefined,
    p_valor_max: filterValues.valorMax ? Number(filterValues.valorMax) : undefined,
    p_data_inicio: filterValues.dataInicio || undefined,
    p_data_fim: filterValues.dataFim || undefined,
    p_order_by: pagination.orderBy,
    p_order_dir: pagination.orderDir,
    p_page: pagination.page,
    p_page_size: pagination.pageSize,
  };

  const { data, isLoading, isError, refetch } = useContratos(filters);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold tracking-tight">Contratos</h1>

      <ContratoFilters
        value={filterValues}
        onChange={handleFilterChange}
      />

      <ContratosTable
        data={data}
        isLoading={isLoading}
        isError={isError}
        onRetry={() => void refetch()}
        page={pagination.page}
        pageSize={pagination.pageSize}
        orderBy={pagination.orderBy}
        orderDir={pagination.orderDir}
        onPageChange={pagination.setPage}
        onPageSizeChange={(size) => pagination.setPageSize(size as PageSize)}
        onSortChange={pagination.toggleSort}
      />
    </div>
  );
}
