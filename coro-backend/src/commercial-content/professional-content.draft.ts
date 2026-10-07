import type {
  CommercialContentDeliveryMaturity,
  CommercialContentIntent,
  CommercialContentTargetType,
} from '@prisma/client';

export type ProfessionalDraftBinding = {
  targetType: CommercialContentTargetType;
  targetCode: string;
  labelFR: string;
  labelEN?: string;
  commercialIntent: CommercialContentIntent;
  deliveryMaturity: CommercialContentDeliveryMaturity;
  evidence: string;
  displayOrder: number;
};

const feature = (
  targetCode: string,
  labelFR: string,
  deliveryMaturity: CommercialContentDeliveryMaturity,
  displayOrder: number,
): ProfessionalDraftBinding => ({
  targetType: 'FUNCTIONAL_FEATURE',
  targetCode,
  labelFR,
  commercialIntent: 'INCLUDED',
  deliveryMaturity,
  evidence: 'FOUNDER_PRODUCT_DECISION',
  displayOrder,
});

export const PROFESSIONAL_CONTENT_DRAFT = Object.freeze({
  code: 'CORO_PROFESSIONAL',
  titleFR: 'CORO Professional — Conformité & Opérations',
  descriptionFR:
    'Brouillon de matrice commerciale à valider avant toute utilisation client.',
  provenance: 'FOUNDER_PRODUCT_DECISION',
  bindings: Object.freeze([
    feature('CLIENTS_BUILDINGS', 'Clients et bâtiments', 'AVAILABLE', 10),
    feature(
      'COMPLIANCE_DOCUMENTS',
      'Création et gestion documentaire de conformité',
      'AVAILABLE',
      20,
    ),
    feature('PMU_PSI_PCA', 'PMU, PSI et PCA', 'UNVERIFIED', 30),
    feature('PROJECTS_MANDATES', 'Projets et mandats', 'AVAILABLE', 40),
    feature(
      'ACTIVITIES_TASKS_ASSIGNMENTS',
      'Activités, tâches et assignations',
      'AVAILABLE',
      50,
    ),
    feature('BOOKING', 'Booking', 'AVAILABLE', 60),
    feature(
      'PLANNER_AVAILABILITY',
      'Planner et gestion des disponibilités',
      'AVAILABLE',
      70,
    ),
    feature(
      'EXERCISES_SIMULATIONS',
      'Exercices et simulations',
      'AVAILABLE',
      80,
    ),
    feature('EXERCISE_REPORTS', 'Rapports d’exercice', 'AVAILABLE', 90),
    feature('REX', 'REX', 'AVAILABLE', 100),
    feature('CORRECTIVE_ACTIONS', 'Actions correctives', 'AVAILABLE', 110),
    feature('CLIENT_PORTAL', 'Portail client', 'AVAILABLE', 120),
    feature(
      'USER_ROLE_MANAGEMENT',
      'Gestion des utilisateurs et rôles autorisés',
      'AVAILABLE',
      130,
    ),
    {
      targetType: 'FUNCTIONAL_FEATURE',
      targetCode: 'PERFORMANCE_CORO_INDEX',
      labelFR: 'Performance et CORO Index',
      commercialIntent: 'OPTIONAL',
      deliveryMaturity: 'UNVERIFIED',
      evidence: 'FOUNDER_CONFIRMATION_PENDING',
      displayOrder: 200,
    },
    {
      targetType: 'FAMILY',
      targetCode: 'KNOWLEDGE_AI',
      labelFR: 'CORO Knowledge et IA',
      commercialIntent: 'OPTIONAL',
      deliveryMaturity: 'LIMITED',
      evidence: 'FOUNDER_PRODUCT_DECISION',
      displayOrder: 210,
    },
    {
      targetType: 'FAMILY',
      targetCode: 'INCIDENT_OPS',
      labelFR: 'CORO Incident et Ops',
      commercialIntent: 'OPTIONAL',
      deliveryMaturity: 'LIMITED',
      evidence: 'FOUNDER_PRODUCT_DECISION',
      displayOrder: 220,
    },
    {
      targetType: 'FUNCTIONAL_FEATURE',
      targetCode: 'BUILDING_BRIDGE',
      labelFR: 'Building Bridge',
      commercialIntent: 'OPTIONAL',
      deliveryMaturity: 'LIMITED',
      evidence: 'FOUNDER_PRODUCT_DECISION',
      displayOrder: 230,
    },
    {
      targetType: 'CAPABILITY',
      targetCode: 'NETWORK',
      labelFR: 'CORO Network',
      commercialIntent: 'FUTURE',
      deliveryMaturity: 'FUTURE',
      evidence: 'FOUNDER_PRODUCT_DECISION',
      displayOrder: 240,
    },
    {
      targetType: 'FAMILY',
      targetCode: 'SENTINELLE',
      labelFR: 'CORO Sentinelle',
      commercialIntent: 'AUTONOMOUS',
      deliveryMaturity: 'AVAILABLE',
      evidence: 'FOUNDER_PRODUCT_DECISION:EXTENSION_OR_AUTONOMOUS',
      displayOrder: 250,
    },
    {
      targetType: 'FAMILY',
      targetCode: 'POPULATION_PUE',
      labelFR: 'CORO Sentinelle Population',
      commercialIntent: 'AUTONOMOUS',
      deliveryMaturity: 'LIMITED',
      evidence: 'FOUNDER_PRODUCT_DECISION:EXTENSION_OR_AUTONOMOUS',
      displayOrder: 260,
    },
  ] satisfies readonly ProfessionalDraftBinding[]),
});
