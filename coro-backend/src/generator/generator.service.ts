import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { generateModule1, DocumentContext } from './module1/module1.index';
import { generateModule2 } from './module2.templates';
import { generateModule3 } from './module3.templates';
import { generateModule4, getActiveProcedures, getAllProcedures } from './module4.templates';
import { generateModule8 } from './module8.templates';
import { generatePcaModules } from './pca.templates';


@Injectable()
export class GeneratorService {
  constructor(private prisma: PrismaService) {}

  /**
   * Normalise les valeurs booléennes provenant du configurateur.
   * Conserve la compatibilité avec les anciennes valeurs stringifiées.
   */
  private asBool(value: any): boolean {
    if (value === true) return true;
    if (value === false || value === null || value === undefined || value === '') return false;

    if (typeof value === 'number') return value !== 0;

    if (typeof value === 'string') {
      const normalized = value.trim().toLowerCase();
      return ['true', '1', 'oui', 'yes', 'y', 'o'].includes(normalized);
    }

    return Boolean(value);
  }

private async loadProceduresFromDB(
    organizationId: string,
    config: any,
    documentType: string,
    activeRoleCodes: string[],
    customProcedureIds: string[],
    projectId?: string,
  ): Promise<any[]> {
    try {
      // ─────────────────────────────────────────────────────────────
      // 1) Procédures par défaut actives
      // ─────────────────────────────────────────────────────────────
      const defaults = await this.prisma.procedureDefault.findMany({
        where: { isActive: true },
        orderBy: { code: 'asc' },
      });

      // ─────────────────────────────────────────────────────────────
      // 2) Overrides organisation + projet
      //
      // Priorité métier :
      // override projet > override organisation > défaut
      // ─────────────────────────────────────────────────────────────
      const organizationOverrides: any[] =
        await this.prisma.procedureOverride.findMany({
          where: {
            organizationId,
            projectId: null,
          },
        });

      const projectOverrides: any[] = projectId
        ? await this.prisma.procedureOverride.findMany({
            where: {
              organizationId,
              projectId,
            },
          })
        : [];

      const organizationOverrideMap = new Map<string, any>(
        organizationOverrides.map((o: any) => [o.procedureId, o]),
      );

      const projectOverrideMap = new Map<string, any>(
        projectOverrides.map((o: any) => [o.procedureId, o]),
      );

      // ─────────────────────────────────────────────────────────────
      // 3) Construire la version effective de chaque procédure
      // ─────────────────────────────────────────────────────────────
      const allProcs = defaults.map(d => {
        const organizationOverride = organizationOverrideMap.get(d.id);
        const projectOverride = projectOverrideMap.get(d.id);

        const content =
          (projectOverride?.content as any) ??
          (organizationOverride?.content as any) ??
          (d.content as any) ??
          {};

        return {
          ...content,
          id: d.id,
          _originalId: content.id,

          // L'activation/désactivation propre au projet est prioritaire.
          // En l'absence d'override projet, la procédure reste active.
          _projectIsActive: projectOverride
            ? projectOverride.isActive !== false
            : true,
        };
      });

      // ─────────────────────────────────────────────────────────────
      // 4) Déterminer les procédures automatiquement applicables
      //    avec la même logique que la registry TypeScript
      // ─────────────────────────────────────────────────────────────
      const autoFromTS = getActiveProcedures(
        config,
        documentType,
        activeRoleCodes,
      );

      const autoCodes = new Set(
        autoFromTS
          .map(p => p?.code)
          .filter(Boolean),
      );

      const allTSCodes = new Set(
        getAllProcedures()
          .map(p => p?.code)
          .filter(Boolean),
      );

      const filterRoleSections = (procedure: any) => ({
        ...procedure,
        roleSections: (procedure.roleSections || []).filter((rs: any) =>
          rs.roleCode === 'TOUS' ||
          rs.roleCode === 'ROLE-OCC' ||
          activeRoleCodes.includes(rs.roleCode),
        ),
      });

      const isUsable = (procedure: any) => {
        if (!procedure) return false;
        if (procedure._projectIsActive === false) return false;

        const filtered = filterRoleSections(procedure);

        const hasGeneralDirectives =
          Array.isArray(filtered.directivesGenerales) &&
          filtered.directivesGenerales.length > 0;

        const hasApplicableRoleSections =
          Array.isArray(filtered.roleSections) &&
          filtered.roleSections.length > 0;

        return hasGeneralDirectives || hasApplicableRoleSections;
      };

      // ─────────────────────────────────────────────────────────────
      // 5) Procédures automatiques
      // ─────────────────────────────────────────────────────────────
      const autoProcedures = allProcs
        .filter(p => autoCodes.has(p.code))
        .filter(isUsable)
        .map(filterRoleSections);

      // ─────────────────────────────────────────────────────────────
      // 6) Nouvelles procédures créées directement en DB
      //    (absentes des fichiers TS), activées par défaut avec
      //    activationRule = 'always'
      // ─────────────────────────────────────────────────────────────
      const newDefaultProcedures = allProcs
        .filter(p => {
          if (p._projectIsActive === false) return false;
          if (allTSCodes.has(p.code)) return false;
          if (customProcedureIds.includes(p.id)) return false;
          if (p.activationRule !== 'always') return false;

          const docTypes: string[] = Array.isArray(p.documentTypes)
            ? p.documentTypes
            : [];

          if (docTypes.length === 0) return true;
          return docTypes.includes(documentType);
        })
        .filter(isUsable)
        .map(filterRoleSections);

      // ─────────────────────────────────────────────────────────────
      // 7) Procédures standards ajoutées manuellement
      // ─────────────────────────────────────────────────────────────
      const manualProcedures = allProcs
        .filter(p =>
          customProcedureIds.includes(p.id) &&
          !autoCodes.has(p.code) &&
          p._projectIsActive !== false,
        )
        .filter(isUsable)
        .map(filterRoleSections);

      // ─────────────────────────────────────────────────────────────
      // 8) Procédures IA / CustomProcedure ajoutées au projet
      // ─────────────────────────────────────────────────────────────
      const standardProcedureIds = new Set(
        allProcs.map(p => p.id),
      );

      const customIAIds = customProcedureIds.filter(
        (id: string) => !standardProcedureIds.has(id),
      );

      const customIAProcedures =
        customIAIds.length > 0
          ? await this.prisma.customProcedure.findMany({
              where: {
                organizationId,
                id: { in: customIAIds },
                OR: [
                  ...(projectId ? [{ projectId }] : []),
                  { isPublished: true },
                ],
              },
            })
          : [];

      const customIAMap = new Map(
        customIAProcedures.map(p => [p.id, p]),
      );

      // Respecter l'ordre de customProcedureIds.
      const iaProcedures = customIAIds
        .map(id => customIAMap.get(id))
        .filter(Boolean)
        .filter((p: any) => {
          // Le toggle de l'éditeur utilise ACTIVE / DRAFT.
          // Si le champ status n'existe pas sur un ancien enregistrement,
          // on conserve la compatibilité en le considérant actif.
          return !p.status || p.status === 'ACTIVE';
        })
        .map((p: any) => {
          const content = (p.content as any) || {};

          return {
            id: p.id,
            code: p.code,
            titleFR: content.titleFR || p.titleFR,
            titleEN: content.titleEN || p.titleEN,
            icon: content.icon,
            headerColor:
              content.headerColor ||
              content.color ||
              p.color ||
              '#2C3E50',
            color:
              content.color ||
              p.color ||
              '#2C3E50',
            activationRule: content.activationRule || 'manual',
            documentTypes: content.documentTypes || [],
            phase: content.phase,
            directivesGenerales: content.directivesGenerales || [],
            roleSections: (content.roleSections || [])
              .filter((rs: any) =>
                rs.roleCode === 'TOUS' ||
                rs.roleCode === 'ROLE-OCC' ||
                activeRoleCodes.includes(rs.roleCode),
              )
              .map((rs: any) => ({
                roleCode: rs.roleCode,
                roleLabelFR:
                  rs.roleLabelFR ||
                  rs.roleName ||
                  rs.roleCode,
                roleLabelEN:
                  rs.roleLabelEN ||
                  rs.roleNameEN ||
                  rs.roleName ||
                  rs.roleCode,
                headerColor:
                  rs.headerColor ||
                  content.headerColor ||
                  p.color ||
                  '#2C3E50',
                steps: Array.isArray(rs.steps)
                  ? rs.steps
                  : (rs.actions || []).map(
                      (action: string, idx: number) => ({
                        id: `${p.code}_${idx}`,
                        textFR: action,
                        textEN:
                          rs.actionsEN && rs.actionsEN[idx]
                            ? rs.actionsEN[idx]
                            : action,
                      }),
                    ),
              })),
            importantBoxes: content.importantBoxes || [],
            objective: content.objective || p.objective,
            _isCustomIA: true,
          };
        })
        .filter(isUsable)
        .map(filterRoleSections);

      // ─────────────────────────────────────────────────────────────
      // 9) Dédupliquer en conservant l'ordre
      // ─────────────────────────────────────────────────────────────
      const combined = [
        ...autoProcedures,
        ...newDefaultProcedures,
        ...manualProcedures,
        ...iaProcedures,
      ];

      const seen = new Set<string>();

      return combined.filter(proc => {
        const key = proc.id || proc.code;
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    } catch (err) {
      console.warn('Fallback aux procédures TypeScript:', err);

      // Retourne vide :
      // generateModule4() utilisera alors son fallback TypeScript.
      return [];
    }
  }

  private async assertProjectOwnership(projectId: string, organizationId: string) {
    const project = await this.prisma.project.findFirst({ where: { id: projectId, organizationId } });
    if (!project) {
      throw new NotFoundException('Projet introuvable');
    }
  }

  private async buildContext(projectId: string, config: any): Promise<DocumentContext> {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: { client: true, building: true, user: true },
    });
    if (!project) throw new Error('Projet introuvable');

    const defaultResponsableNom = `${project.user.firstName} ${project.user.lastName} — ${project.user.companyName || 'CORO'}`;

    return {
      clientName: project.client.name,
      buildingName: project.building.name,
      buildingAddress: `${project.building.address}, ${project.building.city}, ${project.building.province}`,
      city: project.building.city,
      province: config.province || project.building.province || 'Quebec',
      year: project.year,
      documentType: project.documentType,

      // Le configurateur est la source prioritaire pour les métadonnées du document.
      responsableNom: config.responsableNom || defaultResponsableNom,
      responsableTitre:
        config.responsableTitre ||
        project.building.responsableTitre ||
        'Directeur de la sécurité',
      dateReleve: config.dateReleve || new Date().toISOString().split('T')[0],
      versionDocument: config.versionDocument || 'Création initiale',
      historiqueList: Array.isArray(config.historiqueList) ? config.historiqueList : [],

      // Données bâtiment utilisées par plusieurs générateurs.
      floors: config.floors ?? 0,
      hauteurBatiment: config.hauteurBatiment ?? false,
      multiLocataires: this.asBool(config.multiLocataires),
      companyName: project.user.companyName || 'CORO',
      buildingType: config.buildingType || project.building.buildingType || 'office',

      // IMPORTANT : ne plus laisser ces indicateurs à false en dur.
      has_sprinklers: this.asBool(config.gicleurs),
      has_generator: this.asBool(config.generatrice),
      has_elevators: this.asBool(config.ascenseurs),
      has_hazardous_materials: this.asBool(config.matieresDangereuses),
    };
  }

