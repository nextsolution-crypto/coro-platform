import {
  assessCostMethodologyCompatibility,
  costMethodologyDefinitions,
} from './cost-methodology.registry';

const money = (assumptionCode: string, scopeKey: string) => ({
  assumptionCode,
  assumptionVersion: 'v1',
  scopeKey,
  valueType: 'MONEY',
  currency: 'CAD',
});

describe('direct cost methodology compatibility', () => {
  it('exposes one explicit v1/v2 matrix', () => {
    expect(
      costMethodologyDefinitions().map((item) => item.methodologyVersion),
    ).toEqual(['v1', 'v2']);
  });
  it('accepts v1 component unit cost and rejects v2 definitions', () => {
    expect(
      assessCostMethodologyCompatibility({
        methodologyCode: 'direct-cost',
        methodologyVersion: 'v1',
        values: [
          money('LINE_UNIT_COST_MINOR', 'DOCUMENT_COMPLIANCE_SUBSCRIPTION'),
        ],
      }).compatible,
    ).toBe(true);
    expect(
      assessCostMethodologyCompatibility({
        methodologyCode: 'direct-cost',
        methodologyVersion: 'v1',
        values: [
          money('LOADED_DIRECT_DELIVERY_COST', 'ROLE:DELIVERY_PROFESSIONAL'),
        ],
      }).compatible,
    ).toBe(false);
    expect(
      assessCostMethodologyCompatibility({
        methodologyCode: 'direct-cost',
        methodologyVersion: 'v1',
        values: [
          {
            ...money('STANDARD_DELIVERY_EFFORT', 'GLOBAL'),
            valueType: 'DECIMAL',
            currency: null,
          },
        ],
      }).compatible,
    ).toBe(false);
  });
  it('accepts v2 role/effort definitions and rejects v1 unit cost', () => {
    expect(
      assessCostMethodologyCompatibility({
        methodologyCode: 'direct-cost',
        methodologyVersion: 'v2',
        values: [
          money('LOADED_DIRECT_DELIVERY_COST', 'ROLE:DELIVERY_PROFESSIONAL'),
        ],
      }).compatible,
    ).toBe(true);
    expect(
      assessCostMethodologyCompatibility({
        methodologyCode: 'direct-cost',
        methodologyVersion: 'v2',
        values: [
          {
            ...money(
              'STANDARD_DELIVERY_EFFORT',
              'COMPONENT:DOCUMENT_COMPLIANCE_IMPLEMENTATION',
            ),
            valueType: 'DECIMAL',
            currency: null,
          },
        ],
      }).compatible,
    ).toBe(true);
    expect(
      assessCostMethodologyCompatibility({
        methodologyCode: 'direct-cost',
        methodologyVersion: 'v2',
        values: [
          money('LINE_UNIT_COST_MINOR', 'DOCUMENT_COMPLIANCE_SUBSCRIPTION'),
        ],
      }).compatible,
    ).toBe(false);
  });
});
