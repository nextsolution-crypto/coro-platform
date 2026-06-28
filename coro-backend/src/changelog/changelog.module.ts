import { Module } from '@nestjs/common';
import { ChangelogController } from './changelog.controller';
import { ChangelogService } from './changelog.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ChangelogController],
  providers: [ChangelogService],
})
export class ChangelogModule {}