import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ActiveOperationalState } from './operational-observation.types';

@Injectable()
export class OperationalStateService {
  constructor(private readonly prisma: PrismaService) {}

  private canonical(
    count: number,
    provenance: string[],
  ): ActiveOperationalState {
    return { active: count > 0, count, quality: 'CANONICAL', provenance };
  }

  async incident(
    organizationId?: string,
    buildingId?: string,
  ): Promise<ActiveOperationalState> {
    try {
      const count = await this.prisma.incidentEvent.count({
        where: {
          ...(organizationId ? { organizationId } : {}),
          ...(buildingId ? { buildingId } : {}),
          isActive: true,
          status: { in: ['PRE_ALERT', 'ACTIVE', 'CONTAINED'] },
        },
      });
      return this.canonical(count, [
        'IncidentEvent.status',
        'IncidentEvent.isActive',
      ]);
    } catch {
      return {
        active: null,
        count: null,
        quality: 'NOT_AVAILABLE',
        provenance: [],
        warning: 'SOURCE_UNAVAILABLE',
      };
    }
  }

  async evacuation(
    organizationId?: string,
    buildingId?: string,
  ): Promise<ActiveOperationalState> {
    try {
      const count = await this.prisma.evacuationEvent.count({
        where: {
          ...(organizationId ? { organizationId } : {}),
          ...(buildingId ? { buildingId } : {}),
          status: 'ACTIVE',
          resolvedAt: null,
        },
      });
      return this.canonical(count, [
        'EvacuationEvent.status',
        'EvacuationEvent.resolvedAt',
      ]);
    } catch {
      return {
        active: null,
        count: null,
        quality: 'NOT_AVAILABLE',
        provenance: [],
        warning: 'SOURCE_UNAVAILABLE',
      };
    }
  }

  async population(organizationId?: string, buildingId?: string) {
    try {
      const building = buildingId
        ? { rueFacilityProfile: { buildingId } }
        : organizationId
          ? { rueFacilityProfile: { building: { organizationId } } }
          : {};
      const [programs, operations, alerts] = await this.prisma.$transaction([
        this.prisma.populationProgram.count({
          where: { ...building, status: 'ACTIVE' },
        }),
        this.prisma.populationOperationalEvent.count({
          where: {
            ...(organizationId ? { organizationId } : {}),
            status: 'ACTIVE',
            endedAt: null,
            ...(buildingId
              ? { program: { rueFacilityProfile: { buildingId } } }
              : {}),
          },
        }),
        this.prisma.populationAlert.count({
          where: { status: { in: ['SENDING', 'ACTIVE'] }, program: building },
        }),
      ]);
      return {
        program: this.canonical(programs, ['PopulationProgram.status']),
        operation: this.canonical(operations, [
          'PopulationOperationalEvent.status',
          'PopulationOperationalEvent.endedAt',
        ]),
        alert: this.canonical(alerts, ['PopulationAlert.status']),
      };
    } catch {
      const unavailable: ActiveOperationalState = {
        active: null,
        count: null,
        quality: 'NOT_AVAILABLE',
        provenance: [],
        warning: 'SOURCE_UNAVAILABLE',
      };
      return {
        program: unavailable,
        operation: unavailable,
        alert: unavailable,
      };
    }
  }

  async sentinelle(
    organizationId?: string,
    buildingId?: string,
  ): Promise<ActiveOperationalState> {
    const [incident, evacuation] = await Promise.all([
      this.incident(organizationId, buildingId),
      this.evacuation(organizationId, buildingId),
    ]);
    if (
      incident.quality === 'NOT_AVAILABLE' ||
      evacuation.quality === 'NOT_AVAILABLE'
    )
      return {
        active: null,
        count: null,
        quality: 'NOT_AVAILABLE',
        provenance: [...incident.provenance, ...evacuation.provenance],
        warning: 'SOURCE_UNAVAILABLE',
      };
    return {
      active: Boolean(incident.active || evacuation.active),
      count: (incident.count ?? 0) + (evacuation.count ?? 0),
      quality: 'DERIVED',
      provenance: [...incident.provenance, ...evacuation.provenance],
    };
  }
}
