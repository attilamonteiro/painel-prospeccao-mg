# Roadmap

## M0 — Banco (pré-requisito)
- **T0** Aplicar schema/RPCs no Supabase (SQL Editor). Sem isso as RPCs não respondem.

## M1 — Fundação (determinística — orquestrador inline)
- **T1** Scaffold: Next + deps + shadcn/ui
- **T2** Supabase SSR + Auth + middleware/proxy + `/login`
- **T3** Layout + Sidebar + StateHandler + tipos + schemas Zod + formatters/csv

## M2 — Features (Dynamic Workflow — fan-out)
- **T4** Dashboard — `get_dashboard_stats`
- **T5** Filtros globais — `get_filter_options`
- **T6** Tabela de Órgãos — `list_orgaos`        (dep: T5)
- **T7** Detalhe do Órgão — `get_orgao_detail`   (dep: T6)
- **T8** Tabela de Contratos — `list_contratos`
- **T9** Exportação CSV — `export_orgaos`         (dep: T6)

## M3 — Qualidade
- **T10** Polish + QA + gates (lint/typecheck/build/grep) + review adversarial (Opus)

## Futuro (fora de escopo)
Crawler Brasil inteiro · analytics/Recharts · integração Apollo/Instantly ·
pgvector/busca semântica · MCP server próprio.
