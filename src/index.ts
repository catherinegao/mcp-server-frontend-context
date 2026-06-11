#!/usr/bin/env node
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createServer } from './server.js';

async function main() {
  const rootDir = process.env.PROJECT_ROOT ?? process.cwd();
  const server = createServer(rootDir);
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error('[mcp-server-frontend-context] fatal error:', err);
  process.exit(1);
});
