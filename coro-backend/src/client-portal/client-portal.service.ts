import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ExportService } from '../export/export.service';
import { StorageService } from '../storage/storage.service';

@Injectable()
export class ClientPortalService {
  constructor(
    private prisma: PrismaService,
    private exportService: ExportService,
    private storageService: StorageService,
  ) {}

  async getProjects(clientId: string, organizationId: string, role: string, buildingIds?: string[]) {
    const where: any = { organizationId };

    if (role === 'CLIENT_MANAGER' && buildingIds && buildingIds.length > 0) {
      where.buildingId = { in: buildingIds };
    } else if (role === 'CLIENT_MANAGER') {
      where.clientId = clientId;
    }

    const projects = await this.prisma.project.findMany({
      where,
      include: {
        client: true,
        building: true,
        user: { select: { firstName: true, lastName: true, email: true } },
        approvedBy: { select: { firstName: true, lastName: true } },
        signatures: {
          include: {
            clientUser: { select: { firstName: true, lastName: true, email: true } },
          },
          orderBy: { signedAt: 'desc' },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return projects;
  }

  async getProject(projectId: string, clientId: string, organizationId: string, role: string) {
    const project = await this.prisma.project.findFirst({
      where: {
        id: projectId,
        organizationId,
        ...(role === 'CLIENT_MANAGER' ? { clientId } : {}),
      },
      include: {
        client: true,
        building: true,
        user: { select: { firstName: true, lastName: true, email: true } },
        approvedBy: { select: { firstName: true, lastName: true } },
        signatures: {
          include: {
            clientUser: { select: { firstName: true, lastName: true, email: true } },
          },
          orderBy: { signedAt: 'desc' },
        },
      },
    });

    return project;
  }

  async getActivities(clientId: string, organizationId: string, role: string, buildingIds?: string[]) {
    const projects = await this.prisma.project.findMany({
      where: {
        organizationId,
        ...(role === 'CLIENT_MANAGER' && buildingIds?.length ? { buildingId: { in: buildingIds } } : role === 'CLIENT_MANAGER' ? { clientId } : {}),
      },
      select: { id: true },
    });

    const projectIds = projects.map(p => p.id);

    return this.prisma.projectActivity.findMany({
      where: { projectId: { in: projectIds } },
      include: {
        project: {
          include: {
            client: true,
            building: true,
          },
        },
      },
      orderBy: { scheduledDate: 'asc' },
    });
  }

  async signDocument(
    projectId: string,
    clientUser: any,
    data: { fullName: string; comment?: string; ipAddress?: string },
  ) {
    // Vérifier si déjà signé
    const existing = await this.prisma.documentSignature.findFirst({
      where: { projectId, clientUserId: clientUser.sub },
    });

    if (existing) {
      return existing;
    }

    const signature = await this.prisma.documentSignature.create({
      data: {
        projectId,
        clientUserId: clientUser.sub,
        fullName: data.fullName,
        email: clientUser.email,
        comment: data.comment,
        ipAddress: data.ipAddress,
      },
    });

    // Régénérer le PDF sans filigrane et sauvegarder sur Spaces
    try {
      const project = await this.prisma.project.findUnique({
        where: { id: projectId },
      });

      if (project) {
        const result = await this.exportService.generatePdf(
          projectId,
          {
            selectedModules: [1, 2, 3, 4, 5, 6, 7, 8],
            moduleOrder: [1, 2, 3, 4, 5, 6, 7, 8],
            language: 'both',
            isPreview: false,
          },
          project.organizationId,
        );

        const timestamp = Date.now();
        const updateData: any = { exportedAt: new Date() };

        if (result.fr) {
          const urlFr = await this.storageService.uploadFile(
            result.fr,
            `${projectId}-${timestamp}-FR-OFFICIEL.pdf`,
            'documents',
            'application/pdf',
          );
          updateData.exportedPdfFr = urlFr;
        }

        if (result.en) {
          const urlEn = await this.storageService.uploadFile(
            result.en,
            `${projectId}-${timestamp}-EN-OFFICIEL.pdf`,
            'documents',
            'application/pdf',
          );
          updateData.exportedPdfEn = urlEn;
        }

        await this.prisma.project.update({
          where: { id: projectId },
          data: updateData,
        });
      }
    } catch (e) {
      console.error('Erreur régénération PDF officiel:', e);
    }

    return signature;
  }

  async refuseDocument(
    projectId: string,
    clientUser: any,
    comment: string,
  ) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: { client: true, building: true },
    });

    if (!project) throw new Error('Projet introuvable');

    // Remettre en REVIEW
    await this.prisma.project.update({
      where: { id: projectId },
      data: { status: 'REVIEW' },
    });

    // Sauvegarder le commentaire
    await this.prisma.projectComment.create({
      data: {
        projectId,
        userId: clientUser.sub,
        organizationId: project.organizationId,
        contenu: `[Refus client] ${comment}`,
      },
    });

    return { success: true };
  }

  async addComment(
    projectId: string,
    clientUser: any,
    organizationId: string,
    contenu: string,
  ) {
    return this.prisma.projectComment.create({
      data: {
        projectId,
        userId: clientUser.sub,
        organizationId,
        contenu: `[Portail client] ${contenu}`,
      },
    });
  }

  async getComments(projectId: string) {
    return this.prisma.projectComment.findMany({
      where: { projectId },
      include: {
        user: { select: { firstName: true, lastName: true, role: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getDashboard(clientId: string, organizationId: string, role: string, buildingIds?: string[]) {
    const projects = await this.getProjects(clientId, organizationId, role, buildingIds);
    const activities = await this.getActivities(clientId, organizationId, role, buildingIds);

    const now = new Date();
    const upcoming = activities.filter(a => {
      if (!a.scheduledDate) return false;
      const date = new Date(a.scheduledDate);
      return date >= now && a.status !== 'fait';
    }).slice(0, 5);

    const stats = {
      total: projects.length,
      validated: projects.filter(p => p.status === 'VALIDATED').length,
      inProgress: projects.filter(p => p.status === 'IN_PROGRESS').length,
      review: projects.filter(p => p.status === 'REVIEW').length,
      signed: projects.filter(p => p.signatures.length > 0).length,
    };

    return { stats, projects: projects.slice(0, 5), upcomingActivities: upcoming };
  }
}