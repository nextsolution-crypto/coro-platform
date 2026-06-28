import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ClientsService {
  constructor(private prisma: PrismaService) {}

  async findAll(organizationId: string) {
    return this.prisma.client.findMany({
      where: { isActive: true, organizationId },
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { buildings: true, projects: true } } },
    });
  }

  async findOne(id: string, organizationId: string) {
    return this.prisma.client.findFirst({
      where: { id, organizationId },
      include: { buildings: true, projects: true },
    });
  }

  async create(data: {
    name: string;
    email?: string;
    phone?: string;
    address?: string;
    city?: string;
    province?: string;
    logoBase64?: string;
    organizationId: string;
  }) {
    return this.prisma.client.create({ data });
  }

  async update(id: string, data: any, organizationId: string) {
    await this.assertOwnership(id, organizationId);
    return this.prisma.client.update({ where: { id }, data });
  }

  async uploadLogo(id: string, logoBase64: string, organizationId: string) {
    await this.assertOwnership(id, organizationId);
    return this.prisma.client.update({
      where: { id },
      data: { logoBase64 },
    });
  }

  async remove(id: string, organizationId: string) {
    await this.assertOwnership(id, organizationId);
    return this.prisma.client.update({
      where: { id },
      data: { isActive: false },
    });
  }

  private async assertOwnership(id: string, organizationId: string) {
    const client = await this.prisma.client.findFirst({ where: { id, organizationId } });
    if (!client) {
      throw new ForbiddenException('Accès refusé à cette ressource.');
    }
  }
}