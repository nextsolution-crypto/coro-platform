import { Injectable, NotFoundException } from '@nestjs/common';
import puppeteer from 'puppeteer';
import { PDFDocument } from 'pdf-lib';
import { PrismaService } from '../prisma/prisma.service';
import { BASE_STYLES } from './templates/base.styles';
import { COVER_STYLES } from './templates/cover.styles';
import { generateCoverPage, generateLastPage } from './templates/cover.template';
import { generateSeparatorPage, SEPARATOR_STYLES } from './templates/separator.template';
import { generateTocPage, TOC_STYLES, TocEntry } from './templates/toc.template';
import {
  renderModule1,
  renderModule1Section,
  renderModule2,
  renderModule2Section,
  renderModule8,
} from './templates/modules/simple-modules.template';
import { renderModule7 } from './templates/modules/module7.template';
import { renderModule3 } from './templates/modules/module3.template';
import { renderModule4, renderProcedure } from './templates/modules/module4.template';
import { createDocumentBuilder } from './builders/document-builder.factory';

export interface ExportOptions {
  selectedModules: number[];   // ex: [1, 2, 3, 4, 7, 8]
  moduleOrder: number[];       // ordre choisi par l'utilisateur
  language: 'fr' | 'en' | 'both';
  isPreview?: boolean;
}

type PdfSegment =
  | { type: 'html'; content: string; sequentialNumber: number; subsectionId?: string; colorBar?: string }
  | { type: 'separator'; html: string; sequentialNumber: number }
  | { type: 'plans'; plans: { buffer: Buffer; section: string }[]; sequentialNumber: number };

const DOCUMENT_TYPE_LABELS: Record<string, { fr: string; en: string }> = {
  PMU: { fr: 'Plan de mesures d\'urgence', en: 'Emergency Response Plan' },
  PSI: { fr: 'Plan de sécurité incendie',  en: 'Fire Safety Plan' },
  PCA: { fr: 'Plan de continuité des affaires', en: 'Business Continuity Plan' },
  PGC: { fr: 'Plan de gestion de crise',   en: 'Crisis Management Plan' },
  PRA: { fr: 'Plan de reprise des activités', en: 'Disaster Recovery Plan' },
  PUE: { fr: 'Plan d\'urgence environnementale', en: 'Environmental Emergency Plan' },
};

const MODULE_TITLES: Record<number, { fr: string; en: string }> = {
  1: { fr: 'Introduction', en: 'Introduction' },
  2: { fr: 'Liste téléphonique', en: 'Phone Directory' },
  3: { fr: 'Rôles et responsabilités de l\'équipe d\'urgence', en: 'Emergency Team Roles and Responsibilities' },
  4: { fr: 'Procédures', en: 'Procedures' },
  6: { fr: 'Plans techniques du bâtiment', en: 'Technical Building Plans' },
  7: { fr: 'Description du site et équipements de sécurité', en: 'Site Description and Safety Equipment' },
  8: { fr: 'Registres et annexes', en: 'Records and Appendices' },
};

@Injectable()
export class ExportService {
  constructor(private readonly prisma: PrismaService) {}

  // ============================================================
  // POINT D'ENTRÉE PRINCIPAL
  // ============================================================

  async generatePdf(projectId: string, options: ExportOptions, organizationId: string): Promise<{ fr?: Buffer; en?: Buffer }> {
    const doc = await this.prisma.document.findFirst({
      where: { projectId, project: { organizationId } },
      include: {
        project: {
          include: { client: true, building: true, user: true },
        },
      },
    });
    if (!doc) throw new NotFoundException('Document introuvable');

    const content = doc.content as any;
    const result: { fr?: Buffer; en?: Buffer } = {};

    if (options.language === 'fr' || options.language === 'both') {
      result.fr = await this.generateSingleLanguagePdf(doc, content, 'fr', options);
    }
    if (options.language === 'en' || options.language === 'both') {
      result.en = await this.generateSingleLanguagePdf(doc, content, 'en', options);
    }

    return result;
  }

  // ============================================================
  // GÉNÉRATION D'UN PDF DANS UNE LANGUE
  // ============================================================

