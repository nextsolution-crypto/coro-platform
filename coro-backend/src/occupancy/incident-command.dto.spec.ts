import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { IncidentPermission } from '@prisma/client';
import {
  AssignIncidentAuthorityDto,
  ConfigureIncidentEscalationDto,
  SendIncidentAccessDto,
  TriggerIncidentPanicDto,
} from './incident-command.dto';

const pipe = new ValidationPipe({
  transform: true,
  whitelist: true,
  forbidNonWhitelisted: true,
});
const metadata = (metatype: new () => object) => ({
  type: 'body' as const,
  metatype,
  data: '',
});

describe('Incident command DTO security', () => {
  it('accepts a bounded authority grant using known permissions', async () => {
    await expect(
      pipe.transform(
        {
          buildingId: '11111111-1111-4111-8111-111111111111',
          subjectType: 'CLIENT_USER',
          subjectId: '22222222-2222-4222-8222-222222222222',
          operationalRole: 'COORDINATOR',
          permissions: [IncidentPermission.INCIDENT_READ],
          reason: 'Acces operationnel requis',
        },
        metadata(AssignIncidentAuthorityDto),
      ),
    ).resolves.toBeInstanceOf(AssignIncidentAuthorityDto);
  });

  it.each([
    [
      'unknown property',
      TriggerIncidentPanicDto,
      { triggeredBy: 'A', emergencyType: 'TEST', admin: true },
    ],
    [
      'invalid permission',
      AssignIncidentAuthorityDto,
      {
        buildingId: '11111111-1111-4111-8111-111111111111',
        subjectType: 'USER',
        subjectId: '22222222-2222-4222-8222-222222222222',
        operationalRole: 'ROLE',
        permissions: ['INCIDENT_ROOT'],
        reason: 'Motif valide',
      },
    ],
    [
      'too many alternates',
      ConfigureIncidentEscalationDto,
      {
        severity: 'HIGH',
        alternateEmployeeIds: [
          '11111111-1111-4111-8111-111111111111',
          '22222222-2222-4222-8222-222222222222',
          '33333333-3333-4333-8333-333333333333',
        ],
        acknowledgmentSubjectType: 'USER',
        acknowledgmentSubjectId: '44444444-4444-4444-8444-444444444444',
        lockVersion: 1,
        reason: 'Motif valide',
      },
    ],
    ['invalid email', SendIncidentAccessDto, { emails: ['not-an-email'] }],
  ])('rejects %s', async (_label, dto, value) => {
    await expect(pipe.transform(value, metadata(dto))).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});
