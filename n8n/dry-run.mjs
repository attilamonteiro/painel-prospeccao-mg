// Dry-run: busca DE VERDADE no PNCP (secretarias/órgãos de MG), aplica a mesma
// transformação do workflow n8n e imprime um resumo. NÃO escreve no Supabase.
// Uso:  node n8n/dry-run.mjs            (janela padrão de 30 dias, modalidades 6 e 8)
//       DIAS=90 MODALIDADES=6,8,4 node n8n/dry-run.mjs
import { construirLinhas } from './lib/transform.mjs';

const UF = process.env.UF || 'MG';
const DIAS = Number(process.env.DIAS || 30);
const MODALIDADES = (process.env.MODALIDADES || '6,8').split(',').map((n) => Number(n.trim()));
const TAM = 50;
const MAX_PAG = Number(process.env.MAX_PAG || 8); // trava p/ o dry-run ser rápido

const aaaammdd = (d) =>
  `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, '0')}${String(d.getUTCDate()).padStart(2, '0')}`;
const hoje = new Date();
const dataFinal = aaaammdd(hoje);
const dataInicial = aaaammdd(new Date(hoje.getTime() - DIAS * 86400000));

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
        console.error(`  mod ${mod} pág ${pagina}: HTTP ${r.status}`);
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
    console.error(`  mod ${mod} pág ${pagina}/${totalPaginas} (+${data.length})`);
    pagina++;
  } while (pagina <= totalPaginas && pagina <= MAX_PAG);
}

const { orgaos, contratos } = construirLinhas(todas, { uf: UF });

const fmtBRL = (v) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
console.log('\n================= DRY-RUN (sem escrita no Supabase) =================');
console.log('janela (publicação):', dataInicial, '→', dataFinal, `(${DIAS} dias)`);
console.log('modalidades:', MODALIDADES.join(', '));
console.log('contratações coletadas:', todas.length);
console.log('órgãos (CNPJ únicos):', orgaos.length);
console.log('contratos (numeroControlePNCP únicos):', contratos.length);

const top = [...orgaos].sort((a, b) => b.valor_total_contratos - a.valor_total_contratos);
console.log('\n--- Exemplo de linha de `orgaos` (maior volume) ---');
console.log(JSON.stringify(top[0], null, 2));

console.log('\n--- Top 8 municípios por valor coletado ---');
const porMun = {};
for (const o of orgaos) porMun[o.municipio] = (porMun[o.municipio] || 0) + o.valor_total_contratos;
for (const [m, v] of Object.entries(porMun).sort((a, b) => b[1] - a[1]).slice(0, 8)) {
  console.log(`  ${String(m).padEnd(28)} ${fmtBRL(v)}`);
}

console.log('\n--- Distribuição de categorias ---');
const porCat = {};
for (const o of orgaos) for (const c of o.categorias_compra) porCat[c] = (porCat[c] || 0) + 1;
for (const [c, n] of Object.entries(porCat).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${String(c).padEnd(24)} ${n} órgão(s)`);
}
console.log('\nOK: coleta + transformação funcionando. (escrita no Supabase só no workflow n8n)');
