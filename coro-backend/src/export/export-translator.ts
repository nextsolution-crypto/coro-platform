// ============================================================
// Traduction des textes saisis pour l'export anglais
// Les données du projet (configurateur, liste téléphonique, module 8) sont
// saisies en français. À l'export anglais, chaque texte libre est traduit
// une fois par l'IA, puis gardé en mémoire (table TextTranslation) : les
// exports suivants sont instantanés et identiques.
// Les noms propres, adresses, numéros et codes restent tels quels.
// Si l'IA est indisponible, le texte d'origine est conservé : l'export
// n'échoue jamais à cause de la traduction.
// ============================================================

import { createHash } from 'crypto';
import { Logger } from '@nestjs/common';
import { optionToEnglish } from './templates/modules/option-display';

const TARGET = 'en';
const BATCH_SIZE = 60;
const MAX_TEXT_LENGTH = 8000;
const CALL_TIMEOUT_MS = 90_000;

/** Clés qui ne contiennent jamais de texte à traduire. */
const SKIP_KEYS = /^(id|_?originalId|uuid|email|courriel|phone|telephone|tel|fax|url|website|siteWeb|date\w*|\w*Date|\w*At|\w*Base64|\w*B64|photo\w*|logo\w*|image\w*|code|codeNorme|article|hash|token|type|status|lang|language|province|postalCode|codePostal)$/i;

export function hashText(text: string): string {
  return createHash('sha256').update(text).digest('hex');
}

