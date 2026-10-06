import { CommercialFamilyDefinition } from './commercial-family.registry';
import { FIRST_WAVE_COMPONENTS } from './first-wave-commercial.registry';
import { packagingPolicyForFamily } from './commercial-packaging.registry';

export type ReadinessStatus =
  | 'READY'
  | 'PARTIAL'
  | 'NOT_CONFIGURED'
  | 'NOT_APPLICABLE'
  | 'BLOCKED';

export type ReadinessComponent = {
  code: string;
  capabilityCode: string;
  pricingModel: string;
  revenueCategory: string | null;
  amountConfigured: boolean;
  tierCount: number;
};

const dimension = (status: ReadinessStatus, messages: string[] = []) => ({
  status,
  messages,
});

export function buildFamilyReadiness(input: {
  families: readonly CommercialFamilyDefinition[];
  components: ReadinessComponent[];
  publishedCostScopes: string[];
  incompatibleCostAuthorities?: number;
  publishedValuationCount: number;
}) {
  return input.families.map((family) => {
    if (family.availability === 'FUTURE')
      return {
        familyCode: family.code,
        availability: family.availability,
        product: dimension('NOT_APPLICABLE', ['FAMILY_NOT_SELLABLE']),
        packaging: dimension('NOT_APPLICABLE'),
        catalog: dimension('NOT_APPLICABLE'),
        price: dimension('NOT_APPLICABLE'),
        quantity: dimension('NOT_APPLICABLE'),
        drivers: dimension('NOT_APPLICABLE'),
        cost: dimension('NOT_APPLICABLE'),
        value: dimension('NOT_APPLICABLE'),
        blockers: ['FAMILY_NOT_SELLABLE'],
        warnings: [],
        nextActions: [],
      };

    const capabilityComponents = input.components.filter((component) =>
      family.capabilityCodes.length
        ? family.capabilityCodes.includes(component.capabilityCode as never)
        : family.code === 'PROFESSIONAL_SERVICES'
          ? component.revenueCategory === 'PROFESSIONAL_SERVICE'
          : false,
    );
    const packagingPolicy = packagingPolicyForFamily(family.code);
    const packagingComponentCodes = new Set(
      packagingPolicy?.components.map((component) => component.componentCode),
    );
    const familyComponents = packagingComponentCodes.size
      ? input.components.filter((component) =>
          packagingComponentCodes.has(component.code),
        )
      : capabilityComponents;
    const mappedPackagingComponents = familyComponents.filter((component) =>
      packagingPolicy?.components.some(
        (rule) => rule.componentCode === component.code,
      ),
    );
    const packagingStatus: ReadinessStatus =
      packagingPolicy?.status === 'NOT_SELLABLE'
        ? 'NOT_APPLICABLE'
        : packagingPolicy?.status === 'POLICY_INCOMPLETE'
          ? 'BLOCKED'
          : mappedPackagingComponents.length
            ? 'READY'
            : 'NOT_CONFIGURED';
    const invalid = familyComponents.filter(
      (component) =>
        !component.revenueCategory ||
        (!component.amountConfigured &&
          component.pricingModel !== 'CUSTOM' &&
          component.pricingModel !== 'COMPLEXITY' &&
          !(
            ['TIERED', 'CAPACITY_BAND'].includes(component.pricingModel) &&
            component.tierCount > 0
          )),
    );
    const catalogStatus: ReadinessStatus = familyComponents.length
      ? invalid.length
        ? 'PARTIAL'
        : 'READY'
      : 'NOT_CONFIGURED';
    const priceStatus: ReadinessStatus = familyComponents.length
      ? invalid.length === familyComponents.length
        ? 'BLOCKED'
        : invalid.length
          ? 'PARTIAL'
          : 'READY'
      : 'NOT_CONFIGURED';
    const requiredRoleScopes = familyComponents
      .map(
        (component) =>
          FIRST_WAVE_COMPONENTS[
            component.code as keyof typeof FIRST_WAVE_COMPONENTS
          ]?.professionalServiceRole,
      )
      .filter((role): role is NonNullable<typeof role> => Boolean(role))
      .map((role) => `ROLE:${role}`);
    const missingCost = requiredRoleScopes.filter(
      (scope) => !input.publishedCostScopes.includes(scope),
    );
    const costStatus: ReadinessStatus = requiredRoleScopes.length
      ? missingCost.length === requiredRoleScopes.length
        ? 'NOT_CONFIGURED'
        : missingCost.length
          ? 'PARTIAL'
          : 'READY'
      : 'NOT_APPLICABLE';
    const valueApplicable = family.code === 'COMPLIANCE';
    const valueStatus: ReadinessStatus = valueApplicable
      ? input.publishedValuationCount
        ? 'READY'
        : 'NOT_CONFIGURED'
      : 'NOT_APPLICABLE';
    const blockers = [
      ...(familyComponents.length ? [] : ['CATALOG_COMPONENT_MISSING']),
      ...invalid.map((item) => `PRICE_CONFIGURATION_INVALID:${item.code}`),
      ...(packagingPolicy?.status === 'POLICY_INCOMPLETE'
        ? [`PACKAGING_POLICY_INCOMPLETE:${family.code}`]
        : []),
    ];
    const warnings = [
      ...(input.incompatibleCostAuthorities
        ? [
            'Published cost assumption version is incompatible with its direct-cost methodology.',
          ]
        : []),
      ...missingCost.map((scope) => `COST_ASSUMPTION_MISSING:${scope}`),
      ...(valueApplicable && !input.publishedValuationCount
        ? ['VALUATION_ASSUMPTION_NOT_CONFIGURED']
        : []),
    ];
    return {
      familyCode: family.code,
      availability: family.availability,
      product: dimension('READY'),
      packaging: dimension(packagingStatus),
      catalog: dimension(catalogStatus),
      price: dimension(priceStatus),
      quantity: dimension(familyComponents.length ? 'READY' : 'NOT_CONFIGURED'),
      drivers: dimension(
        family.applicableDriverCodes.length ? 'READY' : 'NOT_APPLICABLE',
      ),
      cost: dimension(costStatus, missingCost),
      value: dimension(valueStatus),
      blockers,
      warnings,
      nextActions: [
        ...(catalogStatus !== 'READY' ? ['CATALOG'] : []),
        ...(costStatus === 'PARTIAL' || costStatus === 'NOT_CONFIGURED'
          ? ['COST_ASSUMPTIONS']
          : []),
        ...(valueStatus === 'NOT_CONFIGURED' ? ['VALUE_ASSUMPTIONS'] : []),
      ],
    };
  });
}
