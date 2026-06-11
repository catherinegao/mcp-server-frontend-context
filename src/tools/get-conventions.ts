import { join } from 'node:path';
import type { ConventionsDoc } from '../types.js';
import { readTextSafe } from '../utils/fs-helpers.js';

const CANDIDATES = [
  'CONVENTIONS.md',
  'docs/CONVENTIONS.md',
  '.cursor/rules/CONVENTIONS.md',
  'AGENTS.md',
  'CONTRIBUTING.md',
];

/**
 * Reads the project's conventions document. Looks for a CONVENTIONS.md at
 * the repo root first, then a few common alternatives. Returns `found: false`
 * when nothing is present so the agent can fall back to inferring conventions
 * from the code itself.
 */
export async function getConventions(rootDir: string): Promise<ConventionsDoc> {
  for (const candidate of CANDIDATES) {
    const path = join(rootDir, candidate);
    const content = await readTextSafe(path);
    if (content) {
      return { found: true, path, content };
    }
  }
  return { found: false };
}
