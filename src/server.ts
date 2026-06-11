import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  type Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { resolve } from 'node:path';

import { getProjectOverview } from './tools/get-project-overview.js';
import { listComponents } from './tools/list-components.js';
import { getComponentDetails } from './tools/get-component-details.js';
import { getConventions } from './tools/get-conventions.js';
import { findExamples } from './tools/find-examples.js';

const TOOL_DEFINITIONS: Tool[] = [
  {
    name: 'get_project_overview',
    description:
      'Returns a high-level overview of the frontend project: name, version, detected framework (React, Next, Vite, Remix, etc.), package manager, TypeScript usage, dependency list, and npm scripts. Useful for grounding the agent in what kind of project it is working in before suggesting changes.',
    inputSchema: {
      type: 'object',
      properties: {
        rootDir: {
          type: 'string',
          description:
            'Absolute path to the project root. Defaults to the server\'s working directory.',
        },
      },
    },
  },
  {
    name: 'list_components',
    description:
      'Returns an inventory of React components in the project: detected name, file path, declaration kind (function / arrow / class), and which export styles are used. Heuristic-based; surfaces .tsx and .jsx files that contain JSX and a PascalCase declaration.',
    inputSchema: {
      type: 'object',
      properties: {
        rootDir: {
          type: 'string',
          description: 'Absolute path to the project root.',
        },
        scope: {
          type: 'string',
          description:
            'Optional sub-path under the root to scan (e.g. "src/components"). Defaults to "src" if it exists, otherwise the root.',
        },
      },
    },
  },
  {
    name: 'get_component_details',
    description:
      'Returns detailed information about a single component: its props (extracted from a Props or <Name>Props interface), the React hooks it calls, all of its imports, line count, and the raw source. Look up by detected name or by file path.',
    inputSchema: {
      type: 'object',
      properties: {
        rootDir: { type: 'string', description: 'Absolute path to the project root.' },
        name: { type: 'string', description: 'Component name to look up.' },
        filePath: {
          type: 'string',
          description: 'Absolute or root-relative file path. Overrides name when both are provided.',
        },
      },
    },
  },
  {
    name: 'get_conventions',
    description:
      'Returns the contents of the project\'s conventions document, if present. Looks for CONVENTIONS.md at the root, then docs/CONVENTIONS.md, .cursor/rules/CONVENTIONS.md, AGENTS.md, and CONTRIBUTING.md in that order. Use this before proposing changes so the agent follows project-specific patterns.',
    inputSchema: {
      type: 'object',
      properties: {
        rootDir: { type: 'string', description: 'Absolute path to the project root.' },
      },
    },
  },
  {
    name: 'find_examples',
    description:
      'Finds example components matching a free-form pattern (e.g. "modal", "form", "data-table"). Scores matches by component name, file path, then source body and returns the top results. Useful when the agent needs concrete in-repo examples to mirror rather than inventing patterns from scratch.',
    inputSchema: {
      type: 'object',
      properties: {
        rootDir: { type: 'string', description: 'Absolute path to the project root.' },
        pattern: { type: 'string', description: 'Search pattern (case-insensitive).' },
        limit: {
          type: 'number',
          description: 'Maximum number of results to return. Defaults to 10.',
        },
      },
      required: ['pattern'],
    },
  },
];

interface ToolArgs {
  rootDir?: string;
  scope?: string;
  name?: string;
  filePath?: string;
  pattern?: string;
  limit?: number;
}

export function createServer(defaultRootDir: string = process.cwd()): Server {
  const server = new Server(
    { name: 'mcp-server-frontend-context', version: '0.1.0' },
    { capabilities: { tools: {} } },
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOL_DEFINITIONS }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const args = (request.params.arguments ?? {}) as ToolArgs;
    const rootDir = resolve(args.rootDir ?? defaultRootDir);

    switch (request.params.name) {
      case 'get_project_overview':
        return toToolResult(await getProjectOverview(rootDir));

      case 'list_components':
        return toToolResult(await listComponents(rootDir, { scope: args.scope }));

      case 'get_component_details':
        return toToolResult(
          await getComponentDetails(rootDir, { name: args.name, filePath: args.filePath }),
        );

      case 'get_conventions':
        return toToolResult(await getConventions(rootDir));

      case 'find_examples':
        if (!args.pattern) {
          return toErrorResult('find_examples requires a `pattern` argument.');
        }
        return toToolResult(
          await findExamples(rootDir, { pattern: args.pattern, limit: args.limit }),
        );

      default:
        return toErrorResult(`Unknown tool: ${request.params.name}`);
    }
  });

  return server;
}

function toToolResult(payload: unknown) {
  return {
    content: [{ type: 'text' as const, text: JSON.stringify(payload, null, 2) }],
  };
}

function toErrorResult(message: string) {
  return {
    content: [{ type: 'text' as const, text: message }],
    isError: true,
  };
}
