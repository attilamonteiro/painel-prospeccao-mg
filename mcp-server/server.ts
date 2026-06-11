#!/usr/bin/env node
/**
 * Servidor MCP — Painel de Prospecção Pública MG
 *
 * Expõe os dados de licitações públicas de Minas Gerais (PNCP → Supabase)
 * como ferramentas MCP para qualquer host compatível (Claude Code, Claude
 * Desktop, Cursor, etc.).
 *
 * Arquitetura: o servidor é um client "authenticated" do Supabase — faz login
 * com um usuário real e chama as mesmas RPCs SECURITY DEFINER que o frontend
 * usa. Nenhuma chave service_role é necessária; o modelo de segurança
 * RPC-first do projeto é respeitado integralmente.
 *
 * Transporte: stdio (JSON-RPC 2.0 por stdin/stdout).
 * IMPORTANTE: logs vão para stderr — stdout é o canal do protocolo.
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// dotenv é opcional: ao rodar standalone (Claude Desktop, CLI) carrega o
// mcp-server/.env; quando spawnado pelo painel, as credenciais chegam via
// env do processo pai, então a ausência do pacote/arquivo não é erro.
try {
  const { config: loadEnv } = await import("dotenv");
  loadEnv({ path: path.join(__dirname, ".env") });
} catch {
  // dotenv não instalado (ex.: rodando com as deps da raiz) — segue com process.env
}

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const PAINEL_EMAIL = process.env.PAINEL_EMAIL;
const PAINEL_PASSWORD = process.env.PAINEL_PASSWORD;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !PAINEL_EMAIL || !PAINEL_PASSWORD) {
  console.error(
    "[painel-mg-mcp] Configuração ausente. Copie mcp-server/.env.example para mcp-server/.env e preencha SUPABASE_URL, SUPABASE_ANON_KEY, PAINEL_EMAIL e PAINEL_PASSWORD.",
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: true },
});

let authenticated = false;
async function ensureAuth(): Promise<void> {
  if (authenticated) return;
  const { error } = await supabase.auth.signInWithPassword({
    email: PAINEL_EMAIL!,
    password: PAINEL_PASSWORD!,
  });
  if (error) throw new Error(`Falha no login Supabase: ${error.message}`);
  authenticated = true;
  console.error(`[painel-mg-mcp] Autenticado no Supabase como ${PAINEL_EMAIL}`);
}

/** Remove chaves undefined/null/'' para deixar os defaults da função SQL agirem. */
function compact(params: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ""),
  );
}

async function callRpc(fn: string, params: Record<string, unknown> = {}): Promise<unknown> {
  await ensureAuth();
  const { data, error } = await supabase.rpc(fn, compact(params));
  if (error) throw new Error(`RPC ${fn}: ${error.message}`);
  return data;
}

type ToolResult = {
  content: Array<{ type: "text"; text: string }>;
  isError?: boolean;
};

function jsonResult(data: unknown): ToolResult {
  return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
}

function errorResult(err: unknown): ToolResult {
  const msg = err instanceof Error ? err.message : String(err);
  return { content: [{ type: "text", text: `Erro: ${msg}` }], isError: true };
}

const server = new McpServer({ name: "painel-prospeccao-mg", version: "1.0.0" });

// ---------------------------------------------------------------------------
// Tools — cada uma encapsula uma RPC do Supabase
// ---------------------------------------------------------------------------

server.registerTool(
  "estatisticas_dashboard",
  {
    title: "Estatísticas do painel",
    description:
      "Visão geral dos dados de licitações de MG: total de órgãos, total de contratos, valor total, órgãos com contato, contratos dos últimos 30 dias, top categorias e top municípios. Chame esta ferramenta quando o usuário pedir um panorama geral dos dados.",
    inputSchema: {},
  },
  async () => {
    try {
      return jsonResult(await callRpc("get_dashboard_stats"));
    } catch (e) {
      return errorResult(e);
    }
  },
);

server.registerTool(
  "listar_orgaos",
  {
    title: "Listar órgãos públicos de MG",
    description:
      "Busca paginada de órgãos públicos de Minas Gerais (prefeituras, secretarias, câmaras). Filtros: texto livre, município, esfera, categoria de compra e faixa de valor contratado. Chame quando o usuário quiser encontrar ou rankear órgãos — ex.: 'quais prefeituras mais gastam', 'órgãos de Uberlândia'.",
    inputSchema: {
      busca: z.string().optional().describe("Busca textual em razão social, nome fantasia e município"),
      municipio: z.string().optional().describe("Filtra por município (busca parcial, ex.: 'Belo Horizonte')"),
      esfera: z.enum(["MUNICIPAL", "ESTADUAL", "FEDERAL"]).optional(),
      categoria: z.string().optional().describe("Categoria de compra exata (use opcoes_filtros para ver as válidas)"),
      valor_min: z.number().optional().describe("Valor total contratado mínimo em R$"),
      valor_max: z.number().optional().describe("Valor total contratado máximo em R$"),
      ordenar_por: z
        .enum(["razao_social", "municipio", "esfera", "total_contratos", "valor_total_contratos", "ultimo_contrato_em", "criado_em"])
        .default("valor_total_contratos"),
      direcao: z.enum(["asc", "desc"]).default("desc"),
      pagina: z.number().int().positive().default(1),
      tamanho_pagina: z.number().int().min(1).max(100).default(10),
    },
  },
  async (args) => {
    try {
      return jsonResult(
        await callRpc("list_orgaos", {
          p_search: args.busca,
          p_municipio: args.municipio,
          p_esfera: args.esfera,
          p_categoria: args.categoria,
          p_valor_min: args.valor_min,
          p_valor_max: args.valor_max,
          p_order_by: args.ordenar_por,
          p_order_dir: args.direcao,
          p_page: args.pagina,
          p_page_size: args.tamanho_pagina,
        }),
      );
    } catch (e) {
      return errorResult(e);
    }
  },
);

