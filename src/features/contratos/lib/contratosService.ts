import { createClient } from '@/shared/lib/supabase/client';
import { PaginatedContratoSchema } from '@/shared/schemas/contrato';
import { FilterOptionsSchema } from '@/shared/schemas/filters';
import type { Contrato } from '@/shared/types/contrato';
import type { PaginatedResponse } from '@/shared/types/common';
import type { FilterOptions } from '@/shared/types/filters';
import type { ContratoFilters } from '../types/contrato';

export const contratosService = {
  async list(filters: ContratoFilters): Promise<PaginatedResponse<Contrato>> {
    const supabase = createClient();

    const { data, error } = await supabase.rpc('list_contratos', filters);

    if (error) {
      throw new Error(error.message);
    }

    return PaginatedContratoSchema.parse(data);
  },

  async getFilterOptions(): Promise<FilterOptions> {
    const supabase = createClient();

    const { data, error } = await supabase.rpc('get_filter_options');

    if (error) {
      throw new Error(error.message);
    }

    return FilterOptionsSchema.parse(data);
  },
};
