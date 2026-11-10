import { Module } from '@nestjs/common';
import { DisplayPdfEngineService } from '../display-plans/display-pdf-engine.service';

@Module({
  providers: [DisplayPdfEngineService],
  exports: [DisplayPdfEngineService],
})
export class DisplayPdfRasterizerModule {}
