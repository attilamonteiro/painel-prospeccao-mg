/**
 * Types for Orgao (Public Agency) domain
 * Response types are derived from Zod schemas to eliminate drift.
 * Input filter types (OrgaoFilters) remain as manual interfaces.
 */

import type { z } from 'zod';
import type { OrgaoSchema, OrgaoExportSchema } from '@/shared/schemas/orgao';

export type Orgao = z.infer<typeof OrgaoSchema>;
export type OrgaoExport = z.infer<typeof OrgaoExportSchema>;

export interface OrgaoFilters {
  p_search?: string;
  p_municipio?: string;
  p_esfera?: 'MUNICIPAL' | 'ESTADUAL' | 'FEDERAL';
  p_categoria?: string;
  p_valor_min?: number;
  p_valor_max?: number;
  p_page: number;
  p_page_size: number;
  p_order_by: string;
  p_order_dir: 'asc' | 'desc';
}
