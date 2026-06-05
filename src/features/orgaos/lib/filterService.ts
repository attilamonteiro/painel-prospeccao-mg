import { createClient } from '@/shared/lib/supabase/client';
import { FilterOptionsSchema } from '@/shared/schemas/filters';
import type { FilterOptions } from '@/shared/types/filters';

export const filterService = {
  async getOptions(): Promise<FilterOptions> {
    const supabase = createClient();

    const { data, error } = await supabase.rpc('get_filter_options');

    if (error) {
      throw new Error(error.message);
    }

    return FilterOptionsSchema.parse(data);
  },
};
