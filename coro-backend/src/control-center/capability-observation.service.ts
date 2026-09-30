import { Injectable } from '@nestjs/common';
import { CapabilityCode } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { DataQuality } from './commercial-reconciliation.types';

type Metric = {
  code: string;
  value: number | null;
  quality: DataQuality;
  provenance: string;
  billable: false;
};

@Injectable()
export class CapabilityObservationService {
  constructor(private readonly prisma: PrismaService) {}

  async observeOrganization(organizationId: string) {
    const [
      projects,
      activities,
      bookings,
      exercises,
      timelogs,
      incidents,
      occupancy,
      populationPrograms,
      subscribers,
      email,
      sms,
    ] = await this.prisma.$transaction([
      this.prisma.project.count({ where: { organizationId } }),
      this.prisma.projectActivity.count({ where: { organizationId } }),
      this.prisma.booking.count({ where: { organizationId } }),
      this.prisma.exerciseReport.count({ where: { organizationId } }),
      this.prisma.timelogEntry.count({ where: { organizationId } }),
      this.prisma.incidentEvent.count({ where: { organizationId } }),
      this.prisma.occupancyRecord.count({ where: { organizationId } }),
      this.prisma.populationProgram.count({
        where: { rueFacilityProfile: { building: { organizationId } } },
      }),
      this.prisma.populationSubscriber.count({
        where: {
          program: { rueFacilityProfile: { building: { organizationId } } },
        },
      }),
      this.prisma.populationAlertDelivery.count({
        where: {
          channel: 'EMAIL',
          alert: {
            program: { rueFacilityProfile: { building: { organizationId } } },
          },
        },
      }),
      this.prisma.populationAlertDelivery.count({
        where: {
          channel: 'SMS',
          alert: {
            program: { rueFacilityProfile: { building: { organizationId } } },
          },
        },
      }),
    ]);
    const metric = (
      code: string,
      value: number | null,
      quality: DataQuality,
      provenance: string,
    ): Metric => ({ code, value, quality, provenance, billable: false });
    const unavailable = (code: CapabilityCode) => ({
      capabilityCode: code,
      configured: {
        value: null,
        quality: 'NOT_AVAILABLE' as const,
        provenance: [],
      },
      observed: {
        value: null,
        quality: 'NOT_AVAILABLE' as const,
        provenance: [],
      },
      metrics: [] as Metric[],
    });
    return {
      COMPLIANCE_OPERATIONS: {
        capabilityCode: 'COMPLIANCE_OPERATIONS',
        configured: {
          value: null,
          quality: 'INFERABLE',
          provenance: ['Project/Activity/Booking/ExerciseReport'],
        },
        observed: {
          value: projects + activities + bookings + exercises > 0,
          quality: 'CANONICAL',
          provenance: ['operational counts'],
        },
        metrics: [
          metric('PROJECTS', projects, 'CANONICAL', 'Project'),
          metric('ACTIVITIES', activities, 'CANONICAL', 'ProjectActivity'),
          metric('BOOKINGS', bookings, 'CANONICAL', 'Booking'),
          metric('EXERCISES', exercises, 'CANONICAL', 'ExerciseReport'),
        ],
      },
      PERFORMANCE: {
        ...unavailable('PERFORMANCE'),
        observed: {
          value: timelogs > 0,
          quality: 'CANONICAL',
          provenance: ['TimelogEntry'],
        },
        metrics: [
          metric('TIMELOG_ENTRIES', timelogs, 'CANONICAL', 'TimelogEntry'),
        ],
      },
      INCIDENT: {
        capabilityCode: 'INCIDENT',
        configured: {
          value: null,
          quality: 'INFERABLE',
          provenance: ['IncidentEvent existence'],
        },
        observed: {
          value: incidents > 0,
          quality: 'CANONICAL',
          provenance: ['IncidentEvent'],
        },
        metrics: [
          metric('INCIDENT_EVENTS', incidents, 'CANONICAL', 'IncidentEvent'),
        ],
      },
      KNOWLEDGE: unavailable('KNOWLEDGE'),
      AI: unavailable('AI'),
      NETWORK: unavailable('NETWORK'),
      SENTINELLE: {
        capabilityCode: 'SENTINELLE',
        configured: {
          value: null,
          quality: 'INFERABLE',
          provenance: ['Occupancy signals'],
        },
        observed: {
          value: occupancy > 0,
          quality: 'CANONICAL',
          provenance: ['OccupancyRecord'],
        },
        metrics: [
          metric(
            'OCCUPANCY_RECORDS',
            occupancy,
            'CANONICAL',
            'OccupancyRecord',
          ),
        ],
      },
      SENTINELLE_POPULATION: {
        capabilityCode: 'SENTINELLE_POPULATION',
        configured: {
          value: populationPrograms > 0,
          quality: 'CANONICAL',
          provenance: ['PopulationProgram'],
        },
        observed: {
          value: populationPrograms + subscribers + email + sms > 0,
          quality: 'CANONICAL',
          provenance: ['PopulationProgram/Subscriber/Delivery'],
        },
        metrics: [
          metric(
            'PROGRAMS',
            populationPrograms,
            'CANONICAL',
            'PopulationProgram',
          ),
          metric(
            'SUBSCRIBERS',
            subscribers,
            'CANONICAL',
            'PopulationSubscriber',
          ),
          metric(
            'EMAIL_DELIVERIES',
            email,
            'CANONICAL',
            'PopulationAlertDelivery',
          ),
          metric('SMS_DELIVERIES', sms, 'CANONICAL', 'PopulationAlertDelivery'),
        ],
      },
      CAMPUS: unavailable('CAMPUS'),
    } as const;
  }
}
