import { existsSync } from 'fs';
import { join } from 'path';
import { PUBLIC_KNOWLEDGE_CATALOG } from './public-knowledge.catalog';
import { PublicKnowledgeSecurity } from './public-knowledge-security';
import { SITE_CORPUS } from './public-knowledge.site-corpus';

/* eslint-disable @typescript-eslint/no-require-imports */
const generator = require('../../scripts/public-knowledge-site-corpus.cjs') as {
  build: () => unknown[];
};

describe('Corpus public de Sophie', () => {
  const security = new PublicKnowledgeSecurity();

  it('reste synchronisé avec les pages publiées du site', () => {
    if (!existsSync(join(__dirname, '../../../coro-website/app'))) return;
    // Échec ? Lancer : node scripts/public-knowledge-site-corpus.cjs --write
    expect(generator.build()).toEqual(SITE_CORPUS);
  });

  it('couvre les pages clés dans les deux langues', () => {
    const keys = new Set(SITE_CORPUS.map((entry) => `${entry.route}:${entry.language}`));
    for (const route of ['/', '/sentinelle', '/coro-incident', '/pricing', '/security', '/portail-client', '/coro-ai', '/coro-knowledge'])
      for (const language of ['fr-CA', 'en-CA'])
        expect(keys.has(`${route}:${language}`)).toBe(true);
  });

  it('respecte les règles d ingestion (clé, taille, URL publique, langue)', () => {
    const seen = new Set<string>();
    for (const entry of PUBLIC_KNOWLEDGE_CATALOG) {
      expect(entry.sourceKey).toMatch(/^[A-Za-z0-9][A-Za-z0-9-]{2,79}$/);
      const key = `${entry.sourceKey}:${entry.language}`;
      expect(seen.has(key)).toBe(false);
      seen.add(key);
      const content = security.normalizeText(entry.content);
      expect(content.length).toBeGreaterThanOrEqual(40);
      expect(content.length).toBeLessThanOrEqual(100_000);
      const url = new URL(security.assertCanonicalPublicUrl(entry.canonicalUrl));
      expect(entry.language === 'en-CA').toBe(url.searchParams.get('lang') === 'en');
    }
  });

  it('ne publie aucun montant dans la politique commerciale de Sophie', () => {
    const offer = PUBLIC_KNOWLEDGE_CATALOG.filter((entry) => entry.sourceKey === 'faq-offer-and-demo');
    expect(offer).toHaveLength(2);
    for (const entry of offer) expect(entry.content).not.toMatch(/\d+\s?\$|\$\s?\d+/);
  });
});
