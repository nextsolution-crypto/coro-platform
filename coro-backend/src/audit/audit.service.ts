import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export type AuditAction =
  | 'GENERATE'
  | 'EDIT_SECTION'
  | 'EXPORT'
  | 'STATUS_CHANGE'
  | 'VERSION_SAVE'
  | 'VERSION_RESTORE'
  | 'PROCEDURE_TOGGLE'
  | 'PROCEDURE_EDIT'
  | 'TEMPLATE_CREATE'
  | 'LOGIN';

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  async log(data: {
    action: AuditAction;
    entityType: string;
    entityId: string;
    projectId?: string;
    description: string;
    metadata?: any;
    userId: string;
    organizationId: string;
  }) {
    try {
      await this.prisma.auditLog.create({ data });
    } catch (err) {
      // Ne jamais bloquer le flux principal si l'audit échoue
      console.error('Audit log error:', err);
    }
  }

  async findByProject(projectId: string, organizationId: string) {
    return this.prisma.auditLog.findMany({
      where: { projectId, organizationId },
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: {
        user: { select: { firstName: true, lastName: true, email: true } },
      },
    });
  }

  async findByOrganization(organizationId: string) {
    return this.prisma.auditLog.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      take: 200,
      include: {
        user: { select: { firstName: true, lastName: true, email: true } },
      },
    });
  }
}