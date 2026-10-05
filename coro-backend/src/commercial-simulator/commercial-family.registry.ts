import { CapabilityCode } from '@prisma/client';
import { PROPOSAL_INPUT_REGISTRY } from '../commercial-proposals/proposal-input-registry';

export type CommercialFamilyAvailability = 'AVAILABLE' | 'LIMITED' | 'FUTURE';

export type CommercialFamilyDefinition = Readonly<{
  code: string;
  labelFr: string;
  labelEn: string;
  descriptionFr: string;
  descriptionEn: string;
  displayOrder: number;
  availability: CommercialFamilyAvailability;
  capabilityCodes: readonly CapabilityCode[];
  applicableDriverCodes: readonly (keyof typeof PROPOSAL_INPUT_REGISTRY)[];
  optionalDriverCodes: readonly (keyof typeof PROPOSAL_INPUT_REGISTRY)[];
  includedFeatureKeys: readonly string[];
}>;

const family = (definition: CommercialFamilyDefinition) =>
  Object.freeze({
    ...definition,
    capabilityCodes: Object.freeze([...definition.capabilityCodes]),
    applicableDriverCodes: Object.freeze([...definition.applicableDriverCodes]),
    optionalDriverCodes: Object.freeze([...definition.optionalDriverCodes]),
    includedFeatureKeys: Object.freeze([...definition.includedFeatureKeys]),
  });

export const COMMERCIAL_FAMILY_REGISTRY_VERSION = 'v1';

