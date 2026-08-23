import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class PcaConfiguratorService {
  constructor(private prisma: PrismaService) {}

  async getConfig(projectId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: {
        client: true,
        building: true,
        organization: true,
        pcaConfig: true,
      },
    });

    if (!project) throw new NotFoundException('Projet introuvable');

    // Pré-remplissage depuis les fiches existantes
    const prefill = {
      // Depuis la fiche organisation
      sector: project.organization.sector || null,
      employeeCount: project.organization.employeeCount || null,
      operatingHours: project.organization.operatingHours || null,
      // Depuis la fiche client
      regulatoryReqs: project.client.regulatoryRequirements || [],
      clientSector: project.client.sector || null,
      clientEmployeeCount: project.client.employeeCount || null,
      // Depuis la fiche bâtiment
      buildingName: project.building.name,
      buildingAddress: project.building.address,
      buildingCity: project.building.city,
      buildingProvince: project.building.province,
      // Coordonnateur par défaut = responsable du bâtiment
      coordinatorFirstName: project.building.responsableFirstName || null,
      coordinatorLastName: project.building.responsableLastName || null,
      coordinatorTitle: project.building.responsableTitre || null,
      coordinatorEmail: project.building.responsableEmail || null,
      coordinatorPhone: project.building.responsablePhone || null,
    };

    return {
      project: {
        id: project.id,
        name: project.name,
        documentType: project.documentType,
        year: project.year,
        client: project.client,
        building: project.building,
      },
      config: project.pcaConfig || null,
      prefill,
    };
  }

  async saveConfig(projectId: string, data: any) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });
    if (!project) throw new NotFoundException('Projet introuvable');

    // Upsert PcaConfig
    const config = await this.prisma.pcaConfig.upsert({
      where: { projectId },
      create: { projectId, ...data },
      update: { ...data },
    });

    // Mettre à jour la progression du projet
    await this.prisma.project.update({
      where: { id: projectId },
      data: {
        progress: 25,
        status: 'IN_PROGRESS',
      },
    });

    return config;
  }

  async getPcaProcedures(organizationId: string, projectId: string) {
    const defaults = await this.prisma.procedureDefault.findMany({
      where: { isActive: true, code: { startsWith: 'PC' } },
      orderBy: { code: 'asc' },
    });
    const overrides = await this.prisma.procedureOverride.findMany({
      where: { organizationId, projectId },
    });
    const overrideMap = new Map(overrides.map(o => [o.procedureId, o]));
    return defaults.map(d => {
      const override = overrideMap.get(d.id);
      return {
        ...d,
        content: override ? override.content : d.content,
        isOverridden: !!override,
        isActive: override ? override.isActive : true,
      };
    });
  }

  async togglePcaProcedure(organizationId: string, projectId: string, procedureId: string, isActive: boolean) {
    const proc = await this.prisma.procedureDefault.findUnique({ where: { id: procedureId } });
    if (!proc) throw new NotFoundException('Procédure introuvable');
    await this.prisma.procedureOverride.upsert({
      where: { procedureId_organizationId_projectId: { procedureId, organizationId, projectId } },
      create: { procedureId, organizationId, projectId, content: proc.content as any, isActive },
      update: { isActive },
    });
    return { success: true };
  }

  async updatePcaProcedure(organizationId: string, projectId: string, procedureId: string, content: any) {
    const proc = await this.prisma.procedureDefault.findUnique({ where: { id: procedureId } });
    if (!proc) throw new NotFoundException('Procédure introuvable');
    await this.prisma.procedureOverride.upsert({
      where: { procedureId_organizationId_projectId: { procedureId, organizationId, projectId } },
      create: { procedureId, organizationId, projectId, content, isActive: true },
      update: { content },
    });
    return { success: true };
  }

  async restorePcaProcedure(organizationId: string, projectId: string, procedureId: string) {
    await this.prisma.procedureOverride.deleteMany({
      where: { procedureId, organizationId, projectId },
    });
    return { success: true };
  }

  async getLinkedPmu(projectId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: { building: true },
    });
    if (!project) throw new NotFoundException('Projet introuvable');

    // Chercher un PMU/PSI existant pour le même bâtiment
    const linkedProjects = await this.prisma.project.findMany({
      where: {
        buildingId: project.buildingId,
        documentType: { in: ['PMU', 'PSI'] },
        status: { in: ['VALIDATED', 'EXPORTED'] },
        id: { not: projectId },
      },
      select: {
        id: true,
        name: true,
        documentType: true,
        status: true,
        year: true,
      },
      orderBy: { year: 'desc' },
    });

    return linkedProjects;
  }
}