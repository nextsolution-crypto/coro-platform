import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { getLimitsForLicense } from '../organizations/license-limits';
import {
  AdviserActor,
  projectAccessWhere, projectReadWhere, canWriteProject,
  requireProjectApprover,
} from '../auth/project-access';
import { UpdateProjectDto } from './dto/update-project.dto';

// Types dotés d'un configurateur (PGC, PRA et PUE : « bientôt disponible »).
const CREATABLE_DOCUMENT_TYPES = new Set(['PMU', 'PSI', 'PCA']);


// Réponses du configurateur propres à un document précis : elles ne suivent pas un modèle
// appliqué à un autre bâtiment (responsable, date du relevé, version, historique).
const TEMPLATE_IDENTITY_KEYS = [
  'responsableNom',
  'responsableTitre',
  'dateReleve',
  'versionDocument',
  'historiqueList',
];

export function configFromTemplate(configData: unknown): Record<string, unknown> | null {
  const source = (configData as any)?.projectConfig;
  if (!source || typeof source !== 'object' || Array.isArray(source)) return null;
  const copy: Record<string, unknown> = JSON.parse(JSON.stringify(source));
  for (const key of TEMPLATE_IDENTITY_KEYS) delete copy[key];
  return copy;
}

// Copie pour l'année suivante, même bâtiment : tout est repris sauf la date du relevé,
// qui sera celle du nouveau relevé technique.
export function configForNextYear(configData: unknown): Record<string, unknown> | null {
  if (!configData || typeof configData !== 'object' || Array.isArray(configData)) return null;
  const copy: Record<string, unknown> = JSON.parse(JSON.stringify(configData));
  delete copy.dateReleve;
  return copy;
}

export function nextYearName(name: string, year: number): string {
  const next = String(year + 1);
  return name.includes(String(year)) ? name.split(String(year)).join(next) : `${name} ${next}`;
}

@Injectable()
export class ProjectsService {
  constructor(private prisma: PrismaService) {}

