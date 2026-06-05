-- ============================================================
-- Schema: Crawler PNCP → Secretarias de Minas Gerais
-- Arquitetura: RPC-first (chamadas densas)
-- Auth: Supabase Auth + RLS
-- Destino: Supabase (PostgreSQL)
-- ============================================================

-- ============================================================
-- 1. TABELAS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.orgaos (
  id                    BIGSERIAL PRIMARY KEY,
  cnpj                  VARCHAR(18) UNIQUE NOT NULL,
  razao_social          TEXT,
  nome_fantasia         TEXT,
  esfera                TEXT,                  -- MUNICIPAL, ESTADUAL, FEDERAL
  poder                 TEXT,                  -- EXECUTIVO, LEGISLATIVO
  uf                    CHAR(2),               -- MG
  municipio             TEXT,
  codigo_ibge           VARCHAR(10),
  codigo_pncp           TEXT,
  site_oficial          TEXT,
  email_geral           TEXT,
  email_licitacoes      TEXT,
  telefone              TEXT,
  endereco              TEXT,
  cep                   VARCHAR(9),
  nome_responsavel      TEXT,
  cargo_responsavel     TEXT,
  email_responsavel     TEXT,
  total_contratos       INT       DEFAULT 0,
  valor_total_contratos NUMERIC   DEFAULT 0,
  ultimo_contrato_em    DATE,
  categorias_compra     TEXT[],
  fonte                 TEXT      DEFAULT 'PNCP',
  criado_em             TIMESTAMPTZ DEFAULT NOW(),
  atualizado_em         TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.contratos (
  id                    BIGSERIAL PRIMARY KEY,
  numero_controle_pncp  TEXT UNIQUE,
  orgao_cnpj            VARCHAR(18) REFERENCES public.orgaos(cnpj),
  numero                TEXT,
  objeto                TEXT,
  modalidade            TEXT,
  valor_inicial         NUMERIC,
  valor_final           NUMERIC,
  data_assinatura       DATE,
  data_vigencia_inicio  DATE,
  data_vigencia_fim     DATE,
  fornecedor_cnpj       TEXT,
  fornecedor_nome       TEXT,
  categoria             TEXT,
  criado_em             TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 2. ÍNDICES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_orgaos_uf            ON public.orgaos(uf);
CREATE INDEX IF NOT EXISTS idx_orgaos_municipio     ON public.orgaos(municipio);
CREATE INDEX IF NOT EXISTS idx_orgaos_cnpj          ON public.orgaos(cnpj);
CREATE INDEX IF NOT EXISTS idx_orgaos_esfera        ON public.orgaos(esfera);
CREATE INDEX IF NOT EXISTS idx_orgaos_valor_total   ON public.orgaos(valor_total_contratos DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_orgaos_search        ON public.orgaos USING gin(to_tsvector('portuguese', coalesce(razao_social,'') || ' ' || coalesce(nome_fantasia,'') || ' ' || coalesce(municipio,'')));
CREATE INDEX IF NOT EXISTS idx_contratos_orgao      ON public.contratos(orgao_cnpj);
CREATE INDEX IF NOT EXISTS idx_contratos_modalidade ON public.contratos(modalidade);
CREATE INDEX IF NOT EXISTS idx_contratos_data       ON public.contratos(data_assinatura DESC NULLS LAST);

-- ============================================================
-- 3. TRIGGER: atualizado_em automático
-- ============================================================

CREATE OR REPLACE FUNCTION public.fn_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.atualizado_em = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_orgaos_updated_at ON public.orgaos;
CREATE TRIGGER trg_orgaos_updated_at
  BEFORE UPDATE ON public.orgaos
  FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

-- ============================================================
-- 4. RLS — Nenhum acesso direto às tabelas pelo frontend
-- ============================================================

ALTER TABLE public.orgaos    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contratos ENABLE ROW LEVEL SECURITY;

-- Bloqueia acesso direto do anon e authenticated (forçar uso de RPCs)
-- Sem policies de SELECT para roles normais = acesso negado via .from()

-- Service role (n8n crawler) tem acesso total
CREATE POLICY "service_role_orgaos"
  ON public.orgaos FOR ALL
  TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "service_role_contratos"
  ON public.contratos FOR ALL
  TO service_role USING (true) WITH CHECK (true);

-- ============================================================
-- 5. RPCs — Toda comunicação frontend ↔ banco passa por aqui
-- ============================================================

-- ---------------------------------------------------------
-- RPC: get_dashboard_stats
-- Retorna métricas consolidadas para o dashboard
-- ---------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_dashboard_stats()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'total_orgaos',       (SELECT count(*) FROM orgaos WHERE uf = 'MG'),
    'total_contratos',    (SELECT count(*) FROM contratos),
    'valor_total',        (SELECT coalesce(sum(valor_total_contratos), 0) FROM orgaos WHERE uf = 'MG'),
    'orgaos_com_contato', (SELECT count(*) FROM orgaos WHERE uf = 'MG' AND (email_geral IS NOT NULL OR email_licitacoes IS NOT NULL OR telefone IS NOT NULL)),
    'ultimos_30_dias',    (SELECT count(*) FROM contratos WHERE data_assinatura >= CURRENT_DATE - INTERVAL '30 days'),
    'top_categorias',     (
      SELECT coalesce(json_agg(row_to_json(t)), '[]'::json)
      FROM (
        SELECT unnest(categorias_compra) AS categoria, count(*) AS total
        FROM orgaos WHERE uf = 'MG' AND categorias_compra IS NOT NULL
        GROUP BY categoria ORDER BY total DESC LIMIT 10
      ) t
    ),
    'top_municipios',     (
      SELECT coalesce(json_agg(row_to_json(t)), '[]'::json)
      FROM (
        SELECT municipio, count(*) AS total_orgaos, coalesce(sum(valor_total_contratos), 0) AS valor_total
        FROM orgaos WHERE uf = 'MG' AND municipio IS NOT NULL
        GROUP BY municipio ORDER BY valor_total DESC LIMIT 10
      ) t
    )
  ) INTO result;

  RETURN result;
END;
$$;

-- ---------------------------------------------------------
-- RPC: list_orgaos
-- Lista órgãos com filtros, paginação e ordenação server-side
-- ---------------------------------------------------------
CREATE OR REPLACE FUNCTION public.list_orgaos(
  p_search       TEXT    DEFAULT NULL,
  p_municipio    TEXT    DEFAULT NULL,
  p_esfera       TEXT    DEFAULT NULL,
  p_categoria    TEXT    DEFAULT NULL,
  p_valor_min    NUMERIC DEFAULT NULL,
  p_valor_max    NUMERIC DEFAULT NULL,
  p_order_by     TEXT    DEFAULT 'valor_total_contratos',
  p_order_dir    TEXT    DEFAULT 'desc',
  p_page         INT     DEFAULT 1,
  p_page_size    INT     DEFAULT 25
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_offset  INT := (p_page - 1) * p_page_size;
  v_total   BIGINT;
  v_data    JSON;
  v_order   TEXT;
BEGIN
  -- Sanitizar order_by (whitelist de colunas permitidas)
  IF p_order_by NOT IN ('razao_social', 'municipio', 'esfera', 'total_contratos', 'valor_total_contratos', 'ultimo_contrato_em', 'criado_em') THEN
    p_order_by := 'valor_total_contratos';
  END IF;

  IF p_order_dir NOT IN ('asc', 'desc') THEN
    p_order_dir := 'desc';
  END IF;

  -- Contar total com filtros
  SELECT count(*) INTO v_total
  FROM orgaos
  WHERE uf = 'MG'
    AND (p_search IS NULL OR to_tsvector('portuguese', coalesce(razao_social,'') || ' ' || coalesce(nome_fantasia,'') || ' ' || coalesce(municipio,'')) @@ plainto_tsquery('portuguese', p_search))
    AND (p_municipio IS NULL OR municipio ILIKE p_municipio)
    AND (p_esfera IS NULL OR esfera = p_esfera)
    AND (p_categoria IS NULL OR p_categoria = ANY(categorias_compra))
    AND (p_valor_min IS NULL OR valor_total_contratos >= p_valor_min)
    AND (p_valor_max IS NULL OR valor_total_contratos <= p_valor_max);

  -- Buscar dados paginados
  EXECUTE format(
    'SELECT coalesce(json_agg(row_to_json(t)), ''[]''::json)
     FROM (
       SELECT id, cnpj, razao_social, nome_fantasia, esfera, poder, uf, municipio,
              codigo_ibge, site_oficial, email_geral, email_licitacoes, telefone,
              endereco, cep, nome_responsavel, cargo_responsavel, email_responsavel,
              total_contratos, valor_total_contratos, ultimo_contrato_em,
              categorias_compra, criado_em, atualizado_em
       FROM orgaos
       WHERE uf = ''MG''
         AND ($1 IS NULL OR to_tsvector(''portuguese'', coalesce(razao_social,'''') || '' '' || coalesce(nome_fantasia,'''') || '' '' || coalesce(municipio,'''')) @@ plainto_tsquery(''portuguese'', $1))
         AND ($2 IS NULL OR municipio ILIKE $2)
         AND ($3 IS NULL OR esfera = $3)
         AND ($4 IS NULL OR $4 = ANY(categorias_compra))
         AND ($5 IS NULL OR valor_total_contratos >= $5)
         AND ($6 IS NULL OR valor_total_contratos <= $6)
       ORDER BY %I %s NULLS LAST
       LIMIT $7 OFFSET $8
     ) t',
    p_order_by, p_order_dir
  )
  INTO v_data
  USING p_search, p_municipio, p_esfera, p_categoria, p_valor_min, p_valor_max, p_page_size, v_offset;

  RETURN json_build_object(
    'data',       v_data,
    'total',      v_total,
    'page',       p_page,
    'page_size',  p_page_size,
    'total_pages', ceil(v_total::numeric / p_page_size)
  );
END;
$$;

-- ---------------------------------------------------------
-- RPC: get_orgao_detail
-- Retorna dados completos de um órgão pelo CNPJ
-- ---------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_orgao_detail(p_cnpj TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_orgao JSON;
  v_contratos JSON;
BEGIN
  -- Dados do órgão
  SELECT row_to_json(o) INTO v_orgao
  FROM (
    SELECT id, cnpj, razao_social, nome_fantasia, esfera, poder, uf, municipio,
           codigo_ibge, codigo_pncp, site_oficial, email_geral, email_licitacoes,
           telefone, endereco, cep, nome_responsavel, cargo_responsavel,
           email_responsavel, total_contratos, valor_total_contratos,
           ultimo_contrato_em, categorias_compra, fonte, criado_em, atualizado_em
    FROM orgaos
    WHERE cnpj = p_cnpj
  ) o;

  IF v_orgao IS NULL THEN
    RETURN json_build_object('error', 'not_found');
  END IF;

  -- Contratos vinculados (últimos 20)
  SELECT coalesce(json_agg(row_to_json(c)), '[]'::json) INTO v_contratos
  FROM (
    SELECT id, numero_controle_pncp, numero, objeto, modalidade,
           valor_inicial, valor_final, data_assinatura,
           data_vigencia_inicio, data_vigencia_fim,
           fornecedor_cnpj, fornecedor_nome, categoria, criado_em
    FROM contratos
    WHERE orgao_cnpj = p_cnpj
    ORDER BY data_assinatura DESC NULLS LAST
    LIMIT 20
  ) c;

  RETURN json_build_object(
    'orgao',     v_orgao,
    'contratos', v_contratos
  );
END;
$$;

-- ---------------------------------------------------------
-- RPC: list_contratos
-- Lista contratos com filtros, paginação e ordenação
-- ---------------------------------------------------------
CREATE OR REPLACE FUNCTION public.list_contratos(
  p_orgao_cnpj   TEXT    DEFAULT NULL,
  p_modalidade   TEXT    DEFAULT NULL,
  p_valor_min    NUMERIC DEFAULT NULL,
  p_valor_max    NUMERIC DEFAULT NULL,
  p_data_inicio  DATE    DEFAULT NULL,
  p_data_fim     DATE    DEFAULT NULL,
  p_search       TEXT    DEFAULT NULL,
  p_order_by     TEXT    DEFAULT 'data_assinatura',
  p_order_dir    TEXT    DEFAULT 'desc',
  p_page         INT     DEFAULT 1,
  p_page_size    INT     DEFAULT 25
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_offset  INT := (p_page - 1) * p_page_size;
  v_total   BIGINT;
  v_data    JSON;
BEGIN
  IF p_order_by NOT IN ('valor_final', 'valor_inicial', 'data_assinatura', 'objeto', 'modalidade', 'fornecedor_nome') THEN
    p_order_by := 'data_assinatura';
  END IF;

  IF p_order_dir NOT IN ('asc', 'desc') THEN
    p_order_dir := 'desc';
  END IF;

  SELECT count(*) INTO v_total
  FROM contratos
  WHERE (p_orgao_cnpj IS NULL OR orgao_cnpj = p_orgao_cnpj)
    AND (p_modalidade IS NULL OR modalidade ILIKE p_modalidade)
    AND (p_valor_min IS NULL OR valor_final >= p_valor_min)
    AND (p_valor_max IS NULL OR valor_final <= p_valor_max)
    AND (p_data_inicio IS NULL OR data_assinatura >= p_data_inicio)
    AND (p_data_fim IS NULL OR data_assinatura <= p_data_fim)
    AND (p_search IS NULL OR objeto ILIKE '%' || p_search || '%');

  EXECUTE format(
    'SELECT coalesce(json_agg(row_to_json(t)), ''[]''::json)
     FROM (
       SELECT c.id, c.numero_controle_pncp, c.orgao_cnpj, c.numero, c.objeto,
              c.modalidade, c.valor_inicial, c.valor_final, c.data_assinatura,
              c.data_vigencia_inicio, c.data_vigencia_fim,
              c.fornecedor_cnpj, c.fornecedor_nome, c.categoria, c.criado_em,
              o.razao_social AS orgao_nome, o.municipio AS orgao_municipio
       FROM contratos c
       LEFT JOIN orgaos o ON o.cnpj = c.orgao_cnpj
       WHERE ($1 IS NULL OR c.orgao_cnpj = $1)
         AND ($2 IS NULL OR c.modalidade ILIKE $2)
         AND ($3 IS NULL OR c.valor_final >= $3)
         AND ($4 IS NULL OR c.valor_final <= $4)
         AND ($5 IS NULL OR c.data_assinatura >= $5)
         AND ($6 IS NULL OR c.data_assinatura <= $6)
         AND ($7 IS NULL OR c.objeto ILIKE ''%%'' || $7 || ''%%'')
       ORDER BY %I %s NULLS LAST
       LIMIT $8 OFFSET $9
     ) t',
    p_order_by, p_order_dir
  )
  INTO v_data
  USING p_orgao_cnpj, p_modalidade, p_valor_min, p_valor_max, p_data_inicio, p_data_fim, p_search, p_page_size, v_offset;

  RETURN json_build_object(
    'data',       v_data,
    'total',      v_total,
    'page',       p_page,
    'page_size',  p_page_size,
    'total_pages', ceil(v_total::numeric / p_page_size)
  );
END;
$$;

-- ---------------------------------------------------------
-- RPC: export_orgaos
-- Exporta todos os órgãos que batem nos filtros (sem paginação)
-- Para gerar CSV no frontend
-- ---------------------------------------------------------
CREATE OR REPLACE FUNCTION public.export_orgaos(
  p_search       TEXT    DEFAULT NULL,
  p_municipio    TEXT    DEFAULT NULL,
  p_esfera       TEXT    DEFAULT NULL,
  p_categoria    TEXT    DEFAULT NULL,
  p_valor_min    NUMERIC DEFAULT NULL,
  p_valor_max    NUMERIC DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_data JSON;
  v_count BIGINT;
BEGIN
  -- Verificar limite de segurança (máx 10.000 registros)
  SELECT count(*) INTO v_count
  FROM orgaos
  WHERE uf = 'MG'
    AND (p_search IS NULL OR to_tsvector('portuguese', coalesce(razao_social,'') || ' ' || coalesce(nome_fantasia,'') || ' ' || coalesce(municipio,'')) @@ plainto_tsquery('portuguese', p_search))
    AND (p_municipio IS NULL OR municipio ILIKE p_municipio)
    AND (p_esfera IS NULL OR esfera = p_esfera)
    AND (p_categoria IS NULL OR p_categoria = ANY(categorias_compra))
    AND (p_valor_min IS NULL OR valor_total_contratos >= p_valor_min)
    AND (p_valor_max IS NULL OR valor_total_contratos <= p_valor_max);

  IF v_count > 10000 THEN
    RETURN json_build_object('error', 'too_many_records', 'count', v_count, 'limit', 10000);
  END IF;

  SELECT coalesce(json_agg(row_to_json(t)), '[]'::json) INTO v_data
  FROM (
    SELECT municipio, uf, razao_social, nome_fantasia, esfera, cnpj,
           email_geral, email_licitacoes, telefone, site_oficial,
           nome_responsavel, cargo_responsavel, email_responsavel,
           total_contratos, valor_total_contratos, ultimo_contrato_em,
           array_to_string(categorias_compra, ', ') AS categorias
    FROM orgaos
    WHERE uf = 'MG'
      AND (p_search IS NULL OR to_tsvector('portuguese', coalesce(razao_social,'') || ' ' || coalesce(nome_fantasia,'') || ' ' || coalesce(municipio,'')) @@ plainto_tsquery('portuguese', p_search))
      AND (p_municipio IS NULL OR municipio ILIKE p_municipio)
      AND (p_esfera IS NULL OR esfera = p_esfera)
      AND (p_categoria IS NULL OR p_categoria = ANY(categorias_compra))
      AND (p_valor_min IS NULL OR valor_total_contratos >= p_valor_min)
      AND (p_valor_max IS NULL OR valor_total_contratos <= p_valor_max)
    ORDER BY valor_total_contratos DESC NULLS LAST
  ) t;

  RETURN json_build_object('data', v_data, 'total', v_count);
END;
$$;

-- ---------------------------------------------------------
-- RPC: get_filter_options
-- Retorna valores únicos para popular dropdowns de filtro
-- ---------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_filter_options()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN json_build_object(
    'municipios', (
      SELECT coalesce(json_agg(t.municipio ORDER BY t.municipio), '[]'::json)
      FROM (SELECT DISTINCT municipio FROM orgaos WHERE uf = 'MG' AND municipio IS NOT NULL) t
    ),
    'esferas', (
      SELECT coalesce(json_agg(t.esfera), '[]'::json)
      FROM (SELECT DISTINCT esfera FROM orgaos WHERE uf = 'MG' AND esfera IS NOT NULL) t
    ),
    'categorias', (
      SELECT coalesce(json_agg(t.cat ORDER BY t.cat), '[]'::json)
      FROM (SELECT DISTINCT unnest(categorias_compra) AS cat FROM orgaos WHERE uf = 'MG') t
    ),
    'modalidades', (
      SELECT coalesce(json_agg(t.modalidade ORDER BY t.modalidade), '[]'::json)
      FROM (SELECT DISTINCT modalidade FROM contratos WHERE modalidade IS NOT NULL) t
    )
  );
END;
$$;

-- ============================================================
-- 6. GRANTS — RPCs acessíveis por authenticated
-- ============================================================

GRANT EXECUTE ON FUNCTION public.get_dashboard_stats()   TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_orgaos             TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_orgao_detail         TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_contratos           TO authenticated;
GRANT EXECUTE ON FUNCTION public.export_orgaos            TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_filter_options()     TO authenticated;

-- Revogar acesso direto às tabelas para anon e authenticated
-- (SECURITY DEFINER nas RPCs executa como owner, bypassando RLS)
REVOKE ALL ON public.orgaos    FROM anon, authenticated;
REVOKE ALL ON public.contratos FROM anon, authenticated;
