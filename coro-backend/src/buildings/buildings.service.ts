import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class BuildingsService {
  constructor(private prisma: PrismaService) {}

  async findAll(organizationId: string, clientId?: string) {
    return this.prisma.building.findMany({
      where: { isActive: true, organizationId, ...(clientId && { clientId }) },
      orderBy: { createdAt: 'desc' },
      include: {
        client: { select: { id: true, name: true } },
        _count: { select: { projects: true } },
      },
    });
  }

  async findOne(id: string, organizationId: string) {
    return this.prisma.building.findFirst({
      where: { id, organizationId },
      include: { client: true, projects: true },
    });
  }

  async findProjects(buildingId: string) {
  return this.prisma.project.findMany({
    where: { buildingId },
    orderBy: { updatedAt: 'desc' },
    select: {
      id: true,
      name: true,
      documentType: true,
      year: true,
      status: true,
      updatedAt: true,
    },
  });
}

  async create(data: {
    name: string;
    address: string;
    city: string;
    province: string;
    postalCode?: string;
    floors?: number;
    units?: number;
    buildingType?: string;
    clientId: string;
    organizationId: string;
  }) {
    return this.prisma.building.create({ data });
  }

  async update(id: string, data: any, organizationId: string) {
    await this.assertOwnership(id, organizationId);
    return this.prisma.building.update({ where: { id }, data });
  }

  async remove(id: string, organizationId: string) {
    await this.assertOwnership(id, organizationId);
    return this.prisma.building.update({
      where: { id },
      data: { isActive: false },
    });
  }

  private async assertOwnership(id: string, organizationId: string) {
    const building = await this.prisma.building.findFirst({ where: { id, organizationId } });
    if (!building) {
      throw new ForbiddenException('Accès refusé à cette ressource.');
    }
  }
}