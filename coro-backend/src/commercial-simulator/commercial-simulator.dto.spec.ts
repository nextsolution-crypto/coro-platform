import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import {
  GuidedCatalogLineDto,
  GuidedCustomLineDto,
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
