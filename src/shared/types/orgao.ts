/**
 * Types for Orgao (Public Agency) domain
 */

export interface Orgao {
  id: number;
  cnpj: string;
  razao_social: string;
  nome_fantasia: string;
  esfera: 'MUNICIPAL' | 'ESTADUAL' | 'FEDERAL';
  poder: string;
  uf: string;
  municipio: string;
  codigo_ibge: string;
  site_oficial: string | null;
  email_geral: string | null;
  email_licitacoes: string | null;
  telefone: string | null;
  endereco: string | null;
  cep: string | null;
  nome_responsavel: string | null;
  cargo_responsavel: string | null;
  email_responsavel: string | null;
  total_contratos: number;
  valor_total_contratos: number;
  ultimo_contrato_em: string | null;
  categorias_compra: string[];
  criado_em: string;
  atualizado_em: string;
}

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

export interface OrgaoExport {
  municipio: string;
  uf: string;
  razao_social: string;
  nome_fantasia: string;
  esfera: string;
  cnpj: string;
  email_geral: string | null;
  email_licitacoes: string | null;
  telefone: string | null;
  site_oficial: string | null;
  nome_responsavel: string | null;
  cargo_responsavel: string | null;
  email_responsavel: string | null;
  total_contratos: number;
  valor_total_contratos: number;
  ultimo_contrato_em: string | null;
  categorias: string[];
}
