import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { SaveMandateServicesDto } from './mandate-services.dto';

async function activityTypeErrors(activityTypeId: unknown) {
  const dto = plainToInstance(SaveMandateServicesDto, {
    expectedRevision: 'a'.repeat(64),
    services: [{ activityTypeId, recurrenceMode: 'ONCE', quantity: 1, displayOrder: 0 }],
  });
  const errors = await validate(dto);
  const line = errors.find((error) => error.property === 'services')?.children?.[0];
  return line?.children?.filter((child) => child.property === 'activityTypeId') ?? [];
}

describe('SaveMandateServicesDto', () => {
  it('accepte les identifiants des types système du catalogue', async () => {
    expect(await activityTypeErrors('coro-activity-type-formation-epi')).toHaveLength(0);
  });

  it('accepte les identifiants UUID des types propres à une organisation', async () => {
    expect(await activityTypeErrors('7f9c2b1e-4d3a-4c5b-9e8f-1a2b3c4d5e6f')).toHaveLength(0);
  });

  it('refuse un identifiant vide ou trop long', async () => {
    expect(await activityTypeErrors('')).toHaveLength(1);
    expect(await activityTypeErrors('x'.repeat(101))).toHaveLength(1);
  });
});
