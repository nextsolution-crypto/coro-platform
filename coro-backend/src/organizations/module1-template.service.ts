import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AdminAuditService } from '../admin-audit/admin-audit.service';

@Injectable()
export class Module1TemplateService {
  constructor(private prisma: PrismaService, private audit: AdminAuditService) {}

  async getTemplate(organizationId: string) {
    const template = await this.prisma.organizationModule1Template.findUnique({
      where: { organizationId },
    });
    return template || { sections: [] };
  }

  async saveTemplate(organizationId: string, sections: any[], actor: any) {
    if (!Array.isArray(sections)) throw new Error('Sections invalides.');
    return this.prisma.$transaction(async (tx) => {
      const before = await tx.organizationModule1Template.findUnique({ where: { organizationId }, select: { sections: true } });
      const updated = await tx.organizationModule1Template.upsert({
        where: { organizationId }, update: { sections }, create: { organizationId, sections },
      });
      await this.audit.record(tx, { actorUserId: actor.userId, action: 'ORGANIZATION_MODULE1_TEMPLATE_UPDATED', targetType: 'OrganizationModule1Template', targetId: updated.id, organizationId, beforeData: before?.sections as any, afterData: sections as any });
      return updated;
    });
  }
}
