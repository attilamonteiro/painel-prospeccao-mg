// Dry-run do enriquecimento de contatos — NÃO grava no Supabase.
// Lê órgãos sem contato, roda a cascata de enriquecimento e mostra um preview
// com a taxa de cobertura. Use para validar antes de rodar o workflow real.
//
// Uso:  SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node dry-run-enrich.mjs [N]
import { enriquecerOrgao, cnpjRaiz } from './lib/enrich.mjs';

const SUPABASE_URL = (process.env.SUPABASE_URL || 'https://afzjhphumlqoosgmkirb.supabase.co').replace(/\/+$/, '');
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const LIMITE = Number(process.argv[2] || 20);
const PAUSA_MS = 350;
const COM_SCRAPING = process.env.SCRAPE !== '0';

if (!SERVICE_ROLE) {
  console.error('Defina SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}

// httpGet padronizado (Node/fetch) — { status, body }
async function httpGet(url, timeoutMs = 10000) {
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(timeoutMs), headers: { 'User-Agent': 'painel-mg-enrich/1.0' } });
    return { status: r.status, body: await r.text() };
  } catch {
    return { status: 0, body: '' };
  }
}

const sb = (path) => fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
  headers: { apikey: SERVICE_ROLE, Authorization: 'Bearer ' + SERVICE_ROLE },
}).then((r) => r.json());

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  // órgãos sem email_geral OU sem email_licitacoes OU sem telefone
  const orgaos = await sb(
    'orgaos?select=cnpj,razao_social,municipio,site_oficial,email_geral,email_licitacoes,telefone,endereco,cep' +
    '&or=(email_geral.is.null,email_licitacoes.is.null,telefone.is.null)' +
    `&limit=${LIMITE}`,
  );
  if (!Array.isArray(orgaos)) {
    console.error('Erro ao ler órgãos:', orgaos);
    process.exit(1);
  }

  console.log(`Dry-run em ${orgaos.length} órgãos (scraping ${COM_SCRAPING ? 'ON' : 'OFF'})\n`);
  const vistos = new Set();
  let comEmail = 0, comTel = 0, comLicit = 0, comSite = 0, alterados = 0;

  for (const o of orgaos) {
    const raiz = cnpjRaiz(o.cnpj);
    if (vistos.has(raiz)) continue;
    vistos.add(raiz);

    const patch = await enriquecerOrgao(o, httpGet, { scrape: COM_SCRAPING });
    const campos = Object.keys(patch);
    if (campos.length) alterados++;
    if (patch.email_geral) comEmail++;
    if (patch.telefone) comTel++;
    if (patch.email_licitacoes) comLicit++;
    if (patch.site_oficial) comSite++;

    const resumo = campos.length
      ? campos.map((k) => `${k}=${patch[k]}`).join(' | ')
      : '(nada novo)';
    console.log(`• ${o.razao_social.slice(0, 36).padEnd(36)} ${resumo}`);
    await sleep(PAUSA_MS);
  }

  const n = vistos.size;
  console.log(`\n=== Cobertura em ${n} órgãos únicos ===`);
  console.log(`alterados:        ${alterados} (${Math.round(alterados / n * 100)}%)`);
  console.log(`email_geral novo: ${comEmail} (${Math.round(comEmail / n * 100)}%)`);
  console.log(`telefone novo:    ${comTel} (${Math.round(comTel / n * 100)}%)`);
  console.log(`site_oficial:     ${comSite} (${Math.round(comSite / n * 100)}%)`);
  console.log(`email_licitacoes: ${comLicit} (${Math.round(comLicit / n * 100)}%)  [via scraping]`);
})();
