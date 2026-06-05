'use client';

import { toast } from 'sonner';
import { ExportButton } from '@/shared/components/ExportButton';
import { generateCSV, downloadCSV } from '@/shared/lib/csv';
import { orgaosService } from '../lib/orgaosService';
import type { OrgaoFilters } from '@/shared/types/orgao';

type ExportFilters = Pick<
  OrgaoFilters,
  | 'p_search'
  | 'p_municipio'
  | 'p_esfera'
  | 'p_categoria'
  | 'p_valor_min'
  | 'p_valor_max'
>;

interface OrgaoExportProps {
  filters: ExportFilters;
}

const CSV_HEADERS = [
  { key: 'razao_social', label: 'Razão Social' },
  { key: 'nome_fantasia', label: 'Nome Fantasia' },
  { key: 'cnpj', label: 'CNPJ' },
  { key: 'esfera', label: 'Esfera' },
  { key: 'municipio', label: 'Município' },
  { key: 'uf', label: 'UF' },
  { key: 'email_geral', label: 'E-mail Geral' },
  { key: 'email_licitacoes', label: 'E-mail Licitações' },
  { key: 'telefone', label: 'Telefone' },
  { key: 'site_oficial', label: 'Site Oficial' },
  { key: 'nome_responsavel', label: 'Nome Responsável' },
  { key: 'cargo_responsavel', label: 'Cargo Responsável' },
  { key: 'email_responsavel', label: 'E-mail Responsável' },
  { key: 'total_contratos', label: 'Total Contratos' },
  { key: 'valor_total_contratos', label: 'Valor Total Contratos' },
  { key: 'ultimo_contrato_em', label: 'Último Contrato' },
  { key: 'categorias', label: 'Categorias' },
];

export function OrgaoExport({ filters }: OrgaoExportProps) {
  async function handleExport() {
    try {
      const rows = await orgaosService.export(filters);

      const csvRows = rows.map((r) => ({
        ...r,
        categorias: r.categorias.join(', '),
      })) as Record<string, unknown>[];

      const content = generateCSV(csvRows, CSV_HEADERS);
      downloadCSV('orgaos.csv', content);
    } catch (err) {
      if (err instanceof Error && err.message === 'too_many_records') {
        const typedErr = err as Error & { count?: number; limit?: number };
        toast.error(
          `Muitos registros (${typedErr.count?.toLocaleString('pt-BR') ?? ''}). ` +
            `Limite: ${typedErr.limit?.toLocaleString('pt-BR') ?? '10.000'}. ` +
            'Refine os filtros e tente novamente.',
        );
        return;
      }
      toast.error('Erro ao exportar. Tente novamente.');
    }
  }

  return <ExportButton onExport={handleExport} />;
}
