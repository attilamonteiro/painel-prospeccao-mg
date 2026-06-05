# Tasks — Painel de Prospecção Pública MG

Legenda: **Modelo** = tier sugerido · **Cobre** = requisitos (spec.md) · `[P]` = paralelizável no workflow.
Gate global (T10): `pnpm lint && pnpm typecheck && pnpm build` + `grep "supabase.from(" src/` == 0.

---

## T0 — Aplicar schema no Supabase  · Modelo: Opus(prep)+Usuário · Cobre: SEC-2
- **O quê**: rodar `supabase/migrations/0001_init_rpc_schema.sql` no SQL Editor do projeto `afzjhphumlqoosgmkirb`.
- **Por quê manual**: DDL exige senha do Postgres (não fornecida). Sem isso as RPCs não existem.
- **Done when**: `select get_dashboard_stats();` retorna JSON (com usuário/owner). RPCs visíveis em Database → Functions.
- **Bloqueia**: dados reais em runtime (não bloqueia escrever o código).

## T1 — Scaffold  · Modelo: Haiku-class (comandos) · Cobre: ARCH-4  ✅ FEITO
- Next 16 + TS strict + Tailwind v4 + ESLint + src-dir + alias `@/*`; deps (supabase/ssr, supabase-js, react-query, zod, lucide-react); vitest; shadcn (Radix).
- **Gate**: `pnpm build` verde no scaffold base.

## T2 — Supabase SSR + Auth + middleware + /login  · Modelo: Sonnet · Cobre: AUTH-1,2,3 · SEC-1
- `shared/lib/supabase/{client,server,middleware}.ts`; `middleware.ts` (ou `proxy.ts` — confirmar Next 16).
- `features/auth/{components/LoginForm.tsx,hooks/useAuth.ts}`; `app/login/page.tsx`.
- **Done when**: login email/senha → redirect `/dashboard`; rotas protegidas; logout; 401/403 → `/login`.
- **Gate**: typecheck + build; navegação manual de auth coerente.

## T3 — Layout + shared + tipos + schemas + utils  · Modelo: Sonnet(+Haiku p/ tipos/Zod) · Cobre: ARCH-2,3 · QUAL-1,2
- `providers/{QueryProvider,AuthProvider}.tsx`; `app/layout.tsx` integra providers.
- `shared/components/{Sidebar,StateHandler,DataTable,Pagination,SearchInput,CopyButton,ExportButton}.tsx`.
- `shared/hooks/{usePagination,useDebounce}.ts`; `shared/lib/{formatters,csv,constants}.ts`.
- `shared/types/*` (orgao, contrato, dashboard, filters, common) + `shared/schemas/*` Zod (Haiku).
- **Gate**: typecheck + build; Sidebar navega; StateHandler cobre loading/error/empty.

---
## M2 — Features (Dynamic Workflow, fan-out Sonnet)

## T4 — Dashboard `[P]`  · Modelo: Sonnet · Cobre: DASH-1
- `features/dashboard/lib/dashboardService.ts` → `rpc('get_dashboard_stats')` + Zod.
- `hooks/useDashboardStats.ts`; componentes `StatsCards`, `TopCategorias`, `TopMunicipios`; `app/dashboard/page.tsx`.
- **Done when**: cards + tops renderizam; loading/error tratados.

## T5 — Filtros globais `[P]`  · Modelo: Sonnet · Cobre: ORG-2
- `features/orgaos/lib/filterService.ts` → `rpc('get_filter_options')` + Zod; `hooks/useFilterOptions.ts` (staleTime longo).
- **Done when**: hook retorna municipios/esferas/categorias/modalidades.

## T6 — Tabela de Órgãos  (dep: T5) · Modelo: Sonnet · Cobre: ORG-1, ORG-4
- `lib/orgaosService.ts` → `rpc('list_orgaos')` + Zod; `hooks/useOrgaos.ts` (keepPreviousData).
- `components/{OrgaosTable,OrgaoFilters}.tsx`; `app/orgaos/page.tsx`; paginação+ordenação server-side; badges categorias; CopyButton e-mail.
- **Done when**: filtros + paginação + ordenação funcionam; estados tratados.

## T7 — Detalhe do Órgão  (dep: T6) · Modelo: Sonnet · Cobre: ORG-3
- `orgaosService.getDetail` → `rpc('get_orgao_detail')`; `components/OrgaoDetail.tsx` (Sheet) com cadastro+contatos+contratos; tratar `not_found`.

## T8 — Tabela de Contratos `[P]`  · Modelo: Sonnet · Cobre: CON-1
- `features/contratos/lib/contratosService.ts` → `rpc('list_contratos')` + Zod; `hooks/useContratos.ts`;
  `components/{ContratosTable,ContratoFilters}.tsx`; `app/contratos/page.tsx`.

## T9 — Exportação CSV  (dep: T6) · Modelo: Sonnet · Cobre: EXP-1, ORG-4
- `orgaosService.export` → `rpc('export_orgaos')`; `OrgaoExport.tsx` + `shared/lib/csv.ts` (UTF-8 BOM, BRL, datas);
  tratar `too_many_records`.

---
## T10 — Polish + QA + Review adversarial  · Modelo: Opus · Cobre: QUAL-1,2,3 · ARCH-1
- Responsividade, skeletons, empty states, error boundaries.
- **Verificação adversarial** (por fatia): zero `supabase.from()`; estados tratados; params de RPC corretos; zero `any`.
- **Gate final**: `pnpm lint && pnpm typecheck && pnpm build` + `grep -r "supabase.from(" src/` == 0.

## Grafo de dependências
```
T0 (banco, paralelo ao código)
T1 → T2 → T3 → ┬ T4
               ├ T5 → T6 → ┬ T7
               │           └ T9
               └ T8
                 ↘ todos → T10
```
