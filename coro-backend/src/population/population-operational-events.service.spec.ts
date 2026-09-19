import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import {
  CoroActorType,
  PopulationOperationalEventStatus,
  Prisma,
} from '@prisma/client';
import { PopulationOperationalEventsService } from './population-operational-events.service';

describe('PopulationOperationalEventsService', () => {
  const prisma = {
    populationProgram: { findFirst: jest.fn() },
    rueEmergencyScenario: { findFirst: jest.fn() },
    incidentEvent: { findFirst: jest.fn() },
    populationOperationalEvent: {
      create: jest.fn(),
      findFirst: jest.fn(),
    },
    populationAlert: { findMany: jest.fn() },
  };
  let service: PopulationOperationalEventsService;

  const input = {
    organizationId: 'org-1',
    programId: 'program-1',
    emergencyScenarioId: 'scenario-1',
    startedByType: CoroActorType.CLIENT_USER,
    startedById: 'client-user-1',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new PopulationOperationalEventsService(prisma as any);
    prisma.populationProgram.findFirst.mockResolvedValue({
      id: 'program-1',
      rueFacilityProfile: { id: 'profile-1', buildingId: 'building-1' },
    });
    prisma.rueEmergencyScenario.findFirst.mockResolvedValue({
      id: 'scenario-1',
    });
    prisma.populationOperationalEvent.create.mockResolvedValue({
      id: 'event-1',
      ...input,
      incidentEventId: null,
      status: PopulationOperationalEventStatus.ACTIVE,
    });
  });

  it('crée un événement ACTIVE sans IncidentEvent ni donnée citoyenne', async () => {
    await expect(service.createOperationalEvent(input)).resolves.toMatchObject({
      id: 'event-1',
      status: PopulationOperationalEventStatus.ACTIVE,
    });
    expect(prisma.populationOperationalEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        organizationId: 'org-1',
        programId: 'program-1',
        emergencyScenarioId: 'scenario-1',
      }),
    });
    expect(prisma.incidentEvent.findFirst).not.toHaveBeenCalled();
    expect(
      prisma.populationOperationalEvent.create.mock.calls[0][0].data,
    ).not.toEqual(expect.objectContaining({ email: expect.anything() }));
  });

  it('applique le tenant scope dès la recherche du programme', async () => {
    prisma.populationProgram.findFirst.mockResolvedValue(null);
    await expect(service.createOperationalEvent(input)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(prisma.populationProgram.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: 'program-1',
          rueFacilityProfile: {
            building: { organizationId: 'org-1' },
          },
        }),
      }),
    );
  });

  it('refuse un scénario appartenant à un autre profil', async () => {
    prisma.rueEmergencyScenario.findFirst.mockResolvedValue(null);
    await expect(service.createOperationalEvent(input)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(prisma.populationOperationalEvent.create).not.toHaveBeenCalled();
  });

  it('accepte uniquement un incident du même tenant et bâtiment', async () => {
    prisma.incidentEvent.findFirst.mockResolvedValue({ id: 'incident-1' });
    await service.createOperationalEvent({
      ...input,
      incidentEventId: 'incident-1',
    });
    expect(prisma.incidentEvent.findFirst).toHaveBeenCalledWith({
      where: {
        id: 'incident-1',
        organizationId: 'org-1',
        buildingId: 'building-1',
      },
      select: { id: true },
    });
  });

  it('refuse un incident incohérent', async () => {
    prisma.incidentEvent.findFirst.mockResolvedValue(null);
    await expect(
      service.createOperationalEvent({
        ...input,
        incidentEventId: 'incident-other',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('traduit le conflit d’événement ACTIVE en conflit métier', async () => {
    prisma.populationOperationalEvent.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('unique', {
        code: 'P2002',
        clientVersion: '6.19.3',
      }),
    );
    await expect(service.createOperationalEvent(input)).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('récupère uniquement un événement dans son tenant et programme', async () => {
    prisma.populationOperationalEvent.findFirst.mockResolvedValue({
      id: 'event-1',
    });
    await service.getOperationalEvent('org-1', 'program-1', 'event-1');
    expect(prisma.populationOperationalEvent.findFirst).toHaveBeenCalledWith({
      where: { id: 'event-1', organizationId: 'org-1', programId: 'program-1' },
    });
  });

  it('retourne null en absence d’événement actif ou pour un événement ENDED', async () => {
    prisma.populationOperationalEvent.findFirst.mockResolvedValue(null);
    await expect(
      service.getActiveOperationalEvent('org-1', 'program-1'),
    ).resolves.toBeNull();
    expect(prisma.populationOperationalEvent.findFirst).toHaveBeenCalledWith({
      where: {
        organizationId: 'org-1',
        programId: 'program-1',
        status: PopulationOperationalEventStatus.ACTIVE,
      },
    });
  });

  it('liste les communications sans destination ni subscriber joint', async () => {
    prisma.populationOperationalEvent.findFirst.mockResolvedValue({
      id: 'event-1',
      status: PopulationOperationalEventStatus.ACTIVE,
    });
    prisma.populationAlert.findMany.mockResolvedValue([]);
    await expect(
      service.listOperationalEventAlerts('org-1', 'program-1', 'event-1'),
    ).resolves.toEqual([]);
    expect(prisma.populationAlert.findMany).toHaveBeenCalledWith({
      where: {
        operationalEventId: 'event-1',
        programId: 'program-1',
        operationalEvent: { organizationId: 'org-1' },
      },
      orderBy: [{ cycleSequence: 'asc' }, { createdAt: 'asc' }],
    });
  });
});
