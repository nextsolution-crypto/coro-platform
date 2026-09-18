import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import {
  CreateCorrectiveActionDto,
  UpdateCorrectiveActionDto,
} from './corrective-action.dto';

describe('CorrectiveAction DTOs', () => {
  it('accepts a valid create payload', async () => {
    const dto = plainToInstance(CreateCorrectiveActionDto, {
      buildingId: '11111111-1111-4111-8111-111111111111',
      category: 'EXERCISES',
      title: 'Mettre a jour le plan',
      priority: 'WARNING',
    });
    await expect(validate(dto)).resolves.toHaveLength(0);
  });

  it('rejects invalid enums and identifiers', async () => {
    const dto = plainToInstance(CreateCorrectiveActionDto, {
      buildingId: 'not-an-id',
      category: 'UNSUPPORTED',
      title: 'Action',
      priority: 'UNKNOWN',
    });
    expect(await validate(dto)).toHaveLength(3);
  });

  it('rejects oversized text', async () => {
    const dto = plainToInstance(CreateCorrectiveActionDto, {
      title: 'x'.repeat(501),
    });
    expect(await validate(dto)).not.toHaveLength(0);
  });

  it('allows clearing a due date explicitly', async () => {
    const dto = plainToInstance(UpdateCorrectiveActionDto, { dueDate: null });
    await expect(validate(dto)).resolves.toHaveLength(0);
  });
});
