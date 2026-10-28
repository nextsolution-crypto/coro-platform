import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import puppeteer from 'puppeteer';
import { AdviserActor, projectAccessWhere } from '../auth/project-access';
import { DocumentEditorIntegrityService } from '../generator/document-editor-integrity.service';

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

@Injectable()
export class Module8Service {
  constructor(
    private readonly prisma: PrismaService,
    private readonly integrity: DocumentEditorIntegrityService,
  ) {}

  private async assertProjectOwnership(projectId: string, actor: AdviserActor) {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, ...projectAccessWhere(actor), isActive: true },
    });
    if (!project) {
      throw new NotFoundException('Projet introuvable');
    }
  }

  async getData(projectId: string, actor: AdviserActor) {
    await this.assertProjectOwnership(projectId, actor);

    const doc = await this.prisma.document.findFirst({
      where: { projectId },
      select: { content: true, lockVersion: true },
    });

    const content = this.integrity.sanitize((doc?.content as any) || {});
    return { module8: content.module8 || null, lockVersion: doc?.lockVersion };
  }

  async saveData(projectId: string, dto: any, actor: AdviserActor) {
    const { expectedLockVersion, ...module8 } = dto;
    const result = await this.integrity.mutateProjectContent(
      projectId,
      actor,
      expectedLockVersion,
      (content) => ({
        content: { ...content, module8 },
        value: null,
      }),
    );
    return {
      success: true,
      updatedAt: new Date().toISOString(),
      lockVersion: result.lockVersion,
    };
  }
  async generateAttendancePdf(
    projectId: string,
    actor: AdviserActor,
    language: string,
  ): Promise<Buffer> {
    await this.assertProjectOwnership(projectId, actor);

    const doc = await this.prisma.document.findFirst({ where: { projectId } });
    const content = (doc?.content as any) || {};
    const module8 = content.module8 || {};
    const isFr = language !== 'en';

    const entries = module8.section8_1 || [];
    const defaultRows = Array.from({ length: 20 }, () => ({
      nom: '',
      titre: '',
      date: '',
      formateur: '',
    }));
    const rows = entries.length > 0 ? entries : defaultRows;

    const rowsHtml = rows
      .map(
        (e: any, idx: number) => `
      <tr style="height:36px;background-color:${idx % 2 === 0 ? '#FFFFFF' : '#F8F9FA'};">
        <td style="border:1px solid #DEE2E6;padding:4px 8px;"></td>
        <td style="border:1px solid #DEE2E6;padding:4px 8px;">${escapeHtml(e.nom)}</td>
        <td style="border:1px solid #DEE2E6;padding:4px 8px;">${escapeHtml(e.titre)}</td>
        <td style="border:1px solid #DEE2E6;padding:4px 8px;text-align:center;">${escapeHtml(e.date)}</td>
        <td style="border:1px solid #DEE2E6;padding:4px 8px;">${escapeHtml(e.formateur)}</td>
      </tr>
    `,
      )
      .join('');

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8" />
        <style>
          body { font-family: Arial, sans-serif; margin: 40px; color: #2C3E50; }
          h1 { font-size: 16pt; font-weight: 900; text-transform: uppercase; margin-bottom: 4px; }
          .bar { height: 3px; background-color: #C0392B; width: 60px; margin-bottom: 24px; }
          table { width: 100%; border-collapse: collapse; font-size: 10pt; }
          th { background-color: #2C3E50; color: #FFFFFF; padding: 8px; text-align: left; font-size: 9pt; text-transform: uppercase; border: 1px solid #2C3E50; }
          td { border: 1px solid #DEE2E6; padding: 4px 8px; }
          .footer { margin-top: 24px; font-size: 8pt; color: #ADB5BD; text-align: center; }
        </style>
      </head>
      <body>
        <h1>${isFr ? 'Registre de formation' : 'Training Register'}</h1>
        <div class="bar"></div>
        <table>
          <thead>
            <tr>
              <th style="width:5%;">#</th>
              <th style="width:28%;">${isFr ? 'Nom' : 'Name'}</th>
              <th style="width:30%;">${isFr ? 'Titre / Fonction' : 'Title / Function'}</th>
              <th style="width:15%;">Date</th>
              <th style="width:22%;">${isFr ? 'Formateur' : 'Trainer'}</th>
            </tr>
          </thead>
          <tbody>${rowsHtml}</tbody>
        </table>
        <div class="footer">CORO — ${isFr ? "Feuille de présence — Formation mesures d'urgence" : 'Attendance Sheet — Emergency Measures Training'}</div>
      </body>
      </html>
    `;

    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'load' });
    const pdf = await page.pdf({
      format: 'Letter',
      printBackground: true,
      margin: { top: '20mm', bottom: '20mm', left: '15mm', right: '15mm' },
    });
    await browser.close();
    return Buffer.from(pdf);
  }
}
