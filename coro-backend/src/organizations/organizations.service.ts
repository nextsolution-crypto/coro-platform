import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class OrganizationsService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.organization.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { users: true, projects: true, clients: true, buildings: true } },
      },
    });
  }

  async findOne(id: string) {
    const org = await this.prisma.organization.findUnique({
      where: { id },
      include: {
        users: { select: { id: true, email: true, firstName: true, lastName: true, role: true } },
        _count: { select: { projects: true, clients: true, buildings: true } },
      },
    });
    if (!org) throw new NotFoundException('Organisation introuvable');
    return org;
  }

    async createWithAdmin(data: {
    organizationName: string;
    licenseType: string;
    province?: string;
    adminEmail: string;
    adminPassword: string;
    adminFirstName: string;
    adminLastName: string;
    adminTitle?: string;
    additionalMembers?: { firstName: string; lastName: string; email: string; role: string }[];
  }) {
    const organization = await this.prisma.organization.create({
      data: {
        name: data.organizationName,
        licenseType: data.licenseType,
        isInternal: false,
      },
    });

    // Créer l'administrateur principal
    const hashedPassword = await bcrypt.hash(data.adminPassword, 10);
    const adminUser = await this.prisma.user.create({
      data: {
        email: data.adminEmail,
        password: hashedPassword,
        firstName: data.adminFirstName,
        lastName: data.adminLastName,
        role: 'ADMIN',
        organizationId: organization.id,
      },
    });

    // Envoyer courriel d'invitation à l'admin
    await this.sendInvitationEmail({
      email: data.adminEmail,
      firstName: data.adminFirstName,
      lastName: data.adminLastName,
      organizationName: data.organizationName,
      password: data.adminPassword,
      role: 'ADMIN',
    });

    // Créer les membres additionnels
    const createdMembers: { id: string; email: string }[] = [];
    if (data.additionalMembers && data.additionalMembers.length > 0) {
      for (const member of data.additionalMembers) {
        const memberPassword = this.generateTempPassword();
        const memberHashedPassword = await bcrypt.hash(memberPassword, 10);
        const memberUser = await this.prisma.user.create({
          data: {
            email: member.email,
            password: memberHashedPassword,
            firstName: member.firstName,
            lastName: member.lastName,
            role: member.role as any,
            organizationId: organization.id,
          },
        });
        // Envoyer courriel d'invitation au membre
        await this.sendInvitationEmail({
          email: member.email,
          firstName: member.firstName,
          lastName: member.lastName,
          organizationName: data.organizationName,
          password: memberPassword,
          role: member.role,
        });
        createdMembers.push({ id: memberUser.id, email: memberUser.email });
      }
    }

    return { organization, adminUser: { id: adminUser.id, email: adminUser.email }, membersCreated: createdMembers.length };
  }

  private generateTempPassword(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#';
    return Array.from({ length: 12 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  }

  private async sendInvitationEmail(data: {
    email: string;
    firstName: string;
    lastName: string;
    organizationName: string;
    password: string;
    role: string;
  }) {
    try {
      const roleLabel = data.role === 'ADMIN' ? 'Administrateur' : 'Conseiller';
      await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-key': process.env.BREVO_API_KEY || '',
        },
        body: JSON.stringify({
          sender: { name: 'CORO', email: 'info@getcoro.io' },
          to: [{ email: data.email, name: `${data.firstName} ${data.lastName}` }],
          subject: `Bienvenue dans CORO — Vos identifiants de connexion`,
          htmlContent: `
            <div style="font-family:-apple-system,sans-serif;max-width:600px;margin:0 auto;">
              <div style="background:#2C3E50;padding:24px;border-radius:8px 8px 0 0;">
                <span style="color:#FFFFFF;font-size:28px;font-weight:900;">CO<span style="color:#C0392B;">RO</span></span>
              </div>
              <div style="background:#FFFFFF;padding:32px;border:1px solid #E9ECEF;border-radius:0 0 8px 8px;">
                <h2 style="color:#2C3E50;margin:0 0 8px;">Bienvenue, ${data.firstName} !</h2>
                <p style="color:#6C757D;margin:0 0 24px;">Votre compte CORO a été créé pour l'organisation <strong>${data.organizationName}</strong>. Vous avez le rôle de <strong>${roleLabel}</strong>.</p>
                <div style="background:#F8F9FA;border-radius:8px;padding:20px;margin:0 0 24px;">
                  <p style="margin:0 0 8px;font-size:14px;color:#6C757D;">Vos identifiants de connexion :</p>
                  <p style="margin:0 0 4px;font-size:15px;color:#2C3E50;"><strong>Courriel :</strong> ${data.email}</p>
                  <p style="margin:0;font-size:15px;color:#2C3E50;"><strong>Mot de passe temporaire :</strong> <span style="font-family:monospace;background:#E9ECEF;padding:2px 8px;border-radius:4px;">${data.password}</span></p>
                </div>
                <a href="https://app.getcoro.io/login" style="display:inline-block;background:#C0392B;color:#FFFFFF;padding:14px 28px;border-radius:6px;text-decoration:none;font-weight:700;font-size:15px;">
                  Se connecter à CORO →
                </a>
                <p style="color:#ADB5BD;font-size:13px;margin:24px 0 0;">Veuillez changer votre mot de passe lors de votre première connexion.</p>
              </div>
            </div>
          `,
        }),
      });
    } catch (e) {
      console.error('Erreur envoi invitation:', e);
    }
  }

  async updateLicense(id: string, licenseType: string) {
    return this.prisma.organization.update({
      where: { id },
      data: { licenseType },
    });
  }

  async toggleActive(id: string, isActive: boolean) {
    return this.prisma.organization.update({
      where: { id },
      data: { isActive },
    });
  }

  async findAllProjectsGlobal() {
    return this.prisma.project.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
      include: {
        organization: { select: { id: true, name: true, isInternal: true } },
        client: { select: { id: true, name: true } },
        building: { select: { id: true, name: true } },
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });
  }

    async getHealthScores() {
    const organizations = await this.prisma.organization.findMany({
      where: { isActive: true, isInternal: false },
      include: {
        users: { select: { id: true, firstName: true, lastName: true, email: true, role: true, createdAt: true } },
        projects: {
          where: { createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } },
          select: { id: true, status: true, updatedAt: true },
        },
        _count: { select: { users: true, projects: true, clients: true, buildings: true } },
      },
    });

    const allProjects = await this.prisma.project.findMany({
      where: { organization: { isInternal: false } },
      select: { organizationId: true, status: true, updatedAt: true, officialPdfFr: true },
    });

    return organizations.map(org => {
      const orgProjects = allProjects.filter(p => p.organizationId === org.id);
      const recentProjects = org.projects;
      const signedProjects = orgProjects.filter(p => p.officialPdfFr !== null);
      const totalProjects = orgProjects.length;

      // Calcul du score sur 100
      let score = 0;

      // Critère 1 — Projets créés dans les 30 derniers jours (max 30 pts)
      const recentCount = recentProjects.length;
      score += Math.min(recentCount * 10, 30);

      // Critère 2 — Documents signés (max 30 pts)
      const signedRatio = totalProjects > 0 ? signedProjects.length / totalProjects : 0;
      score += Math.round(signedRatio * 30);

      // Critère 3 — Membres actifs (max 20 pts)
      const memberCount = org._count.users;
      score += Math.min(memberCount * 5, 20);

      // Critère 4 — Clients et bâtiments configurés (max 20 pts)
      score += Math.min(org._count.clients * 5, 10);
      score += Math.min(org._count.buildings * 5, 10);

      score = Math.min(score, 100);

      const level = score >= 80 ? 'ACTIF' : score >= 50 ? 'MODERE' : 'A_RISQUE';

      return {
        id: org.id,
        name: org.name,
        licenseType: org.licenseType,
        score,
        level,
        metrics: {
          recentProjects: recentCount,
          totalProjects,
          signedProjects: signedProjects.length,
          members: memberCount,
          clients: org._count.clients,
          buildings: org._count.buildings,
        },
        users: org.users,
      };
    }).sort((a, b) => a.score - b.score); // Les plus à risque en premier
  }
}