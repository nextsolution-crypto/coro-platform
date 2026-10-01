import { BadRequestException } from '@nestjs/common';
import { PROPOSAL_INPUT_REGISTRY } from '../commercial-proposals/proposal-input-registry';

export type SimulatorValueType =
  | 'DECIMAL'
  | 'INTEGER'
  | 'MONEY'
  | 'BOOLEAN'
  | 'TEXT';

export type SimulatorDriverDefinition = Readonly<{
  code: string;
  version: 'v1';
  valueType: SimulatorValueType;
  category: 'QUANTITY' | 'COMPLEXITY' | 'VALUE_ANALYSIS';
  unit: string | null;
  proposalInputCode: keyof typeof PROPOSAL_INPUT_REGISTRY;
  labelFr: string;
  labelEn: string;
  helpFr: string;
  helpEn: string;
  required: boolean;
  visibility: 'CUSTOMER_DEAL_INPUT' | 'INTERNAL_CONTEXT' | 'VALUE_ANALYSIS';
  hasDefault: false;
}>;

const typeMap = {
  DECIMAL: 'DECIMAL',
  INTEGER: 'INTEGER',
  MONEY: 'MONEY',
  TEXT: 'TEXT',
} as const;

const presentation: Record<
  keyof typeof PROPOSAL_INPUT_REGISTRY,
  Pick<
    SimulatorDriverDefinition,
    'labelFr' | 'labelEn' | 'helpFr' | 'helpEn' | 'required' | 'visibility'
  >
