import { Injectable, NotFoundException } from '@nestjs/common';
import puppeteer from 'puppeteer';
import { PDFDocument } from 'pdf-lib';
import { PrismaService } from '../prisma/prisma.service';
import { BASE_STYLES } from './templates/base.styles';
import { COVER_STYLES } from './templates/cover.styles';
import { generateCoverPage } from './templates/cover.template';
import {
  renderModule1,
  renderModule2,
  renderModule8,
} from './templates/modules/simple-modules.template';
import { renderModule7 } from './templates/modules/module7.template';
import { renderModule3 } from './templates/modules/module3.template';
import { renderModule4 } from './templates/modules/module4.template';

export interface ExportOptions {
  selectedModules: number[];   // ex: [1, 2, 3, 4, 7, 8]
  moduleOrder: number[];       // ordre choisi par l'utilisateur
  language: 'fr' | 'en' | 'both';
}

const DOCUMENT_TYPE_LABELS: Record<string, { fr: string; en: string }> = {
  PMU: { fr: 'Plan de mesures d\'urgence', en: 'Emergency Response Plan' },
  PSI: { fr: 'Plan de sécurité incendie',  en: 'Fire Safety Plan' },
  PCA: { fr: 'Plan de continuité des affaires', en: 'Business Continuity Plan' },
  PGC: { fr: 'Plan de gestion de crise',   en: 'Crisis Management Plan' },
  PRA: { fr: 'Plan de reprise des activités', en: 'Disaster Recovery Plan' },
  PUE: { fr: 'Plan d\'urgence environnementale', en: 'Environmental Emergency Plan' },
};

@Injectable()
export class ExportService {
  constructor(private readonly prisma: PrismaService) {}

  // ============================================================
  // POINT D'ENTRÉE PRINCIPAL
  // ============================================================

  async generatePdf(projectId: string, options: ExportOptions): Promise<{ fr?: Buffer; en?: Buffer }> {
    const doc = await this.prisma.document.findFirst({
      where: { projectId },
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

    // ── Page de couverture (générée en PDF séparé, marges 0) ──
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

    const coverPdfBuffer = await this.coverHtmlToPdf(coverHtml);

    // ── Corps du document selon modules sélectionnés + ordre ──
    let bodyHtml = '';
    const orderedModules = options.moduleOrder.filter(n => options.selectedModules.includes(n));

    for (const moduleNum of orderedModules) {
      bodyHtml += `<div class="page-break">`;

      if (moduleNum === 1) {
        const mod = modules.find((m: any) => m.moduleNumber === 1);
        bodyHtml += renderModule1(mod?.sections || []);
      } else if (moduleNum === 2) {
        const mod = modules.find((m: any) => m.moduleNumber === 2);
        const savedModule2 = content.module2;
        const mergedSections = this.mergeModule2SavedData(mod?.sections || [], savedModule2, lang);
        console.log('mergedSections IDs:', mergedSections.map((s: any) => s.id));
        bodyHtml += renderModule2(mergedSections, lang);
      } else if (moduleNum === 3) {
        const mod = modules.find((m: any) => m.moduleNumber === 3);
        bodyHtml += renderModule3(mod?.sections || [], lang);
      } else if (moduleNum === 4) {
        const procedures = this.getModule4Procedures(content, project);
        const buildingAddress = `${project.building.address}, ${project.building.city}, ${project.building.province}`;
        bodyHtml += renderModule4(procedures, lang, buildingAddress);
      } else if (moduleNum === 7) {
        const module7Data = await this.prisma.module7Data.findUnique({ where: { projectId: project.id } });
        bodyHtml += renderModule7(module7Data, content.config, lang);
      } else if (moduleNum === 8) {
        bodyHtml += renderModule8(content.module8, lang);
      }
      // moduleNum === 6 (plans) géré séparément lors de la fusion finale

      bodyHtml += `</div>`;
    }

    const fullBodyHtml = `
      <!DOCTYPE html>
      <html lang="${lang}">
      <head>
        <meta charset="UTF-8" />
        <style>${BASE_STYLES}</style>
      </head>
      <body>
        ${bodyHtml}
      </body>
      </html>
    `;

    const bodyPdfBuffer = await this.htmlToPdf(fullBodyHtml, doc.title, docTypeLabel);

    // ── Fusion couverture (marges 0) + corps (marges normales) ──
    return this.mergePdfs([coverPdfBuffer, bodyPdfBuffer]);
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
  // PUPPETEER — HTML du corps vers PDF avec header/footer + marges
  // ============================================================

  private async htmlToPdf(html: string, documentTitle: string, docTypeLabel: string): Promise<Buffer> {
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'load' });

      const headerTemplate = `
        <div style="width:100%;font-size:8px;padding:10px 50px 0 50px;color:#6C757D;">
        </div>
      `;

      const footerTemplate = `
        <div style="width:100%;font-size:9px;padding:0 50px 10px 50px;
          display:flex;justify-content:space-between;color:#ADB5BD;
          font-family:Arial,sans-serif;">
          <span>CORO</span>
          <span>${docTypeLabel} — <span class="pageNumber"></span></span>
        </div>
      `;

      const pdfBuffer = await page.pdf({
        format: 'Letter',
        printBackground: true,
        displayHeaderFooter: true,
        headerTemplate,
        footerTemplate,
        margin: { top: '100px', bottom: '80px', left: '50px', right: '50px' },
      });

      return Buffer.from(pdfBuffer);
    } finally {
      await browser.close();
    }
  }

  // ============================================================
  // PUPPETEER — HTML de la couverture vers PDF SANS marges
  // ============================================================

  private async coverHtmlToPdf(coverHtml: string): Promise<Buffer> {
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    try {
      const page = await browser.newPage();
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
      await page.setContent(fullCoverHtml, { waitUntil: 'load' });

      const pdfBuffer = await page.pdf({
        format: 'Letter',
        printBackground: true,
        displayHeaderFooter: false,
        margin: { top: '0', bottom: '0', left: '0', right: '0' },
      });

      return Buffer.from(pdfBuffer);
    } finally {
      await browser.close();
    }
  }

  // ============================================================
  // PDF-LIB — Fusionne plusieurs buffers PDF en un seul document
  // ============================================================

  private async mergePdfs(buffers: Buffer[]): Promise<Buffer> {
    const mergedPdf = await PDFDocument.create();

    for (const buffer of buffers) {
      const pdf = await PDFDocument.load(buffer);
      const pages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
      pages.forEach(page => mergedPdf.addPage(page));
    }

    const mergedBytes = await mergedPdf.save();
    return Buffer.from(mergedBytes);
  }
}