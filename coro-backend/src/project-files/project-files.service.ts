import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { NotificationsService } from '../notifications/notifications.service';
import { createHash, randomUUID } from 'crypto';
import { Prisma, ProjectFileLifecycleState } from '@prisma/client';
import { AdviserActor, projectAccessWhere } from '../auth/project-access';

const PRIVATE_PROJECT_FILE_URL = 'private:project-file';
const MIN_REASON_LENGTH = 8;

@Injectable()
export class ProjectFilesService {
  constructor(
    private prisma: PrismaService,
    private storage: StorageService,
    private notificationsService: NotificationsService,
  ) {}

  async uploadFile(data: {
    projectId?: string;
    buildingId?: string;
    organizationId: string;
    name: string;
    category: string;
    buffer: Buffer;
    mimeType: string;
    size: number;
    visibility: string;
    uploadedById?: string;
    uploadedByClientId?: string;
    parentId?: string;
    permittedBuildingIds?: string[];
    actor?: AdviserActor;
  }) {
    const project = data.projectId
      ? await this.prisma.project.findFirst({
          where: {
            id: data.projectId,
            organizationId: data.organizationId,
            isActive: true,
            ...(data.actor ? projectAccessWhere(data.actor) : {}),
            ...(data.actor ? { status: { not: 'ARCHIVED' as const } } : {}),
            ...(data.permittedBuildingIds !== undefined
              ? { buildingId: { in: data.permittedBuildingIds } }
              : {}),
          },
        })
      : null;
    if (data.projectId && !project)
      throw new NotFoundException('Projet introuvable');
    const buildingId = project?.buildingId ?? data.buildingId;
    const building = buildingId
      ? await this.prisma.building.findFirst({
          where: {
            id: buildingId,
            organizationId: data.organizationId,
            ...(data.permittedBuildingIds !== undefined
              ? {
                  id: { in: data.permittedBuildingIds },
                  AND: { id: buildingId },
                }
              : {}),
          },
          select: { id: true },
        })
      : null;
    if (!building) throw new NotFoundException('Bâtiment introuvable');
    if (!['shared', 'internal'].includes(data.visibility))
      throw new BadRequestException('Visibilité invalide');
    if (!data.buffer?.length || data.buffer.length > 50 * 1024 * 1024)
      throw new BadRequestException('Fichier vide ou supérieur à 50 Mo');

    // Déterminer la version
    let version = 1;
    let parentId = data.parentId;

    if (parentId) {
      const parent = await this.prisma.projectFile.findFirst({
        where: {
          id: parentId,
          ...(data.projectId ? { projectId: data.projectId } : {}),
          buildingId,
          organizationId: data.organizationId,
          ...(data.uploadedByClientId ? { visibility: 'shared' } : {}),
        },
      });
      if (!parent) throw new NotFoundException('Document parent introuvable');
      if (parent) {
        parentId = parent.parentId ?? parent.id;
        const lastVersion = await this.prisma.projectFile.findFirst({
          where: { OR: [{ id: parentId }, { parentId }] },
          orderBy: { version: 'desc' },
        });
        version = (lastVersion?.version || 1) + 1;
      }
    }

    // Store new project documents through the canonical private authority.
    // The legacy public URL remains on historical rows only.
    const id = randomUUID();
    const safeName = data.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const storageKey = `tenant-${data.organizationId}/building-files/${buildingId}/${id}/${safeName}`;

    await this.storage.uploadPrivateImmutable(
      data.buffer,
      storageKey,
      data.mimeType,
    );

    const digest = createHash('sha256').update(data.buffer).digest('hex');
    const file = await this.prisma.$transaction(async (tx) => {
      if (parentId) {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`${data.organizationId}:${parentId}`}, 0))`;
        const latest = await tx.projectFile.findFirst({
          where: {
            organizationId: data.organizationId,
            OR: [{ id: parentId }, { parentId }],
          },
          orderBy: { version: 'desc' },
        });
        version = (latest?.version ?? 1) + 1;
      }
      const created = await tx.projectFile.create({
        data: {
          id,
          projectId: data.projectId ?? null,
          buildingId,
          organizationId: data.organizationId,
          name: data.name,
          category: data.category,
          size: data.size,
          mimeType: data.mimeType,
          storageKey,
          url: PRIVATE_PROJECT_FILE_URL,
          version,
          parentId: parentId || null,
          uploadedById: data.uploadedById || null,
          uploadedByClientId: data.uploadedByClientId || null,
          visibility: data.visibility,
          status: 'en_revision',
          lifecycleState: 'DRAFT',
          sha256: digest,
        },
        include: {
          uploadedBy: { select: { firstName: true, lastName: true } },
          uploadedByClient: { select: { firstName: true, lastName: true } },
        },
      });
      await tx.projectFileLifecycleEvent.create({
        data: {
          projectFileId: created.id,
          organizationId: data.organizationId,
          projectId: data.projectId,
          requestId: `upload:${created.id}`,
          action: 'UPLOADED',
          fromState: null,
          toState: 'DRAFT',
          actorType: data.uploadedByClientId ? 'CLIENT_USER' : 'USER',
          actorId: data.uploadedByClientId ?? data.uploadedById ?? 'SYSTEM',
          metadata: {
            version,
            sha256: digest,
          },
        },
      });
      return created;
    });

    // Le conseiller responsable du projet n'a aucun autre moyen d'apprendre
    // qu'un client a redéposé un fichier (annotation) — sans ceci, il faut
    // tomber dessus par hasard en retournant sur le projet.
    if (data.uploadedByClientId && project) {
      const clientName = file.uploadedByClient
        ? `${file.uploadedByClient.firstName} ${file.uploadedByClient.lastName}`
        : 'Un client';

      await this.notificationsService.create({
        userId: project.userId,
        organizationId: data.organizationId,
        type: 'FICHIER_CLIENT',
        title: 'Fichier déposé par le client',
        message: `${clientName} a déposé un fichier ("${data.name}") dans l'espace de fichiers du projet "${project.name}".`,
        projectId: project.id,
      });
    }

    return this.safeFile(file);
  }

  async requestReview(data: {
    fileId: string;
    organizationId: string;
    actorId: string;
    actor?: AdviserActor;
    reason: string;
    requestId: string;
    lockVersion: number;
  }) {
    this.assertTransitionInput(data.reason, data.requestId, data.lockVersion);
    return this.transition(data, 'DRAFT', 'REVIEW', 'REVIEW_REQUESTED', {
      reviewRequestedAt: new Date(),
      reviewRequestedById: data.actorId,
    });
  }

  async approveFile(data: {
    fileId: string;
    organizationId: string;
    actorId: string;
    actor?: AdviserActor;
    reason: string;
    requestId: string;
    lockVersion: number;
    effectiveAt: string;
    expiresAt?: string;
  }) {
    this.assertTransitionInput(data.reason, data.requestId, data.lockVersion);
    const effectiveAt = this.parseDate(data.effectiveAt, 'effectiveAt');
    const expiresAt = data.expiresAt
      ? this.parseDate(data.expiresAt, 'expiresAt')
      : null;
    if (expiresAt && expiresAt <= effectiveAt)
      throw new BadRequestException('expiresAt doit suivre effectiveAt');

    return this.prisma.$transaction(async (tx) => {
      const file = await this.loadForCustodian(
        tx,
        data.fileId,
        data.organizationId,
        data.actorId,
        data.actor,
      );
      const existingEvent = await tx.projectFileLifecycleEvent.findUnique({
        where: {
          projectFileId_requestId: {
            projectFileId: file.id,
            requestId: data.requestId,
          },
        },
      });
      if (existingEvent) return this.safeFile(file);
      if (file.lifecycleState !== 'REVIEW')
        throw new ConflictException('Le fichier doit être en révision');

      const rootId = file.parentId ?? file.id;
      // Serialize approvals per tenant and documentary chain. The statement is
      // fixed and accepts no caller-controlled SQL fragment.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`${data.organizationId}:${rootId}`}, 0))`;
      const approved = await tx.projectFile.findMany({
        where: {
          organizationId: data.organizationId,
          lifecycleState: 'APPROVED',
          OR: [{ id: rootId }, { parentId: rootId }],
        },
      });
      const now = new Date();
      if (
        approved.some(
          (candidate) =>
            candidate.id !== file.id &&
            candidate.effectiveAt?.getTime() === effectiveAt.getTime(),
        )
      )
        throw new ConflictException(
          'Une version approuvee existe deja a cette date effective',
        );
      for (const previous of approved) {
        if (previous.id === file.id) continue;
        const supersessionIsEffective = effectiveAt.getTime() <= now.getTime();
        await tx.projectFile.update({
          where: { id: previous.id },
          data: {
            lifecycleState: supersessionIsEffective ? 'SUPERSEDED' : 'APPROVED',
            supersededAt: supersessionIsEffective ? now : null,
            supersededById: data.actorId,
            supersededEffectiveAt: effectiveAt,
            supersededByFileId: file.id,
            lockVersion: { increment: 1 },
          },
        });
        await tx.projectFileLifecycleEvent.create({
          data: {
            projectFileId: previous.id,
            organizationId: previous.organizationId,
            projectId: previous.projectId,
            requestId: `${data.requestId}:supersede:${previous.id}`,
            action: supersessionIsEffective
              ? 'SUPERSEDED'
              : 'SUPERSESSION_SCHEDULED',
            fromState: 'APPROVED',
            toState: supersessionIsEffective ? 'SUPERSEDED' : 'APPROVED',
            actorType: 'USER',
            actorId: data.actorId,
            reason: data.reason,
            metadata: { supersededByFileId: file.id },
          },
        });
      }

      const changed = await tx.projectFile.updateMany({
        where: {
          id: file.id,
          organizationId: data.organizationId,
          lifecycleState: 'REVIEW',
          lockVersion: data.lockVersion,
        },
        data: {
          lifecycleState: 'APPROVED',
          status: 'valide',
          approvedAt: now,
          approvedById: data.actorId,
          effectiveAt,
          expiresAt,
          lockVersion: { increment: 1 },
        },
      });
      if (changed.count !== 1)
        throw new ConflictException('Version concurrente du fichier');
      await tx.projectFileLifecycleEvent.create({
        data: {
          projectFileId: file.id,
          organizationId: file.organizationId,
          projectId: file.projectId,
          requestId: data.requestId,
          action: 'APPROVED',
          fromState: 'REVIEW',
          toState: 'APPROVED',
          actorType: 'USER',
          actorId: data.actorId,
          reason: data.reason,
          metadata: {
            effectiveAt: effectiveAt.toISOString(),
            expiresAt: expiresAt?.toISOString() ?? null,
          },
        },
      });
      const updated = await tx.projectFile.findUnique({
        where: { id: file.id },
      });
      return this.safeFile(updated!);
    });
  }

  async resolveCurrentVersion(
    fileId: string,
    organizationId: string,
    asOf = new Date(),
    permittedBuildingIds?: string[],
    actor?: AdviserActor,
  ) {
    if (Number.isNaN(asOf.getTime()))
      throw new BadRequestException('Date de resolution invalide');
    const requested = await this.prisma.projectFile.findFirst({
      where: {
        id: fileId,
        organizationId,
        ...(actor
          ? {
              project: { is: { isActive: true, ...projectAccessWhere(actor) } },
            }
          : {}),
        OR: [
          {
            building: {
              organizationId,
              ...(permittedBuildingIds !== undefined
                ? { id: { in: permittedBuildingIds } }
                : {}),
            },
          },
          {
            buildingId: null,
            project: {
              organizationId,
              ...(permittedBuildingIds !== undefined
                ? { buildingId: { in: permittedBuildingIds } }
                : {}),
            },
          },
        ],
      },
      select: { id: true, parentId: true },
    });
    if (!requested) throw new NotFoundException('Fichier introuvable');
    const rootId = requested.parentId ?? requested.id;
    const candidates = await this.prisma.projectFile.findMany({
      where: {
        organizationId,
        lifecycleState: 'APPROVED',
        OR: [{ id: rootId }, { parentId: rootId }],
        effectiveAt: { lte: asOf },
        AND: [
          { OR: [{ expiresAt: null }, { expiresAt: { gt: asOf } }] },
          {
            OR: [
              { supersededEffectiveAt: null },
              { supersededEffectiveAt: { gt: asOf } },
            ],
          },
        ],
      },
      orderBy: [{ effectiveAt: 'desc' }, { version: 'desc' }],
      take: 2,
    });
    if (candidates.length === 0)
      throw new NotFoundException('Aucune version courante');
    if (
      candidates.length > 1 &&
      candidates[0].effectiveAt?.getTime() ===
        candidates[1].effectiveAt?.getTime()
    )
      throw new ConflictException('Resolution courante ambigue');
    return this.safeFile({ ...candidates[0], isCurrent: true });
  }

  async configureDocumentGovernance(data: {
    fileId: string;
    organizationId: string;
    actorId: string;
    actor?: AdviserActor;
    reason: string;
    requestId: string;
    lockVersion: number;
    documentResponsibleUserId?: string;
    expiryEscalationUserId?: string;
    historicalDownloadAllowed: boolean;
  }) {
    this.assertTransitionInput(data.reason, data.requestId, data.lockVersion);
    return this.prisma.$transaction(async (tx) => {
      const file = await this.loadForCustodian(
        tx,
        data.fileId,
        data.organizationId,
        data.actorId,
        data.actor,
      );
      if (!file.lifecycleState)
        throw new ConflictException('Document historique sans cycle gouverne');
      const recipientIds = [
        data.documentResponsibleUserId,
        data.expiryEscalationUserId,
      ].filter((value): value is string => Boolean(value));
      if (recipientIds.length) {
        const validRecipients = await tx.user.count({
          where: {
            id: { in: recipientIds },
            organizationId: data.organizationId,
            isActive: true,
          },
        });
        if (validRecipients !== new Set(recipientIds).size)
          throw new BadRequestException(
            'Responsable documentaire ou escalade invalide',
          );
      }
      const existingEvent = await tx.projectFileLifecycleEvent.findUnique({
        where: {
          projectFileId_requestId: {
            projectFileId: file.id,
            requestId: data.requestId,
          },
        },
      });
      if (existingEvent) return this.safeFile(file);
      const changed = await tx.projectFile.updateMany({
        where: {
          id: file.id,
          organizationId: data.organizationId,
          lockVersion: data.lockVersion,
        },
        data: {
          documentResponsibleUserId: data.documentResponsibleUserId ?? null,
          expiryEscalationUserId: data.expiryEscalationUserId ?? null,
          historicalDownloadAllowedAt: data.historicalDownloadAllowed
            ? new Date()
            : null,
          historicalDownloadAuthorizedById: data.historicalDownloadAllowed
            ? data.actorId
            : null,
          historicalDownloadReason: data.reason.trim(),
          lockVersion: { increment: 1 },
        },
      });
      if (changed.count !== 1)
        throw new ConflictException('Version concurrente du fichier');
      await tx.projectFileLifecycleEvent.create({
        data: {
          projectFileId: file.id,
          organizationId: file.organizationId,
          projectId: file.projectId,
          requestId: data.requestId,
          action: data.historicalDownloadAllowed
            ? 'HISTORICAL_ACCESS_AUTHORIZED'
            : 'HISTORICAL_ACCESS_REVOKED',
          fromState: file.lifecycleState,
          toState: file.lifecycleState,
          actorType: 'USER',
          actorId: data.actorId,
          reason: data.reason.trim(),
          metadata: {
            documentResponsibleUserId: data.documentResponsibleUserId ?? null,
            expiryEscalationUserId: data.expiryEscalationUserId ?? null,
          },
        },
      });
      return this.safeFile(
        (await tx.projectFile.findUnique({ where: { id: file.id } }))!,
      );
    });
  }

  async revokeFile(data: {
    fileId: string;
    organizationId: string;
    actorId: string;
    actor?: AdviserActor;
    reason: string;
    requestId: string;
    lockVersion: number;
  }) {
    this.assertTransitionInput(data.reason, data.requestId, data.lockVersion);
    const file = await this.prisma.projectFile.findFirst({
      where: {
        id: data.fileId,
        organizationId: data.organizationId,
        ...(data.actor
          ? {
              project: {
                is: {
                  isActive: true,
                  status: { not: 'ARCHIVED' },
                  ...projectAccessWhere(data.actor),
                },
              },
            }
          : {}),
      },
    });
    if (!file) throw new NotFoundException('Fichier introuvable');
    if (!file.lifecycleState)
      throw new ConflictException('Document historique sans cycle gouverné');
    if (file.lifecycleState === 'REVOKED') return this.safeFile(file);
    return this.transition(data, file.lifecycleState, 'REVOKED', 'REVOKED', {
      revokedAt: new Date(),
      revokedById: data.actorId,
      revocationReason: data.reason,
    });
  }

  async setOfflineClassification(data: {
    fileId: string;
    organizationId: string;
    actorId: string;
    actor?: AdviserActor;
    classification: 'PROHIBITED' | 'NON_SENSITIVE_EMERGENCY';
    reason: string;
    requestId: string;
    lockVersion: number;
  }) {
    this.assertTransitionInput(data.reason, data.requestId, data.lockVersion);
    return this.prisma.$transaction(async (tx) => {
      const file = await this.loadForCustodian(
        tx,
        data.fileId,
        data.organizationId,
        data.actorId,
        data.actor,
      );
      if (file.lifecycleState !== 'APPROVED')
        throw new ConflictException(
          'Seule une version approuvee peut etre classifiee hors ligne',
        );
      const existingEvent = await tx.projectFileLifecycleEvent.findUnique({
        where: {
          projectFileId_requestId: {
            projectFileId: file.id,
            requestId: data.requestId,
          },
        },
      });
      if (existingEvent) return this.safeFile(file);
      const changed = await tx.projectFile.updateMany({
        where: {
          id: file.id,
          organizationId: data.organizationId,
          lifecycleState: 'APPROVED',
          lockVersion: data.lockVersion,
        },
        data: {
          offlineClassification: data.classification,
          offlineApprovedAt:
            data.classification === 'NON_SENSITIVE_EMERGENCY'
              ? new Date()
              : null,
          offlineApprovedById:
            data.classification === 'NON_SENSITIVE_EMERGENCY'
              ? data.actorId
              : null,
          offlineApprovalReason: data.reason.trim(),
          lockVersion: { increment: 1 },
        },
      });
      if (changed.count !== 1)
        throw new ConflictException('Version concurrente du fichier');
      await tx.projectFileLifecycleEvent.create({
        data: {
          projectFileId: file.id,
          organizationId: file.organizationId,
          projectId: file.projectId,
          requestId: data.requestId,
          action:
            data.classification === 'NON_SENSITIVE_EMERGENCY'
              ? 'OFFLINE_CLASSIFICATION_APPROVED'
              : 'OFFLINE_CLASSIFICATION_REMOVED',
          fromState: 'APPROVED',
          toState: 'APPROVED',
          actorType: 'USER',
          actorId: data.actorId,
          reason: data.reason.trim(),
          metadata: { classification: data.classification },
        },
      });
      const updated = await tx.projectFile.findUnique({
        where: { id: file.id },
      });
      return this.safeFile(updated!);
    });
  }

  async getFilesForProject(
    projectId: string,
    visibility: string | undefined,
    organizationId: string,
    permittedBuildingIds?: string[],
    actor?: AdviserActor,
  ) {
    const project = await this.prisma.project.findFirst({
      where: {
        id: projectId,
        organizationId,
        isActive: true,
        ...(actor ? projectAccessWhere(actor) : {}),
        ...(permittedBuildingIds !== undefined
          ? { buildingId: { in: permittedBuildingIds } }
          : {}),
      },
      select: { id: true },
    });
    if (!project) throw new NotFoundException('Projet introuvable');
    const where: any = {
      projectId,
      organizationId,
      parentId: null, // Seulement les fichiers racine (pas les versions)
    };
    if (visibility) where.visibility = visibility;

    const files = await this.prisma.projectFile.findMany({
      where,
      include: {
        uploadedBy: { select: { firstName: true, lastName: true } },
        uploadedByClient: { select: { firstName: true, lastName: true } },
        versions: {
          orderBy: { version: 'desc' },
          include: {
            uploadedBy: { select: { firstName: true, lastName: true } },
            uploadedByClient: { select: { firstName: true, lastName: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const now = Date.now();
    return files.map((file) => {
      const chain = [file, ...file.versions];
      const current = chain
        .filter(
          (candidate) =>
            candidate.lifecycleState === 'APPROVED' &&
            (!candidate.effectiveAt ||
              candidate.effectiveAt.getTime() <= now) &&
            (!candidate.expiresAt || candidate.expiresAt.getTime() > now) &&
            (!candidate.supersededEffectiveAt ||
              candidate.supersededEffectiveAt.getTime() > now),
        )
        .sort(
          (left, right) =>
            (right.effectiveAt?.getTime() ?? 0) -
              (left.effectiveAt?.getTime() ?? 0) ||
            right.version - left.version,
        )[0];
      return this.safeFile({
        ...file,
        isCurrent: current?.id === file.id,
        versions: file.versions.map((version) => ({
          ...version,
          isCurrent: current?.id === version.id,
        })),
      });
    });
  }

  async getSignedUrl(
    fileId: string,
    organizationId: string,
    actor?: AdviserActor,
  ) {
    const file = await this.prisma.projectFile.findFirst({
      where: {
        id: fileId,
        organizationId,
        ...(actor
          ? {
              project: { is: { isActive: true, ...projectAccessWhere(actor) } },
            }
          : {}),
      },
    });
    if (!file) throw new NotFoundException('Fichier introuvable');
    // Preserve the response shape without exposing the persisted reference.
    return {
      url: `/api/project-files/${file.id}/content`,
      name: file.name,
    };
  }

  async downloadPrivateFile(
    fileId: string,
    organizationId: string,
    permittedBuildingIds?: string[],
    sharedOnly = false,
    actor?: AdviserActor,
  ) {
    const file = await this.prisma.projectFile.findFirst({
      where: {
        id: fileId,
        organizationId,
        ...(actor
          ? {
              project: { is: { isActive: true, ...projectAccessWhere(actor) } },
            }
          : {}),
        ...(sharedOnly ? { visibility: 'shared' } : {}),
        OR: [
          {
            building: {
              organizationId,
              ...(permittedBuildingIds !== undefined
                ? { id: { in: permittedBuildingIds } }
                : {}),
            },
          },
          {
            buildingId: null,
            project: {
              organizationId,
              ...(permittedBuildingIds !== undefined
                ? { buildingId: { in: permittedBuildingIds } }
                : {}),
            },
          },
        ],
      },
    });
    if (!file) throw new NotFoundException('Fichier prive introuvable');
    if (file.lifecycleState === 'REVOKED')
      throw new NotFoundException('Fichier prive introuvable');
    if (
      file.lifecycleState === 'SUPERSEDED' &&
      !file.historicalDownloadAllowedAt
    )
      throw new NotFoundException('Fichier prive introuvable');
    if (file.effectiveAt && file.effectiveAt.getTime() > Date.now())
      throw new NotFoundException('Fichier prive introuvable');
    if (
      file.supersededEffectiveAt &&
      file.supersededEffectiveAt.getTime() <= Date.now() &&
      !file.historicalDownloadAllowedAt
    )
      throw new NotFoundException('Fichier prive introuvable');
    if (file.expiresAt && file.expiresAt.getTime() <= Date.now())
      throw new NotFoundException('Fichier prive introuvable');
    const storageKey = file.storageKey;
    if (
      !storageKey ||
      storageKey.startsWith('/') ||
      storageKey.includes('..') ||
      storageKey.includes('\\') ||
      /^[a-z][a-z0-9+.-]*:/i.test(storageKey)
    ) {
      throw new NotFoundException('Reference documentaire historique invalide');
    }
    return {
      buffer: await this.storage.downloadPrivate(storageKey),
      mimeType: file.mimeType,
      name: file.name,
    };
  }

  async getLifecycleHistory(
    fileId: string,
    organizationId: string,
    permittedBuildingIds?: string[],
    actor?: AdviserActor,
  ) {
    const file = await this.prisma.projectFile.findFirst({
      where: {
        id: fileId,
        organizationId,
        ...(actor
          ? {
              project: { is: { isActive: true, ...projectAccessWhere(actor) } },
            }
          : {}),
        OR: [
          {
            building: {
              organizationId,
              ...(permittedBuildingIds !== undefined
                ? { id: { in: permittedBuildingIds } }
                : {}),
            },
          },
          {
            buildingId: null,
            project: {
              organizationId,
              ...(permittedBuildingIds !== undefined
                ? { buildingId: { in: permittedBuildingIds } }
                : {}),
            },
          },
        ],
      },
      select: { id: true },
    });
    if (!file) throw new NotFoundException('Fichier introuvable');
    return this.prisma.projectFileLifecycleEvent.findMany({
      where: { projectFileId: file.id, organizationId },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        action: true,
        fromState: true,
        toState: true,
        actorType: true,
        actorId: true,
        reason: true,
        metadata: true,
        createdAt: true,
      },
    });
  }

  private assertTransitionInput(
    reason: string,
    requestId: string,
    lockVersion: number,
  ) {
    if (!reason?.trim() || reason.trim().length < MIN_REASON_LENGTH)
      throw new BadRequestException('Justification obligatoire');
    if (!requestId?.trim() || requestId.length > 120)
      throw new BadRequestException('requestId invalide');
    if (!Number.isInteger(lockVersion) || lockVersion < 0)
      throw new BadRequestException('lockVersion invalide');
  }

  private parseDate(value: string, field: string) {
    const parsed = new Date(value);
    if (!value || Number.isNaN(parsed.getTime()))
      throw new BadRequestException(`${field} invalide`);
    return parsed;
  }

  private async loadForCustodian(
    tx: Prisma.TransactionClient,
    fileId: string,
    organizationId: string,
    actorId: string,
    actor?: AdviserActor,
  ) {
    const file = await tx.projectFile.findFirst({
      where: {
        id: fileId,
        organizationId,
        ...(actor
          ? {
              project: {
                is: {
                  isActive: true,
                  status: { not: 'ARCHIVED' },
                  ...projectAccessWhere(actor),
                },
              },
            }
          : {}),
      },
      include: {
        project: { select: { userId: true, status: true, isActive: true } },
      },
    });
    if (!file) throw new NotFoundException('Fichier introuvable');
    if (file.project?.isActive === false)
      throw new NotFoundException('Fichier introuvable');
    if (file.project?.status === 'ARCHIVED')
      throw new ForbiddenException('Projet archive en lecture seule');
    const buildingApprover =
      !file.project && file.buildingId
        ? await tx.user.findFirst({
            where: {
              id: actorId,
              organizationId,
              isActive: true,
              OR: [
                { role: { in: ['ADMIN', 'SUPER_ADMIN'] } },
                { id: file.uploadedById ?? '' },
              ],
            },
            select: { id: true },
          })
        : null;
    if (file.project?.userId !== actorId && !buildingApprover)
      throw new ForbiddenException(
        'Transition réservée au conseiller responsable du projet',
      );
    return file;
  }

  private async transition(
    data: {
      fileId: string;
      organizationId: string;
      actorId: string;
      actor?: AdviserActor;
      reason: string;
      requestId: string;
      lockVersion: number;
    },
    fromState: ProjectFileLifecycleState,
    toState: ProjectFileLifecycleState,
    action: string,
    fields: Record<string, unknown>,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const file = await this.loadForCustodian(
        tx,
        data.fileId,
        data.organizationId,
        data.actorId,
        data.actor,
      );
      const existingEvent = await tx.projectFileLifecycleEvent.findUnique({
        where: {
          projectFileId_requestId: {
            projectFileId: file.id,
            requestId: data.requestId,
          },
        },
      });
      if (existingEvent) return this.safeFile(file);
      if (file.lifecycleState !== fromState)
        throw new ConflictException('Transition documentaire invalide');
      const changed = await tx.projectFile.updateMany({
        where: {
          id: file.id,
          organizationId: data.organizationId,
          lifecycleState: fromState,
          lockVersion: data.lockVersion,
        },
        data: {
          ...fields,
          lifecycleState: toState,
          lockVersion: { increment: 1 },
        },
      });
      if (changed.count !== 1)
        throw new ConflictException('Version concurrente du fichier');
      await tx.projectFileLifecycleEvent.create({
        data: {
          projectFileId: file.id,
          organizationId: file.organizationId,
          projectId: file.projectId,
          requestId: data.requestId,
          action,
          fromState,
          toState,
          actorType: 'USER',
          actorId: data.actorId,
          reason: data.reason.trim(),
        },
      });
      const updated = await tx.projectFile.findUnique({
        where: { id: file.id },
      });
      return this.safeFile(updated!);
    });
  }

  private safeFile<T extends Record<string, any>>(
    file: T,
  ): Omit<T, 'storageKey'> {
    const { storageKey: _storageKey, versions, ...safe } = file;
    const lifecycleState =
      safe.lifecycleState ??
      (safe.status === 'valide' ? 'LEGACY_VALIDATED' : 'LEGACY');
    const effectiveLifecycleState =
      lifecycleState === 'APPROVED' &&
      safe.effectiveAt &&
      new Date(safe.effectiveAt).getTime() > Date.now()
        ? 'NOT_EFFECTIVE'
        : lifecycleState === 'APPROVED' &&
            safe.expiresAt &&
            new Date(safe.expiresAt).getTime() <= Date.now()
          ? 'EXPIRED'
          : lifecycleState === 'APPROVED' &&
              safe.supersededEffectiveAt &&
              new Date(safe.supersededEffectiveAt).getTime() <= Date.now()
            ? 'SUPERSEDED'
            : lifecycleState;
    return {
      ...safe,
      effectiveLifecycleState,
      isDownloadable:
        !['REVOKED', 'EXPIRED', 'NOT_EFFECTIVE'].includes(
          effectiveLifecycleState,
        ) &&
        (effectiveLifecycleState !== 'SUPERSEDED' ||
          Boolean(safe.historicalDownloadAllowedAt)),
      ...(versions
        ? {
            versions: versions.map((version: Record<string, any>) =>
              this.safeFile(version),
            ),
          }
        : {}),
    } as Omit<T, 'storageKey'>;
  }
}
