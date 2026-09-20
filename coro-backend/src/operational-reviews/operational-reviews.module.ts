import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { JwtModule } from '@nestjs/jwt';
import { OperationalReviewsController } from './operational-reviews.controller';
import { OperationalReviewsService } from './operational-reviews.service';
import { CorrectiveActionsService } from '../occupancy/corrective-actions.service';

@Module({ imports: [PrismaModule, JwtModule.register({ secret: process.env.JWT_SECRET || 'coro-secret' })], controllers: [OperationalReviewsController], providers: [OperationalReviewsService, CorrectiveActionsService], exports: [OperationalReviewsService] })
export class OperationalReviewsModule {}
