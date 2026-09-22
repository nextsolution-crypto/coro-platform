import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ActivityTypesController } from './activity-types.controller';
import { ActivityTypesService } from './activity-types.service';

@Module({ imports: [PrismaModule], controllers: [ActivityTypesController], providers: [ActivityTypesService], exports: [ActivityTypesService] })
export class ActivityTypesModule {}
