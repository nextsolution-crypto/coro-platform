import { PrismaService } from '../../prisma/prisma.service';
import { BaseDocumentBuilder } from './base.builder';
import { PmuBuilder } from './pmu.builder';
import { PsiBuilder } from './psi.builder';

export function createDocumentBuilder(
  documentType: string,
  prisma: PrismaService,
  doc: any,
  content: any,
  lang: 'fr' | 'en',
  options: { selectedModules: number[]; moduleOrder: number[] },
): BaseDocumentBuilder {
  switch (documentType) {
    case 'PSI':
      return new PsiBuilder(prisma, doc, content, lang, options);
    case 'PMU':
    default:
      return new PmuBuilder(prisma, doc, content, lang, options);
  }
}