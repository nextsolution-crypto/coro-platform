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
export interface FormConditionPredicate {
  fieldKey: string;
  operator: 'EQ' | 'NEQ' | 'IN' | 'PRESENT';
  value?: unknown;
}
export type FormCondition =
  | FormConditionPredicate
  | { all: FormCondition[] }
  | { any: FormCondition[] }
  | { not: FormCondition };
export interface FormFieldConstraints {
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  minItems?: number;
  maxItems?: number;
}
export interface FormFieldDefinition {
  key: string;
  label: string;
  labelEn?: string;
  type: IncidentReportFieldType;
  required?: boolean;
  options?: Array<{ value: string; label: string }>;
  visibleWhen?: FormCondition;
  constraints?: FormFieldConstraints;
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
  schemaVersion: '1.0' | '1.1';
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
  if ('all' in condition)
    return condition.all.every((item) => conditionMet(item, content));
  if ('any' in condition)
    return condition.any.some((item) => conditionMet(item, content));
  if ('not' in condition) return !conditionMet(condition.not, content);
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
  const constraints = field.constraints;
  if (typeof value === 'string') {
    if (
      constraints?.minLength !== undefined &&
      value.length < constraints.minLength
    )
      errors.push(`${field.label} est trop court.`);
    if (
      constraints?.maxLength !== undefined &&
      value.length > constraints.maxLength
    )
      errors.push(`${field.label} est trop long.`);
  }
  if (field.type === 'NUMBER' && typeof value !== 'number')
    errors.push(`${field.label} doit être un nombre.`);
  if (typeof value === 'number') {
    if (constraints?.min !== undefined && value < constraints.min)
      errors.push(`${field.label} est sous la valeur minimale.`);
    if (constraints?.max !== undefined && value > constraints.max)
      errors.push(`${field.label} dépasse la valeur maximale.`);
  }
  if (
    ['SELECT', 'RADIO'].includes(field.type) &&
    field.options?.length &&
    !field.options.some((option) => option.value === value)
  )
    errors.push(`${field.label} contient une option inconnue.`);
  if (
    field.type === 'MULTI_SELECT' &&
    Array.isArray(value) &&
    field.options?.length
  ) {
    const allowed = new Set(field.options.map((option) => option.value));
    if (value.some((item) => typeof item !== 'string' || !allowed.has(item)))
      errors.push(`${field.label} contient une option inconnue.`);
  }
  if (
    ['MULTI_SELECT', 'REPEATABLE_SECTION'].includes(field.type) &&
    !Array.isArray(value)
  )
    errors.push(`${field.label} doit être une liste.`);
  if (field.type === 'REPEATABLE_SECTION' && Array.isArray(value)) {
    const maxItems = constraints?.maxItems ?? field.maxItems ?? 100;
    if (value.length > maxItems)
      errors.push(`${field.label} dépasse la limite permise.`);
    if (
      constraints?.minItems !== undefined &&
      value.length < constraints.minItems
    )
      errors.push(`${field.label} ne contient pas assez d'éléments.`);
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
    !['1.0', '1.1'].includes(schema.schemaVersion) ||
    !Array.isArray(schema.sections) ||
    !schema.sections.length
  )
    throw new BadRequestException('Schéma de formulaire invalide.');
  const keys = new Set<string>();
  const conditions: FormCondition[] = [];
  let fieldCount = 0;
  const validateDefinition = (field: FormFieldDefinition, depth = 0) => {
    fieldCount += 1;
    if (fieldCount > 500 || depth > 3)
      throw new BadRequestException('Schéma de formulaire trop complexe.');
    if (
      !KEY.test(field.key) ||
      !INCIDENT_REPORT_FIELD_TYPES.includes(field.type)
    )
      throw new BadRequestException(`Champ invalide: ${field.key}`);
    if (keys.has(field.key))
      throw new BadRequestException(`Clé de champ dupliquée: ${field.key}`);
    keys.add(field.key);
    if (field.visibleWhen) conditions.push(field.visibleWhen);
    if (
      field.options &&
      new Set(field.options.map((option) => option.value)).size !==
        field.options.length
    )
      throw new BadRequestException(`Options dupliquées: ${field.key}`);
    if (field.type === 'REPEATABLE_SECTION') {
      if (!field.children?.length)
        throw new BadRequestException(`Section répétable vide: ${field.key}`);
      for (const child of field.children) validateDefinition(child, depth + 1);
    }
  };
  for (const section of schema.sections) {
    if (
      !KEY.test(section.key) ||
      !section.title ||
      !Array.isArray(section.fields)
    )
      throw new BadRequestException('Section de formulaire invalide.');
    for (const field of section.fields) validateDefinition(field);
  }
  let conditionCount = 0;
  const validateCondition = (condition: FormCondition, depth = 0): void => {
    conditionCount += 1;
    if (conditionCount > 100 || depth > 8)
      throw new BadRequestException('Conditions du formulaire trop complexes.');
    if ('all' in condition || 'any' in condition) {
      const children = 'all' in condition ? condition.all : condition.any;
      if (!Array.isArray(children) || !children.length || children.length > 20)
        throw new BadRequestException('Condition composée invalide.');
      children.forEach((child) => validateCondition(child, depth + 1));
      return;
    }
    if ('not' in condition) {
      validateCondition(condition.not, depth + 1);
      return;
    }
    if (
      !keys.has(condition.fieldKey) ||
      !['EQ', 'NEQ', 'IN', 'PRESENT'].includes(condition.operator) ||
      (condition.operator === 'IN' && !Array.isArray(condition.value))
    )
      throw new BadRequestException('Condition de formulaire invalide.');
  };
  conditions.forEach((condition) => validateCondition(condition));
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
        {
          key: 'people.name',
          label: 'Nom',
          type: 'SHORT_TEXT',
          required: true,
          constraints: { maxLength: 160 },
        },
        {
          key: 'people.role',
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

const classification: FormSectionDefinition = {
  key: 'classification',
  title: 'Classification',
  fields: [
    {
      key: 'priority',
      label: 'Priorité',
      type: 'SELECT',
      required: true,
      options: ['LOW', 'NORMAL', 'HIGH', 'CRITICAL'].map((value) => ({
        value,
        label: value,
      })),
    },
    {
      key: 'requiresExternalResponse',
      label: 'Intervention externe requise',
      type: 'CHECKBOX',
    },
    {
      key: 'externalAgencies',
      label: 'Services externes',
      type: 'MULTI_SELECT',
      visibleWhen: {
        all: [
          {
            fieldKey: 'requiresExternalResponse',
            operator: 'EQ',
            value: true,
          },
          { not: { fieldKey: 'priority', operator: 'EQ', value: 'LOW' } },
        ],
      },
      options: ['POLICE', 'FIRE', 'EMS', 'CONTRACTOR'].map((value) => ({
        value,
        label: value,
      })),
    },
  ],
};

const response: FormSectionDefinition = {
  key: 'response',
  title: 'Interventions et communications',
  fields: [
    {
      key: 'response.actions',
      label: 'Interventions',
      type: 'REPEATABLE_SECTION',
      constraints: { maxItems: 100 },
      children: [
        {
          key: 'response.actions.at',
          label: 'Date et heure',
          type: 'DATETIME',
          required: true,
        },
        {
          key: 'response.actions.description',
          label: 'Action',
          type: 'LONG_TEXT',
          required: true,
          constraints: { maxLength: 4000 },
        },
      ],
    },
  ],
};

const closure: FormSectionDefinition = {
  key: 'closure',
  title: 'Suivis et clôture',
  fields: [
    {
      key: 'followUpRequired',
      label: 'Suivi requis',
      type: 'CHECKBOX',
    },
    {
      key: 'followUpSummary',
      label: 'Suivi attendu',
      type: 'LONG_TEXT',
      visibleWhen: {
        fieldKey: 'followUpRequired',
        operator: 'EQ',
        value: true,
      },
      constraints: { maxLength: 4000 },
    },
  ],
};

const specialized = (
  key: string,
  title: string,
  fields: FormFieldDefinition[],
): FormSectionDefinition => ({ key, title, fields });

const TEMPLATE_DEFINITIONS: Array<[string, string, FormSectionDefinition]> = [
  [
    'GENERAL_INCIDENT',
    'Incident général',
    specialized('incidentDetails', 'Détails de l’incident', [
      {
        key: 'incidentCategory',
        label: 'Catégorie',
        type: 'SELECT',
        required: true,
        options: ['SAFETY', 'SECURITY', 'PROPERTY', 'OPERATIONS', 'OTHER'].map(
          (value) => ({ value, label: value }),
        ),
      },
    ]),
  ],
  [
    'SECURITY_INTRUSION',
    'Sécurité / intrusion',
    specialized('securityDetails', 'Sécurité et accès', [
      { key: 'entryPoint', label: 'Point d’entrée', type: 'SHORT_TEXT' },
      { key: 'forcedEntry', label: 'Effraction constatée', type: 'CHECKBOX' },
      {
        key: 'vehicles',
        label: 'Véhicules',
        type: 'REPEATABLE_SECTION',
        constraints: { maxItems: 20 },
        children: [
          {
            key: 'vehicles.description',
            label: 'Description',
            type: 'SHORT_TEXT',
          },
          { key: 'vehicles.plate', label: 'Plaque', type: 'SHORT_TEXT' },
        ],
      },
    ]),
  ],
  [
    'FIRE_ALARM',
    'Incendie / alarme',
    specialized('fireDetails', 'Incendie et alarme', [
      { key: 'alarmSource', label: 'Source de l’alarme', type: 'SHORT_TEXT' },
      { key: 'fireConfirmed', label: 'Feu confirmé', type: 'CHECKBOX' },
      {
        key: 'evacuationStarted',
        label: 'Évacuation déclenchée',
        type: 'CHECKBOX',
      },
    ]),
  ],
  [
    'WATER_DAMAGE',
    'Dégât d’eau',
    specialized('waterDetails', 'Dégât d’eau', [
      { key: 'waterSource', label: 'Origine présumée', type: 'SHORT_TEXT' },
      { key: 'waterActive', label: 'Écoulement actif', type: 'CHECKBOX' },
      { key: 'affectedAreas', label: 'Zones touchées', type: 'MULTI_SELECT' },
    ]),
  ],
  [
    'PERSON_ASSISTANCE',
    'Accident / assistance à une personne',
    specialized('assistanceDetails', 'Accident et assistance', [
      { key: 'injuryReported', label: 'Blessure déclarée', type: 'CHECKBOX' },
      {
        key: 'firstAidProvided',
        label: 'Premiers soins fournis',
        type: 'CHECKBOX',
      },
      {
        key: 'transportRequired',
        label: 'Transport médical',
        type: 'CHECKBOX',
      },
    ]),
  ],
  [
    'PROPERTY_DAMAGE',
    'Dommage matériel',
    specialized('damageDetails', 'Dommages matériels', [
      {
        key: 'assetDescription',
        label: 'Bien endommagé',
        type: 'LONG_TEXT',
        required: true,
      },
      {
        key: 'estimatedCost',
        label: 'Estimation',
        type: 'NUMBER',
        constraints: { min: 0 },
      },
    ]),
  ],
  [
    'TECHNICAL_FAILURE',
    'Défaillance technique',
    specialized('technicalDetails', 'Défaillance technique', [
      {
        key: 'equipment',
        label: 'Équipement',
        type: 'EQUIPMENT',
        required: true,
      },
      {
        key: 'serviceInterrupted',
        label: 'Service interrompu',
        type: 'CHECKBOX',
      },
      { key: 'diagnostic', label: 'Diagnostic', type: 'LONG_TEXT' },
    ]),
  ],
  [
    'OPERATIONAL_EVENT',
    'Événement opérationnel',
    specialized('operationDetails', 'Événement opérationnel', [
      {
        key: 'activity',
        label: 'Activité',
        type: 'SHORT_TEXT',
        required: true,
      },
      { key: 'serviceImpact', label: 'Impact opérationnel', type: 'LONG_TEXT' },
    ]),
  ],
  [
    'SHIFT_REPORT',
    'Rapport de quart',
    specialized('shiftDetails', 'Quart et relève', [
      {
        key: 'shiftStart',
        label: 'Début du quart',
        type: 'DATETIME',
        required: true,
      },
      {
        key: 'shiftEnd',
        label: 'Fin du quart',
        type: 'DATETIME',
        required: true,
      },
      { key: 'handoverNotes', label: 'Notes de relève', type: 'LONG_TEXT' },
    ]),
  ],
  [
    'EVACUATION',
    'Évacuation',
    specialized('evacuationDetails', 'Évacuation', [
      {
        key: 'evacuationReason',
        label: 'Motif',
        type: 'LONG_TEXT',
        required: true,
      },
      {
        key: 'assemblyPoint',
        label: 'Point de rassemblement',
        type: 'SHORT_TEXT',
      },
      {
        key: 'missingPersons',
        label: 'Personnes manquantes',
        type: 'NUMBER',
        constraints: { min: 0 },
      },
    ]),
  ],
  [
    'HAZARDOUS_MATERIAL',
    'Matières dangereuses',
    specialized('hazmatDetails', 'Matières dangereuses', [
      {
        key: 'substance',
        label: 'Produit ou substance',
        type: 'SHORT_TEXT',
        required: true,
      },
      {
        key: 'quantity',
        label: 'Quantité observée',
        type: 'NUMBER',
        constraints: { min: 0 },
      },
      {
        key: 'exposureReported',
        label: 'Exposition déclarée',
        type: 'CHECKBOX',
      },
    ]),
  ],
  [
    'OBSERVATION_NON_CONFORMITY',
    'Observation / non-conformité',
    specialized('observationDetails', 'Observation et conformité', [
      {
        key: 'requirement',
        label: 'Exigence concernée',
        type: 'LONG_TEXT',
        required: true,
      },
      {
        key: 'observation',
        label: 'Constat',
        type: 'LONG_TEXT',
        required: true,
      },
      {
        key: 'immediateCorrection',
        label: 'Correction immédiate',
        type: 'LONG_TEXT',
      },
    ]),
  ],
];

export const INITIAL_INCIDENT_REPORT_TEMPLATES = TEMPLATE_DEFINITIONS.map(
  ([templateKey, name, details]) => ({
    templateKey,
    name,
    reportType: templateKey,
    formSchema: {
      schemaVersion: '1.1',
      sections: [
        identification,
        classification,
        details,
        people,
        response,
        closure,
      ],
    } satisfies IncidentReportFormSchema,
  }),
);
