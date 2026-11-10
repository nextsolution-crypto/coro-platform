import { Module } from '@nestjs/common';
import { DisplayPlansModule } from '../display-plans/display-plans.module';

@Module({ imports: [DisplayPlansModule] })
export class DisplayPdfWorkerModule {}
