// Cliente MCP de teste — sobe o servidor via stdio e exercita o protocolo:
// initialize -> tools/list -> tools/call -> resources/list -> prompts/list.
// Uso: node test-client.mjs
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const transport = new StdioClientTransport({
  command: process.execPath,
  args: ["server.ts"],
  cwd: import.meta.dirname,
});
const client = new Client({ name: "painel-mg-test-client", version: "1.0.0" });

await client.connect(transport);
console.log("✓ initialize/handshake OK");

const { tools } = await client.listTools();
console.log(`✓ tools/list → ${tools.length} tools: ${tools.map((t) => t.name).join(", ")}`);

const stats = await client.callTool({ name: "estatisticas_dashboard", arguments: {} });
console.log("✓ tools/call estatisticas_dashboard →");
console.log(stats.content[0].text.slice(0, 500));

const orgaos = await client.callTool({
  name: "listar_orgaos",
  arguments: { tamanho_pagina: 3, ordenar_por: "valor_total_contratos" },
});
const parsed = JSON.parse(orgaos.content[0].text);
console.log(`✓ tools/call listar_orgaos → total=${parsed.total}, primeiros: ${parsed.data?.map((o) => o.razao_social).join(" | ")}`);

const { resources } = await client.listResources();
console.log(`✓ resources/list → ${resources.map((r) => r.uri).join(", ")}`);

const { prompts } = await client.listPrompts();
console.log(`✓ prompts/list → ${prompts.map((p) => p.name).join(", ")}`);

await client.close();
console.log("✓ Tudo OK — servidor MCP funcional.");
