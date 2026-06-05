/**
 * Zod schemas for Filter options
 */

import { z } from 'zod';

export const FilterOptionsSchema = z.object({
  municipios: z.array(z.string()),
  esferas: z.array(z.string()),
  categorias: z.array(z.string()),
  modalidades: z.array(z.string()),
});
