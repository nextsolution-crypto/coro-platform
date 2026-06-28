import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ProjectsService {
  constructor(private prisma: PrismaService) {}

  async findAll(organizationId: string) {
    return this.prisma.project.findMany({
      where: { isActive: true, organizationId },
      orderBy: { createdAt: 'desc' },
      include: {
        client: { select: { id: true, name: true } },
        building: { select: { id: true, name: true, address: true } },
        user: { select: { id: true, firstName: true, lastName: true } },
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
    return this.prisma.project.create({
      data,
      include: {
        client: true,
        building: true,
      },
    });
  }

  async update(id: string, data: any, organizationId: string) {
    await this.assertOwnership(id, organizationId);
    return this.prisma.project.update({ where: { id }, data });
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