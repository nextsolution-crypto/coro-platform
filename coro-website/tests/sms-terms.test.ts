import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { footerGroups } from '../components/conversion/footer-content.ts';
import { getRoute } from '../lib/site/routes.ts';
import { isLegacyFooterVisible } from '../lib/site/v2-migration.ts';
import { smsTermsContent } from '../app/sms-terms/content.ts';

const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');

test('dedicated SMS terms are bilingual and contain all carrier requirements', () => {
  const fr = [smsTermsContent.fr.intro, ...smsTermsContent.fr.sections.flatMap((section) => section.paragraphs ?? [])].join(' ');
  const en = [smsTermsContent.en.intro, ...smsTermsContent.en.sections.flatMap((section) => section.paragraphs ?? [])].join(' ');
  for (const required of [/codes de vérification/i, /alertes de sécurité ou d’urgence/i, /exercice/i, /fréquence des messages varie/i, /frais de messagerie et de données/i, /STOP/, /HELP/, /transporteurs ne sont pas responsables/i, /ne remplace pas les services d’urgence/i, /jamais automatiquement/i]) assert.match(fr, required);
  for (const required of [/verification codes/i, /safety or emergency alerts/i, /exercise/i, /message frequency varies/i, /message and data rates may apply/i, /STOP/, /HELP/, /carriers are not liable/i, /not a substitute for emergency services/i, /never occurs automatically/i]) assert.match(en, required);
});

test('the public route has canonical bilingual metadata and direct legal links', () => {
  const page = read('app/sms-terms/page.tsx');
  const generalTerms = read('app/terms/page.tsx');
  assert.match(page, /path: '\/sms-terms'/);
  assert.match(page, /localizedHref\('\/privacy', locale\)/);
  assert.match(page, /localizedHref\('\/terms', locale\)/);
  assert.match(generalTerms, /localizedHref\('\/sms-terms', locale\)/);
  assert.equal(getRoute('sms-terms')?.protected, true);
  assert.equal(isLegacyFooterVisible('/sms-terms'), false);
});

test('the SMS terms route is present in the governed footer', () => {
  const legal = footerGroups.find((group) => group.id === 'legal');
  assert.equal(legal?.links.some((link) => link.path === '/sms-terms'), true);
});
