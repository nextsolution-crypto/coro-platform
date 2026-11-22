import { Global, Module } from '@nestjs/common';
import { PdfSealService } from './pdf-seal.service';

@Global()
@Module({ providers: [PdfSealService], exports: [PdfSealService] })
export class PdfSealModule {}
