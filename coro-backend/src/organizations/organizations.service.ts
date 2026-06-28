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
    adminEmail: string;
    adminPassword: string;
    adminFirstName: string;
    adminLastName: string;
  }) {
    const organization = await this.prisma.organization.create({
      data: {
        name: data.organizationName,
        licenseType: data.licenseType,
        isInternal: false,
      },
    });

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

    return { organization, adminUser: { id: adminUser.id, email: adminUser.email } };
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
}