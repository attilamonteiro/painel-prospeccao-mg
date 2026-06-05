/**
 * Zod schemas for Dashboard domain
 */

import { z } from 'zod';

const TopCategoriaSchema = z.object({
  categoria: z.string().min(1),
  total: z.number().int().nonnegative(),
});

const TopMunicipioSchema = z.object({
  municipio: z.string().min(1),
  total_orgaos: z.number().int().nonnegative(),
  valor_total: z.number().nonnegative(),
});

export const DashboardStatsSchema = z.object({
  total_orgaos: z.number().int().nonnegative(),
  total_contratos: z.number().int().nonnegative(),
  valor_total: z.number().nonnegative(),
  orgaos_com_contato: z.number().int().nonnegative(),
  ultimos_30_dias: z.number().int().nonnegative(),
  top_categorias: z.array(TopCategoriaSchema),
  top_municipios: z.array(TopMunicipioSchema),
});
