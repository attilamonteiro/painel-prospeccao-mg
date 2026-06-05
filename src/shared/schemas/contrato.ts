/**
 * Zod schemas for Contrato (Contract) domain
 */

import { z } from 'zod';
import { paginatedSchema } from './common';

export const ContratoSchema = z.object({
  id: z.number().int().positive(),
  numero_controle_pncp: z.string().min(1),
  orgao_cnpj: z.string().min(1),
  numero: z.string().min(1),
  objeto: z.string().min(1),
  modalidade: z.string().min(1),
  valor_inicial: z.number().nonnegative(),
  valor_final: z.number().nonnegative(),
  data_assinatura: z.string().nullable(),
  data_vigencia_inicio: z.string().nullable(),
  data_vigencia_fim: z.string().nullable(),
  fornecedor_cnpj: z.string().min(1),
  fornecedor_nome: z.string().min(1),
  categoria: z.string().min(1),
  criado_em: z.string(),
  orgao_nome: z.string().optional(),
  orgao_municipio: z.string().optional(),
});

export const PaginatedContratoSchema = paginatedSchema(ContratoSchema);
