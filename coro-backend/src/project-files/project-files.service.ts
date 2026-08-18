import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';

@Injectable()
export class ProjectFilesService {
  constructor(
    private prisma: PrismaService,
    private storage: StorageService,
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
  }) {
    const project = await this.prisma.project.findUnique({ where: { id: data.projectId } });
    if (!project) throw new NotFoundException('Projet introuvable');

    // Déterminer la version
    let version = 1;
    let parentId = data.parentId;

    if (parentId) {
      const parent = await this.prisma.projectFile.findUnique({ where: { id: parentId } });
      if (parent) {
        const lastVersion = await this.prisma.projectFile.findFirst({
          where: { OR: [{ id: parentId }, { parentId }] },
          orderBy: { version: 'desc' },
        });
        version = (lastVersion?.version || 1) + 1;
      }
    }

    // Upload vers Spaces
    const timestamp = Date.now();
    const safeName = data.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const storageKey = `projects/${data.projectId}/files/${timestamp}_${safeName}`;

    const url = await this.storage.uploadFile(
      data.buffer,
      `${timestamp}_${safeName}`,
      `projects/${data.projectId}/files`,
      data.mimeType,
    );

    const file = await this.prisma.projectFile.create({
      data: {
        projectId: data.projectId,
        organizationId: data.organizationId,
        name: data.name,
        category: data.category,
        size: data.size,
        mimeType: data.mimeType,
        storageKey,
        url,
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

    return file;
  }

  async getFilesForProject(projectId: string, visibility?: string) {
    const where: any = {
      projectId,
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

    return files;
  }

  async validateFile(fileId: string) {
    return this.prisma.projectFile.update({
      where: { id: fileId },
      data: { status: 'valide' },
    });
  }

  async deleteFile(fileId: string) {
    const file = await this.prisma.projectFile.findUnique({ where: { id: fileId } });
    if (!file) throw new NotFoundException('Fichier introuvable');

    // Supprimer les versions aussi
    await this.prisma.projectFile.deleteMany({
      where: { OR: [{ id: fileId }, { parentId: fileId }] },
    });

    return { success: true };
  }

  async getSignedUrl(fileId: string) {
    const file = await this.prisma.projectFile.findUnique({ where: { id: fileId } });
    if (!file) throw new NotFoundException('Fichier introuvable');
    // Retourner l'URL directe (déjà publique via Spaces)
    return { url: file.url, name: file.name };
  }
}