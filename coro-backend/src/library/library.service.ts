import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { getAllProcedures } from '../generator/procedures/index';

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
  const procedures = getAllProcedures();

  return procedures.map(p => ({
    id: p.id,
    code: p.code,
    titleFR: p.titleFR,
    titleEN: p.titleEN,
    icon: p.icon,
    headerColor: p.headerColor,
    activationRule: p.activationRule,
    documentTypes: p.documentTypes,
    phase: p.phase,
    status: 'PUBLISHED',
    roleSections: p.roleSections.map(rs => ({
      roleCode: rs.roleCode,
      roleLabelFR: rs.roleLabelFR,
      roleLabelEN: rs.roleLabelEN,
      headerColor: rs.headerColor,
      stepCount: rs.steps.length,
    })),
    totalSteps: p.roleSections.reduce((acc, rs) => acc + rs.steps.length, 0),
  }));
}

  async createProcedure(data: any) {
    return this.prisma.procedure.create({ data });
  }

  async updateProcedure(id: string, data: any) {
    return this.prisma.procedure.update({ where: { id }, data });
  }
}