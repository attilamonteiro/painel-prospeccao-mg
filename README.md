This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## MCP Server

O projeto inclui um **servidor MCP (Model Context Protocol)** próprio em [`mcp-server/`](./mcp-server/README.md), que expõe os dados de licitações públicas de MG como ferramentas para LLMs — 5 tools, 1 resource e 1 prompt sobre as RPCs do Supabase, com o mesmo modelo de segurança do frontend (authenticated + RLS). O arquivo [`.mcp.json`](./.mcp.json) registra o servidor automaticamente para quem abrir o projeto no Claude Code.

O protocolo é usado de ponta a ponta: o **chat com IA do próprio painel** (`/api/chat` + widget flutuante) atua como **host MCP** — conecta no servidor via stdio, descobre as tools com `tools/list` e faz a ponte para a Claude API com tool use. Requer `ANTHROPIC_API_KEY` no `.env.local`.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
