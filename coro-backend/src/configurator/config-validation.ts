import { BadRequestException } from '@nestjs/common';

/**
 * Validation serveur des corps de requête documentaires (audit M1-06).
 *
 * Les données de configuration sont du JSON libre historiquement ; on
 * impose ici une forme sûre sans casser l'existant :
 * - objet JSON simple, profondeur et taille bornées, clés raisonnables ;
 * - types attendus pour les champs connus du questionnaire (scalaire ou
 *   liste), avec message qui nomme le champ.
 */
export const MAX_CONFIG_BYTES = 8 * 1024 * 1024; // cartes et photos compressées incluses
const MAX_DEPTH = 8;
const MAX_KEY_LENGTH = 120;

type FieldType = string;
export interface QuestionnaireField {
  key: string;
  label?: string;
  type: FieldType;
}

const LIST_TYPES = new Set(['checkbox_group', 'dynamic_list']);

function assertJsonShape(value: unknown, path: string, depth: number): void {
  if (depth > MAX_DEPTH) {
    throw new BadRequestException(`Données trop imbriquées (${path}).`);
  }
  if (value === null || ['string', 'number', 'boolean'].includes(typeof value)) {
    if (typeof value === 'number' && !Number.isFinite(value)) {
      throw new BadRequestException(`Nombre invalide (${path}).`);
    }
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertJsonShape(item, `${path}[${index}]`, depth + 1));
    return;
  }
  if (typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype) {
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      if (key.length === 0 || key.length > MAX_KEY_LENGTH || key === '__proto__' || key === 'constructor') {
        throw new BadRequestException(`Nom de champ invalide (${path}).`);
      }
      assertJsonShape(child, `${path}.${key}`, depth + 1);
    }
    return;
  }
  throw new BadRequestException(`Valeur non autorisée (${path}).`);
}

export function assertPlainJsonObject(
  value: unknown,
  name: string,
  maxBytes = MAX_CONFIG_BYTES,
): asserts value is Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new BadRequestException(`${name} invalide.`);
  }
  let size: number;
  try {
    size = Buffer.byteLength(JSON.stringify(value), 'utf8');
  } catch {
    throw new BadRequestException(`${name} invalide.`);
  }
  if (size > maxBytes) {
    throw new BadRequestException(
      `${name} trop volumineux (${Math.round(size / 1024)} Ko, maximum ${Math.round(maxBytes / 1024)} Ko). Réduisez la taille des images.`,
    );
  }
  assertJsonShape(value, name, 0);
}

export function validateBuildingConfig(
  config: unknown,
  fields: QuestionnaireField[],
): Record<string, unknown> {
  assertPlainJsonObject(config, 'Configuration');
  for (const field of fields) {
    if (!(field.key in config)) continue;
    const value = config[field.key];
    if (value === null || value === undefined || value === '') continue;
    const label = field.label || field.key;
    if (LIST_TYPES.has(field.type)) {
      if (!Array.isArray(value)) {
        throw new BadRequestException(`Le champ « ${label} » doit être une liste.`);
      }
    } else if (Array.isArray(value) || typeof value === 'object') {
      throw new BadRequestException(`Le champ « ${label} » doit être une valeur simple.`);
    } else if (field.type === 'number' && typeof value === 'string' && value.trim() !== '' && !Number.isFinite(Number(value))) {
      throw new BadRequestException(`Le champ « ${label} » doit être un nombre.`);
    }
  }
  return config;
}

export function questionnaireFields(questions: { sections?: Array<{ fields?: QuestionnaireField[] }> }): QuestionnaireField[] {
  return (questions.sections ?? []).flatMap((section) => section.fields ?? []);
}
