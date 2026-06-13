// Lógica de enriquecimento de contato de órgãos públicos.
// Pura quanto a I/O: recebe um `httpGet(url, timeoutMs) -> { status, body }`
// injetado, para rodar tanto no Node (fetch) quanto no n8n (this.helpers.httpRequest).
//
// Cascata por órgão:
//   1. OpenCNPJ (api.opencnpj.org) — email/telefone/endereço/cep do cadastro
//   2. BrasilAPI (fallback) quando OpenCNPJ falha ou vem vazio
//   3. Deriva site_oficial do domínio do email institucional (.gov.br/.edu.br/.leg.br)
//   4. Scraping do site (paths de licitação) — best-effort, acha email_licitacoes
//
// Realidade medida: ~48% dos órgãos têm email e ~60% têm telefone na Receita;
// o e-mail de LICITAÇÃO raramente está na Receita — vem do site.

export function soDigitos(cnpj) {
  return String(cnpj || '').replace(/\D/g, '');
}

// CNPJ raiz (8 primeiros dígitos) — matriz e filiais compartilham contato.
export function cnpjRaiz(cnpj) {
  return soDigitos(cnpj).slice(0, 8);
}

const REGEX_EMAIL = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;
const DOMINIOS_GENERICOS = /(gmail|hotmail|outlook|yahoo|bol|uol|terra|ig|live|globomail)\./i;
const PALAVRAS_LICITACAO = /(licita|compras|pregao|pregão|cpl|edital|suprimento|contratos)/i;

// Limpa, normaliza e dedup uma lista de e-mails encontrados num HTML.
export function extrairEmails(html) {
  const brutos = String(html || '').match(REGEX_EMAIL) || [];
  return [...new Set(
    brutos.map((e) => e.toLowerCase().replace(/^mailto:/, '').replace(/%40/g, '@')),
  )]
    .filter((e) => !/\.(png|jpe?g|gif|svg|webp|css|js|ico)$/i.test(e))
    .filter((e) => !/(example|sentry|wixpress|\.png|@x\.|@2x|placeholder)/i.test(e))
    .filter((e) => e.length <= 80);
}

// Telefones BR no texto: (xx) xxxx-xxxx / xx xxxxx-xxxx etc.
export function extrairTelefones(html) {
  const brutos = String(html || '').match(/\(?\d{2}\)?[\s.\-]?\d{4,5}[\s.\-]?\d{4}/g) || [];
  return [...new Set(brutos.map((t) => t.replace(/\s+/g, ' ').trim()))]
    .filter((t) => soDigitos(t).length >= 10 && soDigitos(t).length <= 11);
}

// Dentre os e-mails, escolhe o de licitação (se houver) e um geral.
export function classificarEmails(emails) {
  const licit = emails.find((e) => PALAVRAS_LICITACAO.test(e)) || null;
  const geral = emails.find((e) => !PALAVRAS_LICITACAO.test(e)) || emails[0] || null;
  return { email_licitacoes: licit, email_geral: geral };
}

// Se o e-mail for institucional (.gov.br/.edu.br/.leg.br e não genérico),
// o domínio é o site oficial.
export function siteDoEmail(email) {
  if (!email) return null;
  const dom = email.split('@')[1];
  if (!dom) return null;
  if (DOMINIOS_GENERICOS.test(email)) return null;
  if (!/\.(gov|edu|leg|jus|mp)\.br$/i.test(dom) && !/\.gov\.br$/i.test(dom)) return null;
  return 'https://' + dom.toLowerCase();
}

function telOpenCnpj(d) {
  const t = (d.telefones || []).find((x) => !x.is_fax);
  return t ? `(${t.ddd}) ${t.numero}` : null;
}

function enderecoDe(d) {
  return [d.tipo_logradouro || d.descricao_tipo_de_logradouro, d.logradouro, d.numero, d.bairro]
    .filter(Boolean)
    .join(' ') || null;
}

function cepDe(d) {
  const c = soDigitos(d.cep);
  return c.length === 8 ? c.replace(/(\d{5})(\d{3})/, '$1-$2') : null;
}

// --- Fontes de cadastro (CNPJ) ---

export async function buscarOpenCnpj(cnpj, httpGet) {
  const r = await httpGet('https://api.opencnpj.org/' + soDigitos(cnpj), 10000);
  if (r.status !== 200) return null;
  let d;
  try { d = JSON.parse(r.body); } catch { return null; }
  if (d.error) return null;
  return {
    email: (d.email || '').trim().toLowerCase() || null,
    telefone: telOpenCnpj(d),
    endereco: enderecoDe(d),
    cep: cepDe(d),
    nome_fantasia: (d.nome_fantasia || '').trim() || null,
  };
}

