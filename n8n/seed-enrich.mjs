// Enriquece o contato de TODOS os órgãos sem n8n — paginando o banco inteiro.
// Aplica a mesma lógica de lib/enrich.mjs e grava via PATCH no Supabase.
//
// Uso:  SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node seed-enrich.mjs
import { enriquecerOrgao, ehInstitucional } from './lib/enrich.mjs';

const SUPABASE_URL = (process.env.SUPABASE_URL || 'https://afzjhphumlqoosgmkirb.supabase.co').replace(/\/+$/, '');
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const PAGINA = 200;       // órgãos lidos por página
const CONC = 8;           // órgãos processados em paralelo (OpenCNPJ aguenta 50/s)
const PAUSA_MS = 150;     // pausa entre batches
const SCRAPE = process.env.SCRAPE === '1'; // scraping OFF por padrão (lento, rende ~0%)

if (!SERVICE_ROLE) { console.error('Defina SUPABASE_SERVICE_ROLE_KEY.'); process.exit(1); }

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
async function httpGet(url, timeoutMs = 10000) {
  try {
    const r = await fetch(url, {
      signal: AbortSignal.timeout(timeoutMs),
      redirect: 'follow',
      headers: { 'User-Agent': UA, Accept: 'text/html,application/json,*/*' },
    });
    return { status: r.status, body: await r.text() };
  } catch { return { status: 0, body: '' }; }
}
const sbHeaders = { apikey: SERVICE_ROLE, Authorization: 'Bearer ' + SERVICE_ROLE };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  // total para paginar
  const head = await fetch(`${SUPABASE_URL}/rest/v1/orgaos?select=cnpj&limit=1`, { headers: { ...sbHeaders, Prefer: 'count=exact' } });
  const total = Number((head.headers.get('content-range') || '?/0').split('/')[1]);
  console.log(`Total de órgãos: ${total} | scraping ${SCRAPE ? 'ON' : 'OFF'}\n`);

  let processados = 0, pulados = 0, alterados = 0, novoEmail = 0, novoTel = 0, novoSite = 0, novoLicit = 0;

  // Keyset por id (cursor): robusto a filtro mutável — ao preencher email,
  // os processados saem do filtro, mas id>cursor garante avanço sem repetir/pular.
  // ATUALIZAR=1: processa quem TEM email não-institucional e substitui pelo .gov.br do site.
  const ATUALIZAR = process.env.ATUALIZAR === '1';
  const filtro = ATUALIZAR ? '&email_geral=not.is.null'
    : (process.env.SO_SEM_EMAIL === '1' ? '&email_geral=is.null' : '');
  let cursor = 0;
  for (;;) {
    const orgaos = await fetch(
      `${SUPABASE_URL}/rest/v1/orgaos?select=id,cnpj,razao_social,municipio,uf,site_oficial,email_geral,email_licitacoes,telefone,endereco,cep${filtro}&id=gt.${cursor}&order=id.asc&limit=${PAGINA}`,
      { headers: sbHeaders },
    ).then((r) => r.json());
    if (!Array.isArray(orgaos) || !orgaos.length) break;
    cursor = orgaos[orgaos.length - 1].id;

    // pendentes
    const pendentes = orgaos.filter((o) => {
      if (ATUALIZAR) {
        // só os com email NÃO-institucional (candidatos a substituir pelo .gov.br)
        if (ehInstitucional(o.email_geral)) { pulados++; return false; }
        return true;
      }
      const completo = o.email_geral && o.telefone && o.site_oficial && o.email_licitacoes;
      if (completo) pulados++;
      return !completo;
    });

    const processarUm = async (o) => {
      let patch;
      try { patch = await enriquecerOrgao(o, httpGet, { scrape: SCRAPE, preferirInstitucional: ATUALIZAR }); }
      catch { patch = {}; }
      processados++;
      if (!Object.keys(patch).length) return;
      const r = await fetch(`${SUPABASE_URL}/rest/v1/orgaos?cnpj=eq.${encodeURIComponent(o.cnpj)}`, {
        method: 'PATCH',
        headers: { ...sbHeaders, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
        body: JSON.stringify(patch),
      });
      if (r.ok) {
        alterados++;
        if (patch.email_geral) novoEmail++;
        if (patch.telefone) novoTel++;
        if (patch.site_oficial) novoSite++;
        if (patch.email_licitacoes) novoLicit++;
      }
    };

    // processa a página em batches paralelos de CONC
    for (let i = 0; i < pendentes.length; i += CONC) {
      await Promise.all(pendentes.slice(i, i + CONC).map(processarUm));
      await sleep(PAUSA_MS);
    }
    console.log(`[id<=${cursor}] processados=${processados} alterados=${alterados} (email+${novoEmail} tel+${novoTel} site+${novoSite} licit+${novoLicit}) pulados=${pulados}`);
  }

  console.log(`\n=== FIM === processados=${processados} pulados=${pulados} alterados=${alterados}`);
  console.log(`novos: email_geral+${novoEmail}, telefone+${novoTel}, site_oficial+${novoSite}, email_licitacoes+${novoLicit}`);
})();