  private async getOrganizationProjectLimit(organizationId: string) {
    const organization = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: { licenseType: true },
    });
    if (!organization) throw new NotFoundException('Organisation introuvable');
    return getLimitsForLicense(organization.licenseType).maxProjects;
  }

  async getListSummary(actor: AdviserActor) {
    const [quotaUsed, maxProjects] = await Promise.all([
      this.prisma.project.count({
        where: { organizationId: actor.organizationId, isActive: true },
      }),
      this.getOrganizationProjectLimit(actor.organizationId),
    ]);
    return { quotaUsed, maxProjects };
  }

  async getFilterUsers(actor: AdviserActor) {
    const projects = await this.prisma.project.findMany({
      where: { isActive: true, ...projectReadWhere(actor) },
      select: {
        user: {
          select: { id: true, firstName: true, lastName: true, isActive: true },
        },
      },
    });
    const users = new Map<
      string,
      { id: string; firstName: string; lastName: string }
    >();
    for (const project of projects) {
      if (project.user.isActive) {
        users.set(project.user.id, {
          id: project.user.id,
          firstName: project.user.firstName,
          lastName: project.user.lastName,
        });
      }
    }
    return [...users.values()].sort((a, b) =>
      `${a.firstName} ${a.lastName}`.localeCompare(
        `${b.firstName} ${b.lastName}`,
        'fr',
      ),
    );
  }

  async findAll(actor: AdviserActor) {
    const where = { isActive: true, ...projectReadWhere(actor) };

    // Si userId fourni → projets dont l'utilisateur est responsable OU a modifié
    const projects = await this.prisma.project.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      include: {
        client: { select: { id: true, name: true } },
        building: { select: { id: true, name: true, address: true } },
        user: { select: { id: true, firstName: true, lastName: true } },
        lastEditedBy: { select: { id: true, firstName: true, lastName: true } },
        _count: { select: { documents: true } },
      },
    });
    return projects.map((project) => ({ ...project, canWrite: canWriteProject(actor, project) }));
  }

  async findOne(id: string, actor: AdviserActor) {
    const project = await this.prisma.project.findFirst({
      where: { id, isActive: true, ...projectReadWhere(actor) },
      include: {
        client: true,
        building: true,
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
        lastEditedBy: { select: { id: true, firstName: true, lastName: true } },
        submittedBy: { select: { id: true, firstName: true, lastName: true } },
        approvedBy: { select: { id: true, firstName: true, lastName: true } },
        documents: true,
      },
    });
    if (!project) {
      throw new NotFoundException('Projet introuvable');
    }
    return { ...project, canWrite: canWriteProject(actor, project) };
  }

  /** Changement de propriétaire : réservé aux administrateurs de l'organisation. */
  async changeOwner(id: string, newOwnerId: string, actor: AdviserActor) {
    if (actor.role !== 'ADMIN' && actor.role !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Seul un administrateur peut changer le propriétaire');
    }
    if (typeof newOwnerId !== 'string' || !newOwnerId) {
      throw new BadRequestException('Nouveau propriétaire requis');
    }
    const [project, owner] = await Promise.all([
      this.prisma.project.findFirst({
        where: { id, isActive: true, organizationId: actor.organizationId },
        select: { id: true, userId: true, name: true },
      }),
      this.prisma.user.findFirst({
        where: {
          id: newOwnerId,
          organizationId: actor.organizationId,
          isActive: true,
          role: { in: ['ADMIN', 'SUPER_ADMIN', 'OPERATOR'] },
        },
        select: { id: true, firstName: true, lastName: true },
      }),
    ]);
    if (!project) throw new NotFoundException('Projet introuvable');
    if (!owner) throw new BadRequestException('Conseiller introuvable dans votre organisation');
    if (project.userId === owner.id) return { id: project.id, userId: owner.id, changed: false };
    await this.prisma.project.update({ where: { id }, data: { userId: owner.id } });
    return {
      id: project.id,
      userId: owner.id,
      previousUserId: project.userId,
      ownerName: `${owner.firstName ?? ''} ${owner.lastName ?? ''}`.trim(),
      changed: true,
    };
  }

  async create(
    data: {
      name: string;
      documentType: any;
      year: number;
      clientId?: string;
      buildingId: string;
      userId: string;
      organizationId: string;
      templateId?: string;
    },
    actor: AdviserActor,
  ) {
    if (
      data.userId !== actor.userId ||
      data.organizationId !== actor.organizationId
    ) {
      throw new ForbiddenException('Acces refuse a ce projet');
    }
    const organization = await this.prisma.organization.findUnique({
      where: { id: actor.organizationId },
    });
    if (!organization) {
      throw new NotFoundException('Organisation introuvable');
    }

    const limits = getLimitsForLicense(organization.licenseType);
    if (limits.maxProjects !== null) {
      const currentCount = await this.prisma.project.count({
        where: { organizationId: actor.organizationId, isActive: true },
      });
      if (currentCount >= limits.maxProjects) {
        throw new ForbiddenException(
          `Votre licence ${organization.licenseType} est limitée à ${limits.maxProjects} projet(s). Contactez CORO pour mettre à niveau.`,
        );
      }
    }

    const name = typeof data.name === 'string' ? data.name.trim() : '';
    if (!name) {
      throw new BadRequestException('Nom du projet requis');
    }
    if (!CREATABLE_DOCUMENT_TYPES.has(data.documentType)) {
      throw new BadRequestException('Type de document non disponible');
    }
    const year = Number(data.year);
    if (!Number.isInteger(year) || year < 2000 || year > 2100) {
      throw new BadRequestException('Année invalide');
    }
    if (typeof data.buildingId !== 'string' || !data.buildingId) {
      throw new BadRequestException('Bâtiment requis');
    }
    // Le client du projet est toujours celui du bâtiment (formulaire de la fiche bâtiment : pas de client envoyé).
    const building = await this.prisma.building.findFirst({
      where: { id: data.buildingId, organizationId: actor.organizationId },
      select: { id: true, clientId: true },
    });
    if (!building || (data.clientId && data.clientId !== building.clientId)) {
      throw new ForbiddenException('Acces refuse a ce projet');
    }
    data = { ...data, name, year };

    let templateConfig: Record<string, unknown> | null = null;
    if (data.templateId) {
      const template = await this.prisma.projectTemplate.findFirst({
        where: { id: data.templateId, organizationId: actor.organizationId },
        select: { documentType: true, configData: true },
      });
      if (!template) throw new NotFoundException('Modèle introuvable');
      if (template.documentType !== data.documentType)
        throw new BadRequestException(
          'Le modèle choisi est pour un autre type de document',
        );
      templateConfig = configFromTemplate(template.configData);
    }

    return this.prisma.project.create({
      data: {
        name: data.name,
        documentType: data.documentType,
        year: data.year,
        clientId: building.clientId,
        buildingId: building.id,
        userId: actor.userId,
        organizationId: actor.organizationId,
        ...(templateConfig
          ? { configData: templateConfig as Prisma.InputJsonValue }
          : {}),
      },
      include: {
        client: true,
        building: true,
      },
    });
  }

  // Duplique un projet pour l'année suivante (même bâtiment) : configuration du
  // document, configuration PCA et procédures propres au projet. Le mandat, les
  // activités, les tâches et le temps ne sont pas copiés.
  async duplicateForNextYear(id: string, actor: AdviserActor) {
    const source = await this.prisma.project.findFirst({
      where: { id, ...projectAccessWhere(actor), isActive: true },
      include: { pcaConfig: true },
    });
    if (!source) throw new NotFoundException('Projet introuvable');
    const organization = await this.prisma.organization.findUnique({
      where: { id: actor.organizationId },
    });
    if (!organization) throw new NotFoundException('Organisation introuvable');
    const limits = getLimitsForLicense(organization.licenseType);
    if (limits.maxProjects !== null) {
      const currentCount = await this.prisma.project.count({
        where: { organizationId: actor.organizationId, isActive: true },
      });
      if (currentCount >= limits.maxProjects)
        throw new ForbiddenException(
          `Votre licence ${organization.licenseType} est limitée à ${limits.maxProjects} projet(s). Contactez CORO pour mettre à niveau.`,
        );
    }
    const nextYear = source.year + 1;
    return this.prisma.$transaction(async (tx) => {
      const config = configForNextYear(source.configData);
      const created = await tx.project.create({
        data: {
          name: nextYearName(source.name, source.year),
          documentType: source.documentType,
          year: nextYear,
          clientId: source.clientId,
          buildingId: source.buildingId,
          userId: actor.userId,
          organizationId: actor.organizationId,
          ...(config
            ? {
                configData: config as Prisma.InputJsonValue,
                status: 'IN_PROGRESS' as any,
                progress: 25,
              }
            : {}),
        },
        select: { id: true, name: true, year: true },
      });
      if (source.pcaConfig) {
        const { id: _id, projectId: _p, createdAt: _c, updatedAt: _u, ...pca } =
          source.pcaConfig as any;
        await tx.pcaConfig.create({ data: { ...pca, projectId: created.id } });
      }
      const procedures = await tx.customProcedure.findMany({
        where: { projectId: source.id, organizationId: actor.organizationId },
      });
      for (const procedure of procedures) {
        const { id: _id, createdAt: _c, updatedAt: _u, ...rest } = procedure as any;
        await tx.customProcedure.create({
          data: { ...rest, projectId: created.id, createdById: actor.userId },
        });
      }
      return { ...created, sourceProjectId: source.id };
    });
  }

  async update(id: string, data: Record<string, any>, actor: AdviserActor) {
    if (['REVIEW', 'VALIDATED', 'EXPORTED'].includes(data?.status)) {
      throw new ForbiddenException(
        'Transition documentaire reservee au workflow canonique',
      );
    }
    const allowedFields = new Set([
      'expectedUpdatedAt', 'name', 'documentType', 'year', 'progress',
      'configData', 'status', 'clientId', 'buildingId',
    ]);
    if (
      Object.entries(data || {}).some(
        ([field, value]) => value !== undefined && !allowedFields.has(field),
      )
    ) {
      throw new ForbiddenException('Champ de mise a jour interdit');
    }
    const { expectedUpdatedAt } = data as UpdateProjectDto;
    const mutableFields = [
      'name',
      'documentType',
      'year',
      'progress',
      'configData',
      'status',
      'clientId',
      'buildingId',
    ] as const;
    const changes = Object.fromEntries(
      mutableFields
        .filter((field) => data[field] !== undefined)
        .map((field) => [field, data[field]]),
    ) as Omit<UpdateProjectDto, 'expectedUpdatedAt'>;
    return this.prisma.$transaction(
      async (tx) => {
        const current = await tx.project.findFirst({
          where: { id, isActive: true, ...projectAccessWhere(actor) },
          select: {
            id: true,
            organizationId: true,
            clientId: true,
            buildingId: true,
            status: true,
            updatedAt: true,
          },
        });
        if (!current) {
          throw new ForbiddenException('Projet inaccessible');
        }
        if (current.status === 'ARCHIVED') {
          throw new ForbiddenException('Projet archive en lecture seule');
        }
        if (!expectedUpdatedAt) {
          throw new BadRequestException('expectedUpdatedAt requis');
        }
        const expected = new Date(expectedUpdatedAt);
        if (current.updatedAt.getTime() !== expected.getTime()) {
          throw new ConflictException('PROJECT_VERSION_CONFLICT');
        }

        const clientId = changes.clientId ?? current.clientId;
        const buildingId = changes.buildingId ?? current.buildingId;
        if (changes.clientId !== undefined || changes.buildingId !== undefined) {
          const [client, building] = await Promise.all([
            tx.client.findFirst({
              where: { id: clientId, organizationId: current.organizationId },
              select: { id: true },
            }),
            tx.building.findFirst({
              where: {
                id: buildingId,
                organizationId: current.organizationId,
                clientId,
              },
              select: { id: true },
            }),
          ]);
          if (!client || !building) {
            throw new ForbiddenException('Rattachement projet invalide');
          }
        }

        const result = await tx.project.updateMany({
          where: {
            id,
            isActive: true,
            status: { not: 'ARCHIVED' },
            updatedAt: expected,
            ...projectAccessWhere(actor),
          },
          data: {
            ...(changes as Prisma.ProjectUncheckedUpdateManyInput),
            lastEditedById: actor.userId,
          },
        });
        if (result.count !== 1) {
          throw new ConflictException('PROJECT_VERSION_CONFLICT');
        }
        const updated = await tx.project.findFirst({
          where: { id, isActive: true, ...projectAccessWhere(actor) },
          include: {
            client: true,
            building: true,
            user: true,
            lastEditedBy: { select: { id: true, firstName: true, lastName: true } },
            submittedBy: { select: { id: true, firstName: true, lastName: true } },
            approvedBy: { select: { id: true, firstName: true, lastName: true } },
            documents: true,
          },
        });
        if (!updated) throw new ForbiddenException('Projet inaccessible');
        return updated;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  async remove(id: string, actor: AdviserActor) {
    const result = await this.prisma.project.updateMany({
      where: {
        id,
        isActive: true,
        status: { not: 'ARCHIVED' },
        ...projectAccessWhere(actor),
      },
      data: { isActive: false },
    });
    if (result.count !== 1) {
      throw new ForbiddenException(
        'Projet inaccessible ou archive en lecture seule',
      );
    }
    return { id, isActive: false };
  }

  async bulkDeactivate(projectIds: string[], actor: AdviserActor) {
    const ids = [...new Set(projectIds.filter(Boolean))];
    if (ids.length === 0 || ids.length > 100) {
      throw new ForbiddenException('Selection de projets invalide');
    }

    return this.prisma.$transaction(async (tx) => {
      const eligible = await tx.project.count({
        where: {
          id: { in: ids },
          isActive: true,
          status: { not: 'ARCHIVED' },
          ...projectAccessWhere(actor),
        },
      });
      if (eligible !== ids.length) {
        throw new ForbiddenException(
          'La selection contient un projet inaccessible ou archive',
        );
      }
      const result = await tx.project.updateMany({
        where: {
          id: { in: ids },
          isActive: true,
          status: { not: 'ARCHIVED' },
          ...projectAccessWhere(actor),
        },
        data: { isActive: false },
      });
      if (result.count !== ids.length) {
        throw new ForbiddenException(
          'La selection a change; aucune desactivation partielle acceptee',
        );
      }
      return { count: result.count };
    });
  }

  private async assertAccess(id: string, actor: AdviserActor) {
    const project = await this.prisma.project.findFirst({
      where: { id, ...projectAccessWhere(actor) },
      select: { id: true },
    });
    if (!project) {
      throw new ForbiddenException('Acces refuse a ce projet');
    }
  }

  private async assertOwnership(id: string, organizationId: string) {
    const project = await this.prisma.project.findFirst({
      where: { id, organizationId },
    });
    if (!project) {
      throw new ForbiddenException('Accès refusé à cette ressource.');
    }
  }
  async findUpcomingUpdates(actor: AdviserActor) {
    const projects = await this.prisma.project.findMany({
      where: {
        ...projectAccessWhere(actor),
        isActive: true,
        status: { not: 'ARCHIVED' },
      },
      include: {
        client: { select: { name: true } },
        building: { select: { name: true } },
        documents: {
          orderBy: { updatedAt: 'desc' },
          take: 1,
          select: { updatedAt: true, version: true },
        },
      },
    });

    const now = new Date();
    const results: {
      id: string;
      name: string;
      documentType: string;
      clientName: string;
      buildingName: string;
      lastUpdated: Date;
      monthsAgo: number;
      level: string;
    }[] = [];

    for (const project of projects) {
      const lastDoc = project.documents[0];
      if (!lastDoc) continue;

      const monthsAgo =
        (now.getTime() - new Date(lastDoc.updatedAt).getTime()) /
        (1000 * 60 * 60 * 24 * 30.44);

      if (monthsAgo >= 10) {
        results.push({
          id: project.id,
          name: project.name,
          documentType: project.documentType,
          clientName: project.client.name,
          buildingName: project.building.name,
          lastUpdated: lastDoc.updatedAt,
          monthsAgo: Math.floor(monthsAgo),
          level: monthsAgo >= 12 ? 'URGENT' : 'AVERTISSEMENT',
        });
      }
    }

    return results.sort((a, b) => b.monthsAgo - a.monthsAgo);
  }
  private async calculatePcaQualityScore(
    projectId: string,
    organizationId: string,
  ): Promise<{
    score: number;
    level: 'EXCELLENT' | 'BON' | 'A_AMELIORER' | 'INCOMPLET';
    details: { label: string; points: number; earned: number; ok: boolean }[];
  }> {
    const doc = await this.prisma.document.findFirst({ where: { projectId } });
    const pcaConfig = await this.prisma.pcaConfig.findUnique({
      where: { projectId },
    });
    const cfg = (pcaConfig as any) || {};
    const details: {
      label: string;
      points: number;
      earned: number;
      ok: boolean;
    }[] = [];
    let totalScore = 0;

    // 1. Configuration complète (20 pts)
    const hasCoordinator = !!(cfg.coordinatorFirstName && cfg.coordinatorEmail);
    const pts1 = hasCoordinator ? 20 : cfg.coordinatorFirstName ? 10 : 0;
    details.push({
      label: 'Coordonnateur PCA défini',
      points: 20,
      earned: pts1,
      ok: hasCoordinator,
    });
    totalScore += pts1;

    // 2. Document généré (15 pts)
    const hasDoc = !!doc;
    details.push({
      label: 'Document généré',
      points: 15,
      earned: hasDoc ? 15 : 0,
      ok: hasDoc,
    });
    totalScore += hasDoc ? 15 : 0;

    // 3. Scénarios de risque identifiés (15 pts)
    const riskCount = (cfg.riskScenarios || []).length;
    const hasRisks = riskCount >= 3;
    const pts3 = hasRisks ? 15 : riskCount > 0 ? 8 : 0;
    details.push({
      label: 'Scénarios de risque (min. 3)',
      points: 15,
      earned: pts3,
      ok: hasRisks,
    });
    totalScore += pts3;

    // 4. BIA complété (15 pts)
    const serviceCount = (cfg.criticalServices || []).length;
    const hasBia = serviceCount >= 1;
    const pts4 = hasBia ? 15 : 0;
    details.push({
      label: 'Services critiques avec RTO/RPO (min. 1)',
      points: 15,
      earned: pts4,
      ok: hasBia,
    });
    totalScore += pts4;

    // 5. Stratégies de continuité (10 pts)
    const hasStrategies = !!(
      cfg.teleworkPossible ||
      cfg.alternativeSite ||
      cfg.itRedundancy ||
      cfg.crossTraining
    );
    details.push({
      label: 'Stratégies de continuité définies',
      points: 10,
      earned: hasStrategies ? 10 : 0,
      ok: hasStrategies,
    });
    totalScore += hasStrategies ? 10 : 0;

    // 6. Communication de crise (10 pts)
    const hasComm = !!(cfg.internalChannel && cfg.spokesperson);
    details.push({
      label: 'Communication de crise (canal + porte-parole)',
      points: 10,
      earned: hasComm ? 10 : cfg.internalChannel ? 5 : 0,
      ok: hasComm,
    });
    totalScore += hasComm ? 10 : cfg.internalChannel ? 5 : 0;

    // 7. Critères d'activation définis (10 pts)
    const hasActivation = !!(
      cfg.activationCriteria && cfg.activationCriteria.length > 20
    );
    details.push({
      label: "Critères d'activation du PCA",
      points: 10,
      earned: hasActivation ? 10 : 0,
      ok: hasActivation,
    });
    totalScore += hasActivation ? 10 : 0;

    // 8. Programme d'exercices (5 pts)
    const hasExercises = !!(cfg.exerciseFormative && cfg.planOwner);
    details.push({
      label: "Programme d'exercices et responsable définis",
      points: 5,
      earned: hasExercises ? 5 : 0,
      ok: hasExercises,
    });
    totalScore += hasExercises ? 5 : 0;

    const level =
      totalScore >= 80
        ? 'EXCELLENT'
        : totalScore >= 60
          ? 'BON'
          : totalScore >= 40
            ? 'A_AMELIORER'
            : 'INCOMPLET';
    return { score: totalScore, level, details };
  }

  async calculateQualityScore(
    projectId: string,
    actor: AdviserActor,
  ): Promise<{
    score: number;
    level: 'EXCELLENT' | 'BON' | 'A_AMELIORER' | 'INCOMPLET';
    details: { label: string; points: number; earned: number; ok: boolean }[];
  }> {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, isActive: true, ...projectReadWhere(actor) },
    });
    if (!project) throw new NotFoundException('Projet introuvable');

    // ── Branche PCA ──
    if (project.documentType === 'PCA') {
      return this.calculatePcaQualityScore(projectId, actor.organizationId);
    }

    const doc = await this.prisma.document.findFirst({ where: { projectId } });
    const plans = await this.prisma.buildingPlan.count({
      where: { projectId },
    });
    const module7 = await this.prisma.module7Data.findFirst({
      where: { projectId },
    });

    const content = doc?.content as any;
    const config = content?.config || {};
    const modules = content?.modules_fr || [];

    const details: {
      label: string;
      points: number;
      earned: number;
      ok: boolean;
    }[] = [];
    let totalScore = 0;

    // ── 1. Configuration complète (20 pts) ────────────────────
    const configKeys = Object.keys(config).filter(
      (k) => config[k] !== null && config[k] !== '' && config[k] !== false,
    );
    const hasConfig = configKeys.length >= 20;
    const pts1 = hasConfig ? 20 : Math.floor((configKeys.length / 20) * 20);
    details.push({
      label: 'Configuration complète',
      points: 20,
      earned: pts1,
      ok: hasConfig,
    });
    totalScore += pts1;

    // ── 2. Document généré (15 pts) ───────────────────────────
    const hasDoc = !!doc;
    details.push({
      label: 'Document généré',
      points: 15,
      earned: hasDoc ? 15 : 0,
      ok: hasDoc,
    });
    totalScore += hasDoc ? 15 : 0;

    // ── 3. Liste téléphonique renseignée (10 pts) ─────────────
    // Seuls comptent les contacts propres au bâtiment réellement remplis (nom ET
    // téléphone) : ressources internes, contracteurs et, si incluses, ressources
    // corporatives. Le 9-1-1 et les ressources externes sont remplis d'office.
    const m2 = modules.find((m: any) => m.moduleNumber === 2);
    const saved2 = content?.module2 || {};
    const sectionEntries = (id: string, key: string): any[] => {
      if (Array.isArray(saved2[key])) return saved2[key];
      return m2?.sections?.find((s: any) => s.id === id)?.entries || [];
    };
    const contactEntries = [
      ...sectionEntries('2.2', 'section2_2'),
      ...sectionEntries('2.3', 'section2_3'),
      ...(saved2.section2_5Enabled && Array.isArray(saved2.section2_5) ? saved2.section2_5 : []),
    ];
    const filledContacts = contactEntries.filter(
      (e: any) => String(e?.name || '').trim() && String(e?.phone || '').trim(),
    ).length;
    const hasContacts = filledContacts >= 3;
    const contactPoints = hasContacts ? 10 : filledContacts > 0 ? 5 : 0;
    details.push({
      label: hasContacts
        ? 'Liste téléphonique (min. 3 contacts)'
        : `Liste téléphonique : ${filledContacts} contact${filledContacts > 1 ? 's' : ''} rempli${filledContacts > 1 ? 's' : ''} sur 3 requis (nom et téléphone)`,
      points: 10,
      earned: contactPoints,
      ok: hasContacts,
    });
    totalScore += contactPoints;

    // ── 4. Organigramme actif (10 pts) ────────────────────────
    const m3 = modules.find((m: any) => m.moduleNumber === 3);
    const orgRoles =
      m3?.sections?.find((s: any) => s.id === '3.1')?.orgRoles || [];
    const activeRoles = orgRoles.filter((r: any) => r.isActive).length;
    const hasRoles = activeRoles >= 3;
    details.push({
      label: 'Organigramme (min. 3 rôles actifs)',
      points: 10,
      earned: hasRoles ? 10 : activeRoles > 0 ? 5 : 0,
      ok: hasRoles,
    });
    totalScore += hasRoles ? 10 : activeRoles > 0 ? 5 : 0;

    // ── 5. Procédures actives (10 pts) ────────────────────────
    const m4 = modules.find((m: any) => m.moduleNumber === 4);
    const procedures = m4?.procedures || [];
    const hasProcs = procedures.length >= 5;
    details.push({
      label: 'Procédures actives (min. 5)',
      points: 10,
      earned: hasProcs ? 10 : procedures.length > 0 ? 5 : 0,
      ok: hasProcs,
    });
    totalScore += hasProcs ? 10 : procedures.length > 0 ? 5 : 0;

    // ── 6. Plans techniques (10 pts) ──────────────────────────
    const hasPlans = plans >= 1;
    details.push({
      label: 'Plans techniques téléversés',
      points: 10,
      earned: hasPlans ? 10 : 0,
      ok: hasPlans,
    });
    totalScore += hasPlans ? 10 : 0;

    // ── 7. Photos équipements (10 pts) ────────────────────────
    const photos = module7?.photosData as any;
    const photoCount = photos
      ? Object.values(photos).filter((v: any) => v && v !== '').length
      : 0;
    const hasPhotos = photoCount >= 3;
    details.push({
      label: 'Photos équipements (min. 3)',
      points: 10,
      earned: hasPhotos ? 10 : photoCount > 0 ? 5 : 0,
      ok: hasPhotos,
    });
    totalScore += hasPhotos ? 10 : photoCount > 0 ? 5 : 0;

    // ── 8. Aucune validation critique (15 pts) ────────────────
    // On réutilise la logique de validation simplifiée
    const hasCU = orgRoles.some(
      (r: any) =>
        r.isActive && (r.roleCode === 'ROLE-CU' || r.roleCode === 'ROLE-CHE'),
    );
    const hasGaz = config.gazNaturel === true;
    const hasGazProc = procedures.some((p: any) => p.code === 'P005');
    const hasMat = config.matieresDangereuses === true;
    const hasMatProc = procedures.some((p: any) => p.code === 'P018');
    const noBlockers =
      hasCU && (!hasGaz || hasGazProc) && (!hasMat || hasMatProc);
    details.push({
      label: 'Aucune validation critique',
      points: 15,
      earned: noBlockers ? 15 : 0,
      ok: noBlockers,
    });
    totalScore += noBlockers ? 15 : 0;

    const level =
      totalScore >= 80
        ? 'EXCELLENT'
        : totalScore >= 60
          ? 'BON'
          : totalScore >= 40
            ? 'A_AMELIORER'
            : 'INCOMPLET';

    return { score: totalScore, level, details };
  }
  async getBuildingsCompliance(actor: AdviserActor) {
    const projectScope = projectReadWhere(actor);
    const buildings = await this.prisma.building.findMany({
      where: {
        organizationId: actor.organizationId,
        isActive: true,
        ...(actor.role === 'OPERATOR'
          ? { projects: { some: projectScope } }
          : {}),
      },
      include: {
        client: { select: { name: true } },
        projects: {
          where: {
            ...projectScope,
            isActive: true,
            status: { not: 'ARCHIVED' },
          },
          orderBy: { updatedAt: 'desc' },
          include: {
            documents: {
              orderBy: { updatedAt: 'desc' },
              select: {
                id: true,
                title: true,
                status: true,
                version: true,
                updatedAt: true,
              },
            },
          },
        },
      },
    });

    return buildings
      .map((building) => {
        const sources = building.projects.flatMap((project) =>
          project.documents.map((document) => ({
            documentId: document.id,
            documentTitle: document.title,
            documentStatus: document.status,
            version: document.version,
            documentType: project.documentType,
            projectId: project.id,
            projectName: project.name,
            projectStatus: project.status,
            lastModifiedAt: document.updatedAt,
            approvalDate:
              document.status === 'VALIDATED' || document.status === 'EXPORTED'
                ? project.approvedAt
                : null,
            dateMeaning:
              document.status === 'VALIDATED' || document.status === 'EXPORTED'
                ? project.approvedAt
                  ? 'PROJECT_APPROVAL_DATE'
                  : 'APPROVAL_DATE_UNKNOWN'
                : 'LAST_MODIFIED_DATE',
            current: document.status !== 'ARCHIVED',
          })),
        );
        const current = sources.filter((source) => source.current);
        const approved = current.filter(
          (source) =>
            source.documentStatus === 'VALIDATED' ||
            source.documentStatus === 'EXPORTED',
        );
        const inReview = current.filter((source) => {
          const project = building.projects.find(
            (candidate) => candidate.id === source.projectId,
          );
          return (
            source.documentStatus === 'IN_PROGRESS' ||
            project?.status === 'REVIEW'
          );
        });
        const drafts = current.filter(
          (source) => source.documentStatus === 'DRAFT',
        );
        const primarySource =
          approved[0] || inReview[0] || drafts[0] || sources[0] || null;
        const documentaryStatus = approved.length
          ? 'APPROVED_AVAILABLE'
          : inReview.length
            ? 'IN_REVIEW'
            : drafts.length
              ? 'DRAFT_ONLY'
              : sources.length
                ? 'HISTORICAL_ONLY'
                : 'NO_ACCESSIBLE_DOCUMENT';
        return {
          id: building.id,
          name: building.name,
          address: building.address,
          city: building.city,
          province: building.province,
          buildingType: building.buildingType,
          clientName: building.client.name,
          documentaryStatus,
          sourceCount: sources.length,
          approvedCount: approved.length,
          reviewCount: inReview.length,
          draftCount: drafts.length,
          historicalCount: sources.length - current.length,
          primarySource,
          sources,
          exclusions: ['INACTIVE_PROJECT', 'ARCHIVED_PROJECT'],
          regulatoryAttestation: false,
        };
      })
      .sort((a, b) => {
        const clientCompare = a.clientName.localeCompare(b.clientName, 'fr');
        if (clientCompare !== 0) return clientCompare;
        const order = {
          NO_ACCESSIBLE_DOCUMENT: 0,
          DRAFT_ONLY: 1,
          IN_REVIEW: 2,
          HISTORICAL_ONLY: 3,
          APPROVED_AVAILABLE: 4,
        };
        return order[a.documentaryStatus] - order[b.documentaryStatus];
      });
  }
  async submitForApproval(id: string, organizationId: string, userId: string) {
    await this.assertOwnership(id, organizationId);
    return this.prisma.project.update({
      where: { id },
      data: { status: 'REVIEW', submittedById: userId },
    });
  }

  async reject(
    id: string,
    organizationId: string,
    userId: string,
    comment?: string,
  ) {
    const project = await this.prisma.project.findFirst({
      where: { id, organizationId },
    });
    if (!project) throw new ForbiddenException('Accès refusé.');
    if (project.submittedById === userId) {
      throw new ForbiddenException(
        'Vous ne pouvez pas rejeter un document que vous avez soumis.',
      );
    }
    return this.prisma.project.update({
      where: { id },
      data: { status: 'IN_PROGRESS', submittedById: null },
    });
  }

  async findPendingApproval(actor: AdviserActor) {
    requireProjectApprover(actor);
    return this.prisma.project.findMany({
      where: {
        ...projectReadWhere(actor),
        status: 'REVIEW',
        submittedById: { not: actor.userId },
      },
      include: {
        client: { select: { name: true } },
        building: { select: { name: true } },
        submittedBy: { select: { firstName: true, lastName: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async requestRevision(id: string, organizationId: string, comment?: string) {
    await this.assertOwnership(id, organizationId);
    return this.prisma.project.update({
      where: { id },
      data: { status: 'IN_PROGRESS', submittedById: null },
    });
  }
  async findLateTasks(actor: AdviserActor) {
    const tasks = await this.prisma.projectTask.findMany({
      where: {
        organizationId: actor.organizationId,
        assigneeId: actor.userId,
        dueDate: { lt: new Date() },
        status: { notIn: ['fait', 'termine', 'annule'] },
        project: { is: { ...projectAccessWhere(actor), isActive: true } },
      },
      orderBy: [{ dueDate: 'asc' }, { createdAt: 'asc' }],
      select: {
        id: true,
        projectId: true,
        taskTitle: true,
        dueDate: true,
        status: true,
        project: {
          select: {
            name: true,
            client: { select: { name: true } },
            building: { select: { name: true } },
          },
        },
      },
    });
    return tasks.map((task) => ({
      id: task.id,
      projectId: task.projectId,
      taskTitle: task.taskTitle,
      dueDate: task.dueDate,
      status: task.status,
      projectName: task.project.name,
      clientName: task.project.client.name,
      buildingName: task.project.building.name,
      isAssignedToMe: true,
      isLate: true,
    }));
  }

  async globalSearch(query: string, actor: AdviserActor) {
    const q = query.trim().toLowerCase();
    if (!q || q.length < 2) return { projects: [], clients: [], buildings: [] };

    const projectScope = projectReadWhere(actor);

    const [projects, clients, buildings] = await Promise.all([
      this.prisma.project.findMany({
        where: {
          isActive: true,
          AND: [
            projectScope,
            {
              OR: [
                { name: { contains: q, mode: 'insensitive' } },
                { client: { name: { contains: q, mode: 'insensitive' } } },
                { building: { name: { contains: q, mode: 'insensitive' } } },
                { building: { address: { contains: q, mode: 'insensitive' } } },
              ],
            },
          ],
        },
        include: {
          client: { select: { id: true, name: true } },
          building: { select: { id: true, name: true } },
        },
        orderBy: { updatedAt: 'desc' },
        take: 5,
      }),
      this.prisma.client.findMany({
        where: {
          isActive: true,
          organizationId: actor.organizationId,
          ...(actor.role === 'OPERATOR'
            ? { projects: { some: projectScope } }
            : {}),
          OR: [
            { name: { contains: q, mode: 'insensitive' } },
            { city: { contains: q, mode: 'insensitive' } },
            { email: { contains: q, mode: 'insensitive' } },
          ],
        },
        take: 4,
      }),
      this.prisma.building.findMany({
        where: {
          isActive: true,
          organizationId: actor.organizationId,
          ...(actor.role === 'OPERATOR'
            ? { projects: { some: projectScope } }
            : {}),
          OR: [
            { name: { contains: q, mode: 'insensitive' } },
            { address: { contains: q, mode: 'insensitive' } },
            { city: { contains: q, mode: 'insensitive' } },
          ],
        },
        include: {
          client: { select: { name: true } },
        },
        take: 4,
      }),
    ]);

    return { projects, clients, buildings };
  }

  async getComments(projectId: string, actor: AdviserActor) {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, ...projectReadWhere(actor) },
      select: { id: true },
    });
    if (!project) throw new NotFoundException('Projet introuvable');
    const comments = await this.prisma.projectComment.findMany({
      where: { projectId, organizationId: actor.organizationId },
      include: {
        user: { select: { firstName: true, lastName: true, role: true } },
        clientUser: { select: { firstName: true, lastName: true, role: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return comments.map(({ clientUser: clientAuthor, ...comment }) => ({
      ...comment,
      user: comment.user ?? clientAuthor,
    }));
  }
}
