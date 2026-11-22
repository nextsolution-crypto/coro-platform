/*
 * Corpus public de Sophie, généré depuis le code source du site getcoro.io.
 *
 * Chaque page publiée (app/<route>/page.tsx) et ses fichiers de contenu
 * (content.ts, lib/site/*-content.ts) sont lus avec le compilateur
 * TypeScript ; les textes visibles sont regroupés par page et par langue.
 * Sophie ne connaît ainsi que ce que le site publie, dans les deux langues.
 *
 * Usage : node scripts/public-knowledge-site-corpus.cjs [--write]
 */
const fs = require('fs');
const path = require('path');
const ts = require('typescript');

const ROOT = path.resolve(__dirname, '../../coro-website');
const OUTPUT = path.resolve(
  __dirname,
  '../src/public-knowledge/public-knowledge.site-corpus.ts',
);

/** Pages exclues : outils internes, listes dynamiques, aperçus. */
const EXCLUDED_ROUTES = new Set(['/design-lab', '/blog', '/blog/[slug]']);
/** Rang d'autorité (plus petit = plus fort). */
const AUTHORITY = {
  '/pricing': 10,
  '/security': 15,
  '/': 20,
  '/privacy': 40,
  '/terms': 40,
  '/sms-terms': 40,
  '/guides': 45,
};
const SOURCE_TYPE = {
  '/': 'SITE_PAGE',
  '/pricing': 'COMMERCIAL_INFORMATION',
  '/programme-recommandation': 'COMMERCIAL_INFORMATION',
  '/partners': 'COMMERCIAL_INFORMATION',
  '/contact': 'SITE_PAGE',
  '/about': 'SITE_PAGE',
  '/security': 'SITE_PAGE',
  '/privacy': 'SITE_PAGE',
  '/terms': 'SITE_PAGE',
  '/sms-terms': 'SITE_PAGE',
  '/guides': 'SITE_PAGE',
  '/diagnostic': 'SITE_PAGE',
};
/** Titres explicites quand la première ligne extraite n'en est pas un. */
const TITLES = {
  '/': { 'fr-CA': 'CORO — Plateforme de résilience opérationnelle', 'en-CA': 'CORO — Operational resilience platform' },
  '/terms': { 'fr-CA': 'Conditions d’utilisation et documents juridiques CORO', 'en-CA': 'CORO terms of use and legal documents' },
  '/sms-terms': { 'fr-CA': 'Conditions des messages texte (SMS) CORO', 'en-CA': 'CORO text message (SMS) terms' },
  '/sentinelle-population': { 'fr-CA': 'Sentinelle Population — alerte à la population', 'en-CA': 'Sentinelle Population — public alerting' },
  '/coro-knowledge': { 'en-CA': 'CORO Knowledge — building documentation memory' },
  '/coro-ai': { 'en-CA': 'CORO AI — AI assistant for buildings' },
  '/resilience-operationnelle': { 'en-CA': 'Operational resilience: prepare, act, recover, improve' },
};
const SKIPPED_PROPERTIES = new Set([
  'className', 'href', 'src', 'id', 'key', 'icon', 'variant', 'style', 'type',
  'path', 'url', 'slug', 'color', 'tone', 'image', 'alt', 'name', 'rel',
  'target', 'role', 'width', 'height', 'kind', 'ariaLabel', 'aria-label',
  'canonical', 'route', 'routeKey', 'testId', 'data-testid', 'layout',
  'accent', 'size', 'media', 'poster', 'locale', 'lang', 'hrefEn', 'hrefFr',
]);
const FR_WORDS = /\b(le|la|les|des|du|une|et|est|pour|qui|vos|votre|avec|dans|sur|aux|sont|pas|plus|ou|lors|chaque|leurs?)\b/gi;
const EN_WORDS = /\b(the|and|is|for|your|with|to|of|are|on|each|their|not|when|from|that|this|can)\b/gi;

function language(text) {
  const fr = (text.match(FR_WORDS) || []).length + (/[éèêàùçôîœ’]/i.test(text) ? 2 : 0);
  const en = (text.match(EN_WORDS) || []).length;
  if (fr === en) return null;
  return fr > en ? 'fr-CA' : 'en-CA';
}

