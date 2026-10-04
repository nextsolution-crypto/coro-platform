import {
  COMMERCIAL_PACKAGING_POLICY_VERSION,
  FamilyPackagingPolicy,
  PackagingComponentPolicy,
  packagingPolicyForFamily,
} from './commercial-packaging.registry';

export type PackagingSelection = {
  componentCode: string;
  revenueCategory: string | null;
};

export function packagingDraftBlockingIssues(blockers: readonly string[]) {
  return blockers.filter(
    (blocker) =>
      !blocker.startsWith('NO_PACKAGING_COMPONENT_SELECTED') &&
      !blocker.startsWith('PACKAGING_POLICY_INCOMPLETE:'),
  );
}

export function validatePackagingSelection(input: {
  familyCodes: readonly string[];
  components: readonly PackagingSelection[];
  policies?: readonly FamilyPackagingPolicy[];
}) {
  const policies = input.familyCodes.map(
    (familyCode) =>
      input.policies?.find((policy) => policy.familyCode === familyCode) ??
      packagingPolicyForFamily(familyCode),
  );
  const selected = new Set(input.components.map((item) => item.componentCode));
  const rules = new Map<string, PackagingComponentPolicy>();
  policies.forEach((policy) =>
    policy?.components.forEach((rule) => rules.set(rule.componentCode, rule)),
  );
  const unmappedComponents = input.components
    .filter((item) => !rules.has(item.componentCode))
    .map((item) => item.componentCode);
  const missingRequired = [...rules.values()]
    .filter(
      (rule) => rule.role === 'REQUIRED' && !selected.has(rule.componentCode),
    )
    .map((rule) => rule.componentCode);
  const dependencyViolations = [...selected].flatMap((code) =>
    (rules.get(code)?.dependencies ?? [])
      .filter((dependency) => !selected.has(dependency))
      .map((dependency) => ({ componentCode: code, requires: dependency })),
  );
  const exclusionViolations = [...selected].flatMap((code) =>
    (rules.get(code)?.exclusions ?? [])
      .filter((excluded) => selected.has(excluded))
      .map((excluded) => ({ componentCode: code, conflictsWith: excluded })),
  );
  const orphanServices = input.components
    .filter((item) => item.revenueCategory === 'PROFESSIONAL_SERVICE')
    .filter((item) => {
      const attachments =
        rules.get(item.componentCode)?.professionalServiceAttachments ?? [];
      return !attachments.some((familyCode) =>
        input.familyCodes.includes(familyCode),
      );
    })
    .map((item) => item.componentCode);
  const incompleteFamilies = policies
    .filter((policy) => policy?.status === 'POLICY_INCOMPLETE')
    .map((policy) => policy!.familyCode);
  const nonSellableFamilies = policies
    .filter((policy) => !policy || policy.status === 'NOT_SELLABLE')
    .map((policy, index) => policy?.familyCode ?? input.familyCodes[index]);
  const selectedForReadyFamily = input.familyCodes.every((familyCode) => {
    const policy = policies.find((item) => item?.familyCode === familyCode);
    return (
      policy?.status !== 'READY' ||
      policy.components.some((rule) => selected.has(rule.componentCode))
    );
  });
  const blockers = [
    ...unmappedComponents.map((code) => `UNMAPPED_COMPONENT:${code}`),
    ...missingRequired.map((code) => `MISSING_REQUIRED_COMPONENT:${code}`),
    ...dependencyViolations.map(
      (item) => `MISSING_DEPENDENCY:${item.componentCode}:${item.requires}`,
    ),
    ...exclusionViolations.map(
      (item) =>
        `EXCLUDED_COMPONENT_COMBINATION:${item.componentCode}:${item.conflictsWith}`,
    ),
    ...orphanServices.map((code) => `ORPHAN_PROFESSIONAL_SERVICE:${code}`),
    ...incompleteFamilies.map((code) => `PACKAGING_POLICY_INCOMPLETE:${code}`),
    ...nonSellableFamilies.map((code) => `FAMILY_NOT_SELLABLE:${code}`),
    ...(selectedForReadyFamily ? [] : ['NO_PACKAGING_COMPONENT_SELECTED']),
  ];
  return {
    policyVersion: COMMERCIAL_PACKAGING_POLICY_VERSION,
    status: blockers.length ? ('BLOCKED' as const) : ('READY' as const),
    missingRequired,
    unmappedComponents,
    dependencyViolations,
    exclusionViolations,
    orphanServices,
    incompleteFamilies,
    blockers,
  };
}
