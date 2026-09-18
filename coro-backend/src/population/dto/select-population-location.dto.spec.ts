import { ArgumentMetadata, ValidationPipe } from '@nestjs/common';
import { PopulationPublicController } from '../population-public.controller';
import { SelectPopulationLocationDto } from './select-population-location.dto';

describe('SelectPopulationLocationDto', () => {
  const pipe = new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  });
  const metadata: ArgumentMetadata = {
    type: 'body',
    metatype: SelectPopulationLocationDto,
  };
  const valid = {
    accessToken: 'a'.repeat(20),
    selectionToken: 's'.repeat(20),
  };

  it('accepts exactly the access and selection tokens', async () => {
    await expect(pipe.transform(valid, metadata)).resolves.toEqual(valid);
  });

  it.each([
    'latitude',
    'longitude',
    'address',
    'addressLine',
    'city',
    'province',
    'postalCode',
    'provider',
    'unknown',
  ])('rejects the extra property %s', async (property) => {
    await expect(
      pipe.transform({ ...valid, [property]: 'forbidden' }, metadata),
    ).rejects.toMatchObject({ status: 400 });
  });
});

describe('PopulationPublicController location selection throttle', () => {
  it('limits selection to 5/minute and 20/hour', () => {
    const handler = PopulationPublicController.prototype.selectSubscriberLocation;
    expect(Reflect.getMetadata('THROTTLER:LIMITshort', handler)).toBe(5);
    expect(Reflect.getMetadata('THROTTLER:TTLshort', handler)).toBe(60_000);
    expect(Reflect.getMetadata('THROTTLER:LIMITlong', handler)).toBe(20);
    expect(Reflect.getMetadata('THROTTLER:TTLlong', handler)).toBe(3_600_000);
  });
});
