import { BadRequestException } from '@nestjs/common';
import { CommercialCatalogService } from './commercial-catalog.service';

describe('CommercialCatalogService invariants', () => {
  const service = new CommercialCatalogService(
    {} as never,
    { normalizeReason: (value: string) => value } as never,
  );
  const validateTiers = (
    tiers: Parameters<typeof service.validateTiers>[0],
    contiguous: boolean,
  ) => service.validateTiers(tiers, contiguous);
  const validateComponent = (
    component: Parameters<typeof service.validateComponent>[0],
  ) => service.validateComponent({ revenueCategory: 'SAAS', ...component });

  it('accepte VOLUME et GRADUATED continus avec maximum exclusif', () => {
    for (const tierMode of ['VOLUME', 'GRADUATED']) {
      expect(() =>
        validateComponent({
          code: tierMode,
          chargeType: 'RECURRING',
          billingPeriod: 'MONTH',
          pricingModel: 'TIERED',
          metric: 'SEAT',
          tierMode,
          amountMinor: null,
          tiers: [
            { minimumQuantity: '0', maximumQuantity: '5' },
            { minimumQuantity: '5', maximumQuantity: null },
          ],
        }),
      ).not.toThrow();
    }
  });

  it('autorise les trous en DRAFT mais les refuse à la publication', () => {
    const tiers = [
      { minimumQuantity: '0', maximumQuantity: '5' },
      { minimumQuantity: '6', maximumQuantity: null },
    ];
    expect(() => validateTiers(tiers, false)).not.toThrow();
    expect(() => validateTiers(tiers, true)).toThrow(BadRequestException);
  });

  it('refuse chevauchement et maximum ouvert avant le dernier tier', () => {
    expect(() =>
      validateTiers(
        [
          { minimumQuantity: '0', maximumQuantity: '10' },
          { minimumQuantity: '9', maximumQuantity: null },
        ],
        false,
      ),
    ).toThrow('chevauchent');
    expect(() =>
      validateTiers(
        [
          { minimumQuantity: '0', maximumQuantity: null },
          { minimumQuantity: '10', maximumQuantity: null },
        ],
        false,
      ),
    ).toThrow('dernier tier');
  });

  it('sépare billing period et metric', () => {
    expect(() =>
      validateComponent({
        code: 'SETUP',
        chargeType: 'ONE_TIME',
        billingPeriod: 'MONTH',
        pricingModel: 'FLAT',
        amountMinor: 0n,
        tiers: [],
      }),
    ).toThrow('ONE_TIME');
    expect(() =>
      validateComponent({
        code: 'SEAT',
        chargeType: 'RECURRING',
        billingPeriod: null,
        pricingModel: 'PER_SEAT',
        amountMinor: 0n,
        tiers: [],
      }),
    ).toThrow('période');
  });

  it('refuse les combinaisons pricingModel/metric incohérentes', () => {
    expect(() =>
      validateComponent({
        code: 'SEAT',
        chargeType: 'RECURRING',
        billingPeriod: 'MONTH',
        pricingModel: 'PER_SEAT',
        metric: 'SITE',
        amountMinor: 0n,
        tiers: [],
      }),
    ).toThrow('metric SEAT');
    expect(() =>
      validateComponent({
        code: 'TIERED',
        chargeType: 'RECURRING',
        billingPeriod: 'MONTH',
        pricingModel: 'TIERED',
        metric: 'FIXED',
        tierMode: 'GRADUATED',
        amountMinor: null,
        tiers: [{ minimumQuantity: '0', maximumQuantity: null }],
      }),
    ).toThrow('metric quantitative');
  });
  it('reserves PER_UNIT for the HOUR metric', () => {
    expect(() =>
      validateComponent({
        code: 'DELIVERY_HOUR',
        chargeType: 'ONE_TIME',
        billingPeriod: null,
        pricingModel: 'PER_UNIT',
        metric: 'HOUR',
        amountMinor: 0n,
        tiers: [],
      }),
    ).not.toThrow();
    expect(() =>
      validateComponent({
        code: 'INVALID_UNIT',
        chargeType: 'ONE_TIME',
        billingPeriod: null,
        pricingModel: 'PER_UNIT',
        metric: 'SITE',
        amountMinor: 0n,
        tiers: [],
      }),
    ).toThrow('metric HOUR');
  });
});
