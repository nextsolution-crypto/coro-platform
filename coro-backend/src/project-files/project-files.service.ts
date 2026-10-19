import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { NotificationsService } from '../notifications/notifications.service';
import { randomUUID } from 'crypto';

const PRIVATE_PROJECT_FILE_URL = 'private:project-file';

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

    const file = await this.prisma.projectFile.create({
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
      },
      include: {
        uploadedBy: { select: { firstName: true, lastName: true } },
        uploadedByClient: { select: { firstName: true, lastName: true } },
      },
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

  async validateFile(fileId: string, organizationId: string) {
    const file = await this.prisma.projectFile.findFirst({
      where: { id: fileId, organizationId },
      select: { id: true },
    });
    if (!file) throw new NotFoundException('Fichier introuvable');
    return this.prisma.projectFile.update({
      where: { id: file.id },
      data: { status: 'valide' },
    });
  }

  async deleteFile(fileId: string, organizationId: string) {
    const file = await this.prisma.projectFile.findFirst({
      where: { id: fileId, organizationId },
    });
    if (!file) throw new NotFoundException('Fichier introuvable');

    // Supprimer les versions aussi
    await this.prisma.projectFile.deleteMany({
      where: { organizationId, OR: [{ id: fileId }, { parentId: fileId }] },
    });

    return { success: true };
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
    return {
      buffer: await this.storage.downloadPrivate(file.storageKey),
      mimeType: file.mimeType,
      name: file.name,
    };
  }

  private safeFile<T extends Record<string, any>>(
    file: T,
  ): Omit<T, 'storageKey'> {
    const { storageKey: _storageKey, versions, ...safe } = file;
    return {
      ...safe,
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
