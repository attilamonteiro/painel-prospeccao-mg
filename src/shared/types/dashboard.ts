/**
 * Types for Dashboard domain
 */

export interface DashboardStats {
  total_orgaos: number;
  total_contratos: number;
  valor_total: number;
  orgaos_com_contato: number;
  ultimos_30_dias: number;
  top_categorias: Array<{
    categoria: string;
    total: number;
  }>;
  top_municipios: Array<{
    municipio: string;
    total_orgaos: number;
    valor_total: number;
  }>;
}
