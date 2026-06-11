/**
 * Shared type definitions for the frontend-context MCP server.
 */

export interface ProjectOverview {
  name: string;
  version: string;
  description?: string;
  framework: Framework;
  packageManager: PackageManager;
  typescript: boolean;
  dependencies: string[];
  devDependencies: string[];
  scripts: Record<string, string>;
  rootDir: string;
}

export type Framework =
  | 'react'
  | 'next'
  | 'vite-react'
  | 'create-react-app'
  | 'remix'
  | 'astro'
  | 'svelte'
  | 'vue'
  | 'angular'
  | 'unknown';

export type PackageManager = 'npm' | 'yarn' | 'pnpm' | 'bun' | 'unknown';

export interface ComponentInfo {
  name: string;
  filePath: string;
  relativePath: string;
  kind: 'function' | 'arrow' | 'class' | 'unknown';
  hasDefaultExport: boolean;
  hasNamedExport: boolean;
}

export interface ComponentDetails extends ComponentInfo {
  props: PropInfo[];
  hooks: string[];
  imports: ImportInfo[];
  lineCount: number;
  source: string;
}

export interface PropInfo {
  name: string;
  type?: string;
  optional: boolean;
}

export interface ImportInfo {
  source: string;
  named: string[];
  default?: string;
  namespace?: string;
}

export interface ConventionsDoc {
  found: boolean;
  path?: string;
  content?: string;
}

export interface ExampleMatch {
  component: ComponentInfo;
  matchedOn: string[];
  score: number;
}