  private async generateSingleLanguagePdf(
    doc: any,
    content: any,
    lang: 'fr' | 'en',
    options: ExportOptions,
  ): Promise<Buffer> {
    const project = doc.project;
    const modules = lang === 'fr' ? content.modules_fr : content.modules_en;
    const isFr = lang === 'fr';
    const isIndustrielForExport = project.building.buildingType?.toLowerCase() === 'industriel';

    // ── Page de couverture ──
    const docTypeLabel = DOCUMENT_TYPE_LABELS[project.documentType]?.[lang] || project.documentType;
    const historiqueList = content.config?.historiqueList || [];
    const lastEntry = historiqueList.length > 0 ? historiqueList[historiqueList.length - 1] : null;
    const versionNumber = historiqueList.length > 0 ? historiqueList.length : 1;

    const coverHtml = generateCoverPage({
      documentType: project.documentType,
      documentTypeLabel: docTypeLabel,
      buildingName: project.building.name,
      buildingType: project.building.buildingType || '',
      buildingAddress: `${project.building.address}, ${project.building.city}, ${project.building.province}`,
      buildingPhotoBase64: project.building.photoBase64 || undefined,
      clientName: project.client.name,
      clientPhone: project.client.phone,
      year: project.year,
      language: lang,
      clientLogoBase64: project.client.logoBase64,
      coroLogoBase64: project.user?.companyLogoFullB64 || project.user?.companyLogoB64 || undefined,
      coroPhone: project.user?.companyPhone || undefined,
      coroEmail: project.user?.companyEmail || undefined,
      revisionDate: lastEntry?.date || content.config?.dateReleve || undefined,
      revisionType: lastEntry?.type || content.config?.versionDocument || undefined,
      versionNumber,
    });

    const fullCoverHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8" />
        <style>
          ${COVER_STYLES}
          @page { size: letter portrait; margin: 0; }
        </style>
      </head>
      <body>${coverHtml}</body>
      </html>
    `;

  // ── Instancie le builder selon le type de document ──
    const builder = createDocumentBuilder(
      project.documentType,
      this.prisma,
      doc,
      content,
      lang,
      { selectedModules: options.selectedModules, moduleOrder: options.moduleOrder },
    );

    const orderedModules = builder.orderedModules;
    const pdfSegments: PdfSegment[] = [];
    const currentHtmlChunk = { value: '' };
    const currentHtmlSeqNumber = { value: 0 };

    for (const moduleNum of orderedModules) {
      await builder.buildModuleSegments(moduleNum, pdfSegments, currentHtmlChunk, currentHtmlSeqNumber);
    }

    if (currentHtmlChunk.value) {
      pdfSegments.push({ type: 'html', content: currentHtmlChunk.value, sequentialNumber: currentHtmlSeqNumber.value });
    }

    const subsectionTitlesById = builder.subsectionTitlesById;

    // ── UN SEUL NAVIGATEUR PARTAGÉ pour tous les segments HTML ──
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    // Buffers de couverture + corps (sans le sommaire, généré après coup une fois les pages connues)
    const bodyBuffersWithMeta: { buffer: Buffer; sequentialNumber: number; isSeparator: boolean; subsectionId?: string; colorBar?: string }[] = [];

    try {
      const headerTemplate = `
        <div style="width:100%;font-size:8px;padding:10px 50px 0 50px;color:#6C757D;"></div>
      `;
      const footerTemplate = `
        <div style="width:100%;font-size:9px;padding:0;color:transparent;"></div>
      `;

      for (const segment of pdfSegments) {
        if (segment.type === 'separator') {
          const separatorFullHtml = `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="UTF-8" />
              <style>
                ${SEPARATOR_STYLES}
                @page { size: letter portrait; margin: 0; }
              </style>
            </head>
            <body>${segment.html}</body>
            </html>
          `;
          const sepPage = await browser.newPage();
          await sepPage.setContent(separatorFullHtml, { waitUntil: 'load' });
          const sepBytes = await sepPage.pdf({
            format: 'Letter',
            printBackground: true,
            displayHeaderFooter: false,
            margin: { top: '0', bottom: '0', left: '0', right: '0' },
          });
          bodyBuffersWithMeta.push({ buffer: Buffer.from(sepBytes), sequentialNumber: segment.sequentialNumber, isSeparator: true });
          await sepPage.close();
        } else if (segment.type === 'html') {
          const segmentHtml = `
            <!DOCTYPE html>
            <html lang="${lang}">
            <head>
              <meta charset="UTF-8" />
              <style>${BASE_STYLES}</style>
            </head>
            <body>${segment.content}</body>
            </html>
          `;
          const segPage = await browser.newPage();
          await segPage.setContent(segmentHtml, { waitUntil: 'load' });
          const segBytes = await segPage.pdf({
            format: 'Letter',
            printBackground: true,
            displayHeaderFooter: true,
            headerTemplate,
            footerTemplate,
            margin: { top: '100px', bottom: '80px', left: '50px', right: '50px' },
          });
          bodyBuffersWithMeta.push({
            buffer: Buffer.from(segBytes),
            sequentialNumber: segment.sequentialNumber,
            isSeparator: false,
            subsectionId: segment.type === 'html' ? segment.subsectionId : undefined,
            colorBar: segment.type === 'html' ? segment.colorBar : undefined,
          });
          await segPage.close();
        } else {
          for (const planEntry of segment.plans) {
            bodyBuffersWithMeta.push({
              buffer: planEntry.buffer,
              sequentialNumber: segment.sequentialNumber,
              isSeparator: false,
              subsectionId: `plan_${planEntry.section}`,
            });
          }
        }
      }

      // ── Helper : calcule la page de départ de chaque module ET de chaque
      // ── sous-section, étant donné le nombre de pages du sommaire ──
      const computePageStarts = (tocPageCount: number): {
        moduleStarts: Record<number, number>;
        subsectionStarts: Record<string, number>; // clé "seqNum:subsectionId"
      } => {
        const moduleStarts: Record<number, number> = {};
        const subsectionStarts: Record<string, number> = {};
        let runningPageCount = 1 + tocPageCount;

        for (const item of bodyBuffersWithMeta) {
          const pageCount = pageCountsBySegment.get(item) as number;

          if (item.isSeparator && moduleStarts[item.sequentialNumber] === undefined) {
            moduleStarts[item.sequentialNumber] = runningPageCount + 1;
          }
          if (item.subsectionId) {
            const key = `${item.sequentialNumber}:${item.subsectionId}`;
            if (subsectionStarts[key] === undefined) {
              subsectionStarts[key] = runningPageCount + 1;
            }
          }
          runningPageCount += pageCount;
        }
        return { moduleStarts, subsectionStarts };
      };

      // Précalcule le nombre de pages de chaque buffer (évite de recharger 2x)
      const pageCountsBySegment = new Map<typeof bodyBuffersWithMeta[number], number>();
      for (const item of bodyBuffersWithMeta) {
        const pdf = await PDFDocument.load(item.buffer);
        pageCountsBySegment.set(item, pdf.getPageCount());
      }

      const buildTocEntries = (
        moduleStarts: Record<number, number>,
        subsectionStarts: Record<string, number>,
      ): TocEntry[] => {
        return Object.keys(moduleStarts)
          .map(Number)
          .sort((a, b) => a - b)
          .map(seqNum => {
            // Reconstruit les sous-sections de ce module avec leur vraie page
            const subsectionsForModule = Object.keys(subsectionTitlesById)
              .filter(key => key.startsWith(`${seqNum}:`))
              .map(key => {
                const subsectionId = key.split(':')[1];
                return {
                  id: subsectionId,
                  title: subsectionTitlesById[key],
                  page: subsectionStarts[key] ?? moduleStarts[seqNum],
                };
              });

            return {
              sequentialNumber: seqNum,
              moduleTitle: this.findModuleTitleBySeq(orderedModules, seqNum, lang, doc.project.documentType),
              pageNumber: moduleStarts[seqNum],
              subsections: subsectionsForModule,
            };
          });
      };

      const renderTocToPdf = async (entries: TocEntry[]): Promise<Uint8Array> => {
        const tocHtml = generateTocPage({ entries, isFr });
        const fullTocHtml = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="UTF-8" />
            <style>${TOC_STYLES}</style>
          </head>
          <body>${tocHtml}</body>
          </html>
        `;
        const tocPage = await browser.newPage();
        await tocPage.setContent(fullTocHtml, { waitUntil: 'load' });
        const bytes = await tocPage.pdf({
          format: 'Letter',
          printBackground: true,
          displayHeaderFooter: false,
          margin: { top: '100px', bottom: '80px', left: '70px', right: '70px' },
        });
        await tocPage.close();
        return bytes;
      };

