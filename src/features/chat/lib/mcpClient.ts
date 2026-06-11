import path from 'node:path';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

/**
 * Client MCP do chat: a API route atua como host MCP, sobe o servidor
 * (mcp-server/server.ts) via stdio e consome suas tools. Singleton em
 * globalThis para sobreviver ao hot-reload do Next em dev e evitar um
 * processo filho por request.
 */
const g = globalThis as unknown as { __painelMcp?: Promise<Client> };

async function createMcpClient(): Promise<Client> {
  const serverPath = path.join(process.cwd(), 'mcp-server', 'server.ts');
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [serverPath],
  });
  const client = new Client({ name: 'painel-chat-host', version: '1.0.0' });
  await client.connect(transport);
  return client;
}

export function getMcpClient(): Promise<Client> {
  if (!g.__painelMcp) {
    g.__painelMcp = createMcpClient().catch((err) => {
      g.__painelMcp = undefined;
      throw err;
    });
  }
  return g.__painelMcp;
}

export interface AnthropicToolDef {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
}

/** Converte as tools MCP (JSON Schema) para o formato de tools da Claude API. */
export async function listToolsForAnthropic(): Promise<AnthropicToolDef[]> {
  const mcp = await getMcpClient();
  const { tools } = await mcp.listTools();
  return tools.map((t) => ({
    name: t.name,
    description: t.description ?? '',
    input_schema: t.inputSchema as Record<string, unknown>,
  }));
}

export interface McpToolCallResult {
  text: string;
  isError: boolean;
}

export async function callMcpTool(
  name: string,
  args: Record<string, unknown>,
): Promise<McpToolCallResult> {
  const mcp = await getMcpClient();
  const result = await mcp.callTool({ name, arguments: args });
  const content = (result.content ?? []) as Array<{ type: string; text?: string }>;
  const text = content
    .filter((c) => c.type === 'text' && typeof c.text === 'string')
    .map((c) => c.text)
    .join('\n');
  return { text: text || '(sem conteúdo)', isError: result.isError === true };
}
