import { Module } from '@nestjs/common';
import { GeneratorController } from './generator.controller';
import { GeneratorService } from './generator.service';
import { ValidationService } from './validation.service';
import { PrismaModule } from '../prisma/prisma.module';
import { DocumentEditorIntegrityService } from './document-editor-integrity.service';

@Module({
  imports: [PrismaModule],
  controllers: [GeneratorController],
  providers: [
    GeneratorService,
    ValidationService,
    DocumentEditorIntegrityService,
  ],
  exports: [
    GeneratorService,
    ValidationService,
    DocumentEditorIntegrityService,
  ],
})
export class GeneratorModule {}
