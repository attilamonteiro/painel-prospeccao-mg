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
   > **n8n v2+ bloqueia `$env` no Code node por padrão** (`N8N_BLOCK_ENV_ACCESS_IN_NODE=true`).
   > Suba o n8n com `N8N_BLOCK_ENV_ACCESS_IN_NODE=false` para o Code node ler `$env.SUPABASE_SERVICE_ROLE_KEY`.
   > Alternativa: troque no Code node por uma credencial — mas **não** cole a chave no JSON versionado.
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

## Enriquecer contatos dos órgãos (workflow separado)

Workflow dedicado que melhora os contatos dos órgãos **já existentes** no banco
(o crawler popula órgãos+contratos; este preenche email/telefone/site que faltam).

```
orgaos sem contato  ──>  OpenCNPJ (email/tel/endereço)  ──>  BrasilAPI (fallback)
                    ──>  deriva site_oficial do domínio do email institucional
                    ──>  scraping do site (email_licitacoes, best-effort)  ──>  PATCH Supabase
```

| Arquivo | O quê |
|---|---|
| `enrich-contatos.workflow.json` | **Workflow do n8n** — importe este. |
| `lib/enrich.mjs` | Lógica de enriquecimento (OpenCNPJ + BrasilAPI + scraping). |
| `dry-run-enrich.mjs` | Testa contra o banco **sem gravar** (mostra a cobertura). |
| `build-enrich.mjs` | Regera o `.workflow.json` a partir do `lib/enrich.mjs`. |

**Fontes** (todas gratuitas, sem chave): [OpenCNPJ](https://api.opencnpj.org) (~100 req/min,
motor primário) → [BrasilAPI](https://brasilapi.com.br) (fallback). O e-mail de **licitação**
raramente está na Receita — vem do scraping do site oficial.

**Cobertura medida** (amostra real de órgãos de MG, via `dry-run-enrich.mjs`):
~50% ganham `email_geral`, ~40% ganham `site_oficial`, ~5% ganham `email_licitacoes`
(scraping é best-effort: ~1/3 dos sites de prefeitura respondem — muitos têm TLS quebrado).
Leva a cobertura de e-mail de ~5% (65/1245) para ~50% dos restantes.

```powershell
# Validar sem gravar (mostra o que preencheria):
$env:SUPABASE_SERVICE_ROLE_KEY='...'; node n8n/dry-run-enrich.mjs 20
# Regerar o workflow após editar lib/enrich.mjs:
node n8n/build-enrich.mjs
```

No n8n: importe `enrich-contatos.workflow.json`, garanta `SUPABASE_SERVICE_ROLE_KEY`
no `$env` (mesma config do crawler), clique **Execute**. Processa `LIMITE` (120) órgãos por
execução — rode várias vezes até cobrir todos. Usa **PATCH** (só preenche o que falta, não
sobrescreve). O site já mostra os campos (tela de órgãos / detalhe) — o enriquecimento aparece
automaticamente. Para agendar, troque o **Disparar** por um **Schedule Trigger**.

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
