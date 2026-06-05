// Gera o arquivo de workflow do n8n (pncp-mg-crawler.workflow.json) a partir do
// MESMO transform.mjs usado no dry-run — assim a lógica nunca diverge.
// Uso: node n8n/build.mjs
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));

// 1) Lê o transform e remove os `export` para virar código local do Code node.
const transformSrc = (await readFile(join(here, 'lib', 'transform.mjs'), 'utf8'))
  .replace(/^export\s+/gm, '');

// 2) Wrapper executado dentro do Code node do n8n (modo "Run Once for All Items").
//    Usa this.helpers.httpRequest (rede), $now (data) e $env (segredo) do n8n.
const wrapper = `
// ===================== CONFIGURAÇÃO =====================
const UF = 'MG';
const MODALIDADES = [6, 8];   // 6=Pregão Eletrônico, 8=Dispensa. Amplie: 4,5 (Concorrência), 7 (Pregão Presencial), 9 (Inexigibilidade), 12 (Credenciamento).
const DIAS_JANELA = 90;       // coleta por DATA DE PUBLICAÇÃO (snapshot do período)
const TAM_PAGINA = 50;
const MAX_PAGINAS = 60;       // trava de segurança por modalidade
const ENRIQUECER = true;      // BrasilAPI: email/telefone/endereço/CEP por CNPJ
const ENRIQUECER_MAX = 200;   // teto de chamadas de enriquecimento por execução
const LOTE = 500;             // tamanho do lote no upsert do Supabase

const SUPABASE_URL = ($env.SUPABASE_URL || 'https://afzjhphumlqoosgmkirb.supabase.co').replace(/\\/+$/, '');
const SERVICE_ROLE = $env.SUPABASE_SERVICE_ROLE_KEY;
if (!SERVICE_ROLE) throw new Error('Defina a variável de ambiente SUPABASE_SERVICE_ROLE_KEY no n8n (Settings → Variables ou .env do servidor).');

const http = (opts) => this.helpers.httpRequest(opts);
const dataFinal = $now.toFormat('yyyyLLdd');
const dataInicial = $now.minus({ days: DIAS_JANELA }).toFormat('yyyyLLdd');

// ---------- 1. Coleta paginada no PNCP (filtro uf=MG server-side) ----------
const BASE = 'https://pncp.gov.br/api/consulta/v1/contratacoes/publicacao';
const todas = [];
for (const mod of MODALIDADES) {
  let pagina = 1, totalPaginas = 1;
  do {
    let resp;
    try {
      resp = await http({
        method: 'GET', url: BASE, json: true,
        qs: { dataInicial, dataFinal, codigoModalidadeContratacao: mod, uf: UF, pagina, tamanhoPagina: TAM_PAGINA },
      });
    } catch (e) { break; } // 204/400 em janela vazia: passa para a próxima modalidade
    if (!resp || !resp.data || resp.data.length === 0) break;
    todas.push(...resp.data);
    totalPaginas = resp.totalPaginas || 1;
    pagina++;
  } while (pagina <= totalPaginas && pagina <= MAX_PAGINAS);
}

// ---------- 2. Transformação (idêntica ao dry-run) ----------
const { orgaos, contratos } = construirLinhas(todas, { uf: UF });

// ---------- 3. Enriquecimento de contato (BrasilAPI) ----------
if (ENRIQUECER) {
  let n = 0;
  for (const o of orgaos) {
    if (n >= ENRIQUECER_MAX) break;
    n++;
    try {
      const cnpjDigits = o.cnpj.replace(/\\D/g, '');
      const d = await http({ method: 'GET', url: 'https://brasilapi.com.br/api/cnpj/v1/' + cnpjDigits, json: true });
      o.email_geral = d.email || o.email_geral;
      o.telefone = d.ddd_telefone_1 || o.telefone;
      if (d.cep) o.cep = String(d.cep).replace(/(\\d{5})(\\d{3})/, '$1-$2');
      o.endereco = [d.descricao_tipo_de_logradouro, d.logradouro, d.numero, d.bairro].filter(Boolean).join(' ') || o.endereco;
      if (d.nome_fantasia) o.nome_fantasia = d.nome_fantasia;
    } catch (e) { /* 429/404: segue */ }
  }
}

// ---------- 4. Upsert no Supabase (PostgREST, service_role, em lotes) ----------
async function upsert(tabela, linhas, onConflict) {
  for (let i = 0; i < linhas.length; i += LOTE) {
    const lote = linhas.slice(i, i + LOTE);
    if (!lote.length) continue;
    await http({
      method: 'POST',
      url: SUPABASE_URL + '/rest/v1/' + tabela + '?on_conflict=' + onConflict,
      headers: {
        apikey: SERVICE_ROLE,
        Authorization: 'Bearer ' + SERVICE_ROLE,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates,return=minimal',
      },
      body: lote, json: true,
    });
  }
}

await upsert('orgaos', orgaos, 'cnpj');                          // órgãos primeiro (FK)
await upsert('contratos', contratos, 'numero_controle_pncp');

return [{ json: {
  ok: true,
  janela: dataInicial + '–' + dataFinal,
  contratacoes_coletadas: todas.length,
  orgaos_upsertados: orgaos.length,
  contratos_upsertados: contratos.length,
} }];
`;

const jsCode = `${transformSrc.trim()}\n${wrapper}`;

// 3) Monta o workflow n8n.
const workflow = {
  name: 'PNCP → Supabase | Órgãos/Secretarias MG',
  nodes: [
    {
      parameters: {},
      id: 'trigger-manual',
      name: 'Disparar',
      type: 'n8n-nodes-base.manualTrigger',
      typeVersion: 1,
      position: [260, 300],
    },
    {
      parameters: {
        mode: 'runOnceForAllItems',
        language: 'javaScript',
        jsCode,
      },
      id: 'crawler-pncp',
      name: 'Coletar PNCP + gravar no Supabase',
      type: 'n8n-nodes-base.code',
      typeVersion: 2,
      position: [520, 300],
    },
  ],
  connections: {
    Disparar: {
      main: [[{ node: 'Coletar PNCP + gravar no Supabase', type: 'main', index: 0 }]],
    },
  },
  active: false,
  settings: { executionOrder: 'v1' },
  pinData: {},
  meta: { templateId: 'pncp-mg-crawler' },
};

const out = join(here, 'pncp-mg-crawler.workflow.json');
await writeFile(out, JSON.stringify(workflow, null, 2) + '\n', 'utf8');
console.log('Workflow gerado:', out);
console.log('Tamanho do jsCode:', jsCode.length, 'caracteres');
