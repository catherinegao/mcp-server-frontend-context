import type { ComponentDetails } from '../types.js';
import { readTextSafe } from '../utils/fs-helpers.js';
import { extractHooks, extractImports, extractProps } from '../utils/parsers.js';
import { listComponents } from './list-components.js';

/**
 * Locates a component by name and returns props, hooks, imports, line count,
 * and the raw source. Component lookup is case-sensitive against detected
 * names; if multiple matches exist the first by alphabetical order wins
 * (callers can disambiguate with `filePath`).
 */
export async function getComponentDetails(
  rootDir: string,
  options: { name?: string; filePath?: string },
): Promise<ComponentDetails | null> {
  const all = await listComponents(rootDir);

  let target = options.filePath
    ? all.find((c) => c.filePath === options.filePath || c.relativePath === options.filePath)
    : undefined;

  if (!target && options.name) {
    target = all.find((c) => c.name === options.name);
  }

  if (!target) return null;

  const source = await readTextSafe(target.filePath);
  if (!source) return null;

  return {
    ...target,
    props: extractProps(source, target.name),
    hooks: extractHooks(source),
    imports: extractImports(source),
    lineCount: source.split('\n').length,
    source,
  };
}