      // ── PASSE 1 — sommaire provisoire (numéros approximatifs) juste pour mesurer sa taille ──
      const provisional = computePageStarts(1); // suppose 1 page pour la mesure initiale
      const provisionalEntries = buildTocEntries(provisional.moduleStarts, provisional.subsectionStarts);
      const provisionalTocBytes = await renderTocToPdf(provisionalEntries);
      const provisionalTocPdf = await PDFDocument.load(provisionalTocBytes);
      const realTocPageCount = provisionalTocPdf.getPageCount();

      // ── PASSE 2 — sommaire final, avec les vrais numéros de page une fois la taille réelle connue ──
      const final = computePageStarts(realTocPageCount);
      const finalEntries = buildTocEntries(final.moduleStarts, final.subsectionStarts);
      const tocBytes = await renderTocToPdf(finalEntries);

      // ── Couverture ──
      const coverPage = await browser.newPage();
      await coverPage.setContent(fullCoverHtml, { waitUntil: 'load' });
      const coverBytes = await coverPage.pdf({
        format: 'Letter',
        printBackground: true,
        displayHeaderFooter: false,
        margin: { top: '0', bottom: '0', left: '0', right: '0' },
      });
      await coverPage.close();

      // ── Dernière page ──
      const lastPageHtml = generateLastPage({
        companyName: project.user?.companyName || undefined,
        companyLogoFullB64: project.user?.companyLogoFullB64 || undefined,
        companyLogoB64: project.user?.companyLogoB64 || undefined,
        companyPhone: project.user?.companyPhone || undefined,
        companyEmail: project.user?.companyEmail || undefined,
        companyAddress: (project.user as any)?.companyAddress || undefined,
        companyWebsite: (project.user as any)?.companyWebsite || undefined,
        companyTagline: (project.user as any)?.companyTagline || undefined,
        year: project.year,
        language: lang,
      });
      const fullLastPageHtml = `<!DOCTYPE html><html><head><meta charset="UTF-8"/><style>@page{size:letter portrait;margin:0;}body{margin:0;padding:0;}</style></head><body>${lastPageHtml}</body></html>`;
      const lastPage = await browser.newPage();
      await lastPage.setContent(fullLastPageHtml, { waitUntil: 'load' });
      const lastPageBytes = await lastPage.pdf({
        format: 'Letter',
        printBackground: true,
        displayHeaderFooter: false,
        margin: { top: '0', bottom: '0', left: '0', right: '0' },
      });
      await lastPage.close();

