import { describe, it, expect } from 'vitest';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { getProjectOverview } from '../src/tools/get-project-overview.js';
import { listComponents } from '../src/tools/list-components.js';
import { getComponentDetails } from '../src/tools/get-component-details.js';
import { getConventions } from '../src/tools/get-conventions.js';
import { findExamples } from '../src/tools/find-examples.js';

const SAMPLE_ROOT = join(
  fileURLToPath(new URL('.', import.meta.url)),
  '..',
  'examples',
  'sample-project',
);

describe('get_project_overview', () => {
  it('detects framework and TypeScript usage from the sample project', async () => {
    const overview = await getProjectOverview(SAMPLE_ROOT);
    expect(overview.name).toBe('sample-project');
    expect(overview.framework).toBe('vite-react');
    expect(overview.typescript).toBe(true);
    expect(overview.dependencies).toContain('react');
  });

  it('returns "unknown" when no package.json exists', async () => {
    const overview = await getProjectOverview(join(SAMPLE_ROOT, 'no-such-dir'));
    expect(overview.name).toBe('unknown');
    expect(overview.framework).toBe('unknown');
  });
});

describe('list_components', () => {
  it('finds all React components in the sample project', async () => {
    const components = await listComponents(SAMPLE_ROOT);
    const names = components.map((c) => c.name);
    expect(names).toContain('Button');
    expect(names).toContain('Modal');
    expect(names).toContain('UserForm');
  });

  it('returns results sorted by name', async () => {
    const components = await listComponents(SAMPLE_ROOT);
    const names = components.map((c) => c.name);
    const sorted = [...names].sort();
    expect(names).toEqual(sorted);
  });

  it('honors a custom scope path', async () => {
    const components = await listComponents(SAMPLE_ROOT, { scope: 'src/components' });
    expect(components.length).toBeGreaterThan(0);
  });
});

describe('get_component_details', () => {
  it('returns props, hooks, and imports for a known component', async () => {
    const details = await getComponentDetails(SAMPLE_ROOT, { name: 'UserForm' });
    expect(details).not.toBeNull();
    expect(details!.props.map((p) => p.name)).toContain('onSubmit');
    expect(details!.hooks).toContain('useState');
    expect(details!.imports.some((i) => i.source === 'react')).toBe(true);
    expect(details!.lineCount).toBeGreaterThan(0);
  });

  it('returns null when the component does not exist', async () => {
    const details = await getComponentDetails(SAMPLE_ROOT, { name: 'NoSuchComponent' });
    expect(details).toBeNull();
  });
});

describe('get_conventions', () => {
  it('reads CONVENTIONS.md when present', async () => {
    const result = await getConventions(SAMPLE_ROOT);
    expect(result.found).toBe(true);
    expect(result.content).toContain('Component conventions');
  });

  it('returns found: false when no conventions file exists', async () => {
    const result = await getConventions(join(SAMPLE_ROOT, 'no-such-dir'));
    expect(result.found).toBe(false);
  });
});

describe('find_examples', () => {
  it('returns name matches first, then path, then source body', async () => {
    const matches = await findExamples(SAMPLE_ROOT, { pattern: 'form' });
    expect(matches.length).toBeGreaterThan(0);
    expect(matches[0].component.name.toLowerCase()).toContain('form');
  });

  it('returns an empty array for an empty pattern', async () => {
    const matches = await findExamples(SAMPLE_ROOT, { pattern: '   ' });
    expect(matches).toEqual([]);
  });

  it('respects the limit option', async () => {
    const matches = await findExamples(SAMPLE_ROOT, { pattern: 'react', limit: 1 });
    expect(matches.length).toBeLessThanOrEqual(1);
  });
});
