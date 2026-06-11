import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { createClient } from '@/shared/lib/supabase/server';
import { listToolsForAnthropic, callMcpTool } from '@/features/chat/lib/mcpClient';

export const runtime = 'nodejs';
export const maxDuration = 60;

const MAX_TOOL_ROUNDS = 6;

const SYSTEM_PROMPT = `Você é o assistente do Painel de Prospecção Pública MG, um SaaS de prospecção B2G com dados de licitações públicas de Minas Gerais (fonte: PNCP).

Use as ferramentas disponíveis para responder com dados reais — nunca invente números. Quando a resposta depender dos dados, chame a ferramenta antes de responder. Escolha da ferramenta: para panorama/resumo geral use estatisticas_dashboard; para encontrar ou rankear órgãos use listar_orgaos; para contratos use listar_contratos; para a ficha de um órgão específico use detalhar_orgao. Para filtrar por categoria ou modalidade, consulte opcoes_filtros primeiro para usar valores exatos. Aplique filtros somente quando o usuário pedir (não assuma município ou categoria que não foi mencionado).

Responda em português do Brasil, de forma concisa e orientada a prospecção: destaque valores, contatos disponíveis e oportunidades. Formate valores monetários como R$.`;

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

/**
 * O host MCP é agnóstico de provedor: as tools descobertas via tools/list são
 * convertidas para o formato de cada API. DeepSeek (OpenAI-compatible) tem
 * prioridade se DEEPSEEK_API_KEY existir; senão usa a Claude API.
 */
async function runDeepSeek(history: ChatMessage[], toolsUsed: string[]): Promise<string> {
  const client = new OpenAI({
    apiKey: process.env.DEEPSEEK_API_KEY,
    baseURL: 'https://api.deepseek.com',
  });
  const mcpTools = await listToolsForAnthropic();
  const tools: OpenAI.Chat.Completions.ChatCompletionTool[] = mcpTools.map((t) => ({
    type: 'function',
    function: { name: t.name, description: t.description, parameters: t.input_schema },
  }));

  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...history.map((m) => ({ role: m.role, content: m.content })),
  ];

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    const completion = await client.chat.completions.create({
      model: process.env.DEEPSEEK_MODEL ?? 'deepseek-chat',
      messages,
      tools,
      max_tokens: 4096,
    });
    const msg = completion.choices[0].message;
    messages.push(msg);

    const toolCalls = (msg.tool_calls ?? []).filter((tc) => tc.type === 'function');
    if (toolCalls.length > 0) {
      for (const tc of toolCalls) {
        toolsUsed.push(tc.function.name);
        let content: string;
        try {
          const args = tc.function.arguments ? JSON.parse(tc.function.arguments) : {};
          const result = await callMcpTool(tc.function.name, args);
          content = result.isError ? `Erro da ferramenta: ${result.text}` : result.text;
        } catch (err) {
          content = `Erro ao executar a ferramenta: ${err instanceof Error ? err.message : String(err)}`;
        }
        messages.push({ role: 'tool', tool_call_id: tc.id, content });
      }
      continue;
    }
    return msg.content ?? '';
  }
  throw new Error('A consulta excedeu o limite de chamadas de ferramentas.');
}

async function runAnthropic(history: ChatMessage[], toolsUsed: string[]): Promise<string> {
  const anthropic = new Anthropic();
  const tools = (await listToolsForAnthropic()) as unknown as Anthropic.Tool[];
  const messages: Anthropic.MessageParam[] = history.map((m) => ({
    role: m.role,
    content: m.content,
  }));

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    const response = await anthropic.messages.create({
      model: process.env.ANTHROPIC_MODEL ?? 'claude-opus-4-8',
      max_tokens: 4096,
      thinking: { type: 'adaptive' },
      system: SYSTEM_PROMPT,
      tools,
      messages,
    });

    messages.push({ role: 'assistant', content: response.content });

    if (response.stop_reason === 'tool_use') {
      const toolUses = response.content.filter(
        (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use',
      );
      const results: Anthropic.ToolResultBlockParam[] = await Promise.all(
        toolUses.map(async (tu) => {
          toolsUsed.push(tu.name);
          try {
            const result = await callMcpTool(tu.name, tu.input as Record<string, unknown>);
            return {
              type: 'tool_result' as const,
              tool_use_id: tu.id,
              content: result.text,
              is_error: result.isError,
            };
          } catch (err) {
            return {
              type: 'tool_result' as const,
              tool_use_id: tu.id,
              content: `Erro ao executar a ferramenta: ${err instanceof Error ? err.message : String(err)}`,
              is_error: true,
            };
          }
        }),
      );
      messages.push({ role: 'user', content: results });
      continue;
    }

    if (response.stop_reason === 'pause_turn') {
      continue;
    }

    return response.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('\n');
  }
  throw new Error('A consulta excedeu o limite de chamadas de ferramentas.');
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  const provider = process.env.DEEPSEEK_API_KEY
    ? 'deepseek'
    : process.env.ANTHROPIC_API_KEY
      ? 'anthropic'
      : null;
  if (!provider) {
    return NextResponse.json(
      { error: 'Nenhuma chave configurada — defina DEEPSEEK_API_KEY ou ANTHROPIC_API_KEY no .env.local.' },
      { status: 500 },
    );
  }

  let history: ChatMessage[];
  try {
    const body = await request.json();
    history = (body.messages ?? []).filter(
      (m: ChatMessage) =>
        (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string',
    );
    if (history.length === 0 || history[history.length - 1].role !== 'user') {
      throw new Error('histórico inválido');
    }
  } catch {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 });
  }

  try {
    const toolsUsed: string[] = [];
    const reply =
      provider === 'deepseek'
        ? await runDeepSeek(history, toolsUsed)
        : await runAnthropic(history, toolsUsed);
    return NextResponse.json({ reply, toolsUsed, provider });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro interno';
    console.error('[api/chat]', err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
