import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ConfirmPopulationLocationDto } from './confirm-population-location.dto';

describe('ConfirmPopulationLocationDto', () => {
  const valid = {
    accessToken: 'a'.repeat(20),
    resolutionToken: 'r'.repeat(20),
  };

  it('accepts exactly both tokens', async () => {
    await expect(
      validate(plainToInstance(ConfirmPopulationLocationDto, valid), {
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    ).resolves.toHaveLength(0);
  });

  it.each([
    'latitude',
    'longitude',
    'address',
    'addressLine',
    'city',
    'province',
    'postalCode',
    'country',
    'provider',
    'unknown',
  ])('rejects the extra property %s', async (property) => {
    const errors = await validate(
      plainToInstance(ConfirmPopulationLocationDto, {
        ...valid,
        [property]: 'injected',
      }),
      { whitelist: true, forbidNonWhitelisted: true },
    );
    expect(errors.some((error) => error.property === property)).toBe(true);
  });
});
