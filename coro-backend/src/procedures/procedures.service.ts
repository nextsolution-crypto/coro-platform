import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ProceduresService {
  constructor(private prisma: PrismaService) {}

  // ── Toutes les procédures par défaut ───────────────────────
  async findAll() {
    return this.prisma.procedureDefault.findMany({
      where: { isActive: true },
      orderBy: { code: 'asc' },
      select: { id: true, code: true, isActive: true, updatedAt: true, content: true },
    });
  }

  // ── Une procédure (priorité : override projet > override org > défaut) ──
  async findOne(id: string, organizationId: string, projectId?: string) {
    const proc = await this.prisma.procedureDefault.findUnique({ where: { id } });
    if (!proc) throw new NotFoundException('Procédure introuvable');

    // Override projet (priorité maximale)
    if (projectId) {
      const projectOverride = await this.prisma.procedureOverride.findUnique({
        where: { procedureId_organizationId_projectId: { procedureId: id, organizationId, projectId } },
      });
      if (projectOverride) {
        return { ...proc, content: projectOverride.content, isOverridden: true, overrideLevel: 'project' };
      }
    }

    // Override organisation
    const orgOverride = await this.prisma.procedureOverride.findFirst({
        where: { procedureId: id, organizationId, projectId: null },
      });
    if (orgOverride) {
      return { ...proc, content: orgOverride.content, isOverridden: true, overrideLevel: 'organization' };
    }

    return { ...proc, isOverridden: false, overrideLevel: null };
  }

  // ── Toutes les procédures d'un projet (avec overrides appliqués) ──
  async findAllForProject(organizationId: string, projectId: string) {
    const defaults = await this.prisma.procedureDefault.findMany({
      where: { isActive: true },
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

  // ── Sauvegarder un override par projet ─────────────────────
  async updateForProject(id: string, organizationId: string, projectId: string, content: any) {
    const proc = await this.prisma.procedureDefault.findUnique({ where: { id } });
    if (!proc) throw new NotFoundException('Procédure introuvable');

    await this.prisma.procedureOverride.upsert({
      where: { procedureId_organizationId_projectId: { procedureId: id, organizationId, projectId } },
      create: { procedureId: id, organizationId, projectId, content },
      update: { content },
    });

    return { success: true };
  }

  // ── Activer/désactiver une procédure pour un projet ────────
  async toggleActiveForProject(id: string, organizationId: string, projectId: string, isActive: boolean) {
    const proc = await this.prisma.procedureDefault.findUnique({ where: { id } });
    if (!proc) throw new NotFoundException('Procédure introuvable');

    await this.prisma.procedureOverride.upsert({
      where: { procedureId_organizationId_projectId: { procedureId: id, organizationId, projectId } },
      create: { procedureId: id, organizationId, projectId, content: proc.content as any, isActive },
      update: { isActive },
    });

    return { success: true, isActive };
  }

  // ── Restaurer la version par défaut pour un projet ─────────
  async restoreForProject(id: string, organizationId: string, projectId: string) {
    await this.prisma.procedureOverride.deleteMany({
      where: { procedureId: id, organizationId, projectId },
    });
    return { success: true };
  }

  // ── Modifier la procédure par défaut (SUPER_ADMIN) ─────────
  async updateDefault(id: string, content: any) {
    const proc = await this.prisma.procedureDefault.findUnique({ where: { id } });
    if (!proc) throw new NotFoundException('Procédure introuvable');

    return this.prisma.procedureDefault.update({
      where: { id },
      data: { content },
    });
  }

  // ── Créer une nouvelle procédure par défaut (SUPER_ADMIN) ──
  async createDefault(content: any) {
    const existing = await this.prisma.procedureDefault.findUnique({
      where: { code: content.code },
    });
    if (existing) {
      throw new Error(`Une procédure avec le code ${content.code} existe déjà.`);
    }

    return this.prisma.procedureDefault.create({
      data: { code: content.code, content },
    });
  }

  // ── Anciennes méthodes par organisation (compatibilité) ────
  async findOne_legacy(id: string, organizationId: string) {
    return this.findOne(id, organizationId);
  }

  async update(id: string, organizationId: string, content: any) {
    return this.updateForProject(id, organizationId, 'org-level', content);
  }

  async restore(id: string, organizationId: string) {
    return this.restoreForProject(id, organizationId, 'org-level');
  }
}