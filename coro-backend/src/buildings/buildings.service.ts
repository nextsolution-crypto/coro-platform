import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class BuildingsService {
  constructor(private prisma: PrismaService) {}

  async findAll(clientId?: string) {
    return this.prisma.building.findMany({
      where: { isActive: true, ...(clientId && { clientId }) },
      orderBy: { createdAt: 'desc' },
      include: {
        client: { select: { id: true, name: true } },
        _count: { select: { projects: true } },
      },
    });
  }

  async findOne(id: string) {
    return this.prisma.building.findUnique({
      where: { id },
      include: { client: true, projects: true },
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
  }) {
    return this.prisma.building.create({ data });
  }

  async update(id: string, data: any) {
    return this.prisma.building.update({ where: { id }, data });
  }

  async remove(id: string) {
    return this.prisma.building.update({
      where: { id },
      data: { isActive: false },
    });
  }
}