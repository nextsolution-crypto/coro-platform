import { Module } from '@nestjs/common';
import { Module7Controller } from './module7.controller';
import { Module7Service } from './module7.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [Module7Controller],
  providers: [Module7Service],
  exports: [Module7Service],
})
export class Module7Module {}