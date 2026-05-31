// ============================================================
// CORO — Module 2 NestJS Module
// ============================================================

import { Module } from '@nestjs/common';
import { Module2Controller } from './module2.controller';
import { Module2Service } from './module2.service';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  controllers: [Module2Controller],
  providers: [Module2Service, PrismaService],
  exports: [Module2Service],
})
export class Module2Module {}