> = {
  PROFESSIONALS: {
    labelFr: 'Professionnels',
    labelEn: 'Professionals',
    helpFr: 'Nombre de professionnels déclaré pour cette configuration.',
    helpEn: 'Declared number of professionals for this configuration.',
    required: false,
    visibility: 'CUSTOMER_DEAL_INPUT',
  },
  CLIENTS: {
    labelFr: 'Clients',
    labelEn: 'Clients',
    helpFr: 'Nombre de clients déclaré pour cette configuration.',
    helpEn: 'Declared number of clients for this configuration.',
    required: false,
    visibility: 'CUSTOMER_DEAL_INPUT',
  },
  SITES: {
    labelFr: 'Sites',
    labelEn: 'Sites',
    helpFr: 'Nombre de sites déclaré pour cette configuration.',
    helpEn: 'Declared number of sites for this configuration.',
    required: false,
    visibility: 'CUSTOMER_DEAL_INPUT',
  },
  POPULATION_INSTALLATIONS: {
    labelFr: 'Installations Population',
    labelEn: 'Population installations',
    helpFr: 'Nombre d’installations ou programmes déclaré.',
    helpEn: 'Declared number of installations or programs.',
    required: false,
    visibility: 'CUSTOMER_DEAL_INPUT',
  },
  MANDATES_PER_YEAR: {
    labelFr: 'Mandats par année',
    labelEn: 'Mandates per year',
    helpFr: 'Volume déclaré utilisé uniquement pour l’analyse de valeur.',
    helpEn: 'Declared volume used only for value analysis.',
    required: false,
    visibility: 'VALUE_ANALYSIS',
  },
  AVG_HOURS_PER_MANDATE: {
    labelFr: 'Heures moyennes par mandat',
    labelEn: 'Average hours per mandate',
    helpFr: 'Temps moyen déclaré utilisé uniquement pour l’analyse de valeur.',
    helpEn: 'Declared average time used only for value analysis.',
    required: false,
    visibility: 'VALUE_ANALYSIS',
  },
  BILLABLE_RATE: {
    labelFr: 'Taux économique du client',
    labelEn: 'Customer economic rate',
    helpFr:
      'Taux économique du client ou du dossier utilisé pour l’analyse de valeur; ce n’est pas le prix de vente des services professionnels CORO.',
    helpEn:
      'Customer or deal economic rate used for value analysis; this is not the CORO Professional Services selling price.',
    required: false,
    visibility: 'VALUE_ANALYSIS',
  },
  PRODUCTIVITY_GAIN: {
    labelFr: 'Gain de productivité estimé',
    labelEn: 'Estimated productivity gain',
    helpFr:
      'Hypothèse facultative d’analyse de valeur, sans défaut ni benchmark de production approuvé.',
    helpEn:
      'Optional value-analysis assumption with no default or approved production benchmark.',
    required: false,
    visibility: 'VALUE_ANALYSIS',
  },
  POPULATION_SITE: {
    labelFr: 'Population du site',
    labelEn: 'Site population',
    helpFr: 'Population contextuelle du site.',
    helpEn: 'Contextual site population.',
    required: false,
    visibility: 'INTERNAL_CONTEXT',
  },
  POPULATION_MUNICIPALITY: {
    labelFr: 'Population municipale',
    labelEn: 'Municipal population',
    helpFr: 'Population contextuelle de la municipalité.',
    helpEn: 'Contextual municipal population.',
    required: false,
    visibility: 'INTERNAL_CONTEXT',
  },
  POPULATION_ZPU: {
    labelFr: 'Population ZPU',
    labelEn: 'ZPU population',
    helpFr: 'Population contextuelle de la zone de planification.',
    helpEn: 'Contextual planning-zone population.',
    required: false,
    visibility: 'INTERNAL_CONTEXT',
  },
  SUBSTANCE_COUNT: {
    labelFr: 'Substances',
    labelEn: 'Substances',
    helpFr: 'Nombre contextuel de substances.',
    helpEn: 'Contextual number of substances.',
    required: false,
    visibility: 'INTERNAL_CONTEXT',
  },
  SCENARIO_COUNT: {
    labelFr: 'Scénarios',
    labelEn: 'Scenarios',
    helpFr: 'Nombre contextuel de scénarios.',
    helpEn: 'Contextual number of scenarios.',
    required: false,
    visibility: 'INTERNAL_CONTEXT',
  },
  IMPACT_ZONE_COUNT: {
    labelFr: 'Zones d’impact',
    labelEn: 'Impact zones',
    helpFr: 'Nombre contextuel de zones d’impact.',
    helpEn: 'Contextual number of impact zones.',
    required: false,
    visibility: 'INTERNAL_CONTEXT',
  },
  SENSITIVE_ASSET_COUNT: {
    labelFr: 'Éléments sensibles',
    labelEn: 'Sensitive assets',
    helpFr: 'Nombre contextuel d’éléments sensibles.',
    helpEn: 'Contextual number of sensitive assets.',
    required: false,
    visibility: 'INTERNAL_CONTEXT',
  },
  MAX_IMPACT_DISTANCE: {
    labelFr: 'Distance maximale d’impact',
    labelEn: 'Maximum impact distance',
    helpFr: 'Distance contextuelle maximale en kilomètres.',
    helpEn: 'Maximum contextual distance in kilometres.',
    required: false,
    visibility: 'INTERNAL_CONTEXT',
  },
  POTENTIAL_RECIPIENTS: {
    labelFr: 'Destinataires potentiels',
    labelEn: 'Potential recipients',
    helpFr: 'Nombre contextuel de destinataires potentiels.',
    helpEn: 'Contextual number of potential recipients.',
    required: false,
    visibility: 'INTERNAL_CONTEXT',
  },
  IMPLEMENTATION_COMPLEXITY: {
    labelFr: 'Complexité d’implantation',
    labelEn: 'Implementation complexity',
    helpFr: 'Contexte qualitatif; ne fixe aucun prix automatiquement.',
    helpEn: 'Qualitative context; it does not set a price automatically.',
    required: false,
    visibility: 'INTERNAL_CONTEXT',
  },
};

export const SIMULATOR_DRIVER_REGISTRY: readonly SimulatorDriverDefinition[] =
  Object.freeze(
    Object.entries(PROPOSAL_INPUT_REGISTRY).map(
      ([code, [valueType, category, unit]]) =>
        Object.freeze({
          code,
          version: 'v1' as const,
          valueType: typeMap[valueType],
          category,
          unit,
          proposalInputCode: code as keyof typeof PROPOSAL_INPUT_REGISTRY,
          ...presentation[code as keyof typeof PROPOSAL_INPUT_REGISTRY],
          hasDefault: false as const,
        }),
    ),
  );

const byIdentity = new Map(
  SIMULATOR_DRIVER_REGISTRY.map((definition) => [
    `${definition.code}@${definition.version}`,
    definition,
  ]),
);

export function resolveSimulatorDriver(code: string, version: string) {
  const definition = byIdentity.get(`${code}@${version}`);
  if (!definition) {
    throw new BadRequestException('SIMULATOR_DRIVER_NOT_SUPPORTED');
  }
  return definition;
}