      // ── Assemblage final : Couverture → Sommaire → Corps (avec séparateurs et plans) → Dernière page ──
      const allBuffers = [
        Buffer.from(coverBytes),
        Buffer.from(tocBytes),
        ...bodyBuffersWithMeta.map(b => b.buffer),
        Buffer.from(lastPageBytes),
      ];

      // Identifie les sourceIndex correspondant aux pages de plans (Module 6),
      // pour les exclure du filigrane — leur subsectionId commence par 'plan_'
      const planSourceIndices = new Set<number>();
      bodyBuffersWithMeta.forEach((b, idx) => {
        if (b.subsectionId?.startsWith('plan_')) {
          planSourceIndices.add(idx + 2); // +2 car couverture(0) et sommaire(1) précèdent
        }
      });

      const mergedPdf = await this.mergePdfsAndGetCounts(allBuffers);
      await this.drawPageNumbers(mergedPdf.pdfDoc, mergedPdf.pageRanges, docTypeLabel);

      if (options.isPreview) {
        await this.drawPreviewWatermark(mergedPdf.pdfDoc, isFr);
      }
      // Identifie les sourceIndex correspondant aux pages séparateurs de module
      const separatorSourceIndices = new Set<number>();
      bodyBuffersWithMeta.forEach((b, idx) => {
        if (b.isSeparator) separatorSourceIndices.add(idx + 2);
      });

