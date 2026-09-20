import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { JwtModule } from '@nestjs/jwt';
import { OperationalReviewsController } from './operational-reviews.controller';
import { OperationalReviewsService } from './operational-reviews.service';

@Module({ imports: [PrismaModule, JwtModule.register({ secret: process.env.JWT_SECRET || 'coro-secret' })], controllers: [OperationalReviewsController], providers: [OperationalReviewsService], exports: [OperationalReviewsService] })
export class OperationalReviewsModule {}
