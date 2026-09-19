import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  CoroActorType,
  PopulationOperationalEventStatus,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export type CreatePopulationOperationalEventInput = {
  organizationId: string;
  programId: string;
  emergencyScenarioId: string;
  incidentEventId?: string;
  startedByType: CoroActorType;
  startedById: string;
  startedAt?: Date;
};

@Injectable()
export class PopulationOperationalEventsService {
  constructor(private readonly prisma: PrismaService) {}

  async createOperationalEvent(input: CreatePopulationOperationalEventInput) {
    const context = await this.prisma.populationProgram.findFirst({
      where: {
        id: input.programId,
        rueFacilityProfile: {
          building: { organizationId: input.organizationId },
        },
      },
      select: {
        id: true,
        rueFacilityProfile: {
          select: { id: true, buildingId: true },
        },
      },
    });

    if (!context) {
      throw new NotFoundException('Programme Population introuvable');
    }

    const scenario = await this.prisma.rueEmergencyScenario.findFirst({
      where: {
        id: input.emergencyScenarioId,
        facilityProfileId: context.rueFacilityProfile.id,
      },
      select: { id: true },
    });

    if (!scenario) {
      throw new BadRequestException(
        'Le scénario ne correspond pas au programme Population',
      );
    }

    if (input.incidentEventId) {
      const incident = await this.prisma.incidentEvent.findFirst({
        where: {
          id: input.incidentEventId,
          organizationId: input.organizationId,
          buildingId: context.rueFacilityProfile.buildingId,
        },
        select: { id: true },
      });

      if (!incident) {
        throw new BadRequestException(
          'L’incident ne correspond pas au programme Population',
        );
      }
    }

    try {
      return await this.prisma.populationOperationalEvent.create({
        data: {
          organizationId: input.organizationId,
          programId: input.programId,
          emergencyScenarioId: input.emergencyScenarioId,
          incidentEventId: input.incidentEventId,
          startedByType: input.startedByType,
          startedById: input.startedById,
          startedAt: input.startedAt,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'Un événement Population est déjà actif pour ce programme',
        );
      }
      throw error;
    }
  }

  async getOperationalEvent(
    organizationId: string,
    programId: string,
    eventId: string,
  ) {
    const event = await this.prisma.populationOperationalEvent.findFirst({
      where: { id: eventId, organizationId, programId },
    });
    if (!event) {
      throw new NotFoundException('Événement Population introuvable');
    }
    return event;
  }

  getActiveOperationalEvent(organizationId: string, programId: string) {
    return this.prisma.populationOperationalEvent.findFirst({
      where: {
        organizationId,
        programId,
        status: PopulationOperationalEventStatus.ACTIVE,
      },
    });
  }

  async assertOperationalEventActive(
    organizationId: string,
    programId: string,
    eventId: string,
  ) {
    const event = await this.getOperationalEvent(
      organizationId,
      programId,
      eventId,
    );
    if (event.status !== PopulationOperationalEventStatus.ACTIVE) {
      throw new BadRequestException('L’événement Population n’est pas actif');
    }
    return event;
  }

  async listOperationalEventAlerts(
    organizationId: string,
    programId: string,
    eventId: string,
  ) {
    await this.getOperationalEvent(organizationId, programId, eventId);
    return this.prisma.populationAlert.findMany({
      where: {
        operationalEventId: eventId,
        programId,
        operationalEvent: { organizationId },
      },
      orderBy: [{ cycleSequence: 'asc' }, { createdAt: 'asc' }],
    });
  }
}
