import type { ExampleMatch } from '../types.js';
import { readTextSafe } from '../utils/fs-helpers.js';
import { listComponents } from './list-components.js';

export interface FindExamplesOptions {
  pattern: string;
  limit?: number;
}

/**
 * Finds example components that match a free-form pattern. Scores matches
 * across three dimensions, in order of weight:
 *   1. component name contains the pattern (highest)
 *   2. file path contains the pattern
 *   3. source body contains the pattern (lowest)
 *
 * Returns the top N matches sorted by descending score. Useful when an agent
 * is asked "show me how form modals are built" and needs concrete examples
 * from the actual codebase rather than guessing.
 */
export async function findExamples(
  rootDir: string,
  options: FindExamplesOptions,
): Promise<ExampleMatch[]> {
  const { pattern, limit = 10 } = options;
  if (!pattern.trim()) return [];

  const needle = pattern.toLowerCase();
  const components = await listComponents(rootDir);
  const matches: ExampleMatch[] = [];

  for (const component of components) {
    const matchedOn: string[] = [];
    let score = 0;

    if (component.name.toLowerCase().includes(needle)) {
      matchedOn.push('name');
      score += 10;
    }
    if (component.relativePath.toLowerCase().includes(needle)) {
      matchedOn.push('path');
      score += 5;
    }

    if (matchedOn.length === 0) {
      const source = await readTextSafe(component.filePath);
      if (source && source.toLowerCase().includes(needle)) {
        matchedOn.push('source');
        score += 1;
      }
    }

    if (score > 0) {
      matches.push({ component, matchedOn, score });
    }
  }

  matches.sort((a, b) => b.score - a.score || a.component.name.localeCompare(b.component.name));
  return matches.slice(0, limit);
}
