// ============================================================
// Contenu prêt pour un document anglais (PMU/PSI/PCA et guide locataire)
// Les libellés CORO prennent leur version anglaise fixe, puis les textes
// saisis en français sont traduits (mémoire des traductions, IA au besoin).
// Le contenu enregistré n'est jamais modifié : seule la copie rendue change.
// ============================================================

import { officialOrganizationNames, translateModule2Row } from '../generator/module2.templates';
import { localizeModule8ForEnglish } from './module8-localize';
import {
  ExportTranslator,
  applyTexts,
  collectOptionTranslations,
  collectTexts,
  replaceInsertedValues,
  streetOf,
} from './export-translator';
import { displayOption, optionToEnglish } from './templates/modules/option-display';

function module2WithEnglishLabels(saved: any): any {
  if (!saved || typeof saved !== 'object') return saved;
  const out: Record<string, any> = {};
  for (const [key, value] of Object.entries(saved)) {
    out[key] = Array.isArray(value)
      ? value.map((row: any) => (row && typeof row === 'object' ? translateModule2Row(row) : row))
      : value;
  }
  return out;
}

/** Noms jamais traduits : adresse, bâtiment, client, organisation, organismes officiels. */
export function protectedNames(content: any, project: any): string[] {
  const building = project?.building || {};
  return [
    building.address, streetOf(building.address), building.name, building.city,
    project?.client?.name, project?.organization?.companyName, project?.organization?.companyAddress,
    streetOf(project?.organization?.companyAddress),
    content?.config?.adresse, streetOf(content?.config?.adresse),
    ...officialOrganizationNames(),
  ].filter((term): term is string => typeof term === 'string' && term.trim().length >= 3);
}

export async function prepareEnglishContent(
  translator: ExportTranslator,
  content: any,
  project?: any,
  extraTexts: string[] = [],
): Promise<any> {
  const module8 = content.module8
    ? localizeModule8ForEnglish(content.module8, content.modules_fr, content.modules_en)
    : content.module8;
  const module2 = content.module2 ? module2WithEnglishLabels(content.module2) : content.module2;
  const options = collectOptionTranslations(content.config);

  const texts = new Set<string>();
  collectTexts(content.config, texts);
  collectTexts(module2, texts);
  collectTexts(module8, texts);
  // Noms officiels déjà en version CORO : jamais envoyés à la traduction.
  const official = new Set(officialOrganizationNames());
  for (const text of [...texts]) if (official.has(text)) texts.delete(text);
  const tagline: string | undefined = project?.organization?.companyTagline || undefined;
  if (tagline) collectTexts(tagline, texts);
  extraTexts.forEach((text) => collectTexts(text, texts));

  const translations = texts.size
    ? await translator.translate(texts, protectedNames(content, project))
    : new Map<string, string>();
  const inserted = new Map([...options, ...translations]);
  return {
    ...content,
    config: applyTexts(content.config, translations),
    module2: applyTexts(module2, translations),
    // Le permis de travail à chaud reprend des choix de liste dans son texte.
    module8: replaceInsertedValues(applyTexts(module8, translations), inserted),
    // Valeurs françaises insérées à la génération : saisies traduites et choix de liste.
    modules_en: replaceInsertedValues(content.modules_en, inserted),
    companyTaglineEn: tagline ? translations.get(tagline) ?? tagline : undefined,
  };
}

/**
 * Renvois réglementaires corrigés après vérification au texte officiel
 * (nov. 2026). Les modules déjà générés gardent l'ancien texte : il est mis
 * à jour à l'export, en français comme en anglais, sans régénérer le projet.
 */
