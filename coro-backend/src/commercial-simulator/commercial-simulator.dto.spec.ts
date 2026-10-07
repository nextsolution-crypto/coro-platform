import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import {
  GuidedCatalogLineDto,
  GuidedCustomLineDto,
  EvaluateGuidedDraftDto,
} from './commercial-simulator.dto';

describe('guided commercial quantity provenance DTO', () => {
  it.each([GuidedCatalogLineDto, GuidedCustomLineDto])(
    'accepts DECLARED and rejects METERED for %p',
    async (Dto) => {
      const DtoClass = Dto as new () => object;
      const declared = plainToInstance(DtoClass, {
        commercialQuantityBasis: 'DECLARED',
      });
      const metered = plainToInstance(DtoClass, {
        commercialQuantityBasis: 'METERED',
      });

      expect(
        (await validate(declared)).some(
          (error) => error.property === 'commercialQuantityBasis',
        ),
      ).toBe(false);
      expect(
        (await validate(metered)).some(
          (error) => error.property === 'commercialQuantityBasis',
        ),
      ).toBe(true);
    },
  );
});

describe('transient evaluation authority boundary', () => {
  it('strips client-supplied prices, tiers, rates, efforts and methodologies', async () => {
    const pipe = new ValidationPipe({ whitelist: true, transform: true });
    const transformed = (await pipe.transform(
      {
        scenarioId: '00000000-0000-4000-8000-000000000001',
        familyCodes: ['PROFESSIONAL'],
        catalogLines: [
          {
            priceComponentId: '00000000-0000-4000-8000-000000000002',
            quantity: '125',
            catalogAmountMinor: '1',
            tiers: [{ minimum: '1', amountMinor: '1' }],
            costRateMinor: '1',
            standardEffort: '1',
          },
        ],
        customLines: [],
        driverValues: [{ driverCode: 'ACTIVE_SITES', value: '125' }],
        priceBookVersionId: '00000000-0000-4000-8000-000000000003',
        pricingMethodology: 'fake/v1',
        costMethodology: 'fake/v1',
        firstYearTotalMinor: '1',
      },
      { type: 'body', metatype: EvaluateGuidedDraftDto },
    )) as EvaluateGuidedDraftDto & Record<string, unknown>;

    expect(transformed).not.toHaveProperty('priceBookVersionId');
    expect(transformed).not.toHaveProperty('pricingMethodology');
    expect(transformed).not.toHaveProperty('costMethodology');
    expect(transformed).not.toHaveProperty('firstYearTotalMinor');
    expect(transformed.catalogLines[0]).not.toHaveProperty(
      'catalogAmountMinor',
    );
    expect(transformed.catalogLines[0]).not.toHaveProperty('tiers');
    expect(transformed.catalogLines[0]).not.toHaveProperty('costRateMinor');
    expect(transformed.catalogLines[0]).not.toHaveProperty('standardEffort');
  });
});