function admissible(text) {
  const value = text.replace(/\s+/g, ' ').trim();
  if (value.length < 18 || value.split(' ').length < 3) return null;
  if (/^(https?:|\/|#|@|\.|var\(|rgba?\()/.test(value)) return null;
  if (/[{}<>]|=>|\bimport\b|\bfunction\b|\bconst\b|className|\.module\.css/.test(value)) return null;
  if (/^[\w-]+(\s[\w-]+){0,3}$/.test(value) && !/[a-zà-ÿ]{4,}\s[a-zà-ÿ]{4,}/i.test(value)) return null;
  return value;
}

function propertyName(node) {
  let current = node.parent;
  while (current) {
    if (ts.isPropertyAssignment(current) && current.initializer) {
      const name = current.name;
      return ts.isIdentifier(name) || ts.isStringLiteral(name) ? name.text : null;
    }
    if (ts.isJsxAttribute(current)) return current.name.getText();
    if (ts.isArrayLiteralExpression(current) || ts.isJsxElement(current) || ts.isJsxFragment(current)) return null;
    current = current.parent;
  }
  return null;
}

function strings(file) {
  const source = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true,
    file.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const found = [];
  const visit = (node) => {
    if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) return;
    if (ts.isCallExpression(node) && /^(require|fetch|publicApiUrl|localizedHref|buildPageMetadata|absoluteUrl)$/.test(node.expression.getText())) return;
    let text = null;
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) text = node.text;
    else if (ts.isJsxText(node)) text = node.getText();
    if (text !== null) {
      const name = propertyName(node);
      const value = admissible(text);
      if (value && !(name && SKIPPED_PROPERTIES.has(name))) found.push(value);
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return found;
}

function resolveImport(from, specifier) {
  let base;
  if (specifier.startsWith('@/')) base = path.join(ROOT, specifier.slice(2));
  else if (specifier.startsWith('.')) base = path.resolve(path.dirname(from), specifier);
  else return null;
  for (const candidate of [base, `${base}.ts`, `${base}.tsx`, path.join(base, 'index.ts')])
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) return candidate;
  return null;
}

/** Fichiers de contenu d'une page : la page, ses content.ts et lib/site/*-content.ts. */
function contentFiles(page) {
  const files = new Set([page]);
  const queue = [[page, 0]];
  while (queue.length) {
    const [file, depth] = queue.shift();
    const text = fs.readFileSync(file, 'utf8');
    for (const match of text.matchAll(/from\s+['"]([^'"]+)['"]/g)) {
      const resolved = resolveImport(file, match[1]);
      if (!resolved || files.has(resolved)) continue;
      const relative = path.relative(ROOT, resolved);
      const isContent = /content/i.test(path.basename(resolved));
      const isLocalApp = relative.startsWith('app' + path.sep) && !relative.includes(`${path.sep}components${path.sep}`);
      if (isContent && (relative.startsWith('lib' + path.sep) || isLocalApp)) files.add(resolved);
      else if (isLocalApp && depth < 1 && /\.tsx?$/.test(resolved) && !/client|widget|form/i.test(path.basename(resolved))) {
        files.add(resolved);
        queue.push([resolved, depth + 1]);
        continue;
      }
      if (files.has(resolved) && depth < 2) queue.push([resolved, depth + 1]);
    }
  }
  return [...files].sort();
}

function pages() {
  const result = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name === 'page.tsx') {
        const route = '/' + path.relative(path.join(ROOT, 'app'), dir).split(path.sep).join('/');
        result.push({ route: route === '/' ? '/' : route.replace(/\/$/, ''), file: full });
      }
    }
  };
  walk(path.join(ROOT, 'app'));
  return result
    .map((page) => ({ ...page, route: page.route === '/.' || page.route === '/' ? '/' : page.route }))
    .filter((page) => !EXCLUDED_ROUTES.has(page.route))
    .sort((a, b) => a.route.localeCompare(b.route));
}

function sourceKey(route) {
  return route === '/' ? 'site-home' : `site${route.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}`;
}

function build() {
  const entries = [];
  for (const page of pages()) {
    const byLanguage = { 'fr-CA': [], 'en-CA': [] };
    for (const file of contentFiles(page.file))
      for (const text of strings(file)) {
        const lang = language(text);
        if (lang && !byLanguage[lang].includes(text)) byLanguage[lang].push(text);
      }
    for (const lang of ['fr-CA', 'en-CA']) {
      const lines = byLanguage[lang];
      if (lines.length < 3) continue;
      entries.push({
        sourceKey: sourceKey(page.route),
        route: page.route,
        language: lang,
        sourceType: SOURCE_TYPE[page.route] ?? (page.route.startsWith('/documents/') ? 'MODULE_PAGE' : 'MODULE_PAGE'),
        authorityRank: AUTHORITY[page.route] ?? 30,
        title: (TITLES[page.route]?.[lang] ?? lines[0]).slice(0, 160),
        content: lines.join('\n'),
      });
    }
  }
  return entries;
}

function render(corpus) {
  return (
    '// Fichier généré par scripts/public-knowledge-site-corpus.cjs — ne pas modifier à la main.\n' +
    '// Source : textes publiés du site getcoro.io (coro-website/app).\n' +
    "import type { SiteCorpusEntry } from './public-knowledge.types';\n\n" +
    'export const SITE_CORPUS: SiteCorpusEntry[] = ' +
    JSON.stringify(corpus, null, 1) +
    ';\n'
  );
}

module.exports = { build, render, OUTPUT };

if (require.main === module) {
  const corpus = build();
  if (process.argv.includes('--write')) fs.writeFileSync(OUTPUT, render(corpus));
  const total = corpus.reduce((sum, entry) => sum + entry.content.length, 0);
  console.log(JSON.stringify({ entries: corpus.length, characters: total,
    routes: [...new Set(corpus.map((entry) => entry.route))].length }));
}
