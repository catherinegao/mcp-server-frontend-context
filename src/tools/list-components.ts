import { join } from 'node:path';
import type { ComponentInfo } from '../types.js';
import {
  componentNameFromPath,
  isDirectory,
  readTextSafe,
  relativeToRoot,
  walkComponentFiles,
} from '../utils/fs-helpers.js';
import { detectComponentName, looksLikeReactComponent } from '../utils/parsers.js';

export interface ListComponentsOptions {
  /** Optional sub-path under the root (defaults to `src` when present). */
  scope?: string;
}

/**
 * Scans the project's source tree for files that look like React components
 * and returns a normalized inventory. Each entry includes the detected name,
 * file location, declaration kind, and which export styles are present.
 */
export async function listComponents(
  rootDir: string,
  options: ListComponentsOptions = {},
): Promise<ComponentInfo[]> {
  const scopeDir = await resolveScope(rootDir, options.scope);
  const files = await walkComponentFiles(scopeDir);

  const components: ComponentInfo[] = [];
  for (const filePath of files) {
    const source = await readTextSafe(filePath);
    if (!source) continue;
    if (!looksLikeReactComponent(source)) continue;

    const fallbackName = componentNameFromPath(filePath);
    const { name, kind, hasDefaultExport, hasNamedExport } = detectComponentName(
      source,
      fallbackName,
    );

    components.push({
      name,
      filePath,
      relativePath: relativeToRoot(rootDir, filePath),
      kind,
      hasDefaultExport,
      hasNamedExport,
    });
  }

  components.sort((a, b) => a.name.localeCompare(b.name));
  return components;
}

async function resolveScope(rootDir: string, scope?: string): Promise<string> {
  if (scope) {
    return join(rootDir, scope);
  }
  const srcDir = join(rootDir, 'src');
  if (await isDirectory(srcDir)) {
    return srcDir;
  }
  return rootDir;
}
