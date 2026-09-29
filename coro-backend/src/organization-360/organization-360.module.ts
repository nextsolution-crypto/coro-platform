import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { Organization360Controller } from './organization-360.controller';
import { Organization360Service } from './organization-360.service';

@Module({
  imports: [PrismaModule],
  controllers: [Organization360Controller],
  providers: [Organization360Service],
})
export class Organization360Module {}
