// Gera o workflow n8n de enriquecimento de contatos dos órgãos.
// Padrão idêntico ao build.mjs do crawler: lê lib/enrich.mjs, remove os
// `export`, e concatena com um wrapper que roda dentro do Code node do n8n
// (busca órgãos sem contato no Supabase, enriquece, PATCH de volta).
//
// Uso:  node build-enrich.mjs   →  escreve enrich-contatos.workflow.json
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));

// 1) Lógica de enriquecimento, sem os `export` (vira código local do Code node).
const enrichSrc = (await readFile(join(here, 'lib', 'enrich.mjs'), 'utf8'))
  .replace(/^export\s+/gm, '');

// 2) Wrapper: rede + Supabase, executado no n8n. `$env` exige
//    N8N_BLOCK_ENV_ACCESS_IN_NODE=false (já configurado no Docker/Render).
const wrapper = `
// ===================== CONFIGURAÇÃO =====================
const LIMITE     = 120;    // órgãos por execução (rode várias vezes até cobrir todos)
const PAUSA_MS   = 600;    // pausa entre órgãos (rate limit OpenCNPJ ~100/min)
const SCRAPE     = true;   // scraping do site para email_licitacoes (best-effort)
const ATUALIZAR  = false;  // false: só preenche vazios. true: substitui email
                           // não-institucional (gmail/provedor antigo) pelo .gov.br do site.

const SUPABASE_URL = ($env.SUPABASE_URL || 'https://afzjhphumlqoosgmkirb.supabase.co').replace(/\\/+$/, '');
const SERVICE_ROLE = $env.SUPABASE_SERVICE_ROLE_KEY;
if (!SERVICE_ROLE) throw new Error('Defina SUPABASE_SERVICE_ROLE_KEY no n8n (env do servidor).');
const sbHeaders = { apikey: SERVICE_ROLE, Authorization: 'Bearer ' + SERVICE_ROLE };

// httpGet padronizado { status, body } sobre a rede do n8n.
const httpGet = async (url, timeoutMs = 10000) => {
  try {
    const res = await this.helpers.httpRequest({
      method: 'GET', url, timeout: timeoutMs, json: false,
      returnFullResponse: true, ignoreHttpStatusErrors: true,
      headers: { 'User-Agent': 'Mozilla/5.0 painel-mg-enrich' },
    });
    return { status: res.statusCode, body: typeof res.body === 'string' ? res.body : JSON.stringify(res.body) };
  } catch (e) { return { status: 0, body: '' }; }
};

// 1. Busca órgãos. Preencher: faltam email/licitacao. Atualizar: têm email (filtra
//    os não-institucionais no cliente, pois PostgREST não filtra isso facilmente).
const sel = 'select=cnpj,razao_social,municipio,uf,site_oficial,email_geral,email_licitacoes,telefone,endereco,cep';
const filtroQ = ATUALIZAR ? 'email_geral=not.is.null' : 'or=(email_geral.is.null,email_licitacoes.is.null)';
const orgaos = await this.helpers.httpRequest({
  method: 'GET', json: true, headers: sbHeaders,
  url: SUPABASE_URL + '/rest/v1/orgaos?' + sel + '&' + filtroQ + '&limit=' + LIMITE,
});

// 2. Dedup pelo CNPJ raiz (matriz/filiais compartilham contato) + loop.
const vistos = new Set();
let alterados = 0, novoEmail = 0, novoLicit = 0, novoSite = 0, novoTel = 0;

for (const o of orgaos) {
  const raiz = cnpjRaiz(o.cnpj);
  if (vistos.has(raiz)) continue;
  vistos.add(raiz);
  if (ATUALIZAR && ehInstitucional(o.email_geral)) continue; // já institucional

  let patch;
  try { patch = await enriquecerOrgao(o, httpGet, { scrape: SCRAPE, preferirInstitucional: ATUALIZAR }); }
  catch (e) { patch = {}; }

  if (Object.keys(patch).length) {
    await this.helpers.httpRequest({
      method: 'PATCH', json: false,
      url: SUPABASE_URL + '/rest/v1/orgaos?cnpj=eq.' + encodeURIComponent(o.cnpj),
      headers: { ...sbHeaders, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify(patch),
    });
    alterados++;
    if (patch.email_geral) novoEmail++;
    if (patch.email_licitacoes) novoLicit++;
    if (patch.site_oficial) novoSite++;
    if (patch.telefone) novoTel++;
  }
  await new Promise((r) => setTimeout(r, PAUSA_MS));
}

return [{ json: {
  processados: vistos.size,
  alterados,
  novo_email_geral: novoEmail,
  novo_email_licitacoes: novoLicit,
  novo_site_oficial: novoSite,
  novo_telefone: novoTel,
} }];
`;

const jsCode = `${enrichSrc.trim()}\n${wrapper}`;

const workflow = {
  name: 'Enriquecer Contatos | Órgãos MG',
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
      parameters: { mode: 'runOnceForAllItems', language: 'javaScript', jsCode },
      id: 'enrich-contatos',
      name: 'Enriquecer contatos + gravar no Supabase',
      type: 'n8n-nodes-base.code',
      typeVersion: 2,
      position: [520, 300],
    },
  ],
  connections: {
    Disparar: {
      main: [[{ node: 'Enriquecer contatos + gravar no Supabase', type: 'main', index: 0 }]],
    },
  },
  active: false,
  settings: { executionOrder: 'v1' },
  pinData: {},
  meta: { templateId: 'enrich-contatos-mg' },
};

const out = join(here, 'enrich-contatos.workflow.json');
await writeFile(out, JSON.stringify(workflow, null, 2) + '\n', 'utf8');
console.log('OK ->', out, `(${jsCode.length} chars de jsCode)`);
