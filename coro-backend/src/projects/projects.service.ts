import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { getLimitsForLicense } from '../organizations/license-limits';

@Injectable()
export class ProjectsService {
  constructor(private prisma: PrismaService) {}

  async findAll(organizationId: string, userId?: string) {
    const where: any = { isActive: true, organizationId };

    // Si userId fourni → projets dont l'utilisateur est responsable OU a modifié
    if (userId) {
      where.OR = [
        { userId },
        { lastEditedById: userId },
      ];
    }

    return this.prisma.project.findMany({
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
  }

  async findOne(id: string, organizationId: string) {
    return this.prisma.project.findFirst({
      where: { id, organizationId },
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
  }

  async create(data: {
    name: string;
    documentType: any;
    year: number;
    clientId: string;
    buildingId: string;
    userId: string;
    organizationId: string;
  }) {
    const organization = await this.prisma.organization.findUnique({ where: { id: data.organizationId } });
    if (!organization) {
      throw new NotFoundException('Organisation introuvable');
    }

    const limits = getLimitsForLicense(organization.licenseType);
    if (limits.maxProjects !== null) {
      const currentCount = await this.prisma.project.count({
        where: { organizationId: data.organizationId, isActive: true },
      });
      if (currentCount >= limits.maxProjects) {
        throw new ForbiddenException(
          `Votre licence ${organization.licenseType} est limitée à ${limits.maxProjects} projet(s). Contactez CORO pour mettre à niveau.`
        );
      }
    }

    return this.prisma.project.create({
      data,
      include: {
        client: true,
        building: true,
      },
    });
  }

  async update(id: string, data: any, organizationId: string, userId?: string) {
    await this.assertOwnership(id, organizationId);
    return this.prisma.project.update({
      where: { id },
      data: {
        ...data,
        ...(userId ? { lastEditedById: userId } : {}),
      },
    });
  }

  async remove(id: string, organizationId: string) {
    await this.assertOwnership(id, organizationId);
    return this.prisma.project.update({
      where: { id },
      data: { isActive: false },
    });
  }

  private async assertOwnership(id: string, organizationId: string) {
    const project = await this.prisma.project.findFirst({ where: { id, organizationId } });
    if (!project) {
      throw new ForbiddenException('Accès refusé à cette ressource.');
    }
  }
  async findUpcomingUpdates(organizationId: string) {
    const projects = await this.prisma.project.findMany({
      where: { organizationId, isActive: true, status: { not: 'ARCHIVED' } },
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

      const monthsAgo = (now.getTime() - new Date(lastDoc.updatedAt).getTime())
        / (1000 * 60 * 60 * 24 * 30.44);

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
  async calculateQualityScore(projectId: string, organizationId: string): Promise<{
    score: number;
    level: 'EXCELLENT' | 'BON' | 'A_AMELIORER' | 'INCOMPLET';
    details: { label: string; points: number; earned: number; ok: boolean }[];
  }> {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, organizationId },
    });
    if (!project) return { score: 0, level: 'INCOMPLET', details: [] };

    const doc = await this.prisma.document.findFirst({ where: { projectId } });
    const plans = await this.prisma.buildingPlan.count({ where: { projectId } });
    const module7 = await this.prisma.module7Data.findFirst({ where: { projectId } });

    const content = doc?.content as any;
    const config = content?.config || {};
    const modules = content?.modules_fr || [];

    const details: { label: string; points: number; earned: number; ok: boolean }[] = [];
    let totalScore = 0;

    // ── 1. Configuration complète (20 pts) ────────────────────
    const configKeys = Object.keys(config).filter(k => config[k] !== null && config[k] !== '' && config[k] !== false);
    const hasConfig = configKeys.length >= 20;
    const pts1 = hasConfig ? 20 : Math.floor((configKeys.length / 20) * 20);
    details.push({ label: 'Configuration complète', points: 20, earned: pts1, ok: hasConfig });
    totalScore += pts1;

    // ── 2. Document généré (15 pts) ───────────────────────────
    const hasDoc = !!doc;
    details.push({ label: 'Document généré', points: 15, earned: hasDoc ? 15 : 0, ok: hasDoc });
    totalScore += hasDoc ? 15 : 0;

    // ── 3. Liste téléphonique renseignée (10 pts) ─────────────
    const m2 = modules.find((m: any) => m.moduleNumber === 2);
    const entries = m2?.sections?.find((s: any) => s.id === '2.1')?.entries || [];
    const hasContacts = entries.length >= 3;
    details.push({ label: 'Liste téléphonique (min. 3 contacts)', points: 10, earned: hasContacts ? 10 : entries.length > 0 ? 5 : 0, ok: hasContacts });
    totalScore += hasContacts ? 10 : entries.length > 0 ? 5 : 0;

    // ── 4. Organigramme actif (10 pts) ────────────────────────
    const m3 = modules.find((m: any) => m.moduleNumber === 3);
    const orgRoles = m3?.sections?.find((s: any) => s.id === '3.1')?.orgRoles || [];
    const activeRoles = orgRoles.filter((r: any) => r.isActive).length;
    const hasRoles = activeRoles >= 3;
    details.push({ label: 'Organigramme (min. 3 rôles actifs)', points: 10, earned: hasRoles ? 10 : activeRoles > 0 ? 5 : 0, ok: hasRoles });
    totalScore += hasRoles ? 10 : activeRoles > 0 ? 5 : 0;

    // ── 5. Procédures actives (10 pts) ────────────────────────
    const m4 = modules.find((m: any) => m.moduleNumber === 4);
    const procedures = m4?.procedures || [];
    const hasProcs = procedures.length >= 5;
    details.push({ label: 'Procédures actives (min. 5)', points: 10, earned: hasProcs ? 10 : procedures.length > 0 ? 5 : 0, ok: hasProcs });
    totalScore += hasProcs ? 10 : procedures.length > 0 ? 5 : 0;

    // ── 6. Plans techniques (10 pts) ──────────────────────────
    const hasPlans = plans >= 1;
    details.push({ label: 'Plans techniques téléversés', points: 10, earned: hasPlans ? 10 : 0, ok: hasPlans });
    totalScore += hasPlans ? 10 : 0;

    // ── 7. Photos équipements (10 pts) ────────────────────────
    const photos = module7?.photosData as any;
    const photoCount = photos ? Object.values(photos).filter((v: any) => v && v !== '').length : 0;
    const hasPhotos = photoCount >= 3;
    details.push({ label: 'Photos équipements (min. 3)', points: 10, earned: hasPhotos ? 10 : photoCount > 0 ? 5 : 0, ok: hasPhotos });
    totalScore += hasPhotos ? 10 : photoCount > 0 ? 5 : 0;

    // ── 8. Aucune validation critique (15 pts) ────────────────
    // On réutilise la logique de validation simplifiée
    const hasCU = orgRoles.some((r: any) => r.isActive && (r.roleCode === 'ROLE-CU' || r.roleCode === 'ROLE-CHE'));
    const hasGaz = config.gazNaturel === true;
    const hasGazProc = procedures.some((p: any) => p.code === 'P005');
    const hasMat = config.matieresDangereuses === true;
    const hasMatProc = procedures.some((p: any) => p.code === 'P018');
    const noBlockers = hasCU && (!hasGaz || hasGazProc) && (!hasMat || hasMatProc);
    details.push({ label: 'Aucune validation critique', points: 15, earned: noBlockers ? 15 : 0, ok: noBlockers });
    totalScore += noBlockers ? 15 : 0;

    const level = totalScore >= 80 ? 'EXCELLENT' : totalScore >= 60 ? 'BON' : totalScore >= 40 ? 'A_AMELIORER' : 'INCOMPLET';

    return { score: totalScore, level, details };
  }
  async getBuildingsCompliance(organizationId: string) {
    const buildings = await this.prisma.building.findMany({
      where: { organizationId, isActive: true },
      include: {
        client: { select: { name: true } },
        projects: {
          where: { isActive: true, status: { not: 'ARCHIVED' } },
          orderBy: { updatedAt: 'desc' },
          take: 1,
          include: {
            documents: {
              orderBy: { updatedAt: 'desc' },
              take: 1,
              select: { updatedAt: true, status: true },
            },
          },
        },
      },
    });

    const now = new Date();

    return buildings.map(b => {
      const lastProject = b.projects[0];
      const lastDoc = lastProject?.documents[0];

      let complianceStatus: 'CONFORME' | 'AVERTISSEMENT' | 'EXPIRE' | 'AUCUN_DOCUMENT';
      let monthsAgo: number | null = null;
      let lastUpdated: Date | null = null;

      if (!lastDoc) {
        complianceStatus = 'AUCUN_DOCUMENT';
      } else {
        lastUpdated = new Date(lastDoc.updatedAt);
        monthsAgo = Math.floor(
          (now.getTime() - lastUpdated.getTime()) / (1000 * 60 * 60 * 24 * 30.44)
        );
        complianceStatus = monthsAgo >= 12 ? 'EXPIRE' : monthsAgo >= 10 ? 'AVERTISSEMENT' : 'CONFORME';
      }

      return {
        id: b.id,
        name: b.name,
        address: b.address,
        city: b.city,
        province: b.province,
        buildingType: b.buildingType,
        clientName: b.client.name,
        projectId: lastProject?.id || null,
        projectName: lastProject?.name || null,
        documentType: lastProject?.documentType || null,
        lastUpdated,
        monthsAgo,
        complianceStatus,
      };
    }).sort((a, b) => {
      // Trier d'abord par client, puis par état de conformité
      const clientCompare = a.clientName.localeCompare(b.clientName, 'fr');
      if (clientCompare !== 0) return clientCompare;
      const order = { EXPIRE: 0, AVERTISSEMENT: 1, AUCUN_DOCUMENT: 2, CONFORME: 3 };
      return order[a.complianceStatus] - order[b.complianceStatus];
    });
  }
  async submitForApproval(id: string, organizationId: string, userId: string) {
    await this.assertOwnership(id, organizationId);
    return this.prisma.project.update({
      where: { id },
      data: { status: 'REVIEW', submittedById: userId },
    });
  }

  async approve(id: string, organizationId: string, userId: string, comment?: string) {
    const project = await this.prisma.project.findFirst({ where: { id, organizationId } });
    if (!project) throw new ForbiddenException('Accès refusé.');
    if (project.submittedById === userId) {
      throw new ForbiddenException('Vous ne pouvez pas approuver un document que vous avez soumis.');
    }
    return this.prisma.project.update({
      where: { id },
      data: { status: 'VALIDATED' },
    });
  }

  async reject(id: string, organizationId: string, userId: string, comment?: string) {
    const project = await this.prisma.project.findFirst({ where: { id, organizationId } });
    if (!project) throw new ForbiddenException('Accès refusé.');
    if (project.submittedById === userId) {
      throw new ForbiddenException('Vous ne pouvez pas rejeter un document que vous avez soumis.');
    }
    return this.prisma.project.update({
      where: { id },
      data: { status: 'IN_PROGRESS', submittedById: null },
    });
  }

  async findPendingApproval(organizationId: string, userId: string) {
    return this.prisma.project.findMany({
      where: {
        organizationId,
        status: 'REVIEW',
        submittedById: { not: userId },
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
  async globalSearch(query: string, organizationId: string) {
    const q = query.trim().toLowerCase();
    if (!q || q.length < 2) return { projects: [], clients: [], buildings: [] };

    const [projects, clients, buildings] = await Promise.all([
      this.prisma.project.findMany({
        where: {
          isActive: true,
          organizationId,
          OR: [
            { name: { contains: q, mode: 'insensitive' } },
            { client: { name: { contains: q, mode: 'insensitive' } } },
            { building: { name: { contains: q, mode: 'insensitive' } } },
            { building: { address: { contains: q, mode: 'insensitive' } } },
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
          organizationId,
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
          organizationId,
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

  async getComments(projectId: string, organizationId: string) {
    return this.prisma.projectComment.findMany({
      where: { projectId, organizationId },
      include: {
        user: { select: { firstName: true, lastName: true, role: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}