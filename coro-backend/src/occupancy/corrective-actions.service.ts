import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CorrectiveActionsService {
  constructor(private prisma: PrismaService) {}

  async getAll(organizationId: string, buildingId?: string) {
    return this.prisma.correctiveAction.findMany({
      where: {
        organizationId,
        ...(buildingId ? { buildingId } : {}),
        status: { not: 'CANCELLED' },
      },
      orderBy: [
        { status: 'asc' },
        { dueDate: 'asc' },
        { createdAt: 'desc' },
      ],
    });
  }

  async create(body: any, organizationId: string) {
    return this.prisma.correctiveAction.create({
      data: {
        organizationId,
        buildingId:   body.buildingId   || null,
        incidentId:   body.incidentId   || null,
        category:     body.category     || 'GENERAL',
        title:        body.title,
        description:  body.description  || null,
        status:       body.status       || 'PLANNED',
        priority:     body.priority     || 'WARNING',
        assignedTo:   body.assignedTo   || null,
        dueDate:      body.dueDate ? new Date(body.dueDate) : null,
      },
    });
  }

  async update(id: string, body: any, organizationId: string) {
    const action = await this.prisma.correctiveAction.findFirst({ where: { id, organizationId } });
    if (!action) throw new NotFoundException('Action introuvable');

    return this.prisma.correctiveAction.update({
      where: { id },
      data: {
        title:        body.title        ?? action.title,
        description:  body.description  ?? action.description,
        status:       body.status       ?? action.status,
        priority:     body.priority     ?? action.priority,
        assignedTo:   body.assignedTo   ?? action.assignedTo,
        dueDate:      body.dueDate ? new Date(body.dueDate) : action.dueDate,
        completedAt:  body.status === 'COMPLETED' && !action.completedAt ? new Date() : action.completedAt,
      },
    });
  }

  async delete(id: string, organizationId: string) {
    const action = await this.prisma.correctiveAction.findFirst({ where: { id, organizationId } });
    if (!action) throw new NotFoundException('Action introuvable');
    return this.prisma.correctiveAction.update({ where: { id }, data: { status: 'CANCELLED' } });
  }
}