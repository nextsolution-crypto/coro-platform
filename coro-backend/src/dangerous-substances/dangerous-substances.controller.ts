import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PrismaService } from '../prisma/prisma.service';

@Controller('dangerous-substances')
@UseGuards(AuthGuard('jwt'))
export class DangerousSubstancesController {
  constructor(private prisma: PrismaService) {}

  @Get('search')
  async search(@Query('q') q: string) {
    if (!q || q.trim().length < 2) return [];

    const query = q.trim().toLowerCase();

    return this.prisma.dangerousSubstance.findMany({
      where: {
        OR: [
          { unNumber: { contains: query, mode: 'insensitive' } },
          { nameFR: { contains: query, mode: 'insensitive' } },
          { nameEN: { contains: query, mode: 'insensitive' } },
          { casNumber: { contains: query, mode: 'insensitive' } },
          { keywords: { has: query } },
        ],
      },
      orderBy: [
        { isCommon: 'desc' },
        { nameFR: 'asc' },
      ],
      take: 10,
    });
  }

  @Get('common')
  async getCommon() {
    return this.prisma.dangerousSubstance.findMany({
      where: { isCommon: true },
      orderBy: { nameFR: 'asc' },
    });
  }
}