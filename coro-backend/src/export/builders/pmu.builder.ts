import { PrismaService } from '../../prisma/prisma.service';
import { BaseDocumentBuilder, PdfSegment } from './base.builder';
import { generateSeparatorPage } from '../templates/separator.template';
import {
  renderModule1,
  renderModule1Section,
  renderModule2,
  renderModule2Section,
  renderModule8,
} from '../templates/modules/simple-modules.template';
import { renderModule3 } from '../templates/modules/module3.template';
import { renderModule4, renderProcedure } from '../templates/modules/module4.template';
import { renderModule7 } from '../templates/modules/module7.template';

export class PmuBuilder extends BaseDocumentBuilder {

  getDefaultModules(): number[] {
    return [1, 2, 3, 4, 6, 7, 8];
  }

  async buildModuleSegments(
    moduleNum: number,
    pdfSegments: PdfSegment[],
    currentHtmlChunk: { value: string },
    currentHtmlSeqNumber: { value: number },
  ): Promise<boolean> {

    // ── Module 6 — Plans (PDF natifs, traitement spécial) ──
    if (moduleNum === 6) {
      if (currentHtmlChunk.value) {
        pdfSegments.push({ type: 'html', content: currentHtmlChunk.value, sequentialNumber: currentHtmlSeqNumber.value });
        currentHtmlChunk.value = '';
      }
      const planEntries = await this.getBuildingPlansSorted();
      if (planEntries.length > 0) {
        const sepHtml = this.buildSeparatorHtml(6, generateSeparatorPage);
        pdfSegments.push({ type: 'separator', html: sepHtml, sequentialNumber: this.sequentialNumber });
        pdfSegments.push({ type: 'plans', plans: planEntries, sequentialNumber: this.sequentialNumber });

        const sectionLabels: Record<string, { fr: string; en: string }> = {
          IMPLANTATION: { fr: 'Plan d\'implantation', en: 'Site Plan' },
          COUPE:        { fr: 'Plan de coupe',        en: 'Cross-Section Plan' },
          OPERATION:    { fr: 'Plan d\'opération',    en: 'Operations Plan' },
          SECTEURS:     { fr: 'Plan des secteurs',    en: 'Sector Plan' },
          DIVERS:       { fr: 'Divers',               en: 'Miscellaneous' },
        };
        const presentSections = Array.from(new Set(planEntries.map(p => p.section)));
        presentSections.forEach(section => {
          const label = sectionLabels[section]?.[this.lang] || section;
          this.subsectionTitlesById[`${this.sequentialNumber}:plan_${section}`] = label;
        });
      }
      return true;
    }

    // ── Tous les autres modules : on flush d'abord le chunk HTML courant ──
    if (currentHtmlChunk.value) {
      pdfSegments.push({ type: 'html', content: currentHtmlChunk.value, sequentialNumber: currentHtmlSeqNumber.value });
      currentHtmlChunk.value = '';
    }
    const sepHtml = this.buildSeparatorHtml(moduleNum, generateSeparatorPage);
    pdfSegments.push({ type: 'separator', html: sepHtml, sequentialNumber: this.sequentialNumber });
    currentHtmlSeqNumber.value = this.sequentialNumber;

    // ── Module 1 ──
    if (moduleNum === 1) {
      const mod = this.modules.find((m: any) => m.moduleNumber === 1);
      const sections1 = mod?.sections || [];
      sections1.forEach((s: any) => {
        this.subsectionTitlesById[`${this.sequentialNumber}:${s.id}`] = `${s.id} — ${s.title}`;
      });
      for (const section of sections1) {
        pdfSegments.push({
          type: 'html',
          content: `<div>${renderModule1Section(section, false)}</div>`,
          sequentialNumber: this.sequentialNumber,
          subsectionId: section.id,
        });
      }
      return true;
    }

    // ── Module 2 ──
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

    // ── Module 3 ──
    if (moduleNum === 3) {
      const mod = this.modules.find((m: any) => m.moduleNumber === 3);
      const mergedSections3 = this.mergeModule3SavedData(mod?.sections || [], this.content.module3);
      const { html31, html32, has32 } = renderModule3(mergedSections3, this.lang, this.sequentialNumber);

      const s31Title = mergedSections3.find((s: any) => s.id === '3.1')?.title || (this.isFr ? 'ORGANIGRAMME' : 'ORGANIZATIONAL CHART');
      this.subsectionTitlesById[`${this.sequentialNumber}:3.1`] = `${this.sequentialNumber}.1 — ${s31Title}`;
      pdfSegments.push({ type: 'html', content: `<div>${html31}</div>`, sequentialNumber: this.sequentialNumber, subsectionId: '3.1' });

      if (has32 && this.isIndustriel) {
        const s32Title = mergedSections3.find((s: any) => s.id === '3.2')?.title || (this.isFr ? 'LISTE DES MEMBRES' : 'MEMBER LIST');
        this.subsectionTitlesById[`${this.sequentialNumber}:3.2`] = `${this.sequentialNumber}.2 — ${s32Title}`;
        pdfSegments.push({ type: 'html', content: `<div>${html32}</div>`, sequentialNumber: this.sequentialNumber, subsectionId: '3.2' });
      }
      return true;
    }

    // ── Module 4 ──
    if (moduleNum === 4) {
      const procedures = this.getModule4Procedures();
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

    // ── Module 7 ──
    if (moduleNum === 7) {
      const module7Data = await this.prisma.module7Data.findUnique({ where: { projectId: this.project.id } });
      const sections7 = renderModule7(module7Data, this.content.config, this.lang, this.sequentialNumber);
      sections7.forEach((section, idx) => {
        this.subsectionTitlesById[`${this.sequentialNumber}:${section.id}`] = `${this.sequentialNumber}.${idx + 1} — ${section.title}`;
        pdfSegments.push({ type: 'html', content: `<div>${section.html}</div>`, sequentialNumber: this.sequentialNumber, subsectionId: section.id });
      });
      return true;
    }

    // ── Module 8 ──
    if (moduleNum === 8) {
      let module8Data = this.content.module8;
      if (!module8Data) {
        const freshDoc = await this.prisma.document.findFirst({
          where: { projectId: this.project.id },
          select: { content: true },
        });
        module8Data = (freshDoc?.content as any)?.module8 || null;
      }
      const sections8 = renderModule8(module8Data, this.lang, this.sequentialNumber);
      sections8.forEach((section, idx) => {
        this.subsectionTitlesById[`${this.sequentialNumber}:${section.id}`] = `${this.sequentialNumber}.${idx + 1} — ${section.title}`;
        pdfSegments.push({ type: 'html', content: `<div>${section.html}</div>`, sequentialNumber: this.sequentialNumber, subsectionId: section.id });
      });
      return true;
    }

    return false;
  }
}