import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class FeedbackService {
  constructor(private prisma: PrismaService) {}

  async create(data: {
    category: string;
    message: string;
    userId: string;
    organizationId: string;
  }) {
    return this.prisma.feedback.create({ data });
  }

  async findAll() {
    return this.prisma.feedback.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { firstName: true, lastName: true, email: true } },
        organization: { select: { name: true } },
      },
    });
  }

  async updateStatus(id: string, status: string) {
    return this.prisma.feedback.update({
      where: { id },
      data: { status },
    });
  }

  async remove(id: string) {
    return this.prisma.feedback.delete({ where: { id } });
  }
}