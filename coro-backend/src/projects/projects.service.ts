import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { getLimitsForLicense } from '../organizations/license-limits';

@Injectable()
export class ProjectsService {
  constructor(private prisma: PrismaService) {}

  async findAll(organizationId: string) {
    return this.prisma.project.findMany({
      where: { isActive: true, organizationId },
      orderBy: { updatedAt: 'desc' },
      include: {
        client: { select: { id: true, name: true } },
        building: { select: { id: true, name: true, address: true } },
        user: { select: { id: true, firstName: true, lastName: true } },
        lastEditedBy: { select: { id: true, firstName: true, lastName: true } },
        _count: { select: { documents: true } },
      },
    });
  }

  async findOne(id: string, organizationId: string) {
    return this.prisma.project.findFirst({
      where: { id, organizationId },
      include: {
        client: true,
        building: true,
        user: true,
        lastEditedBy: { select: { id: true, firstName: true, lastName: true } },
        documents: true,
      },
    });
  }

  async create(data: {
    name: string;
    documentType: any;
    year: number;
    clientId: string;
    buildingId: string;
    userId: string;
    organizationId: string;
  }) {
    const organization = await this.prisma.organization.findUnique({ where: { id: data.organizationId } });
    if (!organization) {
      throw new NotFoundException('Organisation introuvable');
    }

    const limits = getLimitsForLicense(organization.licenseType);
    if (limits.maxProjects !== null) {
      const currentCount = await this.prisma.project.count({
        where: { organizationId: data.organizationId, isActive: true },
      });
      if (currentCount >= limits.maxProjects) {
        throw new ForbiddenException(
          `Votre licence ${organization.licenseType} est limitée à ${limits.maxProjects} projet(s). Contactez CORO pour mettre à niveau.`
        );
      }
    }

    return this.prisma.project.create({
      data,
      include: {
        client: true,
        building: true,
      },
    });
  }

  async update(id: string, data: any, organizationId: string, userId?: string) {
    await this.assertOwnership(id, organizationId);
    return this.prisma.project.update({
      where: { id },
      data: {
        ...data,
        ...(userId ? { lastEditedById: userId } : {}),
      },
    });
  }

  async remove(id: string, organizationId: string) {
    await this.assertOwnership(id, organizationId);
    return this.prisma.project.update({
      where: { id },
      data: { isActive: false },
    });
  }

  private async assertOwnership(id: string, organizationId: string) {
    const project = await this.prisma.project.findFirst({ where: { id, organizationId } });
    if (!project) {
      throw new ForbiddenException('Accès refusé à cette ressource.');
    }
  }
}