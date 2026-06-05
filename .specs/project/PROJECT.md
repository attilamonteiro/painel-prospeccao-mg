# Painel de Prospecção Pública MG

## Visão
Ferramenta interna para o time de prospecção comercial (SDRs do setor público) acessar,
filtrar, analisar e exportar dados de órgãos públicos e contratos de Minas Gerais —
coletados via crawler PNCP + n8n — para gerar campanhas de outbound direcionadas.

## Problema & impacto
Encontrar prospects no setor público hoje leva horas. Objetivo: reduzir para minutos, com
segmentação por município, esfera, categoria de compra e volume de contratos, e exportação
direta (CSV) para ferramentas de outbound.

## Princípio arquitetural inegociável: RPC-first
O frontend **NUNCA** acessa tabelas diretamente. Toda comunicação frontend ↔ banco passa por
`supabase.rpc('fn', { params })`. As tabelas têm RLS ativo **sem policies** para anon/authenticated;
as 6 RPCs rodam como `SECURITY DEFINER` (owner) e são o único ponto de acesso de leitura.
**Zero `supabase.from()` no código** (verificado por grep no gate final).

## Stack
- Next.js 16 (App Router) + React 19 + TypeScript strict (zero `any`)
- Supabase: Auth + Postgres + RPC + SSR (`@supabase/ssr`)
- Tailwind v4 + shadcn/ui (base Radix)
- TanStack React Query (cache/estado server) + Zod (validação das respostas das RPCs)
- Deploy alvo: Vercel · Tier: Supabase free

## Fontes da verdade
- Spec original: `C:\Users\atmal\Downloads\prompt_dynamic_workflow_rpc.md`
- Schema/RPCs: `C:\Users\atmal\Downloads\supabase_schema_rpc.sql`
  → versionado em `supabase/migrations/0001_init_rpc_schema.sql`

## Critério de sucesso (resumo)
Fluxo Login → Dashboard → Filtrar → Detalhe → Exportar funcionando ponta-a-ponta;
`grep "supabase.from("` retorna zero; `typecheck`/`lint`/`build` limpos; responsivo.
