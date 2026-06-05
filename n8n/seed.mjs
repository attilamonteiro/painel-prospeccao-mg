// Seeder STANDALONE (sem n8n): coleta no PNCP -> transforma -> UPSERT no Supabase.
// Mesma logica do workflow n8n (build.mjs), em Node puro. A transformacao vem de
// ./lib/transform.mjs (fonte unica da verdade, ja validada pelo dry-run).
//
// PRE-REQUISITOS:
//   1. Schema aplicado (T0): supabase/migrations/0001_init_rpc_schema.sql no SQL Editor.
//   2. A service_role no ambiente (NUNCA commitada). VOCE roda no SEU terminal:
//
//   PowerShell:  $env:SUPABASE_SERVICE_ROLE_KEY='cole_aqui'; node n8n/seed.mjs
//   bash:        SUPABASE_SERVICE_ROLE_KEY='cole_aqui' node n8n/seed.mjs
//
// Opcoes (env): DIAS=90  MODALIDADES=6,8,4  ENRIQUECER=0 (desliga BrasilAPI)
//               ENRIQUECER_MAX=200  LOTE=500  MAX_PAG=60  SUPABASE_URL=...
//
// Para TESTAR sem escrever no banco, use:  node n8n/dry-run.mjs
import { construirLinhas } from './lib/transform.mjs';

const UF = process.env.UF || 'MG';
const DIAS = Number(process.env.DIAS || 90);
const MODALIDADES = (process.env.MODALIDADES || '6,8').split(',').map((n) => Number(n.trim()));
const TAM = 50;
const MAX_PAG = Number(process.env.MAX_PAG || 60);
const LOTE = Number(process.env.LOTE || 500);
const ENRIQUECER = process.env.ENRIQUECER !== '0';
const ENRIQUECER_MAX = Number(process.env.ENRIQUECER_MAX || 200);

const SUPABASE_URL = (process.env.SUPABASE_URL || 'https://afzjhphumlqoosgmkirb.supabase.co').replace(/\/+$/, '');
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SERVICE_ROLE) {
  console.error('ERRO: defina SUPABASE_SERVICE_ROLE_KEY no ambiente.');
  console.error('  PowerShell:  $env:SUPABASE_SERVICE_ROLE_KEY=\'...\'; node n8n/seed.mjs');
  console.error('  bash:        SUPABASE_SERVICE_ROLE_KEY=\'...\' node n8n/seed.mjs');
  process.exit(1);
}

const aaaammdd = (d) =>
  `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, '0')}${String(d.getUTCDate()).padStart(2, '0')}`;
const hoje = new Date();
const dataFinal = aaaammdd(hoje);
const dataInicial = aaaammdd(new Date(hoje.getTime() - DIAS * 86400000));

// ---------- 1. Coleta paginada no PNCP (uf=MG server-side) ----------
const BASE = 'https://pncp.gov.br/api/consulta/v1/contratacoes/publicacao';
const todas = [];
for (const mod of MODALIDADES) {
  let pagina = 1;
  let totalPaginas = 1;
  do {
    const url = `${BASE}?dataInicial=${dataInicial}&dataFinal=${dataFinal}&codigoModalidadeContratacao=${mod}&uf=${UF}&pagina=${pagina}&tamanhoPagina=${TAM}`;
    let resp;
    try {
      const r = await fetch(url, { headers: { Accept: 'application/json' } });
      if (r.status === 204) break;
      if (!r.ok) {
        console.error(`  mod ${mod} pag ${pagina}: HTTP ${r.status}`);
        break;
      }
      resp = await r.json();
    } catch (e) {
      console.error('  erro de rede:', e.message);
      break;
    }
    const data = resp.data || [];
    todas.push(...data);
    totalPaginas = resp.totalPaginas || 1;
    console.error(`  mod ${mod} pag ${pagina}/${totalPaginas} (+${data.length})`);
    pagina++;
  } while (pagina <= totalPaginas && pagina <= MAX_PAG);
}

// ---------- 2. Transformacao (identica ao dry-run / workflow) ----------
const { orgaos, contratos } = construirLinhas(todas, { uf: UF });
console.error(`coletadas=${todas.length}  orgaos=${orgaos.length}  contratos=${contratos.length}`);

// ---------- 3. Enriquecimento de contato (BrasilAPI) ----------
if (ENRIQUECER) {
  let n = 0;
  for (const o of orgaos) {
    if (n >= ENRIQUECER_MAX) break;
    n++;
    try {
      const cnpjDigits = o.cnpj.replace(/\D/g, '');
      const r = await fetch('https://brasilapi.com.br/api/cnpj/v1/' + cnpjDigits);
      if (!r.ok) continue;
      const d = await r.json();
      o.email_geral = d.email || o.email_geral;
      o.telefone = d.ddd_telefone_1 || o.telefone;
      if (d.cep) o.cep = String(d.cep).replace(/(\d{5})(\d{3})/, '$1-$2');
      o.endereco =
        [d.descricao_tipo_de_logradouro, d.logradouro, d.numero, d.bairro].filter(Boolean).join(' ') || o.endereco;
      if (d.nome_fantasia) o.nome_fantasia = d.nome_fantasia;
    } catch {
      /* 429/404: segue */
    }
  }
  console.error(`enriquecidos (BrasilAPI): ${Math.min(n, ENRIQUECER_MAX)}`);
}

// ---------- 4. Upsert no Supabase (PostgREST, service_role, em lotes) ----------
async function upsert(tabela, linhas, onConflict) {
  let total = 0;
  for (let i = 0; i < linhas.length; i += LOTE) {
    const lote = linhas.slice(i, i + LOTE);
    if (!lote.length) continue;
    const r = await fetch(`${SUPABASE_URL}/rest/v1/${tabela}?on_conflict=${onConflict}`, {
      method: 'POST',
      headers: {
        apikey: SERVICE_ROLE,
        Authorization: 'Bearer ' + SERVICE_ROLE,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates,return=minimal',
      },
      body: JSON.stringify(lote),
    });
    if (!r.ok) {
      const body = await r.text();
      throw new Error(`upsert ${tabela} HTTP ${r.status}: ${body.slice(0, 600)}`);
    }
    total += lote.length;
  }
  return total;
}

const orgaosUp = await upsert('orgaos', orgaos, 'cnpj'); // orgaos primeiro (FK de contratos)
const contratosUp = await upsert('contratos', contratos, 'numero_controle_pncp');

console.log(
  JSON.stringify(
    {
      ok: true,
      janela: `${dataInicial}-${dataFinal}`,
      contratacoes_coletadas: todas.length,
      orgaos_upsertados: orgaosUp,
      contratos_upsertados: contratosUp,
    },
    null,
    2
  )
);
