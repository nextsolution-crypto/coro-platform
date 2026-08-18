import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ExportService } from '../export/export.service';
import { StorageService } from '../storage/storage.service';
import { EmailService } from './email.service';
import { BookingsService } from '../bookings/bookings.service';

@Injectable()
export class ClientPortalService {
  constructor(
    private prisma: PrismaService,
    private exportService: ExportService,
    private storageService: StorageService,
    private emailService: EmailService,
    private bookingsService: BookingsService,
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
          updateData.officialPdfFr = urlFr;
        }

        if (result.en) {
          const urlEn = await this.storageService.uploadFile(
            result.en,
            `${projectId}-${timestamp}-EN-OFFICIEL.pdf`,
            'documents',
            'application/pdf',
          );
          updateData.officialPdfEn = urlEn;
        }

        await this.prisma.project.update({
          where: { id: projectId },
          data: updateData,
        });
      }
    } catch (e) {
      console.error('Erreur régénération PDF officiel:', e);
    }

    // Notifier le conseiller que le client a signé
    try {
      const fullProject = await this.prisma.project.findUnique({
        where: { id: projectId },
        include: { client: true, user: true },
      });
      if (fullProject?.user?.email) {
        await this.emailService.sendDocumentSigned({
          toEmail: fullProject.user.email,
          toName: `${fullProject.user.firstName} ${fullProject.user.lastName}`,
          projectName: fullProject.name,
          clientName: fullProject.client.name,
          signerName: data.fullName,
          portalUrl: 'https://app.getcoro.io',
        });
      }
    } catch (e) {
      console.error('Erreur email signature:', e);
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
      include: { client: true, building: true, user: true },
    });

    if (!project) throw new Error('Projet introuvable');

    // Remettre en REVIEW
    await this.prisma.project.update({
      where: { id: projectId },
      data: { status: 'REVIEW' },
    });

    // Sauvegarder le commentaire — utiliser l'userId du conseiller responsable du projet
    await this.prisma.projectComment.create({
      data: {
        projectId,
        userId: project.userId,
        organizationId: project.organizationId,
        contenu: `[Refus client - ${clientUser.email}] ${comment}`,
      },
    });

    // Notifier le conseiller par email
    try {
      if (project.user?.email) {
        await this.emailService.sendDocumentRefused({
          toEmail: project.user.email,
          toName: `${project.user.firstName} ${project.user.lastName}`,
          projectName: project.name,
          clientName: project.client.name,
          comment,
          portalUrl: 'https://app.getcoro.io',
        });
      }
    } catch (e) {
      console.error('Erreur email refus:', e);
    }

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

    async trackEngagement(data: {
    projectId: string;
    clientUserId: string;
    event: string;
    device?: string;
    duration?: number;
  }) {
    return this.prisma.documentEngagement.create({
      data: {
        projectId: data.projectId,
        clientUserId: data.clientUserId,
        event: data.event,
        device: data.device,
        duration: data.duration,
      },
    });
  }

  async getEngagement(projectId: string) {
    const engagements = await this.prisma.documentEngagement.findMany({
      where: { projectId },
      include: {
        clientUser: { select: { firstName: true, lastName: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const opened = engagements.filter(e => e.event === 'opened');
    const viewed = engagements.filter(e => e.event === 'viewed');
    const downloaded = engagements.filter(e => e.event === 'downloaded');

    const firstOpen = opened.length > 0 ? opened[opened.length - 1].createdAt : null;
    const lastOpen = opened.length > 0 ? opened[0].createdAt : null;
    const totalDuration = viewed.reduce((acc, e) => acc + (e.duration || 0), 0);
    const devices = engagements.map(e => e.device).filter(Boolean);
    const dominantDevice = devices.length > 0
      ? Object.entries(devices.reduce((acc: any, d) => { acc[d!] = (acc[d!] || 0) + 1; return acc; }, {}))
          .sort((a: any, b: any) => b[1] - a[1])[0][0]
      : null;

    const daysSinceExport = firstOpen
      ? Math.floor((new Date().getTime() - new Date(firstOpen).getTime()) / (1000 * 60 * 60 * 24))
      : null;

    return {
      totalOpens: opened.length,
      totalViews: viewed.length,
      totalDownloads: downloaded.length,
      firstOpenedAt: firstOpen,
      lastOpenedAt: lastOpen,
      totalDurationSeconds: totalDuration,
      dominantDevice,
      daysSinceFirstOpen: daysSinceExport,
      engagements: engagements.slice(0, 10),
      status: opened.length === 0 ? 'not_opened'
        : downloaded.length > 0 ? 'downloaded'
        : viewed.length > 0 ? 'viewed'
        : 'opened',
    };
  }

    async createBookingFromClient(data: {
    projectId: string;
    clientUserId: string;
    activityType: string;
    requestedDate: Date;
    duration: number;
    participants?: number;
    comment?: string;
  }) {
    return this.bookingsService.createBooking(data);
  }

  async getBookingsForClient(clientUserId: string) {
    return this.bookingsService.getBookingsForClient(clientUserId);
  }
}