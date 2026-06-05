# STATE — Memória do Projeto

## Decisões
- [2026-06-05] **Local**: `C:\Users\atmal\painel-prospeccao-mg` — repo Git próprio, separado do brawl-analyzer.
- [2026-06-05] **Versões**: Next 16.2.7 + React 19.2.4 + Tailwind v4 + shadcn (base Radix).
  `create-next-app@latest` trouxe Next 16; mantido (eslint flat-config já está no estilo 16 — rebaixar
  para 15 geraria churn de config). Spec usa `await cookies()` → compatível com 15 e 16.
- [2026-06-05] **RPC-first** inegociável: zero `supabase.from()`; só `supabase.rpc()`. Gate de grep no T10.
- [2026-06-05] **Chaves**: frontend usa SOMENTE a publishable/anon key. `service_role` NUNCA no
  frontend nem no Git (uso exclusivo do n8n/crawler).
- [2026-06-05] **Execução**: Dynamic Workflow (ultracode). Fundação inline (orquestrador Opus);
  fan-out de features (Sonnet); tipos/Zod/testes triviais (Haiku); review final adversarial (Opus).
- [2026-06-05] **Layout shadcn**: primitivas em `@/components/ui` + `cn` em `@/lib/utils` (default shadcn);
  código compartilhado custom em `@/shared/*` (DataTable, supabase, formatters). Pequeno desvio
  cosmético do layout exato da spec.

## Blockers / Pendências
- [ABERTO] **T0 — schema NÃO aplicado** no Supabase (projeto `afzjhphumlqoosgmkirb`). DDL precisa da
  senha do Postgres (não fornecida e não deve ser colada no chat) → usuário roda
  `supabase/migrations/0001_init_rpc_schema.sql` no SQL Editor do dashboard.
- [ABERTO] RPCs têm `GRANT EXECUTE ... TO authenticated` → exigem usuário logado. Para ver dados reais
  é preciso criar um usuário em Supabase Auth **e** o crawler popular as tabelas.
- [SEGURANÇA] `service_role` e `sb_secret_` foram coladas em texto puro no chat → **rotacionar** no dashboard.

## Lições
- O `pnpm` v11 deste ambiente usa `allowBuilds: { pkg: true }` em `pnpm-workspace.yaml`
  (não `onlyBuiltDependencies`) e reescreve o arquivo; é preciso `pnpm rebuild sharp unrs-resolver`.
- `shadcn@latest init` exige `-t next -b radix` (flag `--base-color` foi removida; default = preset base-nova/Base UI).

## Preferências
- Idioma: PT-BR.
- Tarefas leves (validação, tipos, formatação, testes triviais) → modelos mais baratos (Haiku/Sonnet).

## Progresso (2026-06-05)
- **T1-T3** fundação: commit `156a8a4`. **T4-T10** features+polish: commit `7b640ed`.
- **3 Dynamic Workflows**: #1 fundação (6 agentes), #2 features+verificação adversarial (6 agentes), #3 review final 3-lentes.
- **Gates verdes**: lint 0, typecheck 0, build 0 (proxy ativo, sem deprecation), 28 testes, zero `supabase.from()`.
- **Runtime verificado**: dev server :3100, `/login` renderiza sem erro de console (redirect chain + proxy + providers + shadcn OK).
- `middleware.ts` → `proxy.ts` (Next 16). Filtros com isLoading/isError. SearchInput sem set-state-in-effect.
- **PENDENTE (você)**: T0 aplicar SQL no Supabase + criar usuário em Auth + crawler popular dados → ver dados reais.
- **Review final + fixes (workflows #3/#4)**: schemas Zod alinhados ao SQL (nullabilidade real, `categorias` é TEXT no export), tipos via `z.infer` (drift eliminado), `formatBRL` null-safe, CSV formatado (BRL/datas — EXP-1), logout na UI (AUTH-3), error boundaries `error.tsx`/`global-error.tsx` (QUAL-2), `getUser()` no AuthProvider + defense-in-depth (`getUser` no layout `(app)` → rotas autenticadas viram dinâmicas).
- Deferida (não-bloqueante, baixo risco): validação Zod do envelope de `export_orgaos`; `generateCSV` genérico; unificar `get_filter_options` duplicado (filterService vs contratosService).

## Deferred
- Testes de componente (RTL + jsdom) adiados; por ora apenas testes de função pura (formatters, csv, zod).
