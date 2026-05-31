import { Module } from '@nestjs/common';
import { Module3Controller } from './module3.controller';
import { Module3Service } from './module3.service';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  controllers: [Module3Controller],
  providers: [Module3Service, PrismaService],
  exports: [Module3Service],
})
export class Module3Module {}