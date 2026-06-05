import { createClient } from '@/shared/lib/supabase/client';
import {
  PaginatedOrgaoSchema,
  OrgaoDetailSchema,
  OrgaoExportSchema,
} from '@/shared/schemas/orgao';
import type { Orgao, OrgaoFilters, OrgaoExport } from '@/shared/types/orgao';
import type { PaginatedResponse } from '@/shared/types/common';

type OrgaoDetail = {
  orgao: Orgao;
  contratos: import('@/shared/types/contrato').Contrato[];
};

export const orgaosService = {
  async list(filters: OrgaoFilters): Promise<PaginatedResponse<Orgao>> {
    const supabase = createClient();

    const { data, error } = await supabase.rpc('list_orgaos', filters);

    if (error) {
      throw new Error(error.message);
    }

    return PaginatedOrgaoSchema.parse(data);
  },

  async getDetail(cnpj: string): Promise<OrgaoDetail> {
    const supabase = createClient();

    const { data, error } = await supabase.rpc('get_orgao_detail', {
      p_cnpj: cnpj,
    });

    if (error) {
      throw new Error(error.message);
    }

    if ((data as { error?: string } | null)?.error === 'not_found') {
      throw new Error('not_found');
    }

    return OrgaoDetailSchema.parse(data);
  },

  async export(
    filters: Pick<
      OrgaoFilters,
      | 'p_search'
      | 'p_municipio'
      | 'p_esfera'
      | 'p_categoria'
      | 'p_valor_min'
      | 'p_valor_max'
    >,
  ): Promise<OrgaoExport[]> {
    const supabase = createClient();

    const { data, error } = await supabase.rpc('export_orgaos', filters);

    if (error) {
      throw new Error(error.message);
    }

    const result = data as
      | { data: OrgaoExport[]; total: number }
      | { error: 'too_many_records'; count: number; limit: number }
      | null;

    if (result && 'error' in result && result.error === 'too_many_records') {
      const err = new Error('too_many_records');
      (err as Error & { count: number; limit: number }).count = result.count;
      (err as Error & { count: number; limit: number }).limit = result.limit;
      throw err;
    }

    if (!result || !('data' in result)) {
      return [];
    }

    return OrgaoExportSchema.array().parse(result.data);
  },
};
