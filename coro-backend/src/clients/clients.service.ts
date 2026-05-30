import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ClientsService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.client.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { buildings: true, projects: true } } },
    });
  }

  async findOne(id: string) {
    return this.prisma.client.findUnique({
      where: { id },
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
  }) {
    return this.prisma.client.create({ data });
  }

  async update(id: string, data: any) {
    return this.prisma.client.update({ where: { id }, data });
  }

  async uploadLogo(id: string, logoBase64: string) {
    return this.prisma.client.update({
      where: { id },
      data: { logoBase64 },
    });
  }

  async remove(id: string) {
    return this.prisma.client.update({
      where: { id },
      data: { isActive: false },
    });
  }
}