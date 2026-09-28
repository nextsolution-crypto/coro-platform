import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { projectAccessWhere } from '../auth/project-access';
import type { WorkManagementActor } from '../auth/work-management-access';
import { OPEN_BOOKING_STATUSES } from '../bookings/booking-status';
import { MandateServicesService } from './mandate-services.service';
import { previewOperations } from './mandate-operations-preview.engine';

@Injectable()
export class MandateOperationsPreviewService {
  constructor(private readonly prisma: PrismaService, private readonly mandateServices: MandateServicesService) {}

  async preview(projectId: string, actor: WorkManagementActor, expectedRevision: string) {
    return this.prisma.$transaction(tx => this.previewInTransaction(tx, projectId, actor, expectedRevision),
      { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
  }

  async previewInTransaction(tx: Prisma.TransactionClient, projectId: string, actor: WorkManagementActor,
    expectedRevision: string) {
      const project = await tx.project.findFirst({ where: { id: projectId, ...projectAccessWhere(actor) }, select: {
        id: true, organizationId: true, mandate: { select: { services: {
          orderBy: [{ displayOrder: 'asc' }, { id: 'asc' }], include: { activityType: {
            select: { id: true, isActive: true, organizationId: true },
          } },
        } } },
      } });
      if (!project) throw new NotFoundException('Projet introuvable');
      const services = project.mandate?.services ?? [];
      const revision = this.mandateServices.computeRevision(services);
      if (revision !== expectedRevision) throw new ConflictException('La configuration commerciale a été modifiée; rechargez le Mandat');
      if (!services.length) return { commercialRevision: revision, generatedAt: new Date().toISOString(),
        summary: { noAction: 0, createActivity: 0, requiresDecision: 0, blocked: 0 }, operations: [] };
      const serviceIds = services.map(service => service.id);
      const typeIds = [...new Set(services.map(service => service.activityTypeId))];
      const activities = await tx.projectActivity.findMany({ where: { projectId, organizationId: project.organizationId,
        OR: [{ mandateServiceId: { in: serviceIds } }, { mandateServiceId: null, sourceMandate: true,
          activityTypeId: { in: typeIds } }] },
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }], select: {
          id: true, projectId: true, organizationId: true, activityTypeId: true, mandateServiceId: true,
          label: true, customLabel: true, status: true, scheduledDate: true, createdAt: true,
          bookings: { where: { status: { in: OPEN_BOOKING_STATUSES } }, orderBy: { updatedAt: 'desc' }, select: {
            status: true, assignments: { where: { role: 'LEAD', status: { in: ['PENDING', 'ACCEPTED'] } },
              orderBy: { assignedAt: 'desc' }, take: 1, select: { status: true } },
          } }, tasks: { select: { timeEntries: { select: { heures: true } } } },
          exerciseReport: { select: { id: true } },
        } });
      const operations = previewOperations(services, activities.map(activity => ({ ...activity,
        label: activity.customLabel || activity.label, taskCount: activity.tasks.length,
        actualHours: activity.tasks.reduce((sum, task) => sum + task.timeEntries.reduce((s, entry) => s + entry.heures, 0), 0),
        exerciseReportCount: activity.exerciseReport ? 1 : 0,
      })));
      return { commercialRevision: revision, generatedAt: new Date().toISOString(), summary: {
        noAction: operations.filter(item => item.action === 'NO_ACTION').length,
        createActivity: operations.filter(item => item.action === 'CREATE_ACTIVITY').length,
        requiresDecision: operations.filter(item => item.action === 'REQUIRES_DECISION').length,
        blocked: operations.filter(item => item.action === 'BLOCKED').length,
      }, operations };
  }
}
