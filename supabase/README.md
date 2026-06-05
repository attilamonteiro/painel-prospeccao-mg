# Supabase — aplicar schema (T0)

Projeto: `afzjhphumlqoosgmkirb`. O frontend só fala com o banco via RPC (RPC-first).

## Opção A — SQL Editor (recomendado, sem CLI)
1. Dashboard Supabase → **SQL Editor** → New query.
2. Cole todo o conteúdo de `migrations/0001_init_rpc_schema.sql` e **Run**.
3. Confira em **Database → Functions**: devem aparecer `get_dashboard_stats`, `list_orgaos`,
   `get_orgao_detail`, `list_contratos`, `export_orgaos`, `get_filter_options`.

## Opção B — Supabase CLI
```bash
npx supabase login                       # access token
npx supabase link --project-ref afzjhphumlqoosgmkirb
npx supabase db push                     # pede a senha do Postgres
```

## Depois de aplicar
- As RPCs têm `GRANT EXECUTE ... TO authenticated` → **precisa de usuário logado** para chamá-las.
  Crie um usuário em **Authentication → Users** (ou via signup) para testar o painel com dados reais.
- As tabelas `orgaos`/`contratos` começam vazias; o crawler PNCP (n8n, com `service_role`) popula.
- Teste rápido como owner no SQL Editor: `select public.get_dashboard_stats();`

## Segurança
- A `service_role` / `sb_secret_` é só do backend do crawler (n8n). Nunca no frontend nem no Git.
- Se essas chaves vazaram em texto puro, **rotacione** em Settings → API.
