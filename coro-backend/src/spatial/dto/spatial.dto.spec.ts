import { BadRequestException, ValidationPipe } from '@nestjs/common';
import {
  CreateDisplayLocationDto,
  CreateFloorDto,
  UpdateFloorDto,
} from './spatial.dto';

const pipe = new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
});

describe('Spatial DTOs', () => {
  it('rejects unexpected fields', async () => {
    await expect(
      pipe.transform(
        { code: 'RDC', name: 'Rez-de-chaussée', organizationId: 'forged' },
        { type: 'body', metatype: CreateFloorDto },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('validates atypical numeric levels and optimistic locking', async () => {
    await expect(
      pipe.transform(
        { code: 'SS2', name: 'Sous-sol 2', levelNumber: -2 },
        { type: 'body', metatype: CreateFloorDto },
      ),
    ).resolves.toMatchObject({ levelNumber: -2 });
    await expect(
      pipe.transform(
        { name: 'Niveau technique' },
        { type: 'body', metatype: UpdateFloorDto },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects incomplete or out-of-range display coordinates', async () => {
    await expect(
      pipe.transform(
        {
          floorId: 'floor-a',
          code: 'HALL',
          label: 'Hall',
          positionX: 2,
          positionY: 0.5,
        },
        { type: 'body', metatype: CreateDisplayLocationDto },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
