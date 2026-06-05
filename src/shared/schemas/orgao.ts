/**
 * Zod schemas for Orgao (Public Agency) domain
 * Nullability aligned with SQL (0001_init_rpc_schema.sql):
 *   NOT NULL: id, cnpj, total_contratos, valor_total_contratos, criado_em, atualizado_em
 *   uf is always 'MG' — kept as non-nullable string
 *   Everything else is nullable
 */

import { z } from 'zod';
import { paginatedSchema } from './common';
import { ContratoSchema } from './contrato';

export const OrgaoSchema = z.object({
  id: z.number().int().positive(),
  cnpj: z.string().min(1),
  razao_social: z.string().nullable(),
  nome_fantasia: z.string().nullable(),
  esfera: z.enum(['MUNICIPAL', 'ESTADUAL', 'FEDERAL']).nullable(),
  poder: z.string().nullable(),
  uf: z.string().min(1),
  municipio: z.string().nullable(),
  codigo_ibge: z.string().nullable(),
  site_oficial: z.string().nullable(),
  email_geral: z.string().nullable(),
  email_licitacoes: z.string().nullable(),
  telefone: z.string().nullable(),
  endereco: z.string().nullable(),
  cep: z.string().nullable(),
  nome_responsavel: z.string().nullable(),
  cargo_responsavel: z.string().nullable(),
  email_responsavel: z.string().nullable(),
  total_contratos: z.number().int().nonnegative(),
  valor_total_contratos: z.number().nonnegative(),
  ultimo_contrato_em: z.string().nullable(),
  categorias_compra: z.array(z.string()).nullable(),
  criado_em: z.string(),
  atualizado_em: z.string(),
});

export const PaginatedOrgaoSchema = paginatedSchema(OrgaoSchema);

export const OrgaoDetailSchema = z.object({
  orgao: OrgaoSchema,
  contratos: z.array(ContratoSchema),
});

// export_orgaos returns categorias as TEXT (array_to_string), not an array
export const OrgaoExportSchema = z.object({
  municipio: z.string().nullable(),
  uf: z.string().min(1),
  razao_social: z.string().nullable(),
  nome_fantasia: z.string().nullable(),
  esfera: z.string().nullable(),
  cnpj: z.string().min(1),
  email_geral: z.string().nullable(),
  email_licitacoes: z.string().nullable(),
  telefone: z.string().nullable(),
  site_oficial: z.string().nullable(),
  nome_responsavel: z.string().nullable(),
  cargo_responsavel: z.string().nullable(),
  email_responsavel: z.string().nullable(),
  total_contratos: z.number().int().nonnegative(),
  valor_total_contratos: z.number().nonnegative(),
  ultimo_contrato_em: z.string().nullable(),
  categorias: z.string().nullable(),
});
