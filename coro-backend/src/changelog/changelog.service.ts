import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ChangelogService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.changelogEntry.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(data: { title: string; description: string }) {
    return this.prisma.changelogEntry.create({ data });
  }

  async remove(id: string) {
    return this.prisma.changelogEntry.delete({ where: { id } });
  }
}