export const COMMERCIAL_FAMILY_REGISTRY = Object.freeze([
  family({
    code: 'PROFESSIONAL',
    labelFr: 'CORO Professional',
    labelEn: 'CORO Professional',
    descriptionFr:
      'Abonnement professionnel annuel selon la capacité déclarée de sites actifs.',
    descriptionEn:
      'Annual professional subscription based on declared active-site capacity.',
    displayOrder: 5,
    availability: 'AVAILABLE',
    capabilityCodes: ['COMPLIANCE_OPERATIONS'],
    applicableDriverCodes: ['ACTIVE_SITES'],
    optionalDriverCodes: [],
    includedFeatureKeys: [
      'CLIENT_PORTAL',
      'PROJECTS_MANDATES',
      'REX',
      'CORRECTIVE_ACTIONS',
    ],
  }),
  family({
    code: 'COMPLIANCE',
    labelFr: 'CORO Conformité',
    labelEn: 'CORO Compliance',
    descriptionFr: 'Conformité documentaire et opérations de conformité.',
    descriptionEn: 'Document compliance and compliance operations.',
    displayOrder: 10,
    availability: 'AVAILABLE',
    capabilityCodes: ['COMPLIANCE_OPERATIONS'],
    applicableDriverCodes: ['PROFESSIONALS', 'CLIENTS', 'SITES'],
    optionalDriverCodes: [
      'MANDATES_PER_YEAR',
      'AVG_HOURS_PER_MANDATE',
      'BILLABLE_RATE',
      'PRODUCTIVITY_GAIN',
    ],
    includedFeatureKeys: [
      'CLIENT_PORTAL',
      'PROJECTS_MANDATES',
      'REX',
      'CORRECTIVE_ACTIONS',
    ],
  }),
  family({
    code: 'SENTINELLE',
    labelFr: 'CORO Sentinelle',
    labelEn: 'CORO Sentinelle',
    descriptionFr: 'Couverture opérationnelle des sites Sentinelle.',
    descriptionEn: 'Operational coverage for Sentinelle sites.',
    displayOrder: 20,
    availability: 'AVAILABLE',
    capabilityCodes: ['SENTINELLE'],
    applicableDriverCodes: ['SITES'],
    optionalDriverCodes: ['IMPLEMENTATION_COMPLEXITY'],
    includedFeatureKeys: ['OCCUPANCY', 'EVACUATION', 'CHECK_IN'],
  }),
  family({
    code: 'INCIDENT_OPS',
    labelFr: 'CORO Incident et opérations',
    labelEn: 'CORO Incident & Operations',
    descriptionFr: 'Gestion d’incident et contexte opérationnel associé.',
    descriptionEn: 'Incident management and related operational context.',
    displayOrder: 30,
    availability: 'LIMITED',
    capabilityCodes: ['INCIDENT'],
    applicableDriverCodes: ['SITES'],
    optionalDriverCodes: ['IMPLEMENTATION_COMPLEXITY'],
    includedFeatureKeys: ['INCIDENT', 'EXERCISES', 'REX'],
  }),
  family({
    code: 'POPULATION_PUE',
    labelFr: 'CORO Population / PUE',
    labelEn: 'CORO Population / PUE',
    descriptionFr: 'Programmes Population et contexte de planification PUE.',
    descriptionEn: 'Population programs and PUE planning context.',
    displayOrder: 40,
    availability: 'LIMITED',
    capabilityCodes: ['SENTINELLE_POPULATION'],
    applicableDriverCodes: ['POPULATION_INSTALLATIONS'],
    optionalDriverCodes: [
      'POPULATION_SITE',
      'POPULATION_MUNICIPALITY',
      'POPULATION_ZPU',
      'SUBSTANCE_COUNT',
      'SCENARIO_COUNT',
      'IMPACT_ZONE_COUNT',
      'SENSITIVE_ASSET_COUNT',
      'MAX_IMPACT_DISTANCE',
      'POTENTIAL_RECIPIENTS',
      'IMPLEMENTATION_COMPLEXITY',
    ],
    includedFeatureKeys: ['POPULATION_PORTAL', 'ALERTING', 'EVIDENCE'],
  }),
  family({
    code: 'BUILDING_BRIDGE',
    labelFr: 'Building Bridge / Intégrations',
    labelEn: 'Building Bridge / Integrations',
    descriptionFr: 'Intégrations de bâtiment à portée contrôlée.',
    descriptionEn: 'Controlled-scope building integrations.',
    displayOrder: 50,
    availability: 'LIMITED',
    capabilityCodes: [],
    applicableDriverCodes: ['SITES'],
    optionalDriverCodes: ['IMPLEMENTATION_COMPLEXITY'],
    includedFeatureKeys: ['INTEGRATIONS'],
  }),
  family({
    code: 'KNOWLEDGE_AI',
    labelFr: 'CORO Knowledge et IA',
    labelEn: 'CORO Knowledge & AI',
    descriptionFr: 'Fonctions Knowledge et IA selon leur disponibilité.',
    descriptionEn: 'Knowledge and AI functions when available.',
    displayOrder: 60,
    availability: 'LIMITED',
    capabilityCodes: ['KNOWLEDGE', 'AI'],
    applicableDriverCodes: ['PROFESSIONALS'],
    optionalDriverCodes: ['CLIENTS'],
    includedFeatureKeys: ['KNOWLEDGE', 'AI'],
  }),
  family({
    code: 'NETWORK',
    labelFr: 'CORO Network',
    labelEn: 'CORO Network',
    descriptionFr: 'Capacité future, non commercialisable actuellement.',
    descriptionEn: 'Future capability, not currently sellable.',
    displayOrder: 70,
    availability: 'FUTURE',
    capabilityCodes: ['NETWORK'],
    applicableDriverCodes: [],
    optionalDriverCodes: [],
    includedFeatureKeys: [],
  }),
  family({
    code: 'PROFESSIONAL_SERVICES',
    labelFr: 'Services professionnels',
    labelEn: 'Professional Services',
    descriptionFr:
      'Livraison, implantation et révision par des professionnels CORO.',
    descriptionEn: 'Delivery, implementation and review by CORO professionals.',
    displayOrder: 80,
    availability: 'AVAILABLE',
    capabilityCodes: [],
    applicableDriverCodes: [],
    optionalDriverCodes: [],
    includedFeatureKeys: ['DELIVERY', 'IMPLEMENTATION', 'SENIOR_REVIEW'],
  }),
] satisfies readonly CommercialFamilyDefinition[]);
