import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ProjectsService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.project.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
      include: {
        client: { select: { id: true, name: true } },
        building: { select: { id: true, name: true, address: true } },
        user: { select: { id: true, firstName: true, lastName: true } },
        _count: { select: { documents: true } },
      },
    });
  }

  async findOne(id: string) {
    return this.prisma.project.findUnique({
      where: { id },
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
  }) {
    return this.prisma.project.create({
      data,
      include: {
        client: true,
        building: true,
      },
    });
  }

  async update(id: string, data: any) {
    return this.prisma.project.update({ where: { id }, data });
  }

  async remove(id: string) {
    return this.prisma.project.update({
      where: { id },
      data: { isActive: false },
    });
  }
}