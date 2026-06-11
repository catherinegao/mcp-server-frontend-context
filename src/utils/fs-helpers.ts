import { readFile, readdir, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, relative, extname, basename } from 'node:path';

const DEFAULT_IGNORE = new Set([
  'node_modules',
  '.git',
  'dist',
  'build',
  '.next',
  '.nuxt',
  'coverage',
  '.cache',
  '.turbo',
  '.vercel',
  '.netlify',
]);

const COMPONENT_EXTENSIONS = new Set(['.tsx', '.jsx']);

/**
 * Recursively walks a directory and returns all .tsx/.jsx files. Honors a
 * sensible default ignore list (node_modules, build outputs, etc.) and a
 * caller-provided extra ignore set.
 */
export async function walkComponentFiles(
  rootDir: string,
  extraIgnore: Set<string> = new Set(),
): Promise<string[]> {
  const ignore = new Set([...DEFAULT_IGNORE, ...extraIgnore]);
  const results: string[] = [];

  async function walk(dir: string): Promise<void> {
    let entries;
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      if (entry.name.startsWith('.') && entry.name !== '.') continue;
      if (ignore.has(entry.name)) continue;

      const fullPath = join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(fullPath);
      } else if (entry.isFile() && COMPONENT_EXTENSIONS.has(extname(entry.name))) {
        results.push(fullPath);
      }
    }
  }

  await walk(rootDir);
  return results;
}

/**
 * Reads a JSON file safely. Returns null when the file is missing or invalid.
 */
export async function readJsonSafe<T = unknown>(filePath: string): Promise<T | null> {
  try {
    const raw = await readFile(filePath, 'utf-8');
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

/**
 * Reads a text file safely. Returns null when the file is missing.
 */
export async function readTextSafe(filePath: string): Promise<string | null> {
  try {
    return await readFile(filePath, 'utf-8');
  } catch {
    return null;
  }
}

export function fileExists(path: string): boolean {
  return existsSync(path);
}

export function relativeToRoot(rootDir: string, absolutePath: string): string {
  return relative(rootDir, absolutePath).replace(/\\/g, '/');
}

/**
 * Derives a likely component name from a file path. Falls back to the basename
 * without extension; callers can override with the actual exported identifier
 * once they parse the file.
 */
export function componentNameFromPath(filePath: string): string {
  const name = basename(filePath, extname(filePath));
  if (name === 'index') {
    const parent = basename(filePath.substring(0, filePath.lastIndexOf('/')));
    return parent || 'index';
  }
  return name;
}

export async function isDirectory(path: string): Promise<boolean> {
  try {
    const stats = await stat(path);
    return stats.isDirectory();
  } catch {
    return false;
  }
}
