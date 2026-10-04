import { FIRST_WAVE_COST_ASSUMPTIONS } from './first-wave-commercial.registry';

export type CostMethodologyVersion = 'v1' | 'v2';
export type CostAssumptionValueShape = {
  assumptionCode: string;
  assumptionVersion: string;
  scopeKey: string;
  valueType: string;
  currency?: string | null;
};

type Definition = Readonly<{
  code: string;
  version: 'v1';
  valueType: 'MONEY' | 'DECIMAL';
  scope: 'COMPONENT_CODE' | 'ROLE' | 'GLOBAL_OR_COMPONENT';
}>;

const V1_DEFINITIONS = Object.freeze([
  Object.freeze({
    code: 'LINE_UNIT_COST_MINOR',
    version: 'v1',
    valueType: 'MONEY',
    scope: 'COMPONENT_CODE',
  }),
] satisfies readonly Definition[]);

const V2_DEFINITIONS = Object.freeze([
  Object.freeze({
    code: 'LOADED_DIRECT_DELIVERY_COST',
    version: FIRST_WAVE_COST_ASSUMPTIONS.LOADED_DIRECT_DELIVERY_COST.version,
    valueType:
      FIRST_WAVE_COST_ASSUMPTIONS.LOADED_DIRECT_DELIVERY_COST.valueType,
    scope: 'ROLE',
  }),
  ...(
    [
      'STANDARD_DELIVERY_EFFORT',
      'STANDARD_SENIOR_REVIEW_EFFORT',
      'STANDARD_SUPPORT_EFFORT',
    ] as const
  ).map((code) =>
    Object.freeze({
      code,
      version: FIRST_WAVE_COST_ASSUMPTIONS[code].version,
      valueType: FIRST_WAVE_COST_ASSUMPTIONS[code].valueType,
      scope: 'GLOBAL_OR_COMPONENT' as const,
    }),
  ),
] satisfies readonly Definition[]);

export const DIRECT_COST_METHODOLOGIES = Object.freeze({
  v1: Object.freeze({
    methodologyCode: 'direct-cost',
    methodologyVersion: 'v1',
    definitions: V1_DEFINITIONS,
  }),
  v2: Object.freeze({
    methodologyCode: 'direct-cost',
    methodologyVersion: 'v2',
    definitions: V2_DEFINITIONS,
  }),
});

export function costMethodologyContract(
  methodologyCode: string,
  methodologyVersion: string,
) {
  if (methodologyCode !== 'direct-cost') return null;
  return (
    DIRECT_COST_METHODOLOGIES[methodologyVersion as CostMethodologyVersion] ??
    null
  );
}

export function assessCostMethodologyCompatibility(input: {
  methodologyCode: string;
  methodologyVersion: string;
  values: readonly CostAssumptionValueShape[];
}) {
  const contract = costMethodologyContract(
    input.methodologyCode,
    input.methodologyVersion,
  );
  if (!contract)
    return { compatible: false, issues: ['COST_METHODOLOGY_UNSUPPORTED'] };
  const contractDefinitions: readonly Definition[] = contract.definitions;
  const definitions = new Map<string, Definition>(
    contractDefinitions.map(
      (definition) => [definition.code, definition] as const,
    ),
  );
  const issues: string[] = [];
  for (const value of input.values) {
    const definition = definitions.get(value.assumptionCode);
    if (
      !definition ||
      definition.version !== value.assumptionVersion ||
      definition.valueType !== value.valueType
    ) {
      issues.push(`COST_DEFINITION_INCOMPATIBLE:${value.assumptionCode}`);
      continue;
    }
    const validScope =
      definition.scope === 'COMPONENT_CODE'
        ? /^[A-Z][A-Z0-9_]*$/.test(value.scopeKey) &&
          value.scopeKey !== 'GLOBAL' &&
          !value.scopeKey.startsWith('ROLE:') &&
          !value.scopeKey.startsWith('COMPONENT:')
        : definition.scope === 'ROLE'
          ? Object.values(
              FIRST_WAVE_COST_ASSUMPTIONS.LOADED_DIRECT_DELIVERY_COST
                .roleScopes,
            ).includes(value.scopeKey as never)
          : value.scopeKey === 'GLOBAL' ||
            /^COMPONENT:[A-Z][A-Z0-9_]*$/.test(value.scopeKey);
    if (!validScope)
      issues.push(`COST_SCOPE_INCOMPATIBLE:${value.assumptionCode}`);
    if (value.valueType === 'MONEY' && value.currency !== 'CAD')
      issues.push(`COST_CURRENCY_INCOMPATIBLE:${value.assumptionCode}`);
  }
  return { compatible: issues.length === 0, issues };
}

export function costMethodologyDefinitions() {
  return Object.values(DIRECT_COST_METHODOLOGIES).map((contract) => ({
    methodologyCode: contract.methodologyCode,
    methodologyVersion: contract.methodologyVersion,
    definitions: contract.definitions,
  }));
}
