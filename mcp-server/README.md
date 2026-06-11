# Servidor MCP — Painel de Prospecção Pública MG

Servidor [MCP (Model Context Protocol)](https://modelcontextprotocol.io) que expõe os dados de licitações públicas de Minas Gerais como ferramentas para LLMs. Qualquer host compatível com MCP (Claude Code, Claude Desktop, Cursor, etc.) pode consultar órgãos, contratos e estatísticas do painel em linguagem natural.

## Arquitetura

```
Host MCP (Claude Code / Desktop)
        │  JSON-RPC 2.0 via stdio
        ▼
  server.ts (este servidor)
        │  login como usuário authenticated (anon key + e-mail/senha)
        ▼
  Supabase RPCs (SECURITY DEFINER)   ←  mesmas funções que o frontend usa
        │
        ▼
  Postgres (orgaos, contratos — RLS ativo)
```

Decisões de projeto:

- **Mesmo modelo de segurança do frontend.** O servidor autentica como usuário comum (`signInWithPassword`) e chama as RPCs `SECURITY DEFINER` com grant para `authenticated`. Nenhuma chave `service_role` é usada — as tabelas continuam inacessíveis diretamente (RLS).
- **stdio transport.** O protocolo trafega por stdin/stdout (JSON-RPC 2.0); logs vão para stderr para não corromper o canal.
- **Zero build.** Node ≥ 23.6 executa TypeScript nativamente (type stripping) — `node server.ts` direto.

## Primitivos MCP implementados

| Primitivo | Nome | O que faz |
|---|---|---|
| Tool | `estatisticas_dashboard` | Panorama agregado: totais, top categorias, top municípios |
| Tool | `listar_orgaos` | Busca paginada de órgãos com filtros (município, esfera, valor…) |
| Tool | `detalhar_orgao` | Ficha completa de um órgão + 20 contratos recentes |
| Tool | `listar_contratos` | Busca paginada de contratos (modalidade, valor, período…) |
| Tool | `opcoes_filtros` | Valores distintos válidos para filtros |
| Resource | `painel://dashboard` | Snapshot JSON das estatísticas |
| Prompt | `prospeccao_municipio` | Template de briefing de prospecção B2G por município |

Os schemas de entrada são definidos com Zod e convertidos automaticamente para JSON Schema pelo SDK — o host valida os argumentos antes de chamar.

## Como rodar

```bash
cd mcp-server
pnpm install --ignore-workspace
cp .env.example .env   # preencha SUPABASE_URL, SUPABASE_ANON_KEY, PAINEL_EMAIL, PAINEL_PASSWORD
node server.ts         # requer Node >= 23.6
```

### Testar o protocolo de ponta a ponta

```bash
node test-client.mjs
```

O cliente de teste sobe o servidor via stdio e exercita `initialize`, `tools/list`, `tools/call`, `resources/list` e `prompts/list` contra o Supabase real.

### Registrar no Claude Code

O arquivo [.mcp.json](../.mcp.json) na raiz do projeto já registra o servidor no escopo do projeto. Abra o Claude Code na raiz e pergunte, por exemplo:

> "Quais órgãos de Belo Horizonte têm o maior valor contratado?"

### Registrar no Claude Desktop

`claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "painel-mg": {
      "command": "node",
      "args": ["C:/caminho/para/painel-prospeccao-mg/mcp-server/server.ts"]
    }
  }
}
```

## Segurança

- `.env` é gitignored; o template é `.env.example`.
- O servidor usa apenas a chave pública (`anon`) + credenciais de um usuário — sem `service_role`.
- Toda autorização é resolvida no Postgres (grants das RPCs + RLS), não no servidor MCP.