/** Un texte qui vaut la peine d'être traduit (contient des mots, n'est ni un lien, ni un numéro). */
export function isTranslatable(text: unknown): text is string {
  if (typeof text !== 'string') return false;
  const value = text.trim();
  if (value.length < 2 || value.length > MAX_TEXT_LENGTH) return false;
  if (/^data:/i.test(value) || /^https?:\/\//i.test(value) || /^[\w.+-]+@[\w-]+\.[\w.]+$/.test(value)) return false;
  if (!/[A-Za-zÀ-ÿ]{2,}/.test(value)) return false;
  // Un choix du configurateur a déjà sa traduction fixe.
  if (optionToEnglish(value) !== value) return false;
  return true;
}

/** Rassemble les textes à traduire d'une structure JSON. */
export function collectTexts(value: any, out: Set<string>, key = ''): Set<string> {
  if (key && SKIP_KEYS.test(key)) return out;
  if (typeof value === 'string') {
    if (isTranslatable(value)) out.add(value);
  } else if (Array.isArray(value)) {
    value.forEach((item) => collectTexts(item, out));
  } else if (value && typeof value === 'object') {
    for (const [k, v] of Object.entries(value)) collectTexts(v, out, k);
  }
  return out;
}

/** Applique les traductions à une structure JSON (copie). */
export function applyTexts(value: any, translations: Map<string, string>, key = ''): any {
  if (key && SKIP_KEYS.test(key)) return value;
  if (typeof value === 'string') return translations.get(value) ?? value;
  if (Array.isArray(value)) return value.map((item) => applyTexts(item, translations));
  if (value && typeof value === 'object') {
    const out: Record<string, any> = {};
    for (const [k, v] of Object.entries(value)) out[k] = applyTexts(v, translations, k);
    return out;
  }
  return value;
}

/**
 * Remplace, dans le contenu anglais déjà généré, les valeurs françaises
 * insérées au moment de la génération (« rests with the Directeur… »).
 * Seules les valeurs d'au moins 4 caractères sont remplacées, des plus
 * longues aux plus courtes, pour ne jamais toucher un bout de mot.
 */
export function replaceInsertedValues(value: any, translations: Map<string, string>): any {
  const pairs = [...translations.entries()]
    .filter(([fr, en]) => fr !== en && fr.trim().length >= 4)
    .sort((a, b) => b[0].length - a[0].length);
  if (pairs.length === 0) return value;
  const replaceIn = (text: string): string => {
    let out = text;
    for (const [fr, en] of pairs) {
      if (out.includes(fr)) out = out.split(fr).join(en);
    }
    return out;
  };
  const walk = (node: any, key = ''): any => {
    if (key && SKIP_KEYS.test(key)) return node;
    if (typeof node === 'string') return replaceIn(node);
    if (Array.isArray(node)) return node.map((item) => walk(item));
    if (node && typeof node === 'object') {
      const out: Record<string, any> = {};
      for (const [k, v] of Object.entries(node)) out[k] = walk(v, k);
      return out;
    }
    return node;
  };
  return walk(value);
}

const SYSTEM_PROMPT = [
  'You translate field values from Quebec emergency response plans (PMU, PSI, PCA) from French to Canadian English.',
  'Rules:',
  '- Translate meaning faithfully, in the concise style of a technical plan. Use standard Canadian fire-safety terms (NBC, NFC, AED, sprinkler, fire alarm panel, assembly point).',
  '- Keep unchanged: proper names (people, companies, buildings, parks), street names and civic addresses, room or local codes (SS1, B2-01, RDC → keep as written), phone numbers, regulation numbers.',
  '- Translate generic words around names: "Parc de l\'autre côté de la rue" → "Park across the street"; "Salle des serveurs, 2e étage" → "Server room, 2nd floor".',
  '- Keep Markdown markers (**bold**, "- " list items, line breaks) exactly as in the source.',
  '- If a value is already in English or is only a name, return it unchanged.',
  'Answer with JSON only: an object whose keys are the given ids and whose values are the translations.',
].join('\n');

export class ExportTranslator {
  private readonly logger = new Logger('ExportTranslator');

  constructor(private readonly prisma: any) {}

  /** Traductions anglaises des textes donnés (texte d'origine si indisponible). */
  async translate(texts: Iterable<string>): Promise<Map<string, string>> {
    const unique = [...new Set(texts)].filter(isTranslatable);
    const result = new Map<string, string>();
    if (unique.length === 0) return result;

    const byHash = new Map(unique.map((t) => [hashText(t), t]));
    let cached: Array<{ sourceHash: string; translatedText: string }> = [];
    try {
      cached = await this.prisma.textTranslation.findMany({
        where: { targetLang: TARGET, sourceHash: { in: [...byHash.keys()] } },
        select: { sourceHash: true, translatedText: true },
      });
    } catch (error) {
      this.logger.warn(`Mémoire des traductions illisible : ${(error as Error).message}`);
    }
    for (const row of cached) {
      const source = byHash.get(row.sourceHash);
      if (source) result.set(source, row.translatedText);
    }

    const missing = unique.filter((t) => !result.has(t));
    if (missing.length === 0 || !process.env.ANTHROPIC_API_KEY) return result;

    const batches: string[][] = [];
    for (let i = 0; i < missing.length; i += BATCH_SIZE) batches.push(missing.slice(i, i + BATCH_SIZE));
    const answers = await Promise.all(batches.map((batch) => this.translateBatch(batch)));

    const toStore: Array<{ sourceHash: string; targetLang: string; sourceText: string; translatedText: string }> = [];
    answers.forEach((answer, b) => {
      batches[b].forEach((source, i) => {
        const translated = answer?.[String(i)];
        if (typeof translated === 'string' && translated.trim()) {
          result.set(source, translated);
          toStore.push({ sourceHash: hashText(source), targetLang: TARGET, sourceText: source, translatedText: translated });
        }
      });
    });
    if (toStore.length > 0) {
      try {
        await this.prisma.textTranslation.createMany({ data: toStore, skipDuplicates: true });
      } catch (error) {
        this.logger.warn(`Traductions non mémorisées : ${(error as Error).message}`);
      }
    }
    return result;
  }

  private async translateBatch(batch: string[]): Promise<Record<string, string> | null> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const Anthropic = require('@anthropic-ai/sdk').default;
      const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, timeout: CALL_TIMEOUT_MS });
      const input = Object.fromEntries(batch.map((text, i) => [String(i), text]));
      const response = await client.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 16000,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: JSON.stringify(input) }],
      });
      const text = (response?.content || [])
        .filter((part: any) => part?.type === 'text')
        .map((part: any) => part.text)
        .join('');
      const start = text.indexOf('{');
      const end = text.lastIndexOf('}');
      if (start < 0 || end <= start) return null;
      const parsed = JSON.parse(text.slice(start, end + 1));
      return parsed && typeof parsed === 'object' ? parsed : null;
    } catch (error) {
      this.logger.warn(`Traduction automatique indisponible : ${(error as Error).message}`);
      return null;
    }
  }
}
