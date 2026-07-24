import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import puppeteer from 'puppeteer';

@Injectable()
export class Module8Service {
  constructor(private readonly prisma: PrismaService) {}

  private async assertProjectOwnership(projectId: string, organizationId: string) {
    const project = await this.prisma.project.findFirst({ where: { id: projectId, organizationId } });
    if (!project) {
      throw new NotFoundException('Projet introuvable');
    }
  }

  async getData(projectId: string, organizationId: string) {
    await this.assertProjectOwnership(projectId, organizationId);

    const doc = await this.prisma.document.findFirst({
      where: { projectId },
      select: { content: true },
    });

    const content = (doc?.content as any) || {};
    return { module8: content.module8 || null };
  }

  async saveData(projectId: string, dto: any, organizationId: string) {
    await this.assertProjectOwnership(projectId, organizationId);

    const doc = await this.prisma.document.findFirst({
      where: { projectId },
    });
    if (!doc) throw new NotFoundException('Document introuvable');

    const content = (doc.content as any) || {};

    await this.prisma.document.update({
      where: { id: doc.id },
      data: {
        content: {
          ...content,
          module8: dto,
        },
      },
    });

    return { success: true, updatedAt: new Date().toISOString() };
  }
  async generateAttendancePdf(projectId: string, organizationId: string, language: string): Promise<Buffer> {
    await this.assertProjectOwnership(projectId, organizationId);

    const doc = await this.prisma.document.findFirst({ where: { projectId } });
    const content = (doc?.content as any) || {};
    const module8 = content.module8 || {};
    const isFr = language !== 'en';

    const entries = module8.section8_1 || [];
    const defaultRows = Array.from({ length: 20 }, () => ({ nom: '', titre: '', date: '', formateur: '' }));
    const rows = entries.length > 0 ? entries : defaultRows;

    const rowsHtml = rows.map((e: any, idx: number) => `
      <tr style="height:36px;background-color:${idx % 2 === 0 ? '#FFFFFF' : '#F8F9FA'};">
        <td style="border:1px solid #DEE2E6;padding:4px 8px;"></td>
        <td style="border:1px solid #DEE2E6;padding:4px 8px;">${e.nom || ''}</td>
        <td style="border:1px solid #DEE2E6;padding:4px 8px;">${e.titre || ''}</td>
        <td style="border:1px solid #DEE2E6;padding:4px 8px;text-align:center;">${e.date || ''}</td>
        <td style="border:1px solid #DEE2E6;padding:4px 8px;">${e.formateur || ''}</td>
      </tr>
    `).join('');

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
        <div class="footer">CORO — ${isFr ? 'Feuille de présence — Formation mesures d\'urgence' : 'Attendance Sheet — Emergency Measures Training'}</div>
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