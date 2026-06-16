import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { generateModule1, DocumentContext } from './module1.templates';
import { generateModule2 } from './module2.templates';
import { generateModule3 } from './module3.templates';
import { generateModule4 } from './module4.templates';
import { generateModule8 } from './module8.templates';

@Injectable()
export class GeneratorService {
  constructor(private prisma: PrismaService) {}

  private async buildContext(projectId: string, config: any): Promise<DocumentContext> {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: { client: true, building: true, user: true },
    });
    if (!project) throw new Error('Projet introuvable');

    return {
      clientName: project.client.name,
      buildingName: project.building.name,
      buildingAddress: `${project.building.address}, ${project.building.city}, ${project.building.province}`,
      city: project.building.city,
      province: config.province || 'Quebec',
      year: project.year,
      documentType: project.documentType,
      responsableNom: config.responsableNom || '',
      responsableTitre: config.responsableTitre || 'Directeur de la securite',
      dateReleve: config.dateReleve || new Date().toISOString().split('T')[0],
      floors: config.floors || 0,
      hauteurBatiment: config.hauteurBatiment || false,
      multiLocataires: config.multiLocataires || false,
      companyName: project.user.companyName || 'CORO',
      buildingType: project.building.buildingType || 'office',
      has_sprinklers: false,
      has_generator: false,
      has_elevators: false,
      has_hazardous_materials: false,
    };
  }

  async generateAndSave(projectId: string, config: any) {
    const ctx = await this.buildContext(projectId, config);
    const module1Result = generateModule1(ctx);
    const module2Result = generateModule2(ctx);

    // Récupère section2_2 sauvegardée si elle existe
    const existingDoc = await this.prisma.document.findFirst({
      where: { projectId },
      select: { content: true },
    });
    const existingContent = (existingDoc?.content as any) || {};
    const section2_2 = existingContent?.module2?.section2_2 || [];
    const existingCustomRoles = existingContent?.module3?.customRoles || [];

    const module3Result = generateModule3(ctx, config, section2_2, existingCustomRoles);

    // Récupère les rôles actifs depuis Module 3
    const savedOrgRoles = existingContent?.module3?.orgRoles || [];

    const activeRoleCodes = savedOrgRoles.length > 0
      ? savedOrgRoles
          .filter((r: any) => r.isActive)
          .map((r: any) => r.roleCode)
          .filter(Boolean)
      : [
          'ROLE-AS', 'ROLE-CU', 'ROLE-EPI', 'ROLE-RM',
          'ROLE-RPR', 'ROLE-SS', 'ROLE-BRI', 'ROLE-RS',
          'ROLE-CHE', 'ROLE-ACC',
        ];

    // Récupère les procédures manuelles ajoutées
    const customProcedureIds = existingContent?.module4?.customProcedureIds || [];

    const module4Result = generateModule4(
      ctx,
      config,
      activeRoleCodes,
      customProcedureIds,
    );

    // Module 6 — Plans techniques (structure vide, contenu géré via BuildingPlans)
    const module6FR = {
      moduleNumber: 6,
      title: 'PLANS TECHNIQUES DU BÂTIMENT',
      language: 'fr',
      sections: [],
    };

    const module6EN = {
      moduleNumber: 6,
      title: 'TECHNICAL PLANS OF THE BUILDING',
      language: 'en',
      sections: [],
    };

    // Module 7 — Description du site (contenu géré via Module7Data)
    const module7FR = {
      moduleNumber: 7,
      title: 'DESCRIPTION DU SITE ET ÉQUIPEMENTS DE SÉCURITÉ',
      language: 'fr',
      sections: [],
    };

    const module7EN = {
      moduleNumber: 7,
      title: 'SITE DESCRIPTION AND SAFETY EQUIPMENT',
      language: 'en',
      sections: [],
    };

    // Module 8 — Registres et Annexes
    const module8Result = generateModule8(ctx);

    const existing = await this.prisma.document.findFirst({
      where: { projectId },
    });

    const documentData = {
      title: `${ctx.documentType} - ${ctx.buildingName} ${ctx.year}`,
      content: {
        modules_fr: [module1Result.fr, module2Result.fr, module3Result.fr, module4Result, module6FR, module7FR, module8Result.fr],
        modules_en: [module1Result.en, module2Result.en, module3Result.en, module4Result, module6EN, module7EN, module8Result.en],
        config,
        generatedAt: new Date(),
      },
      status: 'IN_PROGRESS' as any,
      version: existing ? existing.version + 1 : 1,
      projectId,
    };

    let document;
    if (existing) {
      document = await this.prisma.document.update({
        where: { id: existing.id },
        data: documentData,
      });
    } else {
      document = await this.prisma.document.create({
        data: documentData,
      });
    }

    await this.prisma.project.update({
      where: { id: projectId },
      data: { status: 'IN_PROGRESS', progress: 50 },
    });

    return { documentId: document.id, ...documentData };
  }

  async getDocument(projectId: string) {
    return this.prisma.document.findFirst({
      where: { projectId },
      include: { project: { include: { client: true, building: true } } },
    });
  }

  async updateModuleContent(
    documentId: string,
    moduleId: string,
    sectionId: string,
    content: string,
    language: string = 'fr',
  ) {
    const doc = await this.prisma.document.findUnique({ where: { id: documentId } });
    if (!doc) throw new Error('Document introuvable');

    const docContent = doc.content as any;
    const modulesKey = language === 'en' ? 'modules_en' : 'modules_fr';
    const modules = docContent[modulesKey] || [];

    const moduleIdx = modules.findIndex((m: any) => m.moduleNumber === parseInt(moduleId));
    if (moduleIdx === -1) throw new Error('Module introuvable');

    const sectionIdx = modules[moduleIdx].sections.findIndex((s: any) => s.id === sectionId);
    if (sectionIdx === -1) throw new Error('Section introuvable');

    modules[moduleIdx].sections[sectionIdx].content = content;

    await this.prisma.document.update({
      where: { id: documentId },
      data: { content: { ...docContent, [modulesKey]: modules } },
    });

    return { success: true, moduleId, sectionId, language };
  }
}