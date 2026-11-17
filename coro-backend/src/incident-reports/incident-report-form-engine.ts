import { BadRequestException } from '@nestjs/common';

export const INCIDENT_REPORT_FIELD_TYPES = [
  'SHORT_TEXT',
  'LONG_TEXT',
  'NUMBER',
  'DATE',
  'TIME',
  'DATETIME',
  'SELECT',
  'MULTI_SELECT',
  'CHECKBOX',
  'RADIO',
  'PERSON',
  'WITNESS',
  'VEHICLE',
  'BUILDING',
  'FLOOR',
  'ZONE',
  'ROOM',
  'EQUIPMENT',
  'PHOTO',
  'ATTACHMENT',
  'CONDITIONAL',
  'REPEATABLE_SECTION',
] as const;

export type IncidentReportFieldType =
  (typeof INCIDENT_REPORT_FIELD_TYPES)[number];
export interface FormCondition {
  fieldKey: string;
  operator: 'EQ' | 'NEQ' | 'IN' | 'PRESENT';
  value?: unknown;
}
export interface FormFieldDefinition {
  key: string;
  label: string;
  labelEn?: string;
  type: IncidentReportFieldType;
  required?: boolean;
  options?: Array<{ value: string; label: string }>;
  visibleWhen?: FormCondition;
  children?: FormFieldDefinition[];
  maxItems?: number;
  source?:
    | 'CORO'
    | 'REPORTPERFECT_CONFIRMED'
    | 'REPORTPERFECT_HISTORICAL'
    | 'CLIENT_CUSTOM';
}
export interface FormSectionDefinition {
  key: string;
  title: string;
  titleEn?: string;
  fields: FormFieldDefinition[];
}
export interface IncidentReportFormSchema {
  schemaVersion: '1.0';
  sections: FormSectionDefinition[];
}

const KEY = /^[a-z][A-Za-z0-9_.-]{0,79}$/;
const scalar = (value: unknown) =>
  ['string', 'number', 'boolean'].includes(typeof value);

function conditionMet(
  condition: FormCondition | undefined,
  content: Record<string, unknown>,
) {
  if (!condition) return true;
  const actual = content[condition.fieldKey];
  if (condition.operator === 'PRESENT')
    return actual !== undefined && actual !== null && actual !== '';
  if (condition.operator === 'EQ') return actual === condition.value;
  if (condition.operator === 'NEQ') return actual !== condition.value;
  return Array.isArray(condition.value) && condition.value.includes(actual);
}

function validateField(
  field: FormFieldDefinition,
  content: Record<string, unknown>,
  errors: string[],
) {
  if (!KEY.test(field.key) || !INCIDENT_REPORT_FIELD_TYPES.includes(field.type))
    errors.push(`Champ invalide: ${field.key}`);
  if (!conditionMet(field.visibleWhen, content)) return;
  const value = content[field.key];
  if (field.required && (value === undefined || value === null || value === ''))
    errors.push(`${field.label} est obligatoire.`);
  if (value === undefined || value === null || value === '') return;
  if (field.type === 'NUMBER' && typeof value !== 'number')
    errors.push(`${field.label} doit être un nombre.`);
  if (
    ['MULTI_SELECT', 'REPEATABLE_SECTION'].includes(field.type) &&
    !Array.isArray(value)
  )
    errors.push(`${field.label} doit être une liste.`);
  if (field.type === 'REPEATABLE_SECTION' && Array.isArray(value)) {
    if (value.length > (field.maxItems ?? 100))
      errors.push(`${field.label} dépasse la limite permise.`);
    for (const [index, item] of value.entries()) {
      if (!item || typeof item !== 'object' || Array.isArray(item)) {
        errors.push(`${field.label} #${index + 1} est invalide.`);
        continue;
      }
      for (const child of field.children ?? [])
        validateField(child, item as Record<string, unknown>, errors);
    }
  } else if (
    !Array.isArray(value) &&
    !scalar(value) &&
    typeof value !== 'object'
  )
    errors.push(`${field.label} contient une valeur invalide.`);
}

export function validateFormSchema(value: unknown): IncidentReportFormSchema {
  const schema = value as IncidentReportFormSchema;
  if (
    !schema ||
    schema.schemaVersion !== '1.0' ||
    !Array.isArray(schema.sections) ||
    !schema.sections.length
  )
    throw new BadRequestException('Schéma de formulaire invalide.');
  const keys = new Set<string>();
  for (const section of schema.sections)
    for (const field of section.fields ?? []) {
      if (keys.has(field.key))
        throw new BadRequestException(`Clé de champ dupliquée: ${field.key}`);
      keys.add(field.key);
    }
  return schema;
}

export function validateFormContent(
  schemaValue: unknown,
  content: Record<string, unknown>,
) {
  const schema = validateFormSchema(schemaValue);
  const errors: string[] = [];
  for (const section of schema.sections)
    for (const field of section.fields) validateField(field, content, errors);
  if (errors.length)
    throw new BadRequestException({
      message: 'Le formulaire contient des erreurs.',
      errors,
    });
  return content;
}

const identification: FormSectionDefinition = {
  key: 'identification',
  title: 'Identification',
  fields: [
    {
      key: 'occurredAt',
      label: 'Date et heure',
      type: 'DATETIME',
      required: true,
      source: 'CORO',
    },
    {
      key: 'location',
      label: 'Lieu',
      type: 'ROOM',
      required: true,
      source: 'CORO',
    },
    {
      key: 'summary',
      label: 'Résumé',
      type: 'LONG_TEXT',
      required: true,
      source: 'CORO',
    },
  ],
};
const people: FormSectionDefinition = {
  key: 'people',
  title: 'Personnes et témoins',
  fields: [
    {
      key: 'people',
      label: 'Personnes',
      type: 'REPEATABLE_SECTION',
      maxItems: 50,
      children: [
        { key: 'name', label: 'Nom', type: 'SHORT_TEXT', required: true },
        {
          key: 'role',
          label: 'Rôle',
          type: 'SELECT',
          options: ['PERSON', 'WITNESS', 'RESPONDER'].map((value) => ({
            value,
            label: value,
          })),
        },
      ],
    },
  ],
};

export const INITIAL_INCIDENT_REPORT_TEMPLATES = [
  ['GENERAL_INCIDENT', 'Rapport général d’incident'],
  ['DAILY_ACTIVITY', 'Rapport d’activité quotidienne'],
  ['TECHNICAL_ANOMALY', 'Rapport d’anomalie technique'],
  ['SECURITY_INTERVENTION', 'Rapport d’intervention de sécurité'],
  ['COMPLAINT', 'Rapport de plainte'],
  ['ACCIDENT', 'Rapport d’accident'],
  ['PROPERTY_DAMAGE', 'Rapport de dommages matériels'],
  ['UNUSUAL_SITUATION', 'Rapport de situation inhabituelle'],
].map(([templateKey, name]) => ({
  templateKey,
  name,
  reportType: templateKey,
  formSchema: {
    schemaVersion: '1.0',
    sections: [identification, people],
  } satisfies IncidentReportFormSchema,
}));
