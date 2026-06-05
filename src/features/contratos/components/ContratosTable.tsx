'use client';

import { DataTable, type DataTableColumn } from '@/shared/components/DataTable';
import { Pagination } from '@/shared/components/Pagination';
import { Badge } from '@/components/ui/badge';
import { formatBRL, formatDate } from '@/shared/lib/formatters';
import type { Contrato } from '@/shared/types/contrato';
import type { PaginatedResponse } from '@/shared/types/common';
import type { PageSize } from '@/shared/lib/constants';

interface ContratosTableProps {
  data: PaginatedResponse<Contrato> | undefined;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  page: number;
  pageSize: PageSize;
  orderBy: string;
  orderDir: 'asc' | 'desc';
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: PageSize) => void;
  onSortChange: (col: string) => void;
}

const COLUMNS: DataTableColumn<Contrato>[] = [
  {
    key: 'objeto',
    header: 'Objeto',
    sortable: true,
    className: 'max-w-[260px]',
    render: (row) => (
      <span
        className="block max-w-[240px] truncate"
        title={row.objeto}
      >
        {row.objeto}
      </span>
    ),
  },
  {
    key: 'orgao_nome',
    header: 'Órgão',
    sortable: true,
    className: 'max-w-[200px]',
    render: (row) => (
      <span
        className="block max-w-[180px] truncate"
        title={row.orgao_nome ?? row.orgao_cnpj}
      >
        {row.orgao_nome ?? row.orgao_cnpj}
      </span>
    ),
  },
  {
    key: 'modalidade',
    header: 'Modalidade',
    sortable: true,
    render: (row) => (
      <Badge variant="secondary" className="whitespace-nowrap">
        {row.modalidade}
      </Badge>
    ),
  },
  {
    key: 'valor_final',
    header: 'Valor final',
    sortable: true,
    className: 'text-right',
    render: (row) => (
      <span className="block text-right tabular-nums">
        {formatBRL(row.valor_final)}
      </span>
    ),
  },
  {
    key: 'data_assinatura',
    header: 'Assinatura',
    sortable: true,
    render: (row) => formatDate(row.data_assinatura),
  },
  {
    key: 'fornecedor_nome',
    header: 'Fornecedor',
    sortable: true,
    className: 'max-w-[200px]',
    render: (row) => (
      <span
        className="block max-w-[180px] truncate"
        title={row.fornecedor_nome}
      >
        {row.fornecedor_nome}
      </span>
    ),
  },
];

export function ContratosTable({
  data,
  isLoading,
  isError,
  onRetry,
  page,
  pageSize,
  orderBy,
  orderDir,
  onPageChange,
  onPageSizeChange,
  onSortChange,
}: ContratosTableProps) {
  return (
    <div className="flex flex-col gap-4">
      <div className="overflow-x-auto rounded-md border">
        <DataTable<Contrato>
          columns={COLUMNS}
          data={data?.data ?? []}
          isLoading={isLoading}
          isError={isError}
          onRetry={onRetry}
          emptyMessage="Nenhum contrato encontrado para os filtros selecionados."
          sort={{ by: orderBy, dir: orderDir }}
          onSortChange={onSortChange}
        />
      </div>

      {data && data.total_pages > 0 && (
        <Pagination
          page={page}
          totalPages={data.total_pages}
          pageSize={pageSize}
          total={data.total}
          onPageChange={onPageChange}
          onPageSizeChange={(size) => onPageSizeChange(size as PageSize)}
        />
      )}
    </div>
  );
}
