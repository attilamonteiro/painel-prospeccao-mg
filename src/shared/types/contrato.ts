/**
 * Types for Contrato (Contract) domain
 */

export interface Contrato {
  id: number;
  numero_controle_pncp: string;
  orgao_cnpj: string;
  numero: string;
  objeto: string;
  modalidade: string;
  valor_inicial: number;
  valor_final: number;
  data_assinatura: string | null;
  data_vigencia_inicio: string | null;
  data_vigencia_fim: string | null;
  fornecedor_cnpj: string;
  fornecedor_nome: string;
  categoria: string;
  criado_em: string;
  orgao_nome?: string;
  orgao_municipio?: string;
}
