/** Esferas de atuação dos órgãos públicos */
export const ESFERAS = ['MUNICIPAL', 'ESTADUAL', 'FEDERAL'] as const;

/** Tipo derivado das esferas disponíveis */
export type Esfera = (typeof ESFERAS)[number];

/** Opções de tamanho de página para tabelas paginadas */
export const PAGE_SIZES = [25, 50, 100] as const;

/** Tipo derivado dos tamanhos de página */
export type PageSize = (typeof PAGE_SIZES)[number];

/** Tamanho de página padrão */
export const DEFAULT_PAGE_SIZE: PageSize = 25;

/** Direções de ordenação suportadas */
export const ORDER_DIRS = ['asc', 'desc'] as const;

/** Tipo derivado das direções de ordenação */
export type OrderDir = (typeof ORDER_DIRS)[number];

/** Colunas de ordenação padrão para a tabela de órgãos */
export const ORGAOS_ORDER_BY_DEFAULT = 'valor_total_contratos';

/** Colunas de ordenação padrão para a tabela de contratos */
export const CONTRATOS_ORDER_BY_DEFAULT = 'data_assinatura';

/** Máximo de registros permitidos na exportação CSV (definido pela RPC) */
export const EXPORT_MAX_RECORDS = 10_000;

/** staleTime longo para dados de referência que raramente mudam (30 min) */
export const REFERENCE_DATA_STALE_TIME_MS = 30 * 60 * 1_000;
