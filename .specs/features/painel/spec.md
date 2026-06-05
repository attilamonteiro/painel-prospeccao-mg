# Spec — Painel de Prospecção Pública MG

Origem: `prompt_dynamic_workflow_rpc.md`. IDs rastreáveis (usados em tasks.md → coluna "Cobre").

## Requisitos

### Arquitetura (ARCH)
- **ARCH-1** Todo acesso a dados via `supabase.rpc()`. Zero `supabase.from()` no código.
- **ARCH-2** Camadas: Service encapsula RPC → Hook (React Query) encapsula Service → Component consome Hook.
- **ARCH-3** Toda resposta de RPC é validada com Zod antes de uso.
- **ARCH-4** TypeScript strict, zero `any`. Estrutura feature-based.

### Segurança (SEC)
- **SEC-1** Frontend usa apenas a publishable/anon key (`NEXT_PUBLIC_*`). `service_role` jamais no cliente/Git.
- **SEC-2** RLS bloqueia acesso direto; RPCs `SECURITY DEFINER` são o único caminho de leitura.

### Autenticação (AUTH)
- **AUTH-1** Login com Supabase Auth (email/senha). Estados: idle | authenticating | error | authenticated.
- **AUTH-2** Sessão via `@supabase/ssr` (cookies). Middleware protege rotas autenticadas; 401/403 → `/login`.
- **AUTH-3** Logout com limpeza de sessão e redirect para `/login`.

### Dashboard (DASH)
- **DASH-1** `get_dashboard_stats()` → StatsCards (total_orgaos, total_contratos, valor_total,
  orgaos_com_contato, ultimos_30_dias) + TopCategorias + TopMunicipios. Estados loading|loaded|error.

### Órgãos (ORG)
- **ORG-1** `list_orgaos(...)` → DataTable paginada com filtros (busca, município, esfera, categoria,
  faixa de valor), ordenação server-side (`p_order_by` + `p_order_dir`). Estados loading|loaded|empty|error|filtering.
- **ORG-2** `get_filter_options()` → popular dropdowns (municipios, esferas, categorias, modalidades).
- **ORG-3** `get_orgao_detail(p_cnpj)` → Sheet/drawer com cadastro + contatos + contratos vinculados.
  Tratar `error: 'not_found'`.
- **ORG-4** Copiar e-mail (CopyButton) na linha/detalhe.

### Contratos (CON)
- **CON-1** `list_contratos(...)` → DataTable paginada com filtros (órgão, modalidade, valor, período, busca no objeto).

### Exportação (EXP)
- **EXP-1** `export_orgaos(filtros)` → CSV client-side (UTF-8 BOM, BRL, datas). Tratar
  `error: 'too_many_records'` (count, limit 10000) com aviso para refinar filtros.

### Qualidade (QUAL)
- **QUAL-1** Todos os componentes tratam loading | error | empty | loaded.
- **QUAL-2** Responsivo (mobile hamburger). Loading skeletons. Empty states. Error boundaries.
- **QUAL-3** Gates verdes: `lint`, `typecheck`, `build`, e `grep "supabase.from(" src/` == 0.

## Contratos das RPCs (entrada → saída)
| RPC | Params | Retorno |
|---|---|---|
| `get_dashboard_stats` | — | `DashboardStats` |
| `list_orgaos` | `p_search,p_municipio,p_esfera,p_categoria,p_valor_min,p_valor_max,p_order_by,p_order_dir,p_page,p_page_size` | `PaginatedResponse<Orgao>` |
| `get_orgao_detail` | `p_cnpj` | `{ orgao: Orgao, contratos: Contrato[] }` \| `{ error:'not_found' }` |
| `list_contratos` | `p_orgao_cnpj,p_modalidade,p_valor_min,p_valor_max,p_data_inicio,p_data_fim,p_search,p_order_by,p_order_dir,p_page,p_page_size` | `PaginatedResponse<Contrato>` |
| `export_orgaos` | `p_search,p_municipio,p_esfera,p_categoria,p_valor_min,p_valor_max` | `{ data:OrgaoExport[], total }` \| `{ error:'too_many_records', count, limit }` |
| `get_filter_options` | — | `FilterOptions` |

DTOs canônicos: ver `prompt_dynamic_workflow_rpc.md` §2 (Orgao, Contrato, DashboardStats, FilterOptions, PaginatedResponse).
