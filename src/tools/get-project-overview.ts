import { join } from 'node:path';
import type { Framework, PackageManager, ProjectOverview } from '../types.js';
import { fileExists, readJsonSafe } from '../utils/fs-helpers.js';

interface PackageJson {
  name?: string;
  version?: string;
  description?: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  scripts?: Record<string, string>;
}

export async function getProjectOverview(rootDir: string): Promise<ProjectOverview> {
  const pkg = (await readJsonSafe<PackageJson>(join(rootDir, 'package.json'))) ?? {};
  const deps = { ...(pkg.dependencies ?? {}), ...(pkg.devDependencies ?? {}) };

  return {
    name: pkg.name ?? 'unknown',
    version: pkg.version ?? '0.0.0',
    description: pkg.description,
    framework: detectFramework(deps, rootDir),
    packageManager: detectPackageManager(rootDir),
    typescript: 'typescript' in deps || fileExists(join(rootDir, 'tsconfig.json')),
    dependencies: Object.keys(pkg.dependencies ?? {}).sort(),
    devDependencies: Object.keys(pkg.devDependencies ?? {}).sort(),
    scripts: pkg.scripts ?? {},
    rootDir,
  };
}

function detectFramework(deps: Record<string, string>, rootDir: string): Framework {
  if ('next' in deps) return 'next';
  if ('@remix-run/react' in deps) return 'remix';
  if ('astro' in deps) return 'astro';
  if ('svelte' in deps) return 'svelte';
  if ('vue' in deps) return 'vue';
  if ('@angular/core' in deps) return 'angular';
  if ('react' in deps) {
    if ('vite' in deps) return 'vite-react';
    if ('react-scripts' in deps || fileExists(join(rootDir, 'public', 'index.html'))) {
      return 'create-react-app';
    }
    return 'react';
  }
  return 'unknown';
}

function detectPackageManager(rootDir: string): PackageManager {
  if (fileExists(join(rootDir, 'pnpm-lock.yaml'))) return 'pnpm';
  if (fileExists(join(rootDir, 'yarn.lock'))) return 'yarn';
  if (fileExists(join(rootDir, 'bun.lockb'))) return 'bun';
  if (fileExists(join(rootDir, 'package-lock.json'))) return 'npm';
  return 'unknown';
}
