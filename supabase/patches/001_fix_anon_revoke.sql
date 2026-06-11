-- ============================================================
-- PATCH 001 — Revogar acesso anon às funções SECURITY DEFINER
-- Roda UMA VEZ no SQL Editor após a migration inicial.
-- ============================================================

-- PostgreSQL concede EXECUTE a PUBLIC por padrão em funções.
-- anon herda de PUBLIC, então REVOKE FROM anon sozinho não basta.
-- Revogamos de PUBLIC e re-concedemos explicitamente a authenticated.

-- 1. Revogar de PUBLIC (elimina herança para anon)
REVOKE EXECUTE ON FUNCTION public.fn_set_updated_at()    FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable()      FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_dashboard_stats()  FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_filter_options()   FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_orgao_detail(text) FROM PUBLIC;

REVOKE EXECUTE ON FUNCTION public.list_orgaos(
  text, text, text, text, numeric, numeric, text, text, integer, integer
) FROM PUBLIC;

REVOKE EXECUTE ON FUNCTION public.list_contratos(
  text, text, numeric, numeric, date, date, text, text, text, integer, integer
) FROM PUBLIC;

REVOKE EXECUTE ON FUNCTION public.export_orgaos(
  text, text, text, text, numeric, numeric
) FROM PUBLIC;

-- 2. Re-conceder explicitamente a authenticated (as 6 RPCs de dados)
GRANT EXECUTE ON FUNCTION public.get_dashboard_stats()  TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_filter_options()   TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_orgao_detail(text) TO authenticated;

GRANT EXECUTE ON FUNCTION public.list_orgaos(
  text, text, text, text, numeric, numeric, text, text, integer, integer
) TO authenticated;

GRANT EXECUTE ON FUNCTION public.list_contratos(
  text, text, numeric, numeric, date, date, text, text, text, integer, integer
) TO authenticated;

GRANT EXECUTE ON FUNCTION public.export_orgaos(
  text, text, text, text, numeric, numeric
) TO authenticated;
