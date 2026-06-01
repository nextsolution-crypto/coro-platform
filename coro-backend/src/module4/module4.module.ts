import { Module } from '@nestjs/common';
import { Module4Controller } from './module4.controller';
import { LibraryController } from './library.controller';
import { Module4Service } from './module4.service';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  controllers: [Module4Controller, LibraryController],
  providers: [Module4Service, PrismaService],
  exports: [Module4Service],
})
export class Module4Module {}