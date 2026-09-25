import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { isDesignLabEnabled } from '../lib/site/design-lab-gate.ts';
import { publicRoutes } from '../lib/site/routes.ts';
import { visibleNavigation } from '../lib/site/navigation.ts';

const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');

test('development and test allow the Lab by default, whatever the flag', () => {
  assert.equal(isDesignLabEnabled({ nodeEnv: 'development' }), true);
  assert.equal(isDesignLabEnabled({ nodeEnv: 'development', explicitFlag: 'false' }), true);
  assert.equal(isDesignLabEnabled({ nodeEnv: 'test' }), true);
  assert.equal(isDesignLabEnabled({ nodeEnv: undefined }), true);
});

test('production disables the Lab by default', () => {
  assert.equal(isDesignLabEnabled({ nodeEnv: 'production' }), false);
  assert.equal(isDesignLabEnabled({ nodeEnv: 'production', explicitFlag: '' }), false);
});

test('production opt-in is strict: only the exact string "true" enables the Lab', () => {
  for (const flag of ['false', '0', '1', 'TRUE', 'True', ' true', 'true ', 'yes', 'on']) assert.equal(isDesignLabEnabled({ nodeEnv: 'production', explicitFlag: flag }), false, flag);
  assert.equal(isDesignLabEnabled({ nodeEnv: 'production', explicitFlag: 'true' }), true);
});

test('the gate is server-side: the layout AND the page call it, it answers notFound(), with no public variable and no client-side hiding', () => {
  const gate = read('app/design-lab/gate.ts');
  const layout = read('app/design-lab/layout.tsx');
  assert.doesNotMatch(gate + layout, /['"]use client['"]/);
  assert.match(gate, /notFound()/);
  assert.match(gate, /process.env.DESIGN_LAB_ENABLED/);
  assert.match(layout, /assertDesignLabEnabled()/);
  assert.match(layout, /dynamic = 'force-dynamic'/);
  // The layout and its page render concurrently: the page must gate itself first, or its content is streamed inside the 404 body.
  const page = read('app/design-lab/page.tsx');
  assert.ok(page.indexOf('assertDesignLabEnabled();') > page.indexOf('export default async function DesignLabPage'));
  assert.ok(page.indexOf('assertDesignLabEnabled();') < page.indexOf('await searchParams'));
  for (const file of ['app/design-lab/layout.tsx', 'app/design-lab/gate.ts', 'lib/site/design-lab-gate.ts']) assert.doesNotMatch(read(file), /NEXT_PUBLIC|redirect/, file);
});

test('defense in depth: the Lab keeps noindex/nofollow and stays out of the sitemap and navigation', () => {
  assert.match(read('app/design-lab/page.tsx'), /robots:\s*\{\s*index:\s*false,\s*follow:\s*false/);
  assert.doesNotMatch(read('app/sitemap.ts'), /design-lab/);
  assert.ok(!publicRoutes.some((route) => route.path.includes('design-lab')));
  for (const locale of ['fr', 'en'] as const) assert.ok(!visibleNavigation(locale).flatMap((group) => group.items).some((item) => item.href?.includes('design-lab')));
});
