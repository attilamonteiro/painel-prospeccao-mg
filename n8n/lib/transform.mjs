// Transformação pura PNCP → linhas das tabelas `orgaos` / `contratos`.
// SEM rede aqui: recebe contratações cruas do PNCP e devolve as linhas prontas.
// Este módulo é a ÚNICA fonte da verdade da transformação — o dry-run (node) o
// importa e o build do workflow n8n embute o mesmo código no Code node.

export const ESFERA = { F: 'FEDERAL', E: 'ESTADUAL', M: 'MUNICIPAL', D: 'DISTRITAL' };
export const PODER = { E: 'EXECUTIVO', L: 'LEGISLATIVO', J: 'JUDICIARIO' };

export function formatarCnpj(raw) {
  const d = String(raw || '').replace(/\D/g, '');
  if (d.length !== 14) return null;
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
}

export function dataISO(s) {
  if (!s) return null;
  const d = String(s).slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : null;
}

// Classifica o objeto da compra em categorias amplas (para o dashboard / filtros).
export function classificarCategorias(objeto) {
  const o = String(objeto || '').toLowerCase();
  const regras = [
    [/aliment|merenda|g[êe]nero aliment|hortifrut|p[ãa]o|carne|leite/, 'Alimentação'],
    [/sa[úu]de|hospital|m[ée]dic|medicament|farm[áa]c|odontol|enfermag|ambul[âa]nci/, 'Saúde'],
    [/educa|escola|ensino|did[áa]tic|creche|uniforme escolar|pedag/, 'Educação'],
    [/obra|pavimenta|constru|reforma|engenharia|asfalt|drenagem/, 'Obras'],
    [/transporte|ve[íi]culo|combust[íi]vel|pneu|frota|loca[çc][ãa]o de ve/, 'Transporte'],
    [/tecnologia|software|inform[áa]tica|sistema|computador|licen[çc]a de uso|ti\b/, 'Tecnologia'],
    [/limpeza|higiene|coleta|res[íi]duo|conserva[çc][ãa]o|jardinag/, 'Limpeza e Conservação'],
    [/material|expediente|escrit[óo]rio|m[óo]vel|mobili[áa]rio/, 'Materiais'],
    [/energia|ilumina[çc][ãa]o|el[ée]tric/, 'Energia'],
    [/consult|assessor|servi[çc]o/, 'Serviços'],
  ];
  const cats = [];
  for (const [re, cat] of regras) if (re.test(o)) cats.push(cat);
  return cats.length ? [...new Set(cats)] : ['Outros'];
}

// Recebe um array de contratações cruas (campo `data[]` do PNCP) e devolve
// { orgaos, contratos } — órgãos deduplicados por CNPJ com agregados, e
// contratos deduplicados por numeroControlePNCP.
export function construirLinhas(contratacoes, { uf = 'MG' } = {}) {
  const orgaos = new Map();
  const contratos = new Map();

  for (const c of contratacoes) {
    const oe = c.orgaoEntidade || {};
    const uo = c.unidadeOrgao || {};
    const cnpj = formatarCnpj(oe.cnpj);
    if (!cnpj) continue;

    const valor = Number(c.valorTotalHomologado ?? c.valorTotalEstimado ?? 0) || 0;
    const dataPub = dataISO(c.dataPublicacaoPncp);
    const cats = classificarCategorias(c.objetoCompra);

    if (!orgaos.has(cnpj)) {
      orgaos.set(cnpj, {
        cnpj,
        razao_social: oe.razaoSocial || null,
        nome_fantasia: uo.nomeUnidade || null,
        esfera: ESFERA[oe.esferaId] || null,
        poder: PODER[oe.poderId] || null,
        uf: uo.ufSigla || uf,
        municipio: uo.municipioNome || null,
        codigo_ibge: uo.codigoIbge || null,
        codigo_pncp: null,
        site_oficial: null,
        email_geral: null,
        email_licitacoes: null,
        telefone: null,
        endereco: null,
        cep: null,
        nome_responsavel: null,
        cargo_responsavel: null,
        email_responsavel: null,
        total_contratos: 0,
        valor_total_contratos: 0,
        ultimo_contrato_em: null,
        categorias_compra: [],
        fonte: 'PNCP',
        _cats: new Set(),
      });
    }
    const row = orgaos.get(cnpj);
    row.total_contratos += 1;
    row.valor_total_contratos += valor;
    if (dataPub && (!row.ultimo_contrato_em || dataPub > row.ultimo_contrato_em)) {
      row.ultimo_contrato_em = dataPub;
    }
    cats.forEach((x) => row._cats.add(x));

    const ncp = c.numeroControlePNCP;
    if (ncp && !contratos.has(ncp)) {
      contratos.set(ncp, {
        numero_controle_pncp: ncp,
        orgao_cnpj: cnpj,
        numero: c.numeroCompra || null,
        objeto: c.objetoCompra || null,
        modalidade: c.modalidadeNome || null,
        valor_inicial: c.valorTotalEstimado ?? null,
        valor_final: c.valorTotalHomologado ?? null,
        data_assinatura: dataPub,
        data_vigencia_inicio: dataISO(c.dataAberturaProposta),
        data_vigencia_fim: dataISO(c.dataEncerramentoProposta),
        fornecedor_cnpj: null,
        fornecedor_nome: null,
        categoria: cats[0] || null,
      });
    }
  }

  const orgaosArr = [...orgaos.values()].map((o) => {
    o.categorias_compra = [...o._cats];
    delete o._cats;
    o.valor_total_contratos = Math.round(o.valor_total_contratos * 100) / 100;
    return o;
  });

  return { orgaos: orgaosArr, contratos: [...contratos.values()] };
}
