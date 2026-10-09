import {
  COMMERCIAL_PACKAGING_POLICY,
  COMMERCIAL_PACKAGING_POLICY_VERSION,
  FamilyPackagingPolicy,
  validatePackagingRegistry,
} from './commercial-packaging.registry';
import {
  packagingDraftBlockingIssues,
  validatePackagingSelection,
} from './commercial-packaging';
import { PROFESSIONAL_CONTENT_DRAFT } from '../commercial-content/professional-content.draft';

describe('commercial packaging policy', () => {
  it('locks the version and validates the canonical registry', () => {
    expect(COMMERCIAL_PACKAGING_POLICY_VERSION).toBe('commercial-packaging/v2');
    expect(COMMERCIAL_PACKAGING_POLICY).toHaveLength(9);
    expect(validatePackagingRegistry()).toEqual({ valid: true, issues: [] });
  });

  it('requires exactly one Professional implementation choice', () => {
    const annual = {
      componentCode: 'CORO_PROFESSIONAL_ANNUAL',
      revenueCategory: 'SAAS',
    };
    const standard = {
      componentCode: 'CORO_PROFESSIONAL_IMPLEMENTATION_STANDARD',
      revenueCategory: 'IMPLEMENTATION',
    };
    const advanced = {
      componentCode: 'CORO_PROFESSIONAL_IMPLEMENTATION_ADVANCED',
      revenueCategory: 'IMPLEMENTATION',
    };
    expect(
      validatePackagingSelection({
        familyCodes: ['PROFESSIONAL'],
        components: [annual, standard],
      }).status,
    ).toBe('READY');
    expect(
      validatePackagingSelection({
        familyCodes: ['PROFESSIONAL'],
        components: [annual, advanced],
      }).status,
    ).toBe('READY');
    expect(
      validatePackagingSelection({
        familyCodes: ['PROFESSIONAL'],
        components: [annual],
      }).status,
    ).toBe('BLOCKED');
    expect(
      validatePackagingSelection({
        familyCodes: ['PROFESSIONAL'],
        components: [annual, standard, advanced],
      }).status,
    ).toBe('BLOCKED');
  });

  it('keeps Professional presentation features aligned with the A1A included content', () => {
    const professional = COMMERCIAL_PACKAGING_POLICY.find(
      (item) => item.familyCode === 'PROFESSIONAL',
    );
    const expectedFeatureKeys = [
      'CLIENTS_BUILDINGS',
      'COMPLIANCE_DOCUMENTS',
      'PMU_PSI_PCA',
      'PROJECTS_MANDATES',
      'ACTIVITIES_TASKS_ASSIGNMENTS',
      'BOOKING',
      'PLANNER_AVAILABILITY',
      'EXERCISES_SIMULATIONS',
      'EXERCISE_REPORTS',
      'REX',
      'CORRECTIVE_ACTIONS',
      'CLIENT_PORTAL',
      'USER_ROLE_MANAGEMENT',
    ];
    const a1aIncludedFeatureKeys = PROFESSIONAL_CONTENT_DRAFT.bindings
      .filter(
        (binding) =>
          binding.targetType === 'FUNCTIONAL_FEATURE' &&
          binding.commercialIntent === 'INCLUDED',
      )
      .map((binding) => binding.targetCode);

    expect(professional?.includedFeatures).toEqual(
      expectedFeatureKeys.map((key) => ({
        key,
        classification: 'PRESENTATION_ONLY',
      })),
    );
    expect(a1aIncludedFeatureKeys).toEqual(expectedFeatureKeys);
    expect(new Set(expectedFeatureKeys).size).toBe(expectedFeatureKeys.length);
    const specializedFeatureKeys = [
      'SENTINELLE',
      'POPULATION_PUE',
      'KNOWLEDGE_AI',
      'INCIDENT_OPS',
      'BUILDING_BRIDGE',
      'NETWORK',
      'PERFORMANCE_CORO_INDEX',
    ];
    expect(
      expectedFeatureKeys.filter((key) => specializedFeatureKeys.includes(key)),
    ).toEqual([]);
  });

  it('keeps Network non-sellable and unresolved families explicit', () => {
    expect(
      COMMERCIAL_PACKAGING_POLICY.find((item) => item.familyCode === 'NETWORK')
        ?.status,
    ).toBe('NOT_SELLABLE');
    expect(
      COMMERCIAL_PACKAGING_POLICY.find(
        (item) => item.familyCode === 'SENTINELLE',
      )?.status,
    ).toBe('POLICY_INCOMPLETE');
  });

  it('allows incomplete composition drafts without allowing invalid selections', () => {
    const incompleteDraft = validatePackagingSelection({
      familyCodes: ['SENTINELLE'],
      components: [],
    });
    expect(packagingDraftBlockingIssues(incompleteDraft.blockers)).toEqual([]);

    const invalidDraft = validatePackagingSelection({
      familyCodes: ['COMPLIANCE'],
      components: [{ componentCode: 'UNMAPPED', revenueCategory: 'SAAS' }],
    });
    expect(packagingDraftBlockingIssues(invalidDraft.blockers)).toContain(
      'UNMAPPED_COMPONENT:UNMAPPED',
    );
  });

  it('admits known Compliance components and excludes unmapped catalog items', () => {
    expect(
      validatePackagingSelection({
        familyCodes: ['COMPLIANCE'],
        components: [
          {
            componentCode: 'DOCUMENT_COMPLIANCE_SUBSCRIPTION',
            revenueCategory: 'SAAS',
          },
        ],
      }).status,
    ).toBe('READY');
    expect(
      validatePackagingSelection({
        familyCodes: ['COMPLIANCE'],
        components: [{ componentCode: 'UNMAPPED', revenueCategory: 'SAAS' }],
      }).blockers,
    ).toContain('UNMAPPED_COMPONENT:UNMAPPED');
  });

  it('supports dependency and exclusion diagnostics without a rules engine', () => {
    const policy: FamilyPackagingPolicy = {
      familyCode: 'COMPLIANCE',
      status: 'READY',
      includedFeatures: [],
      unresolvedDecisions: [],
      requiredOneOf: [],
      components: [
        {
          componentCode: 'A',
          role: 'OPTIONAL',
          dependencies: ['B'],
          exclusions: ['C'],
          professionalServiceAttachments: [],
        },
        {
          componentCode: 'B',
          role: 'OPTIONAL',
          dependencies: [],
          exclusions: [],
          professionalServiceAttachments: [],
        },
        {
          componentCode: 'C',
          role: 'OPTIONAL',
          dependencies: [],
          exclusions: [],
          professionalServiceAttachments: [],
        },
      ],
    };
    const result = validatePackagingSelection({
      familyCodes: ['COMPLIANCE'],
      components: [
        { componentCode: 'A', revenueCategory: 'SAAS' },
        { componentCode: 'C', revenueCategory: 'SAAS' },
      ],
      policies: [policy],
    });
    expect(result.dependencyViolations).toEqual([
      { componentCode: 'A', requires: 'B' },
    ]);
    expect(result.exclusionViolations).toEqual([
      { componentCode: 'A', conflictsWith: 'C' },
    ]);
  });

  it('allows only explicitly attached professional services', () => {
    expect(
      validatePackagingSelection({
        familyCodes: ['COMPLIANCE'],
        components: [
          {
            componentCode: 'DOCUMENT_COMPLIANCE_DELIVERY_HOUR',
            revenueCategory: 'PROFESSIONAL_SERVICE',
          },
        ],
      }).orphanServices,
    ).toEqual([]);
  });

  it('rejects self dependencies during registry validation', () => {
    const invalid: FamilyPackagingPolicy = {
      familyCode: 'COMPLIANCE',
      status: 'READY',
      includedFeatures: [],
      unresolvedDecisions: [],
      requiredOneOf: [],
      components: [
        {
          componentCode: 'A',
          role: 'OPTIONAL',
          dependencies: ['A'],
          exclusions: [],
          professionalServiceAttachments: [],
        },
      ],
    };
    expect(validatePackagingRegistry([invalid]).issues).toContain(
      'SELF_DEPENDENCY:A',
    );
  });
});
