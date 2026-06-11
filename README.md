# mcp-server-frontend-context

A [Model Context Protocol](https://modelcontextprotocol.io/) server that
exposes frontend-project context — `package.json`, framework detection,
component inventory, conventions, and in-repo examples — to LLM agents like
[Cursor](https://cursor.com/), [Claude Desktop](https://claude.ai/download),
and any other MCP-compatible client.

Built to make AI-assisted engineering more grounded. Instead of letting the
agent guess what your project looks like, this server tells it — quickly,
deterministically, and with no LLM call required for the lookup itself.

## Why this exists

Most "AI coding" failure modes come from the same place: the agent doesn't
know what's already in the codebase, what framework it's working in, what
component patterns the team uses, or where a similar example lives. So it
invents.

This MCP server gives the agent the answers up front:

- **What kind of project is this?** → `get_project_overview`
- **What components already exist?** → `list_components`
- **How is this specific component implemented?** → `get_component_details`
- **What conventions does this team follow?** → `get_conventions`
- **Where is something like X done in this repo?** → `find_examples`

The output of each tool is plain JSON, so it composes cleanly with whatever
prompt the agent is running.

## Quickstart

### 1. Install

```bash
npm install
npm run build
```

### 2. Wire it into your MCP client

#### Cursor (`.cursor/mcp.json`)

```json
{
  "mcpServers": {
    "frontend-context": {
      "command": "node",
      "args": ["/absolute/path/to/mcp-server-frontend-context/dist/index.js"],
      "env": {
        "PROJECT_ROOT": "/absolute/path/to/your/project"
      }
    }
  }
}
```

#### Claude Desktop (`~/Library/Application Support/Claude/claude_desktop_config.json` on macOS, `%APPDATA%\Claude\claude_desktop_config.json` on Windows)

```json
{
  "mcpServers": {
    "frontend-context": {
      "command": "node",
      "args": ["/absolute/path/to/mcp-server-frontend-context/dist/index.js"],
      "env": {
        "PROJECT_ROOT": "/absolute/path/to/your/project"
      }
    }
  }
}
```

`PROJECT_ROOT` is optional — when omitted, the server uses the process working
directory. Each tool call also accepts a per-call `rootDir` argument that
overrides both.

### 3. Use it from the agent

Once the server is registered, the agent can call any of the tools by name.
A typical agentic flow looks like:

> *Agent reasoning:* "The user wants me to add a new modal. Let me first see
> what conventions this project follows and find an existing modal to mirror."
>
> 1. `get_conventions(rootDir)` → reads `CONVENTIONS.md`
> 2. `find_examples({ rootDir, pattern: "modal" })` → returns `Modal.tsx`
> 3. `get_component_details({ rootDir, name: "Modal" })` → returns props,
>    hooks, imports, and the source
> 4. *Agent writes new modal following the existing pattern.*

## Tool reference

### `get_project_overview`

Returns the project's name, version, detected framework, package manager,
TypeScript usage, dependency list, and npm scripts.

| Input | Type | Notes |
| --- | --- | --- |
| `rootDir` | string (optional) | Project root. Defaults to `PROJECT_ROOT` or `cwd`. |

**Frameworks detected:** React, Next.js, Vite + React, Create React App,
Remix, Astro, Svelte, Vue, Angular, or `unknown`.

### `list_components`

Returns an inventory of React components: detected name, file path,
declaration kind (`function` / `arrow` / `class`), and whether the file has a
default export, a named export, or both.

| Input | Type | Notes |
| --- | --- | --- |
| `rootDir` | string (optional) | Project root. |
| `scope` | string (optional) | Sub-path to scan. Defaults to `src` if present, else the root. |

**Heuristic:** files with `.tsx` or `.jsx`, JSX-like content, and a
PascalCase declaration are treated as components. Default-ignored:
`node_modules`, `.git`, `dist`, `build`, `.next`, `.nuxt`, `coverage`,
`.cache`, `.turbo`, `.vercel`, `.netlify`.

### `get_component_details`

Returns props (parsed from a `Props` or `<Name>Props` interface), hooks
called, all imports (default / named / namespace), line count, and the raw
source for a single component.

| Input | Type | Notes |
| --- | --- | --- |
| `rootDir` | string (optional) | Project root. |
| `name` | string (optional) | Component name to look up. |
| `filePath` | string (optional) | File path. Overrides `name` when both are provided. |

### `get_conventions`

Returns the contents of the project's conventions document. Searches, in
order: `CONVENTIONS.md`, `docs/CONVENTIONS.md`, `.cursor/rules/CONVENTIONS.md`,
`AGENTS.md`, `CONTRIBUTING.md`. Returns `{ found: false }` when no match
exists so the agent can fall back gracefully.

| Input | Type | Notes |
| --- | --- | --- |
| `rootDir` | string (optional) | Project root. |

### `find_examples`

Finds example components matching a free-form pattern (e.g. `"modal"`,
`"form"`, `"data-table"`). Scores matches by component name (10), file path
(5), then source body (1), and returns the top results sorted by descending
score.

| Input | Type | Notes |
| --- | --- | --- |
| `rootDir` | string (optional) | Project root. |
| `pattern` | string (required) | Search pattern, case-insensitive. |
| `limit` | number (optional) | Max results. Defaults to 10. |

## Design notes

A few things this server does on purpose, and why:

- **Regex over full AST.** Parsing TypeScript is expensive and brittle for a
  starter MCP server. The agent consuming this output has its own filesystem
  access for the rare edge cases that need precision; the goal here is fast,
  good-enough context, not a compiler.
- **JSON-stringified responses.** Every tool returns `content[0].text` as
  pretty-printed JSON. That gives the agent a single, structured shape it can
  parse or pass back into another tool.
- **Heuristic framework detection.** Looks at dependencies first
  (`next` → Next, `astro` → Astro, etc.), then known config files. Returns
  `unknown` rather than guessing on weak signals.
- **No project-state mutation.** Tools are strictly read-only. The agent can
  write code on its own; this server's job is to inform that writing, not
  perform it.

## Development

```bash
npm install           # install dependencies
npm run dev           # run the server in stdio mode against cwd
npm run test          # run the vitest suite (uses examples/sample-project)
npm run lint          # eslint
npm run typecheck     # tsc --noEmit
npm run format        # prettier --write
npm run build         # compile to dist/
```

The `examples/sample-project/` directory is a tiny Vite + React + TypeScript
project that the test suite scans, so every tool exercises real I/O on real
component files rather than mocks.

## License

[MIT](./LICENSE)
