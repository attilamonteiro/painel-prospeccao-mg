# Crawler PNCP → Supabase (n8n)

Coleta órgãos/secretarias e contratações de **Minas Gerais** no
[PNCP](https://pncp.gov.br) e grava nas tabelas `orgaos` e `contratos` do Supabase
(via `service_role`, padrão RPC-first do projeto: o crawler é o **único** que escreve).

```
PNCP /contratacoes/publicacao?uf=MG  ──>  transform  ──>  (BrasilAPI: contato)  ──>  upsert Supabase
```

## Arquivos

| Arquivo | O quê |
|---|---|
| `pncp-mg-crawler.workflow.json` | **Workflow do n8n** — importe este arquivo. |
| `lib/transform.mjs` | Transformação pura PNCP → linhas (fonte da verdade). |
| `dry-run.mjs` | Testa coleta+transform contra o PNCP **sem escrever** no banco. |
| `seed.mjs` | **Popula o Supabase sem n8n** — coleta+transform+upsert em 1 comando. |
| `build.mjs` | Regera o `.workflow.json` a partir do `transform.mjs`. |

## Pré-requisitos

1. **Schema aplicado** no Supabase (`supabase/migrations/0001_init_rpc_schema.sql`) —
   ainda é o blocker T0. Sem as tabelas `orgaos`/`contratos`, o upsert falha com 404.
2. **`service_role`** do projeto (Dashboard → Settings → API). Nunca vai no Git.

## Sem n8n — seed direto (forma mais rápida)

Pré-requisitos: schema aplicado (T0) + a `service_role` no ambiente (NUNCA commitada — você cola no seu terminal).

```powershell
# PowerShell, em C:\Users\atmal\painel-prospeccao-mg
$env:SUPABASE_SERVICE_ROLE_KEY = 'cole_a_service_role_aqui'
node n8n/seed.mjs                                        # 90 dias, modalidades 6 e 8
$env:DIAS='90'; $env:MODALIDADES='6,8,4'; node n8n/seed.mjs
```

Saída: `{ contratacoes_coletadas, orgaos_upsertados, contratos_upsertados }`.
Re-rodar **não duplica** (upsert por `cnpj` / `numero_controle_pncp`). Teste antes sem escrever: `node n8n/dry-run.mjs`.

## Como usar no n8n

1. **Importe** `pncp-mg-crawler.workflow.json` (n8n → *Workflows* → *Import from File*).
2. Configure o segredo numa das formas (o workflow lê `$env`):
   - self-hosted: `SUPABASE_SERVICE_ROLE_KEY=...` (e opcional `SUPABASE_URL=...`) no `.env` do servidor n8n; ou
   - **n8n Variables** (Settings → Variables): crie `SUPABASE_SERVICE_ROLE_KEY`.
   > Se sua instância bloqueia `$env` em nós, troque no Code node `$env.SUPABASE_SERVICE_ROLE_KEY`
   > por uma credencial — mas **não** cole a chave dentro do JSON versionado.
3. Clique **Execute Workflow**. A saída traz `{ contratacoes_coletadas, orgaos_upsertados, contratos_upsertados }`.
4. Verifique no SQL Editor: `select count(*) from orgaos; select * from orgaos order by valor_total_contratos desc limit 5;`

### Agendar (rodar sozinho)
Troque o nó **Disparar** (Manual Trigger) por um **Schedule Trigger** (ex.: diário às 6h).
Para manter atualizado de forma incremental, reduza `DIAS_JANELA` no Code node (ex.: 2)
— o `on_conflict` faz upsert, então re-rodar não duplica.

## Configuração (topo do Code node)

| Const | Padrão | O quê |
|---|---|---|
| `MODALIDADES` | `[6, 8]` | 6=Pregão Eletrônico, 8=Dispensa. Amplie: 4,5,7,9,12. |
| `DIAS_JANELA` | `90` | Janela por data de publicação. |
| `ENRIQUECER` | `true` | Busca email/telefone/CEP por CNPJ na BrasilAPI. |
| `ENRIQUECER_MAX` | `200` | Teto de chamadas de enriquecimento/execução (rate-limit). |
| `LOTE` | `500` | Linhas por POST no Supabase. |

## Validar localmente (sem n8n, sem escrever)

```bash
node n8n/dry-run.mjs                 # 30 dias, modalidades 6 e 8
DIAS=90 MODALIDADES=6,8,4 node n8n/dry-run.mjs
```

Depois de editar `lib/transform.mjs`, **regere o workflow**: `node n8n/build.mjs`.

## Decisões & limitações conhecidas

- **Granularidade = órgão/prefeitura (CNPJ).** A tabela `orgaos` tem `cnpj` único, e cada
  município tem um CNPJ. A secretaria específica fica em `nome_fantasia`/`nome_unidade`.
- **Fonte = contratações (`/contratacoes/publicacao`)**, não contratos assinados. É o que
  permite filtrar por `uf=MG` no servidor e já traz órgão+valor+objeto. `fornecedor_*` fica
  nulo (vem de `/v1/contratos?cnpjOrgao=` — enriquecimento futuro v2).
- **Agregados = snapshot da janela.** `total_contratos`/`valor_total_contratos` refletem o
  período de `DIAS_JANELA`, não o histórico completo. Para acumular, use janela ampla numa
  carga inicial ou migre a agregação para o Postgres.
- **Outliers do PNCP.** Alguns órgãos lançam `valorTotalEstimado` absurdo (ex.: bilhões num
  município pequeno). São dados crus do PNCP, não erro do crawler — considere filtrar no
  frontend ou limpar antes de campanhas.
- **BrasilAPI** tem rate-limit; por isso `ENRIQUECER_MAX`. Públicos nem sempre têm email na Receita.
</content>
