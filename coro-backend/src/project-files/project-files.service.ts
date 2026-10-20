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
    projectId: string;
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
  }) {
    const project = await this.prisma.project.findFirst({
      where: {
        id: data.projectId,
        organizationId: data.organizationId,
        ...(data.permittedBuildingIds !== undefined
          ? { buildingId: { in: data.permittedBuildingIds } }
          : {}),
      },
    });
    if (!project) throw new NotFoundException('Projet introuvable');

    // Déterminer la version
    let version = 1;
    const parentId = data.parentId;

    if (parentId) {
      const parent = await this.prisma.projectFile.findFirst({
        where: {
          id: parentId,
          projectId: data.projectId,
          organizationId: data.organizationId,
        },
      });
      if (parent) {
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
    const storageKey = `tenant-${data.organizationId}/project-files/${data.projectId}/${id}/${safeName}`;

    await this.storage.uploadPrivateImmutable(
      data.buffer,
      storageKey,
      data.mimeType,
    );

    const digest = createHash('sha256').update(data.buffer).digest('hex');
    const file = await this.prisma.$transaction(async (tx) => {
      const created = await tx.projectFile.create({
        data: {
          id,
          projectId: data.projectId,
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
    if (data.uploadedByClientId) {
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
      const approved = await tx.projectFile.findMany({
        where: {
          organizationId: data.organizationId,
          lifecycleState: 'APPROVED',
          OR: [{ id: rootId }, { parentId: rootId }],
        },
      });
      const now = new Date();
      for (const previous of approved) {
        if (previous.id === file.id) continue;
        await tx.projectFile.update({
          where: { id: previous.id },
          data: {
            lifecycleState: 'SUPERSEDED',
            supersededAt: now,
            supersededById: data.actorId,
            lockVersion: { increment: 1 },
          },
        });
        await tx.projectFileLifecycleEvent.create({
          data: {
            projectFileId: previous.id,
            organizationId: previous.organizationId,
            projectId: previous.projectId,
            requestId: `${data.requestId}:supersede:${previous.id}`,
            action: 'SUPERSEDED',
            fromState: 'APPROVED',
            toState: 'SUPERSEDED',
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

  async revokeFile(data: {
    fileId: string;
    organizationId: string;
    actorId: string;
    reason: string;
    requestId: string;
    lockVersion: number;
  }) {
    this.assertTransitionInput(data.reason, data.requestId, data.lockVersion);
    const file = await this.prisma.projectFile.findFirst({
      where: { id: data.fileId, organizationId: data.organizationId },
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

  async getFilesForProject(
    projectId: string,
    visibility: string | undefined,
    organizationId: string,
    permittedBuildingIds?: string[],
  ) {
    const project = await this.prisma.project.findFirst({
      where: {
        id: projectId,
        organizationId,
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

    return files.map((file) => this.safeFile(file));
  }

  async getSignedUrl(fileId: string, organizationId: string) {
    const file = await this.prisma.projectFile.findFirst({
      where: { id: fileId, organizationId },
    });
    if (!file) throw new NotFoundException('Fichier introuvable');
    // Retourner l'URL directe (déjà publique via Spaces)
    return { url: file.url, name: file.name };
  }

  async downloadPrivateFile(
    fileId: string,
    organizationId: string,
    permittedBuildingIds?: string[],
    sharedOnly = false,
  ) {
    const file = await this.prisma.projectFile.findFirst({
      where: {
        id: fileId,
        organizationId,
        ...(sharedOnly ? { visibility: 'shared' } : {}),
        project: {
          organizationId,
          ...(permittedBuildingIds !== undefined
            ? { buildingId: { in: permittedBuildingIds } }
            : {}),
        },
      },
    });
    if (!file || file.url !== PRIVATE_PROJECT_FILE_URL)
      throw new NotFoundException('Fichier prive introuvable');
    if (file.lifecycleState === 'REVOKED')
      throw new NotFoundException('Fichier prive introuvable');
    if (file.effectiveAt && file.effectiveAt.getTime() > Date.now())
      throw new NotFoundException('Fichier prive introuvable');
    if (file.expiresAt && file.expiresAt.getTime() <= Date.now())
      throw new NotFoundException('Fichier prive introuvable');
    return {
      buffer: await this.storage.downloadPrivate(file.storageKey),
      mimeType: file.mimeType,
      name: file.name,
    };
  }

  async getLifecycleHistory(
    fileId: string,
    organizationId: string,
    permittedBuildingIds?: string[],
  ) {
    const file = await this.prisma.projectFile.findFirst({
      where: {
        id: fileId,
        organizationId,
        project: {
          organizationId,
          ...(permittedBuildingIds !== undefined
            ? { buildingId: { in: permittedBuildingIds } }
            : {}),
        },
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
  ) {
    const file = await tx.projectFile.findFirst({
      where: { id: fileId, organizationId },
      include: { project: { select: { userId: true } } },
    });
    if (!file) throw new NotFoundException('Fichier introuvable');
    if (file.project.userId !== actorId)
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
          : lifecycleState;
    return {
      ...safe,
      effectiveLifecycleState,
      isDownloadable: !['REVOKED', 'EXPIRED', 'NOT_EFFECTIVE'].includes(
        effectiveLifecycleState,
      ),
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
