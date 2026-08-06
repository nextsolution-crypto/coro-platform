import { DocumentContext } from './module1.context';
import { generateModule1PmuFR, generateModule1PmuEN } from './module1.pmu';
import { generateModule1PsiFR, generateModule1PsiEN } from './module1.psi';

export function generateModule1(ctx: DocumentContext): { fr: any; en: any } {
  switch (ctx.documentType) {
    case 'PSI':
      return {
        fr: generateModule1PsiFR(ctx),
        en: generateModule1PsiEN(ctx),
      };
    case 'PMU':
    default:
      return {
        fr: generateModule1PmuFR(ctx),
        en: generateModule1PmuEN(ctx),
      };
  }
}

export type { DocumentContext } from './module1.context';