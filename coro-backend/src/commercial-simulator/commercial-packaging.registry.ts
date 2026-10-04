import { COMMERCIAL_FAMILY_REGISTRY } from './commercial-family.registry';
import { FIRST_WAVE_COMPONENTS } from './first-wave-commercial.registry';

export const COMMERCIAL_PACKAGING_POLICY_VERSION = 'commercial-packaging/v1';
export type PackagingRole = 'REQUIRED' | 'OPTIONAL' | 'DEFAULT_SELECTED';
export type PackagingPolicyStatus =
  | 'READY'
  | 'POLICY_INCOMPLETE'
  | 'NOT_SELLABLE';
export type IncludedFeatureClassification = 'PRESENTATION_ONLY' | 'DEPENDENCY';

export type PackagingComponentPolicy = Readonly<{
  componentCode: string;
  role: PackagingRole;
  dependencies: readonly string[];
  exclusions: readonly string[];
  professionalServiceAttachments: readonly string[];
}>;

export type FamilyPackagingPolicy = Readonly<{
  familyCode: string;
  status: PackagingPolicyStatus;
  components: readonly PackagingComponentPolicy[];
  includedFeatures: readonly Readonly<{
    key: string;
    classification: IncludedFeatureClassification;
  }>[];
  unresolvedDecisions: readonly string[];
}>;

const component = (
  componentCode: keyof typeof FIRST_WAVE_COMPONENTS,
  role: PackagingRole,
  professionalServiceAttachments: readonly string[] = [],
): PackagingComponentPolicy =>
  Object.freeze({
    componentCode,
    role,
    dependencies: Object.freeze([]),
    exclusions: Object.freeze([]),
    professionalServiceAttachments: Object.freeze([
      ...professionalServiceAttachments,
    ]),
  });

const family: FamilyPackagingPolicy[] = COMMERCIAL_FAMILY_REGISTRY.map(
  (definition) => {
    const includedFeatures = definition.includedFeatureKeys.map((key) =>
      Object.freeze({ key, classification: 'PRESENTATION_ONLY' as const }),
    );
    if (definition.code === 'COMPLIANCE')
      return Object.freeze({
        familyCode: definition.code,
        status: 'READY' as const,
        components: Object.freeze([
          component('DOCUMENT_COMPLIANCE_SUBSCRIPTION', 'OPTIONAL'),
          component('DOCUMENT_COMPLIANCE_IMPLEMENTATION', 'OPTIONAL'),
          component('DOCUMENT_COMPLIANCE_DELIVERY_HOUR', 'OPTIONAL', [
            'COMPLIANCE',
            'PROFESSIONAL_SERVICES',
          ]),
          component('DOCUMENT_COMPLIANCE_SENIOR_REVIEW_HOUR', 'OPTIONAL', [
            'COMPLIANCE',
            'PROFESSIONAL_SERVICES',
          ]),
        ]),
        includedFeatures: Object.freeze(includedFeatures),
        unresolvedDecisions: Object.freeze([
          'Whether Document Compliance Subscription is mandatory remains a business decision.',
        ]),
      });
    if (definition.code === 'PROFESSIONAL_SERVICES')
      return Object.freeze({
        familyCode: definition.code,
        status: 'READY' as const,
        components: Object.freeze([
          component('DOCUMENT_COMPLIANCE_DELIVERY_HOUR', 'OPTIONAL', [
            'COMPLIANCE',
            'PROFESSIONAL_SERVICES',
          ]),
          component('DOCUMENT_COMPLIANCE_SENIOR_REVIEW_HOUR', 'OPTIONAL', [
            'COMPLIANCE',
            'PROFESSIONAL_SERVICES',
          ]),
        ]),
        includedFeatures: Object.freeze(includedFeatures),
        unresolvedDecisions: Object.freeze([
          'Additional cross-family professional service attachments are not approved.',
        ]),
      });
    return Object.freeze({
      familyCode: definition.code,
      status:
        definition.availability === 'FUTURE'
          ? ('NOT_SELLABLE' as const)
          : ('POLICY_INCOMPLETE' as const),
      components: Object.freeze([]),
      includedFeatures: Object.freeze(includedFeatures),
      unresolvedDecisions: Object.freeze([
        'Stable sellable component codes and composition rules are not yet approved.',
      ]),
    });
  },
);

export const COMMERCIAL_PACKAGING_POLICY = Object.freeze(family);

export function packagingPolicyForFamily(familyCode: string) {
  return COMMERCIAL_PACKAGING_POLICY.find(
    (policy) => policy.familyCode === familyCode,
  );
}

export function validatePackagingRegistry(
  policies: readonly FamilyPackagingPolicy[] = COMMERCIAL_PACKAGING_POLICY,
) {
  const familyCodes = new Set(
    COMMERCIAL_FAMILY_REGISTRY.map((item) => item.code),
  );
  const seenFamilies = new Set<string>();
  const issues: string[] = [];
  for (const policy of policies) {
    if (!familyCodes.has(policy.familyCode))
      issues.push(`UNKNOWN_FAMILY:${policy.familyCode}`);
    if (seenFamilies.has(policy.familyCode))
      issues.push(`DUPLICATE_FAMILY:${policy.familyCode}`);
    seenFamilies.add(policy.familyCode);
    const components = new Map<string, PackagingComponentPolicy>();
    for (const rule of policy.components) {
      if (components.has(rule.componentCode))
        issues.push(
          `DUPLICATE_COMPONENT:${policy.familyCode}:${rule.componentCode}`,
        );
      components.set(rule.componentCode, rule);
      if (rule.dependencies.includes(rule.componentCode))
        issues.push(`SELF_DEPENDENCY:${rule.componentCode}`);
      if (rule.exclusions.includes(rule.componentCode))
        issues.push(`SELF_EXCLUSION:${rule.componentCode}`);
      if (
        rule.dependencies.some((dependency) =>
          rule.exclusions.includes(dependency),
        )
      )
        issues.push(`DEPENDENCY_EXCLUDED:${rule.componentCode}`);
    }
    const visit = (code: string, path: string[]): void => {
      if (path.includes(code)) {
        issues.push(`DEPENDENCY_CYCLE:${[...path, code].join('>')}`);
        return;
      }
      components
        .get(code)
        ?.dependencies.forEach((dependency) =>
          visit(dependency, [...path, code]),
        );
    };
    components.forEach((_rule, code) => visit(code, []));
  }
  return { valid: issues.length === 0, issues };
}
