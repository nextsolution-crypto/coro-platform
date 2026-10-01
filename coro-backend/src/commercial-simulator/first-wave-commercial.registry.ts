import { BadRequestException } from '@nestjs/common';

export const PROFESSIONAL_SERVICE_ROLES = Object.freeze([
  'DELIVERY_PROFESSIONAL',
  'SENIOR_REVIEWER',
] as const);

export type ProfessionalServiceRole =
  (typeof PROFESSIONAL_SERVICE_ROLES)[number];

export const FIRST_WAVE_COST_ASSUMPTIONS = Object.freeze({
  LOADED_DIRECT_DELIVERY_COST: Object.freeze({
    version: 'v1',
    valueType: 'MONEY',
    unit: 'minor/hour',
    roleScopes: Object.freeze({
      DELIVERY_PROFESSIONAL: 'ROLE:DELIVERY_PROFESSIONAL',
      SENIOR_REVIEWER: 'ROLE:SENIOR_REVIEWER',
    }),
  }),
  STANDARD_DELIVERY_EFFORT: Object.freeze({
    version: 'v1',
    valueType: 'DECIMAL',
    unit: 'hour',
  }),
  STANDARD_SENIOR_REVIEW_EFFORT: Object.freeze({
    version: 'v1',
    valueType: 'DECIMAL',
    unit: 'hour',
  }),
  STANDARD_SUPPORT_EFFORT: Object.freeze({
    version: 'v1',
    valueType: 'DECIMAL',
    unit: 'hour/period',
  }),
} as const);

export const FIRST_WAVE_COMPONENTS = Object.freeze({
  DOCUMENT_COMPLIANCE_SUBSCRIPTION: Object.freeze({
    capabilityCode: 'COMPLIANCE_OPERATIONS',
    professionalServiceRole: null,
  }),
  DOCUMENT_COMPLIANCE_IMPLEMENTATION: Object.freeze({
    capabilityCode: 'COMPLIANCE_OPERATIONS',
    professionalServiceRole: null,
  }),
  DOCUMENT_COMPLIANCE_DELIVERY_HOUR: Object.freeze({
    capabilityCode: 'COMPLIANCE_OPERATIONS',
    professionalServiceRole: 'DELIVERY_PROFESSIONAL',
  }),
  DOCUMENT_COMPLIANCE_SENIOR_REVIEW_HOUR: Object.freeze({
    capabilityCode: 'COMPLIANCE_OPERATIONS',
    professionalServiceRole: 'SENIOR_REVIEWER',
  }),
} as const satisfies Record<
  string,
  {
    capabilityCode: 'COMPLIANCE_OPERATIONS';
    professionalServiceRole: ProfessionalServiceRole | null;
  }
>);

export function assertProfessionalServiceRole(
  roleCode: string,
): asserts roleCode is ProfessionalServiceRole {
  if (!(PROFESSIONAL_SERVICE_ROLES as readonly string[]).includes(roleCode))
    throw new BadRequestException('PROFESSIONAL_SERVICE_ROLE_INVALID');
}

export function professionalServiceRoleForComponent(
  componentCode: string,
): ProfessionalServiceRole | null {
  return (
    FIRST_WAVE_COMPONENTS[componentCode as keyof typeof FIRST_WAVE_COMPONENTS]
      ?.professionalServiceRole ?? null
  );
}

export function roleCostScope(roleCode: ProfessionalServiceRole): string {
  return FIRST_WAVE_COST_ASSUMPTIONS.LOADED_DIRECT_DELIVERY_COST.roleScopes[
    roleCode
  ];
}