export async function buscarBrasilApi(cnpj, httpGet) {
  const r = await httpGet('https://brasilapi.com.br/api/cnpj/v1/' + soDigitos(cnpj), 10000);
  if (r.status !== 200) return null;
  let d;
  try { d = JSON.parse(r.body); } catch { return null; }
  const tel = (d.ddd_telefone_1 || '').replace(/\D/g, '');
  return {
    email: (d.email || '').trim().toLowerCase() || null,
    telefone: tel ? `(${tel.slice(0, 2)}) ${tel.slice(2)}` : null,
    endereco: enderecoDe(d),
    cep: cepDe(d),
    nome_fantasia: (d.nome_fantasia || '').trim() || null,
  };
}

// --- Scraping do site oficial (best-effort) ---

const PATHS_LICITACAO = ['', '/licitacoes', '/licitacao', '/compras', '/transparencia', '/contato'];

// Sites de prefeitura variam muito (TLS quebrado, exigem www, só http).
// Descobre a base que responde 200 testando variantes da URL.
export async function resolverBase(site, httpGet) {
  const host = site.replace(/^https?:\/\//, '').replace(/\/+$/, '');
  const candidatas = [
    'https://' + host,
    'https://www.' + host,
    'http://' + host,
    'http://www.' + host,
  ];
  for (const url of candidatas) {
    let r;
    try { r = await httpGet(url, 7000); } catch { continue; }
    if (r && r.status === 200 && r.body && r.body.length > 200) return { base: url, body: r.body };
  }
  return null;
}

export async function scrapeSite(site, httpGet, { maxPaths = 3 } = {}) {
  if (!site) return null;
  const resolvido = await resolverBase(site, httpGet);
  if (!resolvido) return null;
  const base = resolvido.base;
  const emails = new Set();
  const telefones = new Set();
  let visitou = 0;
  for (const path of PATHS_LICITACAO) {
    if (visitou >= maxPaths) break;
    let body;
    if (path === '') {
      body = resolvido.body; // home já buscada por resolverBase
    } else {
      let r;
      try { r = await httpGet(base + path, 8000); } catch { continue; }
      if (!r || r.status !== 200 || !r.body) continue;
      body = r.body;
    }
    visitou++;
    extrairEmails(body).forEach((e) => emails.add(e));
    extrairTelefones(body).forEach((t) => telefones.add(t));
    // se já achou um e-mail de licitação, para cedo
    if ([...emails].some((e) => PALAVRAS_LICITACAO.test(e))) break;
  }
  if (emails.size === 0 && telefones.size === 0) return null;
  const cls = classificarEmails([...emails]);
  return { ...cls, telefones: [...telefones] };
}

// --- Orquestração por órgão ---
// orgao: { cnpj, site_oficial, email_geral, email_licitacoes, telefone }
// Retorna um patch só com os campos que conseguiu preencher e que estavam vazios.
export async function enriquecerOrgao(orgao, httpGet, { scrape = true } = {}) {
  const patch = {};
  const faltaEmail = !orgao.email_geral;
  const faltaTel = !orgao.telefone;

  // 1+2. cadastro (OpenCNPJ → BrasilAPI)
  let cad = await buscarOpenCnpj(orgao.cnpj, httpGet);
  if (!cad || (!cad.email && !cad.telefone)) {
    const fb = await buscarBrasilApi(orgao.cnpj, httpGet);
    if (fb) cad = { ...(cad || {}), ...Object.fromEntries(Object.entries(fb).filter(([, v]) => v)) };
  }
  if (cad) {
    if (faltaEmail && cad.email) patch.email_geral = cad.email;
    if (faltaTel && cad.telefone) patch.telefone = cad.telefone;
    if (!orgao.endereco && cad.endereco) patch.endereco = cad.endereco;
    if (!orgao.cep && cad.cep) patch.cep = cad.cep;
  }

  // 3. site oficial: do banco, ou derivado do domínio do email institucional
  const emailRef = orgao.email_geral || patch.email_geral || (cad && cad.email);
  const site = orgao.site_oficial || siteDoEmail(emailRef);
  if (site && !orgao.site_oficial) patch.site_oficial = site;

  // 4. scraping → email_licitacoes (best-effort)
  if (scrape && site && !orgao.email_licitacoes) {
    const s = await scrapeSite(site, httpGet);
    if (s) {
      if (s.email_licitacoes) patch.email_licitacoes = s.email_licitacoes;
      else if (!patch.email_geral && s.email_geral) patch.email_geral = s.email_geral;
    }
  }

  return patch;
}