server.registerTool(
  "detalhar_orgao",
  {
    title: "Detalhar órgão por CNPJ",
    description:
      "Retorna a ficha completa de um órgão público (contatos, responsável, totais) e seus 20 contratos mais recentes. Chame quando o usuário perguntar sobre um órgão específico. Obtenha o CNPJ via listar_orgaos se necessário.",
    inputSchema: {
      cnpj: z.string().min(11).describe("CNPJ do órgão, no formato retornado por listar_orgaos"),
    },
  },
  async (args) => {
    try {
      const data = (await callRpc("get_orgao_detail", { p_cnpj: args.cnpj })) as {
        error?: string;
      } | null;
      if (data && data.error === "not_found") {
        return errorResult(new Error(`Órgão com CNPJ ${args.cnpj} não encontrado`));
      }
      return jsonResult(data);
    } catch (e) {
      return errorResult(e);
    }
  },
);

server.registerTool(
  "listar_contratos",
  {
    title: "Listar contratos públicos",
    description:
      "Busca paginada de contratos públicos de MG. Filtros: CNPJ do órgão, modalidade, faixa de valor, período de assinatura e busca textual no objeto do contrato. Chame para perguntas sobre contratos — ex.: 'contratos de TI acima de R$500 mil em 2026'.",
    inputSchema: {
      orgao_cnpj: z.string().optional().describe("CNPJ exato do órgão contratante"),
      modalidade: z.string().optional().describe("Modalidade de contratação (busca parcial, ex.: 'pregão')"),
      valor_min: z.number().optional().describe("Valor final mínimo em R$"),
      valor_max: z.number().optional().describe("Valor final máximo em R$"),
      data_inicio: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().describe("Assinados a partir de (YYYY-MM-DD)"),
      data_fim: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().describe("Assinados até (YYYY-MM-DD)"),
      busca: z.string().optional().describe("Busca textual no objeto do contrato"),
      ordenar_por: z
        .enum(["valor_final", "valor_inicial", "data_assinatura", "objeto", "modalidade", "fornecedor_nome"])
        .default("data_assinatura"),
      direcao: z.enum(["asc", "desc"]).default("desc"),
      pagina: z.number().int().positive().default(1),
      tamanho_pagina: z.number().int().min(1).max(100).default(10),
    },
  },
  async (args) => {
    try {
      return jsonResult(
        await callRpc("list_contratos", {
          p_orgao_cnpj: args.orgao_cnpj,
          p_modalidade: args.modalidade,
          p_valor_min: args.valor_min,
          p_valor_max: args.valor_max,
          p_data_inicio: args.data_inicio,
          p_data_fim: args.data_fim,
          p_search: args.busca,
          p_order_by: args.ordenar_por,
          p_order_dir: args.direcao,
          p_page: args.pagina,
          p_page_size: args.tamanho_pagina,
        }),
      );
    } catch (e) {
      return errorResult(e);
    }
  },
);

server.registerTool(
  "opcoes_filtros",
  {
    title: "Valores válidos para filtros",
    description:
      "Lista os valores distintos existentes na base: municípios, esferas, categorias de compra e modalidades de contratação. Chame antes de filtrar por categoria ou modalidade para usar valores exatos.",
    inputSchema: {},
  },
  async () => {
    try {
      return jsonResult(await callRpc("get_filter_options"));
    } catch (e) {
      return errorResult(e);
    }
  },
);

// ---------------------------------------------------------------------------
// Resource — estatísticas como recurso somente leitura
// ---------------------------------------------------------------------------

server.registerResource(
  "dashboard",
  "painel://dashboard",
  {
    title: "Dashboard de licitações MG",
    description: "Snapshot JSON das estatísticas agregadas do painel",
    mimeType: "application/json",
  },
  async (uri) => {
    const data = await callRpc("get_dashboard_stats");
    return {
      contents: [{ uri: uri.href, mimeType: "application/json", text: JSON.stringify(data, null, 2) }],
    };
  },
);

// ---------------------------------------------------------------------------
// Prompt — template de prospecção pronto para o host
// ---------------------------------------------------------------------------

server.registerPrompt(
  "prospeccao_municipio",
  {
    title: "Prospecção por município",
    description: "Gera um briefing de prospecção B2G para um município de MG usando as ferramentas do painel",
    argsSchema: { municipio: z.string().describe("Município de MG, ex.: 'Belo Horizonte'") },
  },
  ({ municipio }) => ({
    messages: [
      {
        role: "user",
        content: {
          type: "text",
          text: `Monte um briefing de prospecção B2G para o município de ${municipio} (MG). Use listar_orgaos para encontrar os órgãos do município ordenados por valor contratado, detalhar_orgao nos 3 maiores para obter contatos e contratos recentes, e listar_contratos para identificar as modalidades e categorias mais frequentes. Termine com: órgãos prioritários, contatos disponíveis e oportunidades observadas.`,
        },
      },
    ],
  }),
);

// ---------------------------------------------------------------------------

const transport = new StdioServerTransport();
await server.connect(transport);
console.error("[painel-mg-mcp] Servidor MCP conectado via stdio — 5 tools, 1 resource, 1 prompt");
