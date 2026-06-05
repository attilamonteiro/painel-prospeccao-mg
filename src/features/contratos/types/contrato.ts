import type { OrderDir, PageSize } from '@/shared/lib/constants';

/**
 * Filters passed to list_contratos RPC.
 * All fields except pagination/sort are optional.
 */
export interface ContratoFilters {
  p_orgao_cnpj?: string;
  p_modalidade?: string;
  p_valor_min?: number;
  p_valor_max?: number;
  p_data_inicio?: string;
  p_data_fim?: string;
  p_search?: string;
  p_order_by: string;
  p_order_dir: OrderDir;
  p_page: number;
  p_page_size: PageSize;
}
