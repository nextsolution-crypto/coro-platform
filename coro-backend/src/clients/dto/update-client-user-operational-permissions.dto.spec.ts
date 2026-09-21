import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { UpdateClientUserOperationalPermissionsDto } from './update-client-user-operational-permissions.dto';

describe('UpdateClientUserOperationalPermissionsDto', () => {
  const errorsFor = (value: object) => validate(plainToInstance(UpdateClientUserOperationalPermissionsDto, value));

  it('accepts valid domain permissions', async () => {
    await expect(errorsFor({ operationalReviewPermissions: ['REX_CREATE'], correctiveActionPermissions: ['CORRECTIVE_ACTION_VERIFY'] })).resolves.toHaveLength(0);
  });

  it('rejects unknown and cross-domain values', async () => {
    await expect(errorsFor({ operationalReviewPermissions: ['CORRECTIVE_ACTION_CREATE'] })).resolves.not.toHaveLength(0);
    await expect(errorsFor({ correctiveActionPermissions: ['REX_CREATE'] })).resolves.not.toHaveLength(0);
  });

  it('rejects duplicates', async () => {
    await expect(errorsFor({ operationalReviewPermissions: ['REX_CREATE', 'REX_CREATE'] })).resolves.not.toHaveLength(0);
  });
});
