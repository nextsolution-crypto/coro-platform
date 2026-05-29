import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class LibraryService {
  constructor(private prisma: PrismaService) {}

  async getIncidentCodes() {
    return this.prisma.incidentCode.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  async getRoles() {
    return this.prisma.role.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  async getProcedures() {
    return this.prisma.procedure.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
      include: {
        incidentCode: true,
        role: true,
      },
    });
  }

  async createProcedure(data: any) {
    return this.prisma.procedure.create({ data });
  }

  async updateProcedure(id: string, data: any) {
    return this.prisma.procedure.update({ where: { id }, data });
  }
}