'use client';

import { useState } from 'react';
import { usePagination } from '@/shared/hooks/usePagination';
import { ORGAOS_ORDER_BY_DEFAULT } from '@/shared/lib/constants';
import { useOrgaos } from '@/features/orgaos/hooks/useOrgaos';
import { OrgaoFiltersPanel } from '@/features/orgaos/components/OrgaoFilters';
import { OrgaosTable } from '@/features/orgaos/components/OrgaosTable';
import { OrgaoDetail } from '@/features/orgaos/components/OrgaoDetail';
import { OrgaoExport } from '@/features/orgaos/components/OrgaoExport';
import type { OrgaoFilters } from '@/shared/types/orgao';
import type { PageSize } from '@/shared/lib/constants';

type PartialFilters = Omit<
  OrgaoFilters,
  'p_page' | 'p_page_size' | 'p_order_by' | 'p_order_dir'
>;

export default function OrgaosPage() {
  const [partialFilters, setPartialFilters] = useState<PartialFilters>({});
  const [selectedCnpj, setSelectedCnpj] = useState<string | null>(null);

  const pagination = usePagination({
    initialOrderBy: ORGAOS_ORDER_BY_DEFAULT,
    initialOrderDir: 'desc',
  });

  const filters: OrgaoFilters = {
    ...partialFilters,
    p_page: pagination.page,
    p_page_size: pagination.pageSize,
    p_order_by: pagination.orderBy,
    p_order_dir: pagination.orderDir,
  };

  const { data, isLoading, isError, refetch } = useOrgaos(filters);

  function handleFiltersChange(updated: PartialFilters) {
    setPartialFilters(updated);
    pagination.resetPage();
  }

  function handleSortChange(col: string) {
    pagination.toggleSort(col);
  }

  function handlePageChange(page: number) {
    pagination.setPage(page);
  }

  function handlePageSizeChange(size: number) {
    pagination.setPageSize(size as PageSize);
  }

  const exportFilters = {
    p_search: partialFilters.p_search,
    p_municipio: partialFilters.p_municipio,
    p_esfera: partialFilters.p_esfera,
    p_categoria: partialFilters.p_categoria,
    p_valor_min: partialFilters.p_valor_min,
    p_valor_max: partialFilters.p_valor_max,
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Órgãos</h1>
        <OrgaoExport filters={exportFilters} />
      </div>

      <OrgaoFiltersPanel
        filters={partialFilters}
        onChange={handleFiltersChange}
      />

      <OrgaosTable
        result={data}
        isLoading={isLoading}
        isError={isError}
        page={pagination.page}
        pageSize={pagination.pageSize}
        orderBy={pagination.orderBy}
        orderDir={pagination.orderDir}
        onPageChange={handlePageChange}
        onPageSizeChange={handlePageSizeChange}
        onSortChange={handleSortChange}
        onViewDetail={setSelectedCnpj}
        onRetry={() => void refetch()}
      />

      <OrgaoDetail
        cnpj={selectedCnpj}
        open={selectedCnpj !== null}
        onClose={() => setSelectedCnpj(null)}
      />
    </div>
  );
}
