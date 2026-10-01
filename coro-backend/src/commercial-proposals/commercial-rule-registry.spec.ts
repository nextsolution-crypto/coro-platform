import { Prisma } from '@prisma/client';
import {
  CommercialRuleDefinition,
  CommercialRuleRegistry,
  PRODUCTION_COMMERCIAL_RULE_DEFINITIONS,
  PRODUCTION_COMMERCIAL_RULE_REGISTRY,
  validateCommercialQuantityBinding,
} from './commercial-rule-registry';

const rule = (
  code: string,
  version: string,
  lifecycle: 'CURRENT' | 'HISTORICAL' = 'CURRENT',
): CommercialRuleDefinition => ({
  code,
  version,
  lifecycle,
  capabilityCode: 'SENTINELLE',
  scope: 'SITE',
  metricCode: 'UNIQUE_OBSERVED_SENTINELLE_SITES',
  metricVersion: '1',
  policyVersion: '1',
  acceptedSourceQualities: ['DERIVED'],
  measuredUnit: 'SITE',
  evaluatedUnit: 'SITE',
  evaluator: (input) => input,
});

describe('Phase 3D Commercial Rule registry foundation', () => {
  it('keeps the production registry empty and isolated from test registries', () => {
    const synthetic = new CommercialRuleRegistry([
      rule('TEST_SENTINELLE_SITE_IDENTITY', 'test/v1'),
    ]);
    expect(synthetic.current()).toHaveLength(1);
    expect(PRODUCTION_COMMERCIAL_RULE_DEFINITIONS).toHaveLength(0);
    expect(PRODUCTION_COMMERCIAL_RULE_REGISTRY.current()).toHaveLength(0);
  });

  it('rejects duplicate identities and multiple CURRENT versions', () => {
    expect(
      () =>
        new CommercialRuleRegistry([
          rule('TEST_RULE', 'v1'),
          rule('TEST_RULE', 'v1', 'HISTORICAL'),
        ]),
    ).toThrow('Duplicate Commercial Rule identity');
    expect(
      () =>
        new CommercialRuleRegistry([
          rule('TEST_RULE', 'v1'),
          rule('TEST_RULE', 'v2'),
        ]),
    ).toThrow('Multiple CURRENT Commercial Rule versions');
  });

  it('does exact lookup and lists CURRENT definitions deterministically', () => {
    const historical = rule('TEST_B', 'v1', 'HISTORICAL');
    const first = rule('TEST_A', 'v2');
    const second = rule('TEST_B', 'v2');
    const registry = new CommercialRuleRegistry([second, historical, first]);
    expect(registry.exact('TEST_B', 'v1')).toEqual(historical);
    expect(registry.exact('TEST_B', 'missing')).toBeUndefined();
    expect(
      registry.current().map(({ code, version }) => [code, version]),
    ).toEqual([
      ['TEST_A', 'v2'],
      ['TEST_B', 'v2'],
    ]);
  });

  it('keeps a synthetic identity evaluator Decimal-safe', () => {
    const definition = rule('TEST_SENTINELLE_SITE_IDENTITY', 'test/v1');
    const quantity = new Prisma.Decimal('12345678901234567890.123456');
    const result = definition.evaluator({ quantity, unit: 'SITE' });
    expect(result.quantity.toString()).toBe('12345678901234567890.123456');
    expect(result.unit).toBe('SITE');
  });

  it('validates DECLARED and exact CURRENT METERED authoring', () => {
    const registry = new CommercialRuleRegistry([
      rule('TEST_SENTINELLE_SITE_IDENTITY', 'test/v1'),
    ]);
    expect(() =>
      validateCommercialQuantityBinding(
        {
          source: 'CUSTOM_COMPONENT',
          capabilityId: 'capability-id',
          capabilityCode: 'SENTINELLE',
          commercialQuantityBasis: 'DECLARED',
        },
        registry,
        { requireExplicit: true, requireCurrentRule: true },
      ),
    ).not.toThrow();
    expect(() =>
      validateCommercialQuantityBinding(
        {
          source: 'CUSTOM_COMPONENT',
          capabilityId: 'capability-id',
          capabilityCode: 'SENTINELLE',
          commercialQuantityBasis: 'METERED',
          commercialRuleCode: 'TEST_SENTINELLE_SITE_IDENTITY',
          commercialRuleVersion: 'test/v1',
        },
        registry,
        { requireExplicit: true, requireCurrentRule: true },
      ),
    ).not.toThrow();
  });

  it('allows legacy null in a draft but requires an explicit basis at finalization', () => {
    const binding = {
      source: 'CUSTOM_COMPONENT' as const,
      capabilityId: 'capability-id',
      capabilityCode: 'SENTINELLE' as const,
    };
    expect(() =>
      validateCommercialQuantityBinding(
        binding,
        PRODUCTION_COMMERCIAL_RULE_REGISTRY,
        { requireExplicit: false, requireCurrentRule: false },
      ),
    ).not.toThrow();
    expect(() =>
      validateCommercialQuantityBinding(
        binding,
        PRODUCTION_COMMERCIAL_RULE_REGISTRY,
        { requireExplicit: true, requireCurrentRule: true },
      ),
    ).toThrow('explicite est requise');
    expect(() =>
      validateCommercialQuantityBinding(
        {
          ...binding,
          commercialQuantityBasis: 'DECLARED',
          commercialRuleCode: 'TEST_RULE',
        },
        PRODUCTION_COMMERCIAL_RULE_REGISTRY,
        { requireExplicit: true, requireCurrentRule: true },
      ),
    ).toThrow('DECLARED');
  });

  it('rejects missing, historical and capability-incompatible rules', () => {
    const registry = new CommercialRuleRegistry([
      rule('TEST_RULE', 'old', 'HISTORICAL'),
    ]);
    const base = {
      source: 'CUSTOM_COMPONENT' as const,
      capabilityId: 'capability-id',
      capabilityCode: 'SENTINELLE' as const,
      commercialQuantityBasis: 'METERED' as const,
      commercialRuleCode: 'TEST_RULE',
    };
    expect(() =>
      validateCommercialQuantityBinding(
        { ...base, commercialRuleVersion: 'missing' },
        registry,
        { requireExplicit: true, requireCurrentRule: true },
      ),
    ).toThrow('Règle commerciale inconnue');
    expect(() =>
      validateCommercialQuantityBinding(
        { ...base, commercialRuleVersion: 'old' },
        registry,
        { requireExplicit: true, requireCurrentRule: true },
      ),
    ).toThrow('n’est pas CURRENT');
    expect(() =>
      validateCommercialQuantityBinding(
        {
          ...base,
          capabilityCode: 'INCIDENT',
          commercialRuleVersion: 'old',
        },
        registry,
        { requireExplicit: false, requireCurrentRule: false },
      ),
    ).toThrow('ne correspond pas à la capability');
  });
});
