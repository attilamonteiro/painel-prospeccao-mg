'use client';

import { DataTable, type DataTableColumn } from '@/shared/components/DataTable';
import { Pagination } from '@/shared/components/Pagination';
import { CopyButton } from '@/shared/components/CopyButton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatBRL } from '@/shared/lib/formatters';
import type { Orgao } from '@/shared/types/orgao';
import type { PaginatedResponse } from '@/shared/types/common';
import type { PageSize } from '@/shared/lib/constants';

interface OrgaosTableProps {
  result: PaginatedResponse<Orgao> | undefined;
  isLoading: boolean;
  isError: boolean;
  page: number;
  pageSize: PageSize;
  orderBy: string;
  orderDir: 'asc' | 'desc';
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  onSortChange: (col: string) => void;
  onViewDetail: (cnpj: string) => void;
  onRetry?: () => void;
}

const ESFERA_VARIANT: Record<string, 'default' | 'secondary' | 'outline'> = {
  MUNICIPAL: 'secondary',
  ESTADUAL: 'default',
  FEDERAL: 'outline',
};

export function OrgaosTable({
  result,
  isLoading,
  isError,
  page,
  pageSize,
  orderBy,
  orderDir,
  onPageChange,
  onPageSizeChange,
  onSortChange,
  onViewDetail,
  onRetry,
}: OrgaosTableProps) {
  const columns: DataTableColumn<Orgao>[] = [
    {
      key: 'razao_social',
      header: 'Razão Social / Nome Fantasia',
      sortable: true,
      render: (row) => (
        <div className="flex flex-col">
          <span className="font-medium leading-tight">{row.razao_social}</span>
          {row.nome_fantasia && row.nome_fantasia !== row.razao_social && (
            <span className="text-xs text-muted-foreground">
              {row.nome_fantasia}
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'municipio',
      header: 'Município',
      sortable: true,
    },
    {
      key: 'esfera',
      header: 'Esfera',
      sortable: true,
      render: (row) => (
        <Badge variant={(row.esfera ? ESFERA_VARIANT[row.esfera] : undefined) ?? 'outline'}>
          {row.esfera}
        </Badge>
      ),
    },
    {
      key: 'total_contratos',
      header: 'Contratos',
      sortable: true,
      className: 'text-right',
      render: (row) => (
        <span className="tabular-nums">{row.total_contratos}</span>
      ),
    },
    {
      key: 'valor_total_contratos',
      header: 'Valor Total',
      sortable: true,
      className: 'text-right',
      render: (row) => (
        <span className="tabular-nums">{formatBRL(row.valor_total_contratos)}</span>
      ),
    },
    {
      key: 'categorias_compra',
      header: 'Categorias',
      render: (row) => (
        <div className="flex flex-wrap gap-1">
          {(row.categorias_compra ?? []).slice(0, 3).map((cat) => (
            <Badge key={cat} variant="outline" className="text-[10px]">
              {cat}
            </Badge>
          ))}
          {(row.categorias_compra ?? []).length > 3 && (
            <Badge variant="outline" className="text-[10px]">
              +{(row.categorias_compra ?? []).length - 3}
            </Badge>
          )}
        </div>
      ),
    },
    {
      key: 'email_geral',
      header: 'E-mail',
      render: (row) =>
        row.email_geral ? (
          <div className="flex items-center gap-1">
            <span className="max-w-[140px] truncate text-xs">
              {row.email_geral}
            </span>
            <CopyButton value={row.email_geral} label="Copiar e-mail" />
          </div>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      key: 'acao',
      header: '',
      render: (row) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onViewDetail(row.cnpj)}
        >
          Ver
        </Button>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-0">
      <DataTable<Orgao>
        columns={columns}
        data={result?.data ?? []}
        isLoading={isLoading}
        isError={isError}
        onRetry={onRetry}
        emptyMessage="Nenhum órgão encontrado para os filtros aplicados."
        sort={{ by: orderBy, dir: orderDir }}
        onSortChange={onSortChange}
      />
      {result && (
        <Pagination
          page={page}
          totalPages={result.total_pages}
          pageSize={pageSize}
          total={result.total}
          onPageChange={onPageChange}
          onPageSizeChange={onPageSizeChange}
        />
      )}
    </div>
  );
}
