import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class PcaConfiguratorService {
  constructor(private prisma: PrismaService) {}

  private async ensureProjectAccess(
    projectId: string,
    organizationId: string,
  ) {
    const project = await this.prisma.project.findFirst({
      where: {
        id: projectId,
        organizationId,
      },
      select: {
        id: true,
      },
    });

    if (!project) {
      throw new NotFoundException('Projet introuvable');
    }
  }

  async getConfig(projectId: string, organizationId: string) {
    const project = await this.prisma.project.findFirst({
      where: {
        id: projectId,
        organizationId,
      },
      include: {
        client: true,
        building: true,
        organization: true,
        pcaConfig: true,
      },
    });

    if (!project) {
      throw new NotFoundException('Projet introuvable');
    }

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

  async saveConfig(
    projectId: string,
    organizationId: string,
    data: any,
  ) {
    const project = await this.prisma.project.findFirst({
      where: {
        id: projectId,
        organizationId,
      },
      select: {
        id: true,
      },
    });

    if (!project) {
      throw new NotFoundException('Projet introuvable');
    }

    // Ne jamais permettre au payload de modifier l'association au projet
    const { projectId: _ignoredProjectId, ...configData } = data || {};

    // Upsert PcaConfig
    const config = await this.prisma.pcaConfig.upsert({
      where: {
        projectId,
      },
      create: {
        ...configData,
        projectId,
      },
      update: {
        ...configData,
      },
    });

    // IMPORTANT :
    // La sauvegarde du configurateur ne modifie plus automatiquement
    // le progress ou le status du projet.
    // Ces valeurs doivent être pilotées par le cycle de vie réel du document.

    return config;
  }

  async getPcaProcedures(
    organizationId: string,
    projectId: string,
  ) {
    await this.ensureProjectAccess(projectId, organizationId);

    const defaults = await this.prisma.procedureDefault.findMany({
      where: {
        isActive: true,
        code: {
          startsWith: 'PC',
        },
      },
      orderBy: {
        code: 'asc',
      },
    });

    const overrides = await this.prisma.procedureOverride.findMany({
      where: {
        organizationId,
        projectId,
      },
    });

    const overrideMap = new Map(
      overrides.map((o) => [o.procedureId, o]),
    );

    return defaults.map((d) => {
      const override = overrideMap.get(d.id);

      return {
        ...d,
        content: override ? override.content : d.content,
        isOverridden: !!override,
        isActive: override ? override.isActive : true,
      };
    });
  }

  async togglePcaProcedure(
    organizationId: string,
    projectId: string,
    procedureId: string,
    isActive: boolean,
  ) {
    await this.ensureProjectAccess(projectId, organizationId);

    const proc = await this.prisma.procedureDefault.findUnique({
      where: {
        id: procedureId,
      },
    });

    if (!proc || !proc.code.startsWith('PC')) {
      throw new NotFoundException('Procédure PCA introuvable');
    }

    await this.prisma.procedureOverride.upsert({
      where: {
        procedureId_organizationId_projectId: {
          procedureId,
          organizationId,
          projectId,
        },
      },
      create: {
        procedureId,
        organizationId,
        projectId,
        content: proc.content as any,
        isActive,
      },
      update: {
        isActive,
      },
    });

    return {
      success: true,
    };
  }

  async updatePcaProcedure(
    organizationId: string,
    projectId: string,
    procedureId: string,
    content: any,
  ) {
    await this.ensureProjectAccess(projectId, organizationId);

    const proc = await this.prisma.procedureDefault.findUnique({
      where: {
        id: procedureId,
      },
    });

    if (!proc || !proc.code.startsWith('PC')) {
      throw new NotFoundException('Procédure PCA introuvable');
    }

    await this.prisma.procedureOverride.upsert({
      where: {
        procedureId_organizationId_projectId: {
          procedureId,
          organizationId,
          projectId,
        },
      },
      create: {
        procedureId,
        organizationId,
        projectId,
        content,
        isActive: true,
      },
      update: {
        content,
      },
    });

    return {
      success: true,
    };
  }

  async restorePcaProcedure(
    organizationId: string,
    projectId: string,
    procedureId: string,
  ) {
    await this.ensureProjectAccess(projectId, organizationId);

    const proc = await this.prisma.procedureDefault.findUnique({
      where: {
        id: procedureId,
      },
      select: {
        id: true,
        code: true,
      },
    });

    if (!proc || !proc.code.startsWith('PC')) {
      throw new NotFoundException('Procédure PCA introuvable');
    }

    await this.prisma.procedureOverride.deleteMany({
      where: {
        procedureId,
        organizationId,
        projectId,
      },
    });

    return {
      success: true,
    };
  }

  async getLinkedPmu(
    projectId: string,
    organizationId: string,
  ) {
    const project = await this.prisma.project.findFirst({
      where: {
        id: projectId,
        organizationId,
      },
      include: {
        building: true,
      },
    });

    if (!project) {
      throw new NotFoundException('Projet introuvable');
    }

    // Chercher un PMU ou PSI existant et validé/exporté
    // appartenant à la même organisation et au même bâtiment.
    const linkedProjects = await this.prisma.project.findMany({
      where: {
        organizationId,
        buildingId: project.buildingId,
        documentType: {
          in: ['PMU', 'PSI'],
        },
        status: {
          in: ['VALIDATED', 'EXPORTED'],
        },
        id: {
          not: projectId,
        },
      },
      select: {
        id: true,
        name: true,
        documentType: true,
        status: true,
        year: true,
      },
      orderBy: {
        year: 'desc',
      },
    });

    return linkedProjects;
  }
}