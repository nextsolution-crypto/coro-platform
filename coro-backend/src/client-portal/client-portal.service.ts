import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ClientPortalService {
  constructor(private prisma: PrismaService) {}

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

    return this.prisma.documentSignature.create({
      data: {
        projectId,
        clientUserId: clientUser.sub,
        fullName: data.fullName,
        email: clientUser.email,
        comment: data.comment,
        ipAddress: data.ipAddress,
      },
    });
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