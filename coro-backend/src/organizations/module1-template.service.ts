import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class Module1TemplateService {
  constructor(private prisma: PrismaService) {}

  async getTemplate(organizationId: string) {
    const template = await this.prisma.organizationModule1Template.findUnique({
      where: { organizationId },
    });
    return template || { sections: [] };
  }

  async saveTemplate(organizationId: string, sections: any[]) {
    return this.prisma.organizationModule1Template.upsert({
      where: { organizationId },
      update: { sections },
      create: { organizationId, sections },
    });
  }
}