/**
 * Zod schemas for Orgao (Public Agency) domain
 */

import { z } from 'zod';
import { paginatedSchema } from './common';
import { ContratoSchema } from './contrato';

export const OrgaoSchema = z.object({
  id: z.number().int().positive(),
  cnpj: z.string().min(1),
  razao_social: z.string().min(1),
  nome_fantasia: z.string().min(1),
  esfera: z.enum(['MUNICIPAL', 'ESTADUAL', 'FEDERAL']),
  poder: z.string().min(1),
  uf: z.string().min(1),
  municipio: z.string().min(1),
  codigo_ibge: z.string().min(1),
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
  categorias_compra: z.array(z.string()),
  criado_em: z.string(),
  atualizado_em: z.string(),
});

export const PaginatedOrgaoSchema = paginatedSchema(OrgaoSchema);

export const OrgaoDetailSchema = z.object({
  orgao: OrgaoSchema,
  contratos: z.array(ContratoSchema),
});

export const OrgaoExportSchema = z.object({
  municipio: z.string().min(1),
  uf: z.string().min(1),
  razao_social: z.string().min(1),
  nome_fantasia: z.string().min(1),
  esfera: z.string().min(1),
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
  categorias: z.array(z.string()),
});
