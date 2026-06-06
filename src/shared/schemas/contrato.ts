/**
 * Zod schemas for Contrato (Contract) domain
 * Nullability aligned with SQL (0001_init_rpc_schema.sql):
 *   NOT NULL: id, criado_em
 *   NULLABLE: all other columns
 *   orgao_nome, orgao_municipio come from LEFT JOIN — optional and nullable
 */

import { z } from 'zod';
import { paginatedSchema } from './common';

export const ContratoSchema = z.object({
  id: z.number().int().positive(),
  numero_controle_pncp: z.string().nullable(),
  orgao_cnpj: z.string().nullable().optional(),
  numero: z.string().nullable(),
  objeto: z.string().nullable(),
  modalidade: z.string().nullable(),
  valor_inicial: z.number().nullable(),
  valor_final: z.number().nullable(),
  data_assinatura: z.string().nullable(),
  data_vigencia_inicio: z.string().nullable(),
  data_vigencia_fim: z.string().nullable(),
  fornecedor_cnpj: z.string().nullable(),
  fornecedor_nome: z.string().nullable(),
  categoria: z.string().nullable(),
  criado_em: z.string(),
  orgao_nome: z.string().nullable().optional(),
  orgao_municipio: z.string().nullable().optional(),
});

export const PaginatedContratoSchema = paginatedSchema(ContratoSchema);
