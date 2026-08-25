import { PrismaService } from '../../prisma/prisma.service';
import { BaseDocumentBuilder, PdfSegment } from './base.builder';
import { generateSeparatorPage } from '../templates/separator.template';
import { renderProcedure } from '../templates/modules/module4.template';
import { BASE_STYLES } from '../templates/base.styles';

// Titres des modules PCA
const PCA_MODULE_TITLES: Record<number, { fr: string; en: string }> = {
  1: { fr: 'Introduction et politique de continuité',       en: 'Introduction and Continuity Policy' },
  2: { fr: 'Contexte organisationnel et gouvernance',       en: 'Organizational Context and Governance' },
  3: { fr: 'Appréciation du risque (ARA)',                  en: 'Risk Assessment' },
  4: { fr: 'Bilan d\'impact sur les activités (BIA)',       en: 'Business Impact Analysis (BIA)' },
  5: { fr: 'Stratégies de continuité',                      en: 'Continuity Strategies' },
  6: { fr: 'Communication de crise',                        en: 'Crisis Communication' },
  7: { fr: 'Activation et procédures de reprise',           en: 'Activation and Recovery Procedures' },
  8: { fr: 'Exercices, registres et maintien du plan',      en: 'Exercises, Records and Plan Maintenance' },
};

export class PcaBuilder extends BaseDocumentBuilder {

  getDefaultModules(): number[] {
    return [1, 2, 3, 4, 5, 6, 7, 8];
  }

  private renderPcaSectionWithHeader(moduleNum: number, section: any): string {
    return this.renderPcaSection(section);
  }

  private renderPcaSection(section: any): string {
    const { renderFormattedText } = require('../templates/modules/simple-modules.template');
    const content = this.convertDashTablesToPipe(section.content || '');
    return `
      <div class="no-break" style="margin-bottom: 28px;">
        <div class="section-header">
          <span class="section-id">${section.id || ''}</span>
          <span class="section-title-line2">${section.title || ''}</span>
          <div class="section-bar"></div>
        </div>
        <div style="font-size: 10.5pt; line-height: 1.8; color: #2C3E50;">
          ${renderFormattedText(content)}
        </div>
      </div>
    `;
  }

  private convertDashTablesToPipe(content: string): string {
    // Convertit les tableaux avec ─────── en tableaux pipe Markdown
    const lines = content.split('\n');
    const result: string[] = [];
    let i = 0;

    while (i < lines.length) {
      const line = lines[i];

      // Ligne séparateur ─────────────
      const isSeparator = /^─{10,}/.test(line.trim());
      if (isSeparator) {
        i++;
        continue;
      }

      // Ligne tableau — COL1 | COL2 | COL3
      const isPipeRow = line.includes(' | ') && !line.startsWith('•') && !line.startsWith('-');
      if (isPipeRow) {
        const cells = line.split(' | ');
        result.push('|' + cells.join('|') + '|');
        i++;
        continue;
      }

      // Ligne titre de section en majuscules (sans pipe)
      const isSectionTitle = /^[A-ZÀÂÄÉÈÊËÎÏÔÙÛÜ\s\-\/()]{8,}$/.test(line.trim()) && !line.includes('|') && line.trim().length > 0;
      if (isSectionTitle && !line.startsWith('•') && !line.startsWith('-')) {
        result.push(`**${line.trim()}**`);
        i++;
        continue;
      }

      result.push(line);
      i++;
    }

    return result.join('\n');
  }

  private buildPcaModuleHtml(moduleNum: number, sections: any[]): string {
    const title = this.isFr
      ? PCA_MODULE_TITLES[moduleNum]?.fr
      : PCA_MODULE_TITLES[moduleNum]?.en;

    const sectionsHtml = sections.map(s => this.renderPcaSection(s)).join('');

    return `
      <div>
        <div style="margin-bottom: 36px; padding-bottom: 16px; border-bottom: 3px solid #C0392B;">
          <p style="font-size: 9pt; font-weight: 700; color: #C0392B; margin: 0 0 4px 0;
            text-transform: uppercase; letter-spacing: 0.15em;">
            ${this.isFr ? `MODULE ${moduleNum}` : `MODULE ${moduleNum}`}
          </p>
          <h2 style="font-size: 20pt; font-weight: 800; color: #2C3E50; margin: 0; line-height: 1.2;">
            ${title || ''}
          </h2>
        </div>
        ${sectionsHtml}
      </div>
    `;
  }

