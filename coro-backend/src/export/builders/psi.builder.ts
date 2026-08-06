import { PdfSegment } from './base.builder';
import { PmuBuilder } from './pmu.builder';
import { generateSeparatorPage } from '../templates/separator.template';
import {
  renderModule1Section,
  renderModule2Section,
  renderModule8,
} from '../templates/modules/simple-modules.template';
import { renderProcedure } from '../templates/modules/module4.template';
import { renderModule7 } from '../templates/modules/module7.template';

// Codes de procédures autorisées dans un PSI
// Seulement la procédure de base découverte de fumée ou flamme
const PSI_ALLOWED_PROCEDURES = ['P001', 'P002'];

// Sections du Module 1 désactivées dans un PSI
const PSI_DISABLED_SECTIONS_M1 = ['1.3', '1.4'];

// Titres des modules adaptés pour le PSI
const PSI_MODULE_TITLES: Record<number, { fr: string; en: string }> = {
  1: { fr: 'Introduction',                                   en: 'Introduction' },
  2: { fr: 'Liste téléphonique',                             en: 'Phone Directory' },
  4: { fr: 'Procédures de sécurité incendie',                en: 'Fire Safety Procedures' },
  6: { fr: 'Plans techniques du bâtiment',                   en: 'Technical Building Plans' },
  7: { fr: 'Description du site et équipements de sécurité', en: 'Site Description and Safety Equipment' },
  8: { fr: 'Registres et annexes',                           en: 'Records and Appendices' },
};

export class PsiBuilder extends PmuBuilder {

  // PSI n'a pas de Module 3 (organigramme)
  getDefaultModules(): number[] {
    return [1, 2, 4, 6, 7, 8];
  }

  // Override du titre de module pour PSI
  protected getPsiModuleTitle(moduleNum: number): string {
    return PSI_MODULE_TITLES[moduleNum]?.[this.lang] || `Module ${moduleNum}`;
  }

  async buildModuleSegments(
    moduleNum: number,
    pdfSegments: PdfSegment[],
    currentHtmlChunk: { value: string },
    currentHtmlSeqNumber: { value: number },
  ): Promise<boolean> {

    // Module 3 — désactivé dans PSI
    if (moduleNum === 3) return true;

    // Module 6 — identique au PMU (plans)
    if (moduleNum === 6) {
      return super.buildModuleSegments(moduleNum, pdfSegments, currentHtmlChunk, currentHtmlSeqNumber);
    }

    // Flush chunk courant + séparateur
    if (currentHtmlChunk.value) {
      pdfSegments.push({ type: 'html', content: currentHtmlChunk.value, sequentialNumber: currentHtmlSeqNumber.value });
      currentHtmlChunk.value = '';
    }

    // Séparateur avec titre PSI
    this.sequentialNumber += 1;
    const moduleTitle = this.getPsiModuleTitle(moduleNum);
    const sepHtml = generateSeparatorPage({
      sequentialNumber: this.sequentialNumber,
      moduleTitle,
      documentTypeLabel: this.docTypeLabel,
      buildingName: this.project.building.name,
      year: this.project.year,
    });
    pdfSegments.push({ type: 'separator', html: sepHtml, sequentialNumber: this.sequentialNumber });
    currentHtmlSeqNumber.value = this.sequentialNumber;

    // ── Module 1 — filtre les sections désactivées pour PSI ──
    if (moduleNum === 1) {
      const mod = this.modules.find((m: any) => m.moduleNumber === 1);
      const allSections = mod?.sections || [];

      // Filtrer les sections désactivées dans PSI
      const sections1 = allSections.filter((s: any) => !PSI_DISABLED_SECTIONS_M1.includes(s.id));

      // Remplacer les textes PMU par PSI dans les sections actives
      const psiSections = sections1.map((s: any) => this.adaptSectionForPsi(s));

      psiSections.forEach((s: any) => {
        this.subsectionTitlesById[`${this.sequentialNumber}:${s.id}`] = `${s.id} — ${s.title}`;
      });

      for (const section of psiSections) {
        pdfSegments.push({
          type: 'html',
          content: `<div>${renderModule1Section(section, false)}</div>`,
          sequentialNumber: this.sequentialNumber,
          subsectionId: section.id,
        });
      }
      return true;
    }

    // ── Module 2 — identique PMU ──
    if (moduleNum === 2) {
      const mod = this.modules.find((m: any) => m.moduleNumber === 2);
      const mergedSections = this.mergeModule2SavedData(mod?.sections || [], this.content.module2);
      mergedSections.forEach((s: any, i: number) => {
        this.subsectionTitlesById[`${this.sequentialNumber}:${s.id}`] = `${this.sequentialNumber}.${i + 1} — ${s.title}`;
      });
      for (let i = 0; i < mergedSections.length; i++) {
        pdfSegments.push({
          type: 'html',
          content: `<div>${renderModule2Section(mergedSections[i], i, this.lang, this.sequentialNumber)}</div>`,
          sequentialNumber: this.sequentialNumber,
          subsectionId: mergedSections[i].id,
        });
      }
      return true;
    }

    // ── Module 4 — seulement P001 (découverte fumée/flamme) ──
    if (moduleNum === 4) {
      const allProcedures = this.getModule4Procedures();
      const procedures = allProcedures.filter((p: any) => PSI_ALLOWED_PROCEDURES.includes(p.code));
      const buildingAddress = `${this.project.building.address}, ${this.project.building.city}, ${this.project.building.province}`;

      procedures.forEach((proc: any) => {
        const title = this.lang === 'fr' ? proc.titleFR : proc.titleEN;
        this.subsectionTitlesById[`${this.sequentialNumber}:${proc.id}`] = `${proc.code} — ${title}`;
        pdfSegments.push({
          type: 'html',
          content: `<div>${renderProcedure(proc, this.lang, buildingAddress, this.content.config)}</div>`,
          sequentialNumber: this.sequentialNumber,
          subsectionId: proc.id,
          colorBar: proc.headerColor,
        });
      });
      return true;
    }

    // ── Module 7 — identique PMU ──
    if (moduleNum === 7) {
      const module7Data = await this.prisma.module7Data.findUnique({ where: { projectId: this.project.id } });
      const sections7 = renderModule7(module7Data, this.content.config, this.lang, this.sequentialNumber);
      sections7.forEach((section, idx) => {
        this.subsectionTitlesById[`${this.sequentialNumber}:${section.id}`] = `${this.sequentialNumber}.${idx + 1} — ${section.title}`;
        pdfSegments.push({ type: 'html', content: `<div>${section.html}</div>`, sequentialNumber: this.sequentialNumber, subsectionId: section.id });
      });
      return true;
    }

    // ── Module 8 — filtrer section 8.11 registre analyse de risque ──
    if (moduleNum === 8) {
      let module8Data = this.content.module8;
      if (!module8Data) {
        const freshDoc = await this.prisma.document.findFirst({
          where: { projectId: this.project.id },
          select: { content: true },
        });
        module8Data = (freshDoc?.content as any)?.module8 || null;
      }
      const allSections8 = renderModule8(module8Data, this.lang, this.sequentialNumber);

      // Filtrer la section 8.11 (registre analyse de risque procédures climatiques)
      const sections8 = allSections8.filter((s: any) => s.id !== '8.11');

      sections8.forEach((section, idx) => {
        this.subsectionTitlesById[`${this.sequentialNumber}:${section.id}`] = `${this.sequentialNumber}.${idx + 1} — ${section.title}`;
        pdfSegments.push({ type: 'html', content: `<div>${section.html}</div>`, sequentialNumber: this.sequentialNumber, subsectionId: section.id });
      });
      return true;
    }

    return false;
  }

