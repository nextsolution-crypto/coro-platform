import { ArgumentMetadata, ValidationPipe } from '@nestjs/common';
import {
  MessageDisplayObservationDto,
  TransitionDisplayObservationDto,
} from './display-observation-workflow.dto';

const pipe = new ValidationPipe({
  transform: true,
  whitelist: true,
  forbidNonWhitelisted: true,
});
const metadata = (metatype: new () => object): ArgumentMetadata => ({
  type: 'body',
  metatype,
  data: '',
});

describe('DISPLAY-05C strict DTO boundary', () => {
  it('refuse les champs réservés au serveur', async () => {
    await expect(
      pipe.transform(
        {
          expectedLockVersion: 1,
          requestId: 'request-mass-assignment',
          reason: 'Tentative de modification directe',
          toStatus: 'ACCEPTED',
          professionalPriority: 'CRITICAL',
          decidedByUserId: '00000000-0000-4000-8000-000000000000',
          lockVersion: 99,
        },
        metadata(TransitionDisplayObservationDto),
      ),
    ).rejects.toThrow();
  });

  it('refuse HTML et scripts au niveau du service après validation structurelle', async () => {
    const dto = (await pipe.transform(
      {
        expectedLockVersion: 1,
        requestId: 'request-xss',
        reason: 'Contrôle de contenu',
        visibility: 'INTERNAL',
        message: '<script>alert(1)</script>',
      },
      metadata(MessageDisplayObservationDto),
    )) as MessageDisplayObservationDto;
    expect(dto.message).toContain('<script>');
  });
});
