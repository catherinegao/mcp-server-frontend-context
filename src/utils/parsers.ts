import type { ComponentInfo, ImportInfo, PropInfo } from '../types.js';

/**
 * Lightweight regex-based parsers. Deliberately not using a full TS parser
 * here - the goal is fast, dependency-free heuristics good enough to surface
 * useful context to an LLM, not a perfect AST.
 *
 * Trade-off documented intentionally: regex misses some edge cases (HOC
 * wrappers, dynamic exports, complex prop spreads). For a starter MCP server
 * the simplicity is the feature; the LLM consuming this output can also read
 * the raw file via its own filesystem access when more precision is needed.
 */

const HOOK_PATTERN = /\b(use[A-Z]\w*)\s*\(/g;
const IMPORT_LINE = /^import\s+(.+?)\s+from\s+['"]([^'"]+)['"]/gm;
const DEFAULT_EXPORT_FN =
  /export\s+default\s+(?:function\s+(\w+)|\(\)|class\s+(\w+)|(\w+))/;
const NAMED_EXPORT_FN =
  /export\s+(?:const|function|class)\s+(\w+)/g;
const FUNCTION_COMPONENT_DECL =
  /(?:function\s+([A-Z]\w*)\s*\(|const\s+([A-Z]\w*)\s*[:=]\s*(?:\([^)]*\)|\w+)\s*=>)/;
const CLASS_COMPONENT_DECL =
  /class\s+([A-Z]\w*)\s+extends\s+(?:React\.)?(?:PureComponent|Component)/;

/**
 * Returns true when a file looks like it defines at least one React component.
 * Heuristic: contains JSX-like content AND either a function/arrow/class
 * declaration with a PascalCase name.
 */
export function looksLikeReactComponent(source: string): boolean {
  const hasJsx = /<[A-Za-z][\w.]*(\s|\/|>)/.test(source);
  if (!hasJsx) return false;
  return FUNCTION_COMPONENT_DECL.test(source) || CLASS_COMPONENT_DECL.test(source);
}

/**
 * Best-effort detection of the primary exported component name in a file.
 */
export function detectComponentName(source: string, fallback: string): {
  name: string;
  kind: ComponentInfo['kind'];
  hasDefaultExport: boolean;
  hasNamedExport: boolean;
} {
  const defaultMatch = DEFAULT_EXPORT_FN.exec(source);
  const defaultName = defaultMatch
    ? defaultMatch[1] || defaultMatch[2] || defaultMatch[3]
    : undefined;

  const namedExports = Array.from(source.matchAll(NAMED_EXPORT_FN), (m) => m[1]).filter(
    (n) => /^[A-Z]/.test(n),
  );

  const classMatch = CLASS_COMPONENT_DECL.exec(source);
  const fnMatch = FUNCTION_COMPONENT_DECL.exec(source);

  let kind: ComponentInfo['kind'] = 'unknown';
  if (classMatch) kind = 'class';
  else if (fnMatch && fnMatch[1]) kind = 'function';
  else if (fnMatch && fnMatch[2]) kind = 'arrow';

  const name = defaultName || namedExports[0] || classMatch?.[1] || fnMatch?.[1] || fnMatch?.[2] || fallback;

  return {
    name,
    kind,
    hasDefaultExport: Boolean(defaultName),
    hasNamedExport: namedExports.length > 0,
  };
}

/**
 * Returns the unique set of React hook names called in the file. Heuristic
 * only - matches the `useXxx(` pattern.
 */
export function extractHooks(source: string): string[] {
  const found = new Set<string>();
  for (const match of source.matchAll(HOOK_PATTERN)) {
    found.add(match[1]);
  }
  return Array.from(found).sort();
}

/**
 * Parses import statements. Handles default, named, namespace, and mixed
 * forms. Side-effect imports (`import './x.css'`) are skipped.
 */
export function extractImports(source: string): ImportInfo[] {
  const results: ImportInfo[] = [];
  for (const match of source.matchAll(IMPORT_LINE)) {
    const clause = match[1].trim();
    const sourceModule = match[2];

    const info: ImportInfo = { source: sourceModule, named: [] };

    const namespaceMatch = /\*\s+as\s+(\w+)/.exec(clause);
    if (namespaceMatch) {
      info.namespace = namespaceMatch[1];
    }

    const namedMatch = /\{([^}]+)\}/.exec(clause);
    if (namedMatch) {
      info.named = namedMatch[1]
        .split(',')
        .map((s) => s.trim().replace(/\s+as\s+\w+/, ''))
        .filter(Boolean);
    }

    const defaultMatch = /^([A-Za-z_$][\w$]*)(\s*,|\s*$)/.exec(clause);
    if (defaultMatch && !namespaceMatch) {
      info.default = defaultMatch[1];
    }

    results.push(info);
  }
  return results;
}

/**
 * Best-effort prop extraction from a TypeScript Props interface or inline
 * destructured props. Returns an empty array when nothing recognizable is
 * found - the LLM can fall back to reading the source.
 */
export function extractProps(source: string, componentName: string): PropInfo[] {
  const candidates = [
    new RegExp(`(?:interface|type)\\s+${componentName}Props\\s*[=]?\\s*\\{([\\s\\S]*?)\\n\\}`),
    new RegExp(`(?:interface|type)\\s+Props\\s*[=]?\\s*\\{([\\s\\S]*?)\\n\\}`),
  ];

  for (const pattern of candidates) {
    const match = pattern.exec(source);
    if (match) {
      return parsePropsBlock(match[1]);
    }
  }

  return [];
}

function parsePropsBlock(block: string): PropInfo[] {
  const props: PropInfo[] = [];
  const lines = block
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('//') && !l.startsWith('*') && !l.startsWith('/*'));

  for (const line of lines) {
    const match = /^(\w+)(\?)?\s*:\s*(.+?);?$/.exec(line);
    if (match) {
      props.push({
        name: match[1],
        optional: Boolean(match[2]),
        type: match[3].replace(/;$/, '').trim(),
      });
    }
  }

  return props;
}