  // Adapte le contenu d'une section du Module 1 pour remplacer PMU par PSI
  private adaptSectionForPsi(section: any): any {
    const adapted = { ...section };

    // Adapter le titre si nécessaire
    if (adapted.title) {
      adapted.title = adapted.title
        .replace(/plan de mesures d'urgence/gi, 'Plan de sécurité incendie')
        .replace(/PMU/g, 'PSI');
    }

    // Adapter le contenu textuel
    if (adapted.content) {
      adapted.content = this.replacePmuWithPsi(adapted.content);
    }

    // Adapter les sous-sections récursivement
    if (adapted.subsections) {
      adapted.subsections = adapted.subsections.map((sub: any) => this.adaptSectionForPsi(sub));
    }

    // Adapter les paragraphes
    if (adapted.paragraphs) {
      adapted.paragraphs = adapted.paragraphs.map((p: any) => ({
        ...p,
        content: p.content ? this.replacePmuWithPsi(p.content) : p.content,
        text: p.text ? this.replacePmuWithPsi(p.text) : p.text,
      }));
    }

    // Adapter les bullets
    if (adapted.bullets) {
      adapted.bullets = adapted.bullets.map((b: any) =>
        typeof b === 'string' ? this.replacePmuWithPsi(b) : {
          ...b,
          text: b.text ? this.replacePmuWithPsi(b.text) : b.text,
        }
      );
    }

    return adapted;
  }

  private replacePmuWithPsi(text: string): string {
    if (!text) return text;
    return text
      .replace(/plan de mesures d'urgence/gi, 'Plan de sécurité incendie')
      .replace(/plans de mesures d'urgence/gi, 'Plans de sécurité incendie')
      .replace(/\bPMU\b/g, 'PSI')
      .replace(/mesures d'urgence telles que\s*:/gi, 'situations telles que :')
      .replace(/fuite de gaz\s*;?\s*/gi, '')
      .replace(/déversement de matières dangereuses\s*;?\s*/gi, '')
      .replace(/panne de courant ou d'ascenseur\s*;?\s*/gi, '')
      .replace(/coordonnateur d'urgence/gi, 'responsable de la sécurité incendie')
      .replace(/équipe d'urgence/gi, 'personnel de surveillance')
      .replace(/équipe d\'intervention/gi, 'personnel de surveillance')
      .replace(/code national de prévention des incendies – Canada 2010/gi,
               'Code national de prévention des incendies — Canada 2020')
      .replace(/section 2\.8/gi, 'article 2.8');
  }
}