  async generateAndSave(projectId: string, config: any, organizationId: string, userId?: string) {
    await this.assertProjectOwnership(projectId, organizationId);
    const ctx = await this.buildContext(projectId, config);
    const isPca = ctx.documentType === 'PCA';
    const isPsi = ctx.documentType === 'PSI';

    // ── Branche PCA ──
    if (isPca) {
      const pcaConfig = await this.prisma.pcaConfig.findUnique({
        where: { projectId },
      });
      const pcaModules = generatePcaModules(ctx, pcaConfig);
      const existing = await this.prisma.document.findFirst({ where: { projectId } });
      const documentData = {
        title: `PCA - ${ctx.clientName} ${ctx.year}`,
        content: {
          modules_fr: pcaModules.fr,
          modules_en: pcaModules.en,
          config,
          generatedAt: new Date(),
        },
        status: 'IN_PROGRESS' as any,
        version: existing ? existing.version + 1 : 1,
        projectId,
      };
      let document;
      if (existing) {
        document = await this.prisma.document.update({ where: { id: existing.id }, data: documentData });
      } else {
        document = await this.prisma.document.create({ data: documentData });
      }
      await this.prisma.project.update({
        where: { id: projectId },
        data: { status: 'IN_PROGRESS', progress: 50, ...(userId ? { lastEditedById: userId } : {}) },
      });
      return { documentId: document.id, ...documentData };
    }

    // Vérifier si l'organisation a un template Module 1 personnalisé
    const orgTemplate = await this.prisma.organizationModule1Template.findUnique({
      where: { organizationId },
    });

    let module1Result = generateModule1(ctx);

    if (orgTemplate && (orgTemplate.sections as any[]).length > 0) {
      const customSections = (orgTemplate.sections as any[]).map(s => ({
        id: s.id,
        title: s.title,
        content: s.content
          .replace(/\{\{clientName\}\}/g, ctx.clientName)
          .replace(/\{\{buildingAddress\}\}/g, ctx.buildingAddress)
          .replace(/\{\{documentType\}\}/g, ctx.documentType),
      }));

      module1Result = {
        fr: {
          moduleNumber: 1,
          title: 'INTRODUCTION',
          language: 'fr',
          sections: customSections,
        },
        en: {
          moduleNumber: 1,
          title: 'INTRODUCTION',
          language: 'en',
          sections: customSections,
        },
      };
    }
    const module2Result = generateModule2(ctx);

    // Récupère section2_2 sauvegardée si elle existe
    const existingDoc = await this.prisma.document.findFirst({
      where: { projectId },
      select: { content: true },
    });
    const existingContent = (existingDoc?.content as any) || {};
    // Chercher les données M2 dans les deux structures possibles
    const section2_2 =
      existingContent?.module2?.section2_2 ||
      existingContent?.modules_fr?.find((m: any) => m.moduleNumber === 2)
        ?.sections?.find((s: any) => s.id === '2.2' || s.id === 'm2_contacts')?.contacts ||
      [];
    const existingCustomRoles = existingContent?.module3?.customRoles || [];

    const module3Result = isPsi ? null : generateModule3(ctx, config, section2_2, existingCustomRoles);

    // Récupère les rôles actifs depuis Module 3.
    // Chercher les rôles actifs dans les deux structures possibles.
    const savedOrgRoles =
      existingContent?.module3?.orgRoles ||
      existingContent?.modules_fr?.find((m: any) => m.moduleNumber === 3)
        ?.sections?.find((s: any) => s.id === '3.1')?.orgRoles ||
      [];

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

    // Charger les procédures depuis la DB (avec overrides par organisation)
    const proceduresFromDB = await this.loadProceduresFromDB(
      organizationId,
      config,
      ctx.documentType,
      activeRoleCodes,
      customProcedureIds,
      projectId,
    );

    // Module 4 :
    // Les procédures applicables au PSI sont déjà déterminées par
    // getActiveProcedures() / loadProceduresFromDB() selon
    // documentTypes + activationRule.
    // Ne pas imposer ici une seconde liste P001/P002 : cela supprimerait
    // des procédures pourtant explicitement compatibles avec le PSI.
    const module4Result = generateModule4(
      ctx,
      config,
      activeRoleCodes,
      customProcedureIds,
      proceduresFromDB,
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
    const module8Result = generateModule8(ctx, config);

    const existing = await this.prisma.document.findFirst({
      where: { projectId },
    });

    const previousContent = (existing?.content as any) || {};

    const documentData = {
      title: `${ctx.documentType} - ${ctx.buildingName} ${ctx.year}`,
      content: {
        modules_fr: [
          module1Result.fr,
          module2Result.fr,
          ...(isPsi ? [] : [module3Result!.fr]),
          module4Result,
          module6FR,
          module7FR,
          module8Result.fr,
        ],
        modules_en: [
          module1Result.en,
          module2Result.en,
          ...(isPsi ? [] : [module3Result!.en]),
          module4Result,
          module6EN,
          module7EN,
          module8Result.en,
        ],
        config,
        generatedAt: new Date(),
        // Préserve les données éditées manuellement, non régénérées automatiquement
        module2: previousContent.module2 || undefined,
        module3: previousContent.module3 || undefined,
        module4: previousContent.module4 || undefined,
        module8: previousContent.module8 || undefined,
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
      data: {
        status: 'IN_PROGRESS',
        progress: 50,
        ...(userId ? { lastEditedById: userId } : {}),
      },
    });

    return { documentId: document.id, ...documentData };
  }

  async getDocument(projectId: string, organizationId: string) {
    await this.assertProjectOwnership(projectId, organizationId);
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
    organizationId: string,
  ) {
    const doc = await this.prisma.document.findFirst({
      where: { id: documentId, project: { organizationId } },
    });
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