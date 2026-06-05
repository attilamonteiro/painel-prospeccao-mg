# Design — Painel de Prospecção Pública MG

## Fluxo de dados (RPC-first)
```
Component → Hook (React Query) → Service (supabase.rpc) → [Zod parse] → tipos
                                         │
                              Postgres RPC SECURITY DEFINER → tabelas (RLS bloqueia acesso direto)
```
Regra: nenhuma camada acima do Service conhece o Supabase. O Service é o ÚNICO lugar com `supabase.rpc(...)`.

## Estrutura de pastas (as-built)
```
src/
├─ app/
│  ├─ layout.tsx                  # providers + fontes
│  ├─ page.tsx                    # redirect → /dashboard
│  ├─ login/page.tsx
│  ├─ dashboard/page.tsx
│  ├─ orgaos/page.tsx
│  └─ contratos/page.tsx
├─ components/ui/*                # shadcn (Radix) — primitivas
├─ features/
│  ├─ auth/        (LoginForm, useAuth)
│  ├─ dashboard/   (StatsCards, TopCategorias, TopMunicipios, useDashboardStats, dashboardService)
│  ├─ orgaos/      (OrgaosTable, OrgaoFilters, OrgaoDetail, OrgaoExport, useOrgaos, useFilterOptions, orgaosService, filterService, orgaoSchema)
│  └─ contratos/   (ContratosTable, ContratoFilters, useContratos, contratosService, contratoSchema)
├─ shared/
│  ├─ components/  (DataTable, Pagination, SearchInput, ExportButton, CopyButton, Sidebar, StateHandler)
│  ├─ hooks/       (usePagination, useDebounce)
│  ├─ lib/
│  │  ├─ supabase/ (client.ts, server.ts, middleware.ts)
│  │  ├─ formatters.ts (formatBRL, formatDate, formatCNPJ)
│  │  ├─ csv.ts        (generateCSV, downloadCSV)
│  │  └─ constants.ts
│  ├─ schemas/     (paginated.ts, primitives Zod reutilizáveis)
│  └─ types/       (orgao, contrato, dashboard, filters, common)
├─ providers/      (QueryProvider, AuthProvider)
├─ lib/utils.ts    # cn (shadcn)
└─ middleware.ts   # (ou proxy.ts no Next 16 — confirmar) auth Supabase
```

## Padrão de Service
```ts
export const orgaosService = {
  async list(filters: OrgaoFilters): Promise<PaginatedResponse<Orgao>> {
    const supabase = createClient();
    const { data, error } = await supabase.rpc('list_orgaos', filters);
    if (error) throw new Error(error.message);
    return PaginatedOrgaoSchema.parse(data);     // Zod valida o contrato
  },
};
```

## Padrão de Hook
```ts
export function useOrgaos(filters: OrgaoFilters) {
  return useQuery({
    queryKey: ['orgaos', filters],
    queryFn: () => orgaosService.list(filters),
    placeholderData: keepPreviousData,           // paginação suave
  });
}
```

## Estados & erros (StateHandler)
Wrapper único que recebe `{ isLoading, isError, isEmpty }` e renderiza skeleton / erro+retry / empty / children.
Stop conditions: 401/403 → `/login`; `too_many_records` → aviso refinar filtros; 3 erros seguidos na mesma RPC → erro permanente + sugerir reload.

## Auth (SSR)
`client.ts` = `createBrowserClient`. `server.ts` = `createServerClient` com `cookies()` (`await` no Next 15/16).
Middleware/proxy revalida sessão e protege `/dashboard`, `/orgaos`, `/contratos`. Não logado → `/login`.

## Validação Zod
Um schema por DTO + `PaginatedResponse<T>` genérico. Service faz `.parse()`; falha de contrato vira erro tratável
(não quebra a UI silenciosamente). Tipos derivam de `z.infer` OU os DTOs da spec — manter um só fonte por tipo.

## Plano de execução (Dynamic Workflow)
- **Inline (Opus)**: T1–T3 (fundação coerente: supabase, auth, layout, tipos, schemas, shared UI).
- **Workflow fan-out (Sonnet)**: T4, T5→T6→{T7,T9}, T8 — cada feature é um agente, escreve sua fatia.
- **Haiku**: geração/checagem de schemas Zod a partir dos DTOs + testes de função pura.
- **Verificação adversarial (Opus/Sonnet)**: por fatia, conferir ARCH-1 (zero `from()`), QUAL-1 (estados),
  params de RPC corretos, zero `any`.
- **Gates (Opus, barreira final)**: lint + typecheck + build + grep.
