import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ChangelogService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.changelogEntry.findMany({
      orderBy: { entryDate: 'desc' },
    });
  }

  async create(data: { title: string; description: string; entryDate?: string }) {
    return this.prisma.changelogEntry.create({
      data: {
        title: data.title,
        description: data.description,
        entryDate: data.entryDate ? new Date(data.entryDate + 'T12:00:00') : new Date(),
      },
    });
  }

  async remove(id: string) {
    return this.prisma.changelogEntry.delete({ where: { id } });
  }
}