  private buildContactsHtml(contacts: any[]): string {
    if (!contacts || contacts.length === 0) return '';

    const categories = [...new Set(contacts.map((c: any) => c.category))];

    return categories.map(cat => {
      const catContacts = contacts.filter((c: any) => c.category === cat);
      const rows = catContacts.map((c: any) => `
        <tr>
          <td style="padding: 8px 12px; border-bottom: 1px solid #F1F3F5; font-size: 11px; color: #2C3E50;">${c.role || ''}</td>
          <td style="padding: 8px 12px; border-bottom: 1px solid #F1F3F5; font-size: 11px; color: #2C3E50;">${c.name || ''}</td>
          <td style="padding: 8px 12px; border-bottom: 1px solid #F1F3F5; font-size: 11px; color: #2C3E50; font-weight: 700;">${c.phone || ''}</td>
          <td style="padding: 8px 12px; border-bottom: 1px solid #F1F3F5; font-size: 11px; color: #6C757D;">${c.email || ''}</td>
        </tr>
      `).join('');

      return `
        <div style="margin-bottom: 24px;">
          <h4 style="font-size: 11px; font-weight: 700; color: #C0392B; text-transform: uppercase;
            letter-spacing: 0.08em; margin: 0 0 8px 0; padding-bottom: 6px; border-bottom: 1px solid #E9ECEF;">
            ${cat}
          </h4>
          <table style="width: 100%; border-collapse: collapse; border: 1px solid #E9ECEF; border-radius: 4px; overflow: hidden;">
            <thead>
              <tr style="background: #F8F9FA;">
                <th style="padding: 8px 12px; text-align: left; font-size: 10px; font-weight: 700;
                  color: #6C757D; text-transform: uppercase; letter-spacing: 0.05em; width: 30%;">
                  ${this.isFr ? 'Rôle / Fonction' : 'Role / Function'}
                </th>
                <th style="padding: 8px 12px; text-align: left; font-size: 10px; font-weight: 700;
                  color: #6C757D; text-transform: uppercase; letter-spacing: 0.05em; width: 22%;">
                  ${this.isFr ? 'Nom' : 'Name'}
                </th>
                <th style="padding: 8px 12px; text-align: left; font-size: 10px; font-weight: 700;
                  color: #6C757D; text-transform: uppercase; letter-spacing: 0.05em; width: 22%;">
                  ${this.isFr ? 'Téléphone' : 'Phone'}
                </th>
                <th style="padding: 8px 12px; text-align: left; font-size: 10px; font-weight: 700;
                  color: #6C757D; text-transform: uppercase; letter-spacing: 0.05em; width: 26%;">
                  ${this.isFr ? 'Courriel' : 'Email'}
                </th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      `;
    }).join('');
  }

  private buildProceduresHtml(procedures: any[]): string {
    if (!procedures || procedures.length === 0) {
      return `<p style="font-size: 11px; color: #ADB5BD; text-align: center; padding: 24px;">
        ${this.isFr ? 'Aucune procédure activée.' : 'No procedures activated.'}
      </p>`;
    }

    return procedures
      .filter((p: any) => p.isActive !== false)
      .map((p: any) => renderProcedure(p.content || p, this.lang, this.project.building?.address || '', {}))
      .join('');
  }

