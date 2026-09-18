import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { PopulationVerificationChannel } from '@prisma/client';
import { RequestPopulationAccessByDestinationDto } from './request-population-access-by-destination.dto';
import { VerifyPopulationAccessRequestDto } from './verify-population-access-request.dto';

describe('Population access recovery DTOs', () => {
  it('rejects unknown request properties', async () => {
    const errors = await validate(
      plainToInstance(RequestPopulationAccessByDestinationDto, {
        channel: PopulationVerificationChannel.SMS,
        destination: '+14505551234',
        subscriberId: 'forbidden',
      }),
      { whitelist: true, forbidNonWhitelisted: true },
    );
    expect(errors.some((error) => error.property === 'subscriberId')).toBe(
      true,
    );
  });

  it('rejects unknown verify properties and malformed codes', async () => {
    const errors = await validate(
      plainToInstance(VerifyPopulationAccessRequestDto, {
        accessRequestToken: 'x'.repeat(20),
        code: '12345',
        destination: 'forbidden',
      }),
      { whitelist: true, forbidNonWhitelisted: true },
    );
    expect(errors.map((error) => error.property)).toEqual(
      expect.arrayContaining(['code', 'destination']),
    );
  });
});
