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