  async buildModuleSegments(
    moduleNum: number,
    pdfSegments: PdfSegment[],
    currentHtmlChunk: { value: string },
    currentHtmlSeqNumber: { value: number },
  ): Promise<boolean> {

    // Flush le chunk courant
    if (currentHtmlChunk.value) {
      pdfSegments.push({ type: 'html', content: currentHtmlChunk.value, sequentialNumber: currentHtmlSeqNumber.value });
      currentHtmlChunk.value = '';
    }

    // Séparateur de module — incrémente sequentialNumber
    this.sequentialNumber += 1;
    const title = this.isFr
      ? PCA_MODULE_TITLES[moduleNum]?.fr
      : PCA_MODULE_TITLES[moduleNum]?.en;

    const sepHtml = generateSeparatorPage({
      sequentialNumber: this.sequentialNumber,
      moduleTitle: title || '',
      documentTypeLabel: this.docTypeLabel,
      buildingName: this.project.building?.name || '',
      year: this.project.year,
    });

    pdfSegments.push({ type: 'separator', html: sepHtml, sequentialNumber: this.sequentialNumber });
    currentHtmlSeqNumber.value = this.sequentialNumber;

    const mod = this.modules.find((m: any) => m.moduleNumber === moduleNum);
    const sections = mod?.sections || [];

    // Enregistrer les sous-sections pour la table des matières
    sections.forEach((s: any, i: number) => {
      this.subsectionTitlesById[`${this.sequentialNumber}:${s.id}`] = `${this.sequentialNumber}.${i + 1} — ${s.title}`;
    });

    // ── Module 4 — Procédures PCA ──
    if (moduleNum === 4) {
      // Sections BIA du générateur — une section par segment
      for (const section of sections) {
        pdfSegments.push({
          type: 'html',
          content: this.wrapHtml(`<div>${this.renderPcaSection(section)}</div>`),
          sequentialNumber: this.sequentialNumber,
          subsectionId: section.id,
        });
      }

      // Procédures PCA depuis la DB
      try {
        const pcaProcedures = await this.prisma.procedureDefault.findMany({
          where: { isActive: true, code: { startsWith: 'PC' } },
          orderBy: { code: 'asc' },
        });

        const overrides = await this.prisma.procedureOverride.findMany({
          where: { projectId: this.doc.projectId },
        });
        const overrideMap = new Map(overrides.map((o: any) => [o.procedureId, o]));

        const procedures = pcaProcedures.map((p: any) => {
          const override = overrideMap.get(p.id);
          return {
            ...p,
            content: override ? override.content : p.content,
            isActive: override ? override.isActive : true,
          };
        }).filter((p: any) => p.isActive !== false);

        if (procedures.length > 0) {
          const procsHtml = this.buildProceduresHtml(procedures);
          pdfSegments.push({
            type: 'html',
            content: this.wrapHtml(`<div style="padding: 40px 50px;">${procsHtml}</div>`),
            sequentialNumber: this.sequentialNumber,
          });
        }
      } catch (err) {
        console.error('Erreur chargement procédures PCA:', err);
      }

      return true;
    }

    // ── Module 6 — Communication + Contacts ──
    if (moduleNum === 6) {
      // Sections texte du générateur (sauf m6_s5 qui est remplacé par le tableau)
      const otherSections = sections.filter((s: any) => s.id !== 'm6_s5');

      // Contacts depuis la DB (sauvegardés via Module6PcaContacts)
      let contactsHtml = '';
      try {
        const module4Data = await this.prisma.document.findFirst({
          where: { projectId: this.doc.projectId },
          select: { content: true },
        });
        const savedContent = module4Data?.content as any;
        const contacts = savedContent?.module4?.pcaContacts || [];
        if (contacts.length > 0) {
          contactsHtml = `
            <div style="margin-bottom: 32px;">
              <h3 style="font-size: 13px; font-weight: 700; color: #2C3E50; margin: 0 0 12px 0;
                padding-bottom: 8px; border-bottom: 2px solid #C0392B; text-transform: uppercase;
                letter-spacing: 0.05em;">
                ${this.isFr ? 'Répertoire de contacts opérationnels' : 'Operational Contact Directory'}
              </h3>
              ${this.buildContactsHtml(contacts)}
            </div>
          `;
        }
      } catch (err) {
        console.error('Erreur chargement contacts PCA:', err);
      }

      const moduleHtml = `
        <div style="font-family: 'Arial', sans-serif; padding: 40px 50px; max-width: 900px; margin: 0 auto;">
          <div style="margin-bottom: 32px;">
            <div style="display: flex; align-items: center; gap: 16px; margin-bottom: 8px;">
              <div style="width: 4px; height: 40px; background: #C0392B; border-radius: 2px; flex-shrink: 0;"></div>
              <div>
                <p style="font-size: 10px; font-weight: 700; color: #C0392B; margin: 0;
                  text-transform: uppercase; letter-spacing: 0.15em;">MODULE 6</p>
                <h2 style="font-size: 18px; font-weight: 800; color: #2C3E50; margin: 4px 0 0 0;">
                  ${this.isFr ? 'Communication de crise' : 'Crisis Communication'}
                </h2>
              </div>
            </div>
            <div style="height: 1px; background: linear-gradient(to right, #C0392B, transparent); margin-top: 8px;"></div>
          </div>
          ${contactsHtml}
          ${otherSections.map((s: any) => this.renderPcaSection(s)).join('')}
        </div>
      `;

      pdfSegments.push({
        type: 'html',
        content: this.wrapHtml(moduleHtml),
        sequentialNumber: this.sequentialNumber,
      });

      return true;
    }

    // ── Tous les autres modules PCA (1, 2, 3, 5, 7, 8) — une section par segment ──
    for (const section of sections) {
      pdfSegments.push({
        type: 'html',
        content: this.wrapHtml(`<div>${this.renderPcaSectionWithHeader(moduleNum, section)}</div>`),
        sequentialNumber: this.sequentialNumber,
        subsectionId: section.id,
      });
    }

    return true;
  }

  private wrapHtml(body: string): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8" />
        <style>${BASE_STYLES}</style>
      </head>
      <body>${body}</body>
      </html>
    `;
  }
}