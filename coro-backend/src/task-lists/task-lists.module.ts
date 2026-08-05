import { Module } from '@nestjs/common';
import { TaskListsController } from './task-lists.controller';
import { TaskListsService } from './task-lists.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [TaskListsController],
  providers: [TaskListsService],
  exports: [TaskListsService],
})
export class TaskListsModule {}