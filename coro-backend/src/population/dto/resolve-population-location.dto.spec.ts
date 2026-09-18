import { ArgumentMetadata, ValidationPipe } from '@nestjs/common';
import { PopulationPublicController } from '../population-public.controller';
import { ResolvePopulationLocationDto } from './resolve-population-location.dto';

describe('ResolvePopulationLocationDto', () => {
  const pipe = new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  });
  const metadata: ArgumentMetadata = {
    type: 'body',
    metatype: ResolvePopulationLocationDto,
  };
  const valid = {
    accessToken: 'a'.repeat(30),
    addressLine: ' 123 Rue Principale ',
    city: ' Montréal ',
    province: 'qc',
    postalCode: 'H2X 1Y4',
  };

  it('valide, trim et normalise une adresse canadienne', async () => {
    await expect(pipe.transform(valid, metadata)).resolves.toEqual({
      ...valid,
      addressLine: '123 Rue Principale',
      city: 'Montréal',
      province: 'QC',
    });
  });

  it.each([
    [{ addressLine: ' ' }, 'adresse vide'],
    [{ city: ' ' }, 'ville vide'],
    [{ province: 'XX' }, 'province invalide'],
    [{ postalCode: '12345' }, 'code postal invalide'],
  ])('rejette %s', async (override, _label) => {
    await expect(
      pipe.transform({ ...valid, ...override }, metadata),
    ).rejects.toBeDefined();
  });

  it.each(['latitude', 'longitude', 'country', 'provider', 'unexpected'])(
    'rejette explicitement la propriété %s',
    async (property) => {
      await expect(
        pipe.transform({ ...valid, [property]: 'forbidden' }, metadata),
      ).rejects.toMatchObject({ status: 400 });
    },
  );
});

describe('PopulationPublicController location throttle', () => {
  it('limite la résolution à 5/minute et 20/heure', () => {
    const handler =
      PopulationPublicController.prototype.resolveSubscriberLocation;
    expect(Reflect.getMetadata('THROTTLER:LIMITshort', handler)).toBe(5);
    expect(Reflect.getMetadata('THROTTLER:TTLshort', handler)).toBe(60_000);
    expect(Reflect.getMetadata('THROTTLER:LIMITlong', handler)).toBe(20);
    expect(Reflect.getMetadata('THROTTLER:TTLlong', handler)).toBe(3_600_000);
  });
});