const REFERENCE_FIXES: Array<[string, string]> = [
  ["l'article 2.8.2.1 (3) du CNPI 2020 modifié", "l'article 2.8.2.1, paragraphe 3) c), du CNPI 2020 modifié Québec"],
  ["l'article 2.8.2.1 (4) du Code national de prévention des incendies – Canada 2020", "l'article 2.8.2.1, paragraphe 2), du Code national de prévention des incendies – Canada 2020 (modifié Québec)"],
  ['article 2.8.2.1 (3) of the amended NFCC 2020', 'Article 2.8.2.1, Sentence (3)(c), of the National Fire Code of Canada 2020 (Quebec amended)'],
  ['article 2.8.2.1 (4) of the National Fire Code of Canada 2020', 'Article 2.8.2.1, Sentence (2), of the National Fire Code of Canada 2020'],
  ['article 2.8.2.1 (3) du NFC(AE)', 'article 2.8.2.1, phrase (3), alinéa (c), du NFC(AE)'],
  ['article 2.8.2.1 (4) du NFC(AE)', 'article 2.8.2.1, phrase (2), du NFC(AE)'],
  ['article 2.8.3.1 du National Fire Code – 2023 Alberta Edition', 'article 2.8.3.2 du National Fire Code – 2023 Alberta Edition'],
  ['article 2.8.2.1 (3) of the NFC(AE)', 'Article 2.8.2.1, Sentence (3), Clause (c), of the NFC(AE)'],
  ['article 2.8.2.1 (4) of the NFC(AE)', 'Article 2.8.2.1, Sentence (2), of the NFC(AE)'],
  ['article 2.8.3.1 of the National Fire Code – 2023 Alberta Edition', 'Article 2.8.3.2 of the National Fire Code – 2023 Alberta Edition'],
];

export function withCurrentReferences(content: any): any {
  if (!content) return content;
  const map = new Map(REFERENCE_FIXES);
  const fix = (node: any): any => {
    if (typeof node === 'string') {
      let out = node;
      for (const [from, to] of map) if (out.includes(from)) out = out.split(from).join(to);
      return out;
    }
    if (Array.isArray(node)) return node.map(fix);
    if (node && typeof node === 'object') {
      const out: Record<string, any> = {};
      for (const [k, v] of Object.entries(node)) out[k] = fix(v);
      return out;
    }
    return node;
  };
  const historyFr = historyCells('fr');
  const historyEn = historyCells('en');
  const cells = (pairs: Array<[string, string]>) => (node: any): any => {
    if (typeof node === 'string') {
      let out = node;
      for (const [from, to] of pairs) if (out.includes(from)) out = out.split(from).join(to);
      return out;
    }
    if (Array.isArray(node)) return node.map(cells(pairs));
    if (node && typeof node === 'object') {
      const out: Record<string, any> = {};
      for (const [key, value] of Object.entries(node)) out[key] = cells(pairs)(value);
      return out;
    }
    return node;
  };
  return {
    ...content,
    modules_fr: cells(historyFr)(fix(content.modules_fr)),
    modules_en: cells(historyEn)(fix(content.modules_en)),
  };
}

/**
 * Journal des modifications (section 1.5) des plans déjà générés : le motif
 * était inséré tel qu'enregistré (« Creation initiale »). Cellule de tableau
 * remplacée par le libellé accentué, ou anglais dans le document anglais.
 */
const HISTORY_TYPES = [
  'Creation initiale',
  'Mise a jour annuelle',
  'Mise a jour suite a incident',
  'Mise a jour suite a renovation',
  'Mise a jour suite a changement occupation',
];
function historyCells(lang: 'fr' | 'en'): Array<[string, string]> {
  return HISTORY_TYPES.map((value) => [
    `| ${value} |`,
    `| ${lang === 'fr' ? displayOption(value) : optionToEnglish(value)} |`,
  ]);
}


/**
 * Données du module 7 saisies hors configurateur (informations sur
 * l'occupation, légendes des photos) : copie traduite pour le PDF anglais.
 */
export async function englishModule7(
  translator: ExportTranslator,
  module7: any,
  names: string[],
): Promise<any> {
  if (!module7 || typeof module7 !== 'object') return module7;
  const quarts = { ...(module7.quartsData || {}) };
  const photos: Record<string, any> = { ...(module7.photosData || {}) };
  const texts = new Set<string>();
  const labelOf = (value: unknown) =>
    typeof value === 'string' && value.trim() ? value : null;
  const info = labelOf(quarts.infosSup);
  if (info) texts.add(info);
  for (const photo of Object.values(photos)) {
    const label = labelOf((photo as any)?.label);
    if (label && optionToEnglish(label) === label) texts.add(label);
  }
  const translated = texts.size ? await translator.translate(texts, names) : new Map<string, string>();
  const english = (value: string) => {
    const option = optionToEnglish(value);
    return option !== value ? option : translated.get(value) ?? value;
  };
  if (info) quarts.infosSup = english(info);
  for (const [key, photo] of Object.entries(photos)) {
    const label = labelOf((photo as any)?.label);
    if (label) photos[key] = { ...(photo as any), label: english(label) };
  }
  return { ...module7, quartsData: quarts, photosData: photos };
}
