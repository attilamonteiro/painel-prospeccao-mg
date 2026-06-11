import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // O MCP SDK spawna o servidor MCP como processo filho (stdio) — não deve ser bundlado.
  serverExternalPackages: ['@modelcontextprotocol/sdk'],
};

export default nextConfig;