      await this.drawWatermarks(
        mergedPdf.pdfDoc,
        mergedPdf.pageRanges,
        project.user?.companyLogoFullB64 || project.user?.companyLogoB64,
        project.client?.logoBase64,
        planSourceIndices,
        separatorSourceIndices,
      );
      await this.drawProcedureColorBars(mergedPdf.pdfDoc, mergedPdf.pageRanges, bodyBuffersWithMeta);

      const finalBytes = await mergedPdf.pdfDoc.save();
      return Buffer.from(finalBytes);
    } finally {
      try {
        await browser.close();
      } catch (err) {
        console.warn('Avertissement fermeture navigateur (ignoré) :', err);
      }
    }
  }

  // ============================================================
  // RETROUVE LE TITRE DU MODULE POUR UN NUMÉRO SÉQUENTIEL DONNÉ
  // ============================================================

  private findModuleTitleBySeq(orderedModules: number[], seqNum: number, lang: 'fr' | 'en', documentType?: string): string {
    const moduleNum = orderedModules[seqNum - 1];

    const PCA_MODULE_TITLES: Record<number, { fr: string; en: string }> = {
      1: { fr: 'Introduction et politique de continuité',     en: 'Introduction and Continuity Policy' },
      2: { fr: 'Contexte organisationnel et gouvernance',     en: 'Organizational Context and Governance' },
      3: { fr: 'Appréciation du risque (ARA)',                en: 'Risk Assessment' },
      4: { fr: 'Bilan d\'impact sur les activités (BIA)',     en: 'Business Impact Analysis (BIA)' },
      5: { fr: 'Stratégies de continuité',                    en: 'Continuity Strategies' },
      6: { fr: 'Communication de crise',                      en: 'Crisis Communication' },
      7: { fr: 'Activation et procédures de reprise',         en: 'Activation and Recovery Procedures' },
      8: { fr: 'Exercices, registres et maintien du plan',    en: 'Exercises, Records and Plan Maintenance' },
    };

    if (documentType === 'PCA') {
      return PCA_MODULE_TITLES[moduleNum]?.[lang] || `Module ${moduleNum}`;
    }

    return MODULE_TITLES[moduleNum]?.[lang] || `Module ${moduleNum}`;
  }

  // ============================================================
  // RÉCUPÈRE LES PROCÉDURES ACTIVES DU MODULE 4
  // ============================================================

  private getModule4Procedures(content: any, project: any): any[] {
    const { getActiveProcedures } = require('../generator/procedures/index');
    const module4Content = content.module4 || {};
    const module3Content = content.modules_fr?.find((m: any) => m.moduleNumber === 3);
    const savedOrgRoles = module3Content?.sections?.find((s: any) => s.id === '3.1')?.orgRoles || [];

    const activeRoleCodes = savedOrgRoles.length > 0
      ? savedOrgRoles.filter((r: any) => r.isActive).map((r: any) => r.roleCode).filter(Boolean)
      : ['ROLE-AS', 'ROLE-CU', 'ROLE-EPI', 'ROLE-RM', 'ROLE-RPR', 'ROLE-SS', 'ROLE-BRI', 'ROLE-RS', 'ROLE-CHE', 'ROLE-ACC'];

    return getActiveProcedures(
      content.config || {},
      project.documentType,
      activeRoleCodes,
    );
  }

  // ============================================================
  // FUSIONNE LES SECTIONS GÉNÉRÉES AVEC LES DONNÉES RÉELLEMENT
  // SAUVEGARDÉES PAR L'UTILISATEUR DANS L'ÉDITEUR MODULE 2
  // ============================================================

  private mergeModule2SavedData(generatedSections: any[], savedModule2: any, lang: 'fr' | 'en'): any[] {
    if (!savedModule2) return generatedSections;

    const sectionKeyMap: Record<string, string> = {
      '2.1': 'section2_1',
      '2.2': 'section2_2',
      '2.3': 'section2_3',
      '2.4': 'section2_4',
    };

    const isFr = lang === 'fr';
    const section25Active = savedModule2.section2_5Enabled && savedModule2.section2_5?.length > 0;

    const merged = generatedSections
      .filter(section => section.id !== '2.5' || section25Active)
      .map(section => {
        const savedKey = sectionKeyMap[section.id];
        if (section.id === '2.5') {
          return {
            ...section,
            title: isFr ? 'RESSOURCES CORPORATIVES' : 'CORPORATE RESOURCES',
            entries: savedModule2.section2_5,
          };
        }
        if (savedKey && savedModule2[savedKey]) {
          const updated = { ...section, entries: savedModule2[savedKey] };
          if (section.id === '2.1') {
            updated.internalEmergencyNumber = savedModule2.internalEmergencyNumber || '';
          }
          return updated;
        }
        return section;
      });

    return merged;
  }

  // ============================================================
  // FUSIONNE LES SECTIONS GÉNÉRÉES AVEC LES DONNÉES RÉELLEMENT
  // SAUVEGARDÉES PAR L'UTILISATEUR DANS L'ÉDITEUR MODULE 3
  // (rôles actifs, couleurs, positions, membres de l'équipe)
  // ============================================================

  private mergeModule3SavedData(generatedSections: any[], savedModule3: any): any[] {
    if (!savedModule3) return generatedSections;

    return generatedSections.map(section => {
      if (section.id === '3.1' && savedModule3.orgRoles) {
        return { ...section, orgRoles: savedModule3.orgRoles };
      }
      if (section.id === '3.2' && savedModule3.members) {
        return { ...section, members: savedModule3.members };
      }
      return section;
    });
  }

  // ============================================================
  // RÉCUPÈRE LES PLANS TECHNIQUES (MODULE 6) TRIÉS PAR SECTION
  // Ordre fixe : Implantation → Coupe → Opération → Secteurs → Divers
  // Seules les sections ayant au moins un plan uploadé apparaissent
  // ============================================================

  private async getBuildingPlansSorted(projectId: string): Promise<{ buffer: Buffer; section: string }[]> {
    const plans = await this.prisma.buildingPlan.findMany({
      where: { projectId },
      orderBy: { order: 'asc' },
    });

    const sectionOrder = ['IMPLANTATION', 'COUPE', 'OPERATION', 'SECTEURS', 'DIVERS'];

    const sorted = sectionOrder.flatMap(section => plans.filter(p => p.section === section));

    return sorted.map(plan => ({
      buffer: Buffer.from(plan.fileBase64, 'base64'),
      section: plan.section,
    }));
  }

  // ============================================================
  // FUSIONNE LES PDF ET RETOURNE LES PLAGES DE PAGES PAR BUFFER
  // SOURCE — permet de savoir quelles pages sont la couverture,
  // le sommaire, un séparateur, du contenu, ou un plan
  // ============================================================

  private async mergePdfsAndGetCounts(buffers: Buffer[]): Promise<{
    pdfDoc: PDFDocument;
    pageRanges: { start: number; end: number; sourceIndex: number }[];
  }> {
    const mergedPdf = await PDFDocument.create();
    const pageRanges: { start: number; end: number; sourceIndex: number }[] = [];
    let currentPage = 0;

    for (let i = 0; i < buffers.length; i++) {
      const pdf = await PDFDocument.load(buffers[i]);
      const pages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
      pages.forEach(page => mergedPdf.addPage(page));

      const pageCount = pdf.getPageCount();
      pageRanges.push({ start: currentPage, end: currentPage + pageCount - 1, sourceIndex: i });
      currentPage += pageCount;
    }

    return { pdfDoc: mergedPdf, pageRanges };
  }

  // ============================================================
  // DESSINE LE NUMÉRO DE PAGE CONTINU (1, 2, 3...) SUR CHAQUE
  // PAGE DE CONTENU — exclut couverture (index 0) et sommaire
  // (index 1, peu importe son nombre réel de pages)
  // ============================================================

  private async drawPageNumbers(
    pdfDoc: PDFDocument,
    pageRanges: { start: number; end: number; sourceIndex: number }[],
    docTypeLabel: string,
  ): Promise<void> {
    const { rgb, StandardFonts } = await import('pdf-lib');
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const pages = pdfDoc.getPages();
    const totalPages = pages.length;

    const FOOTER_Y = 28;

    // index 0 = couverture, index 1 = sommaire — jamais numérotés
    // dernière page (totalPages - 1) = page de fin — jamais numérotée
    const SKIP_SOURCE_INDICES = new Set([0, 1]);
    const lastSourceIndex = pageRanges[pageRanges.length - 1]?.sourceIndex;

    for (const range of pageRanges) {
      if (SKIP_SOURCE_INDICES.has(range.sourceIndex)) continue;
      if (range.sourceIndex === lastSourceIndex) continue; // Skip dernière page

      for (let pageIdx = range.start; pageIdx <= range.end; pageIdx++) {
        const page = pages[pageIdx];
        const { width } = page.getSize();
        const pageNumberLabel = `${pageIdx + 1}`;

        // Type de document — centré horizontalement, même hauteur que le numéro
        const docTypeFontSize = 9;
        const docTypeTextWidth = regularFont.widthOfTextAtSize(docTypeLabel, docTypeFontSize);
        page.drawText(docTypeLabel, {
          x: (width - docTypeTextWidth) / 2,
          y: FOOTER_Y,
          size: docTypeFontSize,
          font: regularFont,
          color: rgb(0.678, 0.678, 0.678), // équivalent #ADB5BD
        });

        // Numéro de page — coin droit, même hauteur
        page.drawText(pageNumberLabel, {
          x: width - 65,
          y: FOOTER_Y,
          size: 10,
          font: boldFont,
          color: rgb(0.663, 0.196, 0.149), // équivalent #A93226
        });
      }
    }
  }

  // ============================================================
  // DESSINE LES LOGOS EN FILIGRANE (CORO en bas à gauche,
  // client en haut à gauche) sur toutes les pages SAUF
  // couverture (index 0) et plans techniques (sans page de
  // contenu HTML — détectés via sourceIndex sans correspondance HTML)
  // ============================================================

  private async drawWatermarks(
    pdfDoc: PDFDocument,
    pageRanges: { start: number; end: number; sourceIndex: number }[],
    coroLogoBase64: string | undefined,
    clientLogoBase64: string | undefined,
    planSourceIndices: Set<number>,
    separatorSourceIndices: Set<number>,
  ): Promise<void> {
    const pages = pdfDoc.getPages();
    const MAX_LOGO_WIDTH = 100;
    const MAX_LOGO_HEIGHT = 30;
    const OPACITY = 0.35;

    const computeFittedSize = (imgWidth: number, imgHeight: number): { width: number; height: number } => {
      const scaleByWidth = MAX_LOGO_WIDTH / imgWidth;
      const scaleByHeight = MAX_LOGO_HEIGHT / imgHeight;
      const scale = Math.min(scaleByWidth, scaleByHeight);
      return { width: imgWidth * scale, height: imgHeight * scale };
    };

    const embedLogo = async (base64?: string) => {
      if (!base64) return null;
      try {
        const cleaned = base64.includes(',') ? base64.split(',')[1] : base64;
        const bytes = Buffer.from(cleaned, 'base64');
        const isPng = base64.includes('image/png') || bytes[0] === 0x89;
        return isPng ? await pdfDoc.embedPng(bytes) : await pdfDoc.embedJpg(bytes);
      } catch (err) {
        console.warn('Avertissement: impossible d\'intégrer un logo filigrane :', err);
        return null;
      }
    };

    const coroImage = await embedLogo(coroLogoBase64);
    const clientImage = await embedLogo(clientLogoBase64);

    if (!coroImage && !clientImage) return;

    // index 0 = couverture — jamais de filigrane
    // les pages de plans (Module 6) sont aussi exclues (PDF externes insérés tels quels)
    // dernière page (page de fin) — aussi exclue
    const lastSourceIndex = pageRanges[pageRanges.length - 1]?.sourceIndex;
    const SKIP_SOURCE_INDICES = new Set([0, lastSourceIndex, ...planSourceIndices, ...separatorSourceIndices]);

    for (const range of pageRanges) {
      if (SKIP_SOURCE_INDICES.has(range.sourceIndex)) continue;

      for (let pageIdx = range.start; pageIdx <= range.end; pageIdx++) {
        const page = pages[pageIdx];
        const { width, height } = page.getSize();

        if (coroImage) {
          const { width: logoW, height: logoH } = computeFittedSize(coroImage.width, coroImage.height);
          // Centre verticalement le logo sur la même ligne que le texte/numéro (FOOTER_Y=28, taille texte ~9-10px)
          const footerCenterY = 28 + 5;
          page.drawImage(coroImage, {
            x: 40,
            y: footerCenterY - logoH / 2,
            width: logoW,
            height: logoH,
            opacity: OPACITY,
          });
        }

        if (clientImage) {
          const { width: logoW, height: logoH } = computeFittedSize(clientImage.width, clientImage.height);
          page.drawImage(clientImage, {
            x: 40,
            y: height - logoH - 30,
            width: logoW,
            height: logoH,
            opacity: OPACITY,
          });
        }
      }
    }
  }

  // ============================================================
  // DESSINE LA BANDE COLORÉE 10PX PLEINE LARGEUR EN HAUT DE
  // CHAQUE PAGE APPARTENANT À UNE PROCÉDURE (Module 4), avec
  // la couleur officielle headerColor de cette procédure
  // ============================================================

  private async drawProcedureColorBars(
    pdfDoc: PDFDocument,
    pageRanges: { start: number; end: number; sourceIndex: number }[],
    bodyBuffersWithMeta: { colorBar?: string }[],
  ): Promise<void> {
    const { rgb } = await import('pdf-lib');
    const pages = pdfDoc.getPages();
    const BAR_HEIGHT = 10;

    const hexToRgb = (hex: string) => {
      const clean = hex.replace('#', '');
      const r = parseInt(clean.substring(0, 2), 16) / 255;
      const g = parseInt(clean.substring(2, 4), 16) / 255;
      const b = parseInt(clean.substring(4, 6), 16) / 255;
      return rgb(r, g, b);
    };

    for (const range of pageRanges) {
      // sourceIndex 0=couverture, 1=sommaire — décalage de 2 vers bodyBuffersWithMeta
      const metaIdx = range.sourceIndex - 2;
      if (metaIdx < 0 || metaIdx >= bodyBuffersWithMeta.length) continue;

      const colorBar = bodyBuffersWithMeta[metaIdx]?.colorBar;
      if (!colorBar) continue;

      const color = hexToRgb(colorBar);

      for (let pageIdx = range.start; pageIdx <= range.end; pageIdx++) {
        const page = pages[pageIdx];
        const { width, height } = page.getSize();
        page.drawRectangle({
          x: 0,
          y: height - BAR_HEIGHT,
          width,
          height: BAR_HEIGHT,
          color,
        });
      }
    }
  }

  // ============================================================
  // DESSINE LE FILIGRANE "APERÇU"/"PREVIEW" EN DIAGONALE, AU
  // CENTRE DE CHAQUE PAGE — appliqué uniformément, couverture
  // incluse, quand l'utilisateur active la case "version aperçu"
  // ============================================================

  private async drawPreviewWatermark(pdfDoc: PDFDocument, isFr: boolean): Promise<void> {
    const { rgb, StandardFonts, degrees } = await import('pdf-lib');
    const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const label = isFr ? 'APERÇU' : 'PREVIEW';
    const fontSize = 110;
    const textWidth = font.widthOfTextAtSize(label, fontSize);
    const angleRad = (45 * Math.PI) / 180;

    for (const page of pdfDoc.getPages()) {
      const { width, height } = page.getSize();

      // Centre réel du texte après rotation 45° : on ajuste x/y pour compenser
      // le décalage causé par la rotation autour du coin inférieur gauche du texte
      const centerX = width / 2;
      const centerY = height / 2;
      const x = centerX - (textWidth / 2) * Math.cos(angleRad);
      const y = centerY - (textWidth / 2) * Math.sin(angleRad);

      page.drawText(label, {
        x,
        y,
        size: fontSize,
        font,
        color: rgb(0.6, 0.6, 0.6),
        opacity: 0.25,
        rotate: degrees(45),
      });
    }
  }
}