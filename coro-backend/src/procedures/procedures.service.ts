import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { getAllProcedures } from '../generator/procedures/index';
import { harmonizeStep } from '../generator/step-style';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AdviserActor, projectAccessWhere } from '../auth/project-access';

/**
 * Corrections de texte des procédures CORO déjà en base. Appliquées au
 * démarrage, seulement si l'ancien texte est encore présent : une version
 * déjà modifiée n'est jamais touchée, et les versions d'organisation ou de
 * projet ne le sont jamais.
 */
export const DEFAULT_TEXT_FIXES: Array<{ code: string; from: string; to: string }> = [
  { code: 'P005', from: 'Informer que la valve interne est située [LOCALISATION VALVE GAZ]', to: 'Informer que la valve interne est située à : [LOCALISATION VALVE GAZ]' },
  { code: 'P005', from: 'Inform that the internal valve is located [GAS VALVE LOCATION]', to: 'Inform that the internal valve is located at: [GAS VALVE LOCATION]' },
  { code: 'P013', from: 'Apporter le DEA, situé [LOCALISATION DEA], si :', to: 'Apporter le DEA (emplacement : [LOCALISATION DEA]) si :' },
  { code: 'P013', from: 'Bring the AED, located [DEA LOCATION], if:', to: 'Bring the AED (location: [DEA LOCATION]) if:' },
];

/** Remplace un texte dans toutes les chaînes d'un contenu JSON. */
export function replaceInContent(value: any, from: string, to: string): any {
  if (typeof value === 'string') return value.split(from).join(to);
  if (Array.isArray(value)) return value.map((item) => replaceInContent(item, from, to));
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, replaceInContent(v, from, to)]));
  }
  return value;
}

@Injectable()
export class ProceduresService implements OnModuleInit {
  private readonly logger = new Logger(ProceduresService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * La bibliothèque CORO vit en base (modifiable par le super-administrateur,
   * personnalisable par organisation et par projet). Au démarrage, les
   * procédures de la bibliothèque absentes de la base y sont créées ; une
   * procédure déjà en base n'est jamais écrasée.
   */
  async onModuleInit() {
    if (process.env.NODE_ENV === 'test') return;
    try {
      const existing = new Set(
        (await this.prisma.procedureDefault.findMany({ select: { code: true } })).map((d) => d.code),
      );
      let created = 0;
      for (const procedure of getAllProcedures()) {
        if (!procedure?.code || existing.has(procedure.code)) continue;
        try {
          await this.prisma.procedureDefault.create({
            data: { code: procedure.code, content: this.asInputJson(procedure) },
          });
          created++;
        } catch (error: any) {
          if (error?.code !== 'P2002') throw error; // créée en parallèle par une autre instance
        }
      }
      if (created > 0) this.logger.log(`Bibliothèque : ${created} procédure(s) ajoutée(s) en base.`);
      await this.applyDefaultTextFixes();
    } catch (error) {
      this.logger.error('Synchronisation de la bibliothèque impossible', error as Error);
    }
  }

  async applyDefaultTextFixes(): Promise<number> {
    let fixed = 0;
    const codes = [...new Set(DEFAULT_TEXT_FIXES.map((f) => f.code))];
    const rows = await this.prisma.procedureDefault.findMany({ where: { code: { in: codes } } });
    for (const row of rows) {
      let content: any = row.content;
      for (const fix of DEFAULT_TEXT_FIXES.filter((f) => f.code === row.code)) {
        if (JSON.stringify(content).includes(JSON.stringify(fix.from).slice(1, -1))) {
          content = replaceInContent(content, fix.from, fix.to);
        }
      }
      if (JSON.stringify(content) !== JSON.stringify(row.content)) {
        await this.prisma.procedureDefault.update({ where: { id: row.id }, data: { content: this.asInputJson(content) } });
        fixed++;
      }
    }
    if (fixed > 0) this.logger.log(`Bibliothèque : texte corrigé dans ${fixed} procédure(s) CORO.`);
    return fixed;
  }

  /**
   * Identifiant en base d'une procédure de la bibliothèque. Accepte aussi
   * l'identifiant de bibliothèque (« p005_fuite_gaz ») ou le code (« P005 »)
   * que portent les documents générés avant la synchronisation.
   */
  private async resolveDefaultId(idOrKey: string): Promise<string> {
    const byId = await this.prisma.procedureDefault.findUnique({ where: { id: idOrKey }, select: { id: true } });
    if (byId) return byId.id;
    const code =
      getAllProcedures().find((p) => p.id === idOrKey)?.code ||
      (/^P\d{3}$/i.test(idOrKey) ? idOrKey.toUpperCase() : undefined);
    if (!code) return idOrKey;
    const byCode = await this.prisma.procedureDefault.findUnique({ where: { code }, select: { id: true } });
    return byCode?.id || idOrKey;
  }

  /** Contenu présenté au même style que le PDF (« **Vérifiez** »), pour l'éditer tel qu'il sera imprimé. */
  private styled(content: any) {
    if (!content || typeof content !== 'object') return content;
    return {
      ...content,
      ...(Array.isArray(content.roleSections)
        ? {
            roleSections: content.roleSections.map((section: any) => ({
              ...section,
              steps: (section.steps || []).map((step: any) => harmonizeStep(step)),
            })),
          }
        : {}),
      ...(Array.isArray(content.directivesGenerales)
        ? { directivesGenerales: content.directivesGenerales.map((step: any) => harmonizeStep(step)) }
        : {}),
    };
  }

  private async assertMutableProject(projectId: string, actor: AdviserActor) {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, ...projectAccessWhere(actor), isActive: true },
      select: { status: true },
    });
    if (!project) throw new NotFoundException('Projet introuvable');
    if (!['DRAFT', 'IN_PROGRESS'].includes(project.status))
      throw new ForbiddenException(
        `Le projet ${project.status} est en lecture seule.`,
      );
  }

  // ── Helper JSON Prisma ─────────────────────────────────────
  //
  // Prisma distingue JsonValue (lecture) et InputJsonValue (écriture).
  // Cette conversion centralisée évite les erreurs TypeScript lorsque
  // l'on réutilise un contenu JSON lu en base dans create/update.
  private asInputJson(value: unknown): Prisma.InputJsonValue {
    return value as Prisma.InputJsonValue;
  }

  // ============================================================
  // Versions de procédures : organisation et versions enregistrées
  // ============================================================

  private requireOrganizationManager(actor: AdviserActor) {
    if (!['ADMIN', 'SUPER_ADMIN'].includes(actor.role))
      throw new ForbiddenException(
        'Seul un administrateur peut modifier la version de l’organisation.',
      );
  }

  private assertContentSize(content: unknown) {
    if (!content || typeof content !== 'object')
      throw new BadRequestException('Contenu de procédure invalide.');
    if (JSON.stringify(content).length > 1_500_000)
      throw new BadRequestException('Procédure trop volumineuse.');
  }

  /** Codes des procédures que l'organisation a personnalisées. */
  async organizationVersions(actor: AdviserActor) {
    const overrides = await this.prisma.procedureOverride.findMany({
      where: { organizationId: actor.organizationId, projectId: null },
      select: { updatedAt: true, procedure: { select: { id: true, code: true } } },
    });
    return overrides.map((o) => ({ procedureId: o.procedure.id, code: o.procedure.code, updatedAt: o.updatedAt }));
  }

  /** Version de l'organisation (administrateur). */
  async saveOrganizationVersion(id: string, content: unknown, actor: AdviserActor) {
    this.requireOrganizationManager(actor);
    this.assertContentSize(content);
    id = await this.resolveDefaultId(id);
    return this.updateForOrganization(id, actor.organizationId, content);
  }

  /** Retour à la version CORO pour l'organisation (administrateur). */
  async resetOrganizationVersion(id: string, actor: AdviserActor) {
    this.requireOrganizationManager(actor);
    id = await this.resolveDefaultId(id);
    await this.restoreForOrganization(id, actor.organizationId);
    return { success: true };
  }

  private variantView(variant: any, actor: AdviserActor) {
    return {
      id: variant.id,
      procedureId: variant.procedureId,
      code: variant.procedure?.code ?? (variant.content as any)?.code,
      title: (variant.content as any)?.titleFR,
      name: variant.name,
      ownerName: variant.ownerName,
      isMine: variant.ownerId === actor.userId,
      sharedWithOrganization: variant.sharedWithOrganization,
      updatedAt: variant.updatedAt,
    };
  }

  /** Mes versions + celles partagées dans mon organisation (option : pour une procédure). */
  async listVariants(actor: AdviserActor, procedureId?: string) {
    const resolved = procedureId ? await this.resolveDefaultId(procedureId) : undefined;
    const variants = await this.prisma.procedureVariant.findMany({
      where: {
        organizationId: actor.organizationId,
        ...(resolved ? { procedureId: resolved } : {}),
        OR: [{ ownerId: actor.userId }, { sharedWithOrganization: true }],
      },
      include: { procedure: { select: { code: true } } },
      orderBy: [{ updatedAt: 'desc' }],
    });
    return variants.map((variant) => this.variantView(variant, actor));
  }

  /** Enregistre la version affichée dans l'éditeur sous un nom, pour la réutiliser. */
  async createVariant(
    id: string,
    body: { name?: unknown; content?: unknown; sourceProjectId?: unknown },
    actor: AdviserActor & { email?: string; firstName?: string; lastName?: string },
  ) {
    id = await this.resolveDefaultId(id);
    const proc = await this.prisma.procedureDefault.findUnique({ where: { id }, select: { id: true } });
    if (!proc) throw new NotFoundException('Procédure introuvable');
    const name = typeof body?.name === 'string' ? body.name.trim().slice(0, 120) : '';
    if (!name) throw new BadRequestException('Donnez un nom à cette version.');
    this.assertContentSize(body?.content);
    const sourceProjectId =
      typeof body?.sourceProjectId === 'string' && body.sourceProjectId ? body.sourceProjectId : null;
    if (sourceProjectId) {
      const project = await this.prisma.project.findFirst({
        where: { id: sourceProjectId, ...projectAccessWhere(actor) },
        select: { id: true },
      });
      if (!project) throw new NotFoundException('Projet introuvable');
    }
    const owner = await this.prisma.user.findUnique({
      where: { id: actor.userId },
      select: { firstName: true, lastName: true, email: true },
    });
    const ownerName =
      [owner?.firstName, owner?.lastName].filter(Boolean).join(' ').trim() || owner?.email || null;
    const variant = await this.prisma.procedureVariant.create({
      data: {
        organizationId: actor.organizationId,
        procedureId: id,
        ownerId: actor.userId,
        ownerName,
        name,
        content: this.asInputJson(body.content),
        sourceProjectId,
      },
      include: { procedure: { select: { code: true } } },
    });
    return this.variantView(variant, actor);
  }

  private async findVariant(variantId: string, actor: AdviserActor) {
    const variant = await this.prisma.procedureVariant.findFirst({
      where: {
        id: variantId,
        organizationId: actor.organizationId,
        OR: [{ ownerId: actor.userId }, { sharedWithOrganization: true }],
      },
      include: { procedure: { select: { code: true } } },
    });
    if (!variant) throw new NotFoundException('Version introuvable');
    return variant;
  }

  /** Renommer ou partager / retirer le partage (auteur; un administrateur peut retirer un partage). */
  async updateVariant(
    variantId: string,
    body: { name?: unknown; sharedWithOrganization?: unknown },
    actor: AdviserActor,
  ) {
    const variant = await this.findVariant(variantId, actor);
    const isOwner = variant.ownerId === actor.userId;
    const isManager = ['ADMIN', 'SUPER_ADMIN'].includes(actor.role);
    const data: { name?: string; sharedWithOrganization?: boolean } = {};
    if (typeof body?.name === 'string') {
      if (!isOwner) throw new ForbiddenException('Seul l’auteur peut renommer cette version.');
      const name = body.name.trim().slice(0, 120);
      if (!name) throw new BadRequestException('Donnez un nom à cette version.');
      data.name = name;
    }
    if (typeof body?.sharedWithOrganization === 'boolean') {
      if (!isOwner && !(isManager && body.sharedWithOrganization === false))
        throw new ForbiddenException('Seul l’auteur peut partager cette version.');
      data.sharedWithOrganization = body.sharedWithOrganization;
    }
    if (Object.keys(data).length === 0) throw new BadRequestException('Aucune modification.');
    const updated = await this.prisma.procedureVariant.update({
      where: { id: variant.id },
      data,
      include: { procedure: { select: { code: true } } },
    });
    return this.variantView(updated, actor);
  }

  async deleteVariant(variantId: string, actor: AdviserActor) {
    const variant = await this.findVariant(variantId, actor);
    const isManager = ['ADMIN', 'SUPER_ADMIN'].includes(actor.role);
    if (variant.ownerId !== actor.userId && !(isManager && variant.sharedWithOrganization))
      throw new ForbiddenException('Seul l’auteur peut supprimer cette version.');
    await this.prisma.procedureVariant.delete({ where: { id: variant.id } });
    return { success: true };
  }

  /** Applique une version enregistrée à un projet (devient la version du projet). */
  async applyVariant(variantId: string, projectId: string, actor: AdviserActor) {
    const variant = await this.findVariant(variantId, actor);
    await this.updateForProject(variant.procedureId, projectId, variant.content, actor);
    return { success: true, procedureId: variant.procedureId };
  }

  /** Fait d'une version partagée la version officielle de l'organisation (administrateur). */
  async promoteVariant(variantId: string, actor: AdviserActor) {
    this.requireOrganizationManager(actor);
    const variant = await this.findVariant(variantId, actor);
    await this.updateForOrganization(variant.procedureId, actor.organizationId, variant.content);
    return { success: true, procedureId: variant.procedureId };
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
  async findOne(id: string, projectId: string | undefined, actor: AdviserActor) {
    id = await this.resolveDefaultId(id);
    const organizationId = actor.organizationId;
    const proc = await this.prisma.procedureDefault.findUnique({
      where: { id },
    });

    if (!proc) {
      throw new NotFoundException('Procédure introuvable');
    }

    // Override projet — priorité maximale
    if (projectId) {
      const project = await this.prisma.project.findFirst({
        where: { id: projectId, ...projectAccessWhere(actor) },
        select: { id: true },
      });
      if (!project) throw new NotFoundException('Projet introuvable');
      const projectOverride = await this.prisma.procedureOverride.findUnique({
        where: {
          procedureId_organizationId_projectId: {
            procedureId: id,
            organizationId,
            projectId,
          },
        },
      });

      if (projectOverride) {
        const hasOrganizationVersion = !!(await this.prisma.procedureOverride.findFirst({
          where: { procedureId: id, organizationId, projectId: null },
          select: { id: true },
        }));
        return {
          ...proc,
          content: this.styled(projectOverride.content),
          isActive: projectOverride.isActive,
          isOverridden: true,
          overrideLevel: 'project',
          // Vers quoi « Restaurer » revient : la version de l'organisation ou celle de CORO.
          restoresTo: hasOrganizationVersion ? 'organization' : 'coro',
        };
      }
    }

    // Override organisation
    const orgOverride = await this.prisma.procedureOverride.findFirst({
      where: {
        procedureId: id,
        organizationId,
        projectId: null,
      },
    });

    if (orgOverride) {
      return {
        ...proc,
        content: this.styled(orgOverride.content),
        isActive: true,
        isOverridden: true,
        overrideLevel: 'organization',
        restoresTo: 'coro',
      };
    }

    return {
      ...proc,
      content: this.styled(proc.content),
      isOverridden: false,
      overrideLevel: null,
      restoresTo: null,
    };
  }

  // ── Toutes les procédures d'un projet ─────────────────────
  //
  // Applique :
  // projet > organisation > défaut
  // + état isActive propre au projet
  async findAllForProject(projectId: string, actor: AdviserActor) {
    const organizationId = actor.organizationId;
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, ...projectAccessWhere(actor) },
      select: { documentType: true },
    });

    if (!project) {
      throw new NotFoundException('Projet introuvable');
    }

    const documentType = project.documentType || 'PMU';

    const [defaults, organizationOverrides, projectOverrides] =
      await Promise.all([
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
      organizationOverrides.map((o: any) => [o.procedureId, o]),
    );

    const projectOverrideMap = new Map<string, any>(
      projectOverrides.map((o: any) => [o.procedureId, o]),
    );

    return defaults
      .map((defaultProc) => {
        const orgOverride = organizationOverrideMap.get(defaultProc.id);

        const projectOverride = projectOverrideMap.get(defaultProc.id);

        const effectiveContent =
          projectOverride?.content ??
          orgOverride?.content ??
          defaultProc.content;

        return {
          ...defaultProc,
          content: effectiveContent,
          isOverridden: Boolean(projectOverride) || Boolean(orgOverride),
          overrideLevel: projectOverride
            ? 'project'
            : orgOverride
              ? 'organization'
              : null,
          isActive: projectOverride ? projectOverride.isActive !== false : true,
        };
      })
      .filter((proc) => {
        const content = proc.content as any;
        const docTypes: string[] = Array.isArray(content?.documentTypes)
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
    projectId: string,
    content: any,
    actor: AdviserActor,
  ) {
    id = await this.resolveDefaultId(id);
    await this.assertMutableProject(projectId, actor);
    const organizationId = actor.organizationId;
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
    id = await this.resolveDefaultId(id);
    const proc = await this.prisma.procedureDefault.findUnique({
      where: { id },
    });

    if (!proc) {
      throw new NotFoundException('Procédure introuvable');
    }

    const existing = await this.prisma.procedureOverride.findFirst({
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
    projectId: string,
    isActive: boolean,
    actor: AdviserActor,
  ) {
    id = await this.resolveDefaultId(id);
    await this.assertMutableProject(projectId, actor);
    const organizationId = actor.organizationId;
    const proc = await this.prisma.procedureDefault.findUnique({
      where: { id },
    });

    if (!proc) {
      throw new NotFoundException('Procédure introuvable');
    }

    const existing = await this.prisma.procedureOverride.findUnique({
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
      const orgOverride = await this.prisma.procedureOverride.findFirst({
        where: {
          procedureId: id,
          organizationId,
          projectId: null,
        },
      });

      const effectiveContent = orgOverride?.content ?? proc.content;

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
  async restoreForProject(id: string, projectId: string, actor: AdviserActor) {
    id = await this.resolveDefaultId(id);
    await this.assertMutableProject(projectId, actor);
    const organizationId = actor.organizationId;
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
  async restoreForOrganization(id: string, organizationId: string) {
    id = await this.resolveDefaultId(id);
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
  async updateDefault(id: string, content: any) {
    id = await this.resolveDefaultId(id);
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
    const existing = await this.prisma.procedureDefault.findUnique({
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
  async findOne_legacy(id: string, organizationId: string) {
    return this.findOne(id, undefined, {
      userId: 'legacy-read',
      organizationId,
      role: 'ADMIN',
    });
  }

  async update(id: string, organizationId: string, content: any) {
    return this.updateForOrganization(id, organizationId, content);
  }

  async restore(id: string, organizationId: string) {
    return this.restoreForOrganization(id, organizationId);
  }

  // ── Supprimer une procédure par défaut (SUPER_ADMIN) ───────
  async deleteDefault(id: string) {
    id = await this.resolveDefaultId(id);
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
