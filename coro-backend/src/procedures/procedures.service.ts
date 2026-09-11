import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ProceduresService {
  constructor(private prisma: PrismaService) {}

  // ── Helper JSON Prisma ─────────────────────────────────────
  //
  // Prisma distingue JsonValue (lecture) et InputJsonValue (écriture).
  // Cette conversion centralisée évite les erreurs TypeScript lorsque
  // l'on réutilise un contenu JSON lu en base dans create/update.
  private asInputJson(value: unknown): Prisma.InputJsonValue {
    return value as Prisma.InputJsonValue;
  }

  // ── Toutes les procédures par défaut ───────────────────────
  async findAll() {
    return this.prisma.procedureDefault.findMany({
      where: { isActive: true },
      orderBy: { code: 'asc' },
      select: {
        id: true,
        code: true,
        isActive: true,
        updatedAt: true,
        content: true,
      },
    });
  }

  // ── Une procédure ──────────────────────────────────────────
  //
  // Priorité :
  // override projet > override organisation > défaut
  async findOne(
    id: string,
    organizationId: string,
    projectId?: string,
  ) {
    const proc = await this.prisma.procedureDefault.findUnique({
      where: { id },
    });

    if (!proc) {
      throw new NotFoundException('Procédure introuvable');
    }

    // Override projet — priorité maximale
    if (projectId) {
      const projectOverride =
        await this.prisma.procedureOverride.findUnique({
          where: {
            procedureId_organizationId_projectId: {
              procedureId: id,
              organizationId,
              projectId,
            },
          },
        });

      if (projectOverride) {
        return {
          ...proc,
          content: projectOverride.content,
          isActive: projectOverride.isActive,
          isOverridden: true,
          overrideLevel: 'project',
        };
      }
    }

    // Override organisation
    const orgOverride =
      await this.prisma.procedureOverride.findFirst({
        where: {
          procedureId: id,
          organizationId,
          projectId: null,
        },
      });

    if (orgOverride) {
      return {
        ...proc,
        content: orgOverride.content,
        isActive: true,
        isOverridden: true,
        overrideLevel: 'organization',
      };
    }

    return {
      ...proc,
      isOverridden: false,
      overrideLevel: null,
    };
  }

  // ── Toutes les procédures d'un projet ─────────────────────
  //
  // Applique :
  // projet > organisation > défaut
  // + état isActive propre au projet
  async findAllForProject(
    organizationId: string,
    projectId: string,
  ) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { documentType: true },
    });

    if (!project) {
      throw new NotFoundException('Projet introuvable');
    }

    const documentType = project.documentType || 'PMU';

    const [
      defaults,
      organizationOverrides,
      projectOverrides,
    ] = await Promise.all([
      this.prisma.procedureDefault.findMany({
        where: { isActive: true },
        orderBy: { code: 'asc' },
      }),

      this.prisma.procedureOverride.findMany({
        where: {
          organizationId,
          projectId: null,
        },
      }),

      this.prisma.procedureOverride.findMany({
        where: {
          organizationId,
          projectId,
        },
      }),
    ]);

    const organizationOverrideMap = new Map<string, any>(
      organizationOverrides.map((o: any) => [
        o.procedureId,
        o,
      ]),
    );

    const projectOverrideMap = new Map<string, any>(
      projectOverrides.map((o: any) => [
        o.procedureId,
        o,
      ]),
    );

    return defaults
      .map(defaultProc => {
        const orgOverride =
          organizationOverrideMap.get(defaultProc.id);

        const projectOverride =
          projectOverrideMap.get(defaultProc.id);

        const effectiveContent =
          projectOverride?.content ??
          orgOverride?.content ??
          defaultProc.content;

        return {
          ...defaultProc,
          content: effectiveContent,
          isOverridden:
            Boolean(projectOverride) ||
            Boolean(orgOverride),
          overrideLevel: projectOverride
            ? 'project'
            : orgOverride
              ? 'organization'
              : null,
          isActive: projectOverride
            ? projectOverride.isActive !== false
            : true,
        };
      })
      .filter(proc => {
        const content = proc.content as any;
        const docTypes: string[] =
          Array.isArray(content?.documentTypes)
            ? content.documentTypes
            : [];

        if (docTypes.length === 0) {
          return true;
        }

        return docTypes.includes(documentType);
      });
  }

  // ── Sauvegarder un override par projet ─────────────────────
  async updateForProject(
    id: string,
    organizationId: string,
    projectId: string,
    content: any,
  ) {
    const proc = await this.prisma.procedureDefault.findUnique({
      where: { id },
    });

    if (!proc) {
      throw new NotFoundException('Procédure introuvable');
    }

    await this.prisma.procedureOverride.upsert({
      where: {
        procedureId_organizationId_projectId: {
          procedureId: id,
          organizationId,
          projectId,
        },
      },
      create: {
        procedureId: id,
        organizationId,
        projectId,
        content: this.asInputJson(content),
      },
      update: {
        content: this.asInputJson(content),
      },
    });

    return { success: true };
  }

  // ── Sauvegarder un override organisation ───────────────────
  async updateForOrganization(
    id: string,
    organizationId: string,
    content: any,
  ) {
    const proc = await this.prisma.procedureDefault.findUnique({
      where: { id },
    });

    if (!proc) {
      throw new NotFoundException('Procédure introuvable');
    }

    const existing =
      await this.prisma.procedureOverride.findFirst({
        where: {
          procedureId: id,
          organizationId,
          projectId: null,
        },
      });

    if (existing) {
      await this.prisma.procedureOverride.update({
        where: { id: existing.id },
        data: {
          content: this.asInputJson(content),
        },
      });
    } else {
      await this.prisma.procedureOverride.create({
        data: {
          procedureId: id,
          organizationId,
          projectId: null,
          content: this.asInputJson(content),
        },
      });
    }

    return { success: true };
  }

  // ── Activer/désactiver une procédure pour un projet ────────
  async toggleActiveForProject(
    id: string,
    organizationId: string,
    projectId: string,
    isActive: boolean,
  ) {
    const proc = await this.prisma.procedureDefault.findUnique({
      where: { id },
    });

    if (!proc) {
      throw new NotFoundException('Procédure introuvable');
    }

    const existing =
      await this.prisma.procedureOverride.findUnique({
        where: {
          procedureId_organizationId_projectId: {
            procedureId: id,
            organizationId,
            projectId,
          },
        },
      });

    if (existing) {
      await this.prisma.procedureOverride.update({
        where: { id: existing.id },
        data: { isActive },
      });
    } else {
      // Le toggle seul ne doit pas figer une ancienne version projet
      // si un override organisation existe.
      const orgOverride =
        await this.prisma.procedureOverride.findFirst({
          where: {
            procedureId: id,
            organizationId,
            projectId: null,
          },
        });

      const effectiveContent =
        orgOverride?.content ??
        proc.content;

      await this.prisma.procedureOverride.create({
        data: {
          procedureId: id,
          organizationId,
          projectId,
          content: this.asInputJson(effectiveContent),
          isActive,
        },
      });
    }

    return {
      success: true,
      isActive,
    };
  }

  // ── Restaurer la version par défaut pour un projet ─────────
  async restoreForProject(
    id: string,
    organizationId: string,
    projectId: string,
  ) {
    await this.prisma.procedureOverride.deleteMany({
      where: {
        procedureId: id,
        organizationId,
        projectId,
      },
    });

    return { success: true };
  }

  // ── Restaurer la version organisation ──────────────────────
  async restoreForOrganization(
    id: string,
    organizationId: string,
  ) {
    await this.prisma.procedureOverride.deleteMany({
      where: {
        procedureId: id,
        organizationId,
        projectId: null,
      },
    });

    return { success: true };
  }

  // ── Modifier la procédure par défaut (SUPER_ADMIN) ─────────
  async updateDefault(
    id: string,
    content: any,
  ) {
    const proc = await this.prisma.procedureDefault.findUnique({
      where: { id },
    });

    if (!proc) {
      throw new NotFoundException('Procédure introuvable');
    }

    return this.prisma.procedureDefault.update({
      where: { id },
      data: {
        content: this.asInputJson(content),
      },
    });
  }

  // ── Créer une nouvelle procédure par défaut (SUPER_ADMIN) ──
  async createDefault(content: any) {
    const existing =
      await this.prisma.procedureDefault.findUnique({
        where: { code: content.code },
      });

    if (existing) {
      throw new Error(
        `Une procédure avec le code ${content.code} existe déjà.`,
      );
    }

    return this.prisma.procedureDefault.create({
      data: {
        code: content.code,
        content: this.asInputJson(content),
      },
    });
  }

  // ── Anciennes méthodes par organisation ────────────────────
  //
  // Elles pointent maintenant vers un véritable override
  // organisation (projectId = null), au lieu du pseudo-projet
  // historique "org-level".
  async findOne_legacy(
    id: string,
    organizationId: string,
  ) {
    return this.findOne(id, organizationId);
  }

  async update(
    id: string,
    organizationId: string,
    content: any,
  ) {
    return this.updateForOrganization(
      id,
      organizationId,
      content,
    );
  }

  async restore(
    id: string,
    organizationId: string,
  ) {
    return this.restoreForOrganization(
      id,
      organizationId,
    );
  }

  // ── Supprimer une procédure par défaut (SUPER_ADMIN) ───────
  async deleteDefault(id: string) {
    const proc = await this.prisma.procedureDefault.findUnique({
      where: { id },
    });

    if (!proc) {
      throw new NotFoundException('Procédure introuvable');
    }

    await this.prisma.procedureOverride.deleteMany({
      where: { procedureId: id },
    });

    return this.prisma.procedureDefault.delete({
      where: { id },
    });
  }
}
