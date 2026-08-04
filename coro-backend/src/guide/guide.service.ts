import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import puppeteer from 'puppeteer';
import { PDFDocument } from 'pdf-lib';
import { generateCoverPage, generateLastPage } from '../export/templates/cover.template';
import { COVER_STYLES } from '../export/templates/cover.styles';
import { generateTocPage, TOC_STYLES } from '../export/templates/toc.template';
import { BASE_STYLES } from '../export/templates/base.styles';
import { renderModule3 } from '../export/templates/modules/module3.template';
import { PDFDocument as PDFDocLib } from 'pdf-lib';
import { P015_IMAGES } from '../generator/procedures/p015_images.asset';

@Injectable()
export class GuideService {
  constructor(private prisma: PrismaService) {}

  async generateGuide(projectId: string, organizationId: string, lang: 'fr' | 'en'): Promise<{ pdf: Buffer; filename: string }> {
    const doc = await this.prisma.document.findFirst({
      where: { projectId, project: { organizationId } },
      include: {
        project: {
          include: { client: true, building: true, user: true },
        },
      },
    });
    if (!doc) throw new NotFoundException('Document introuvable');

    const project = doc.project;
    const content = doc.content as any;
    const config = content?.config || {};
    const isFr = lang === 'fr';

    const isDoubleSignal = config.panneauType === 'DOUBLE';
    const isBOMA = config.certBOMA === true;

    // Données réutilisées du PMU
    const modules = isFr ? content.modules_fr : content.modules_en;
    const module3 = modules?.find((m: any) => m.moduleNumber === 3);
    const savedModule3 = content.module3;

    // Plan d'implantation pour section 1.4
    let planImplantation: any = await this.prisma.buildingPlan.findFirst({
      where: { projectId, section: 'IMPLANTATION' },
      orderBy: { order: 'asc' },
    }) ?? undefined;

    const historiqueList = config.historiqueList || [];
    const lastEntry = historiqueList.length > 0 ? historiqueList[historiqueList.length - 1] : null;
    const versionNumber = historiqueList.length > 0 ? historiqueList.length : 1;

    const DOCUMENT_TYPE_LABELS: Record<string, { fr: string; en: string }> = {
      PMU: { fr: 'Plan de mesures d\'urgence', en: 'Emergency Response Plan' },
      PSI: { fr: 'Plan de sécurité incendie', en: 'Fire Safety Plan' },
    };
    const docTypeLabel = DOCUMENT_TYPE_LABELS[project.documentType]?.[lang] || project.documentType;
    const buildingAddress = `${project.building.address}, ${project.building.city}, ${project.building.province}`;

    const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });

    // Convertir le PDF du plan d'implantation en image PNG via pdf.js dans Puppeteer
    if (planImplantation?.fileBase64) {
      try {
        const pdfBase64 = planImplantation.fileBase64.includes(',')
          ? planImplantation.fileBase64.split(',')[1]
          : planImplantation.fileBase64;

        const pdfPage = await browser.newPage();
        await pdfPage.setViewport({ width: 1100, height: 850 });
        await pdfPage.setContent(`
          <!DOCTYPE html>
          <html><head><meta charset="UTF-8"/>
          <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"></script>
          <style>
            * { margin:0; padding:0; }
            body { background:#FFFFFF; }
            canvas { display:block; }
          </style>
          </head>
          <body>
            <canvas id="c"></canvas>
            <script>
              pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
              const data = atob('${pdfBase64}');
              const arr = new Uint8Array(data.length);
              for (let i = 0; i < data.length; i++) arr[i] = data.charCodeAt(i);
              pdfjsLib.getDocument({ data: arr }).promise.then(pdf => {
                pdf.getPage(1).then(page => {
                  const vp = page.getViewport({ scale: 1.5 });
                  const canvas = document.getElementById('c');
                  canvas.width = vp.width;
                  canvas.height = vp.height;
                  page.render({ canvasContext: canvas.getContext('2d'), viewport: vp }).promise.then(() => {
                    window._done = true;
                  });
                });
              });
            </script>
          </body></html>
        `, { waitUntil: 'load' });

        // Attendre que le rendu PDF soit terminé
        await pdfPage.waitForFunction('window._done === true', { timeout: 15000 });
        const screenshot = await pdfPage.screenshot({ type: 'png', fullPage: true });
        await pdfPage.close();
        planImplantation = { ...planImplantation, imageBase64: Buffer.from(screenshot).toString('base64') };
      } catch (err) {
        console.warn('Impossible de convertir le plan en image:', err);
        planImplantation = { ...planImplantation, imageBase64: null };
      }
    }

    try {
      // ── COUVERTURE ──
      const coverHtml = generateCoverPage({
        documentType: project.documentType,
        documentTypeLabel: DOCUMENT_TYPE_LABELS[project.documentType]?.[lang] || project.documentType,
        buildingName: project.building.name,
        buildingType: project.building.buildingType || '',
        buildingAddress,
        buildingPhotoBase64: project.building.photoBase64 || undefined,
        clientName: project.client.name,
        clientPhone: project.client.phone || undefined,
        year: project.year,
        language: lang,
        clientLogoBase64: project.client.logoBase64 || undefined,
        coroLogoBase64: project.user?.companyLogoFullB64 || project.user?.companyLogoB64 || undefined,
        coroPhone: project.user?.companyPhone || undefined,
        coroEmail: project.user?.companyEmail || undefined,
        revisionDate: lastEntry?.date || config.dateReleve || undefined,
        revisionType: lastEntry?.type || config.versionDocument || undefined,
        versionNumber,
        guideMention: isFr ? 'GUIDE DU LOCATAIRE' : 'TENANT GUIDE',
      });

      const coverPage = await browser.newPage();
      await coverPage.setContent(`<!DOCTYPE html><html><head><meta charset="UTF-8"/><style>${COVER_STYLES}@page{size:letter portrait;margin:0;}</style></head><body>${coverHtml}</body></html>`, { waitUntil: 'load' });
      const coverBytes = await coverPage.pdf({ format: 'Letter', printBackground: true, displayHeaderFooter: false, margin: { top: '0', bottom: '0', left: '0', right: '0' } });
      await coverPage.close();

      // ── CONSTRUCTION DES SOUS-SECTIONS (une par une pour avoir les vraies pages) ──
      const subsectionBuffers: {
        buffer: Buffer;
        seqNum: number;
        subsectionId: string;
        title: string;
        sectionTitle: string;
      }[] = [];

      const renderHtml = async (html: string): Promise<Buffer> => {
        const fullHtml = `<!DOCTYPE html><html lang="${lang}"><head><meta charset="UTF-8"/><style>${BASE_STYLES}${this.guideStyles()}</style></head><body>${html}</body></html>`;
        const p = await browser.newPage();
        await p.setContent(fullHtml, { waitUntil: 'load' });
        const bytes = await p.pdf({
          format: 'Letter', printBackground: true, displayHeaderFooter: false,
          margin: { top: '100px', bottom: '80px', left: '50px', right: '50px' },
        });
        await p.close();
        return Buffer.from(bytes);
      };

      // ── SECTION 1 : sous-sections individuelles ──
      const s1SubSections = this.buildSection1Subsections(config, content, module3, savedModule3, isFr, isDoubleSignal, buildingAddress, project, planImplantation);
      for (const sub of s1SubSections) {
        const buf = await renderHtml(sub.html);
        subsectionBuffers.push({ buffer: buf, seqNum: 1, subsectionId: sub.id, title: sub.title, sectionTitle: isFr ? 'Introduction' : 'Introduction' });
      }

      // ── SECTION 2 : chaque procédure séparément ──
      const s2SubSections = this.buildSection2Subsections(config, isFr, isDoubleSignal, isBOMA, buildingAddress);
      let firstSection2 = true;
      for (const sub of s2SubSections) {
        const sectionHeaderHtml = firstSection2 ? `
          <div class="section-header">
            <span class="section-id">2</span>
            <span class="section-title-line2">${isFr ? 'PROCÉDURES ÉQUIPE D\'URGENCE' : 'EMERGENCY TEAM PROCEDURES'}</span>
            <div class="section-bar"></div>
          </div>` : '';
        firstSection2 = false;
        const buf = await renderHtml(sectionHeaderHtml + sub.html);
        subsectionBuffers.push({ buffer: buf, seqNum: 2, subsectionId: sub.id, title: sub.title, sectionTitle: isFr ? 'Procédures équipe d\'urgence' : 'Emergency Team Procedures' });
      }

      // ── SECTION 3 : sous-sections individuelles ──
      const s3SubSections = this.buildSection3Subsections(isFr);
      let firstSection3 = true;
      for (const sub of s3SubSections) {
        const sectionHeaderHtml = firstSection3 ? `
          <div class="section-header">
            <span class="section-id">3</span>
            <span class="section-title-line2">${isFr ? 'RAPPORTS ET REGISTRES' : 'REPORTS AND REGISTERS'}</span>
            <div class="section-bar"></div>
          </div>` : '';
        firstSection3 = false;
        const buf = await renderHtml(sectionHeaderHtml + sub.html);
        subsectionBuffers.push({ buffer: buf, seqNum: 3, subsectionId: sub.id, title: sub.title, sectionTitle: isFr ? 'Rapports et registres' : 'Reports and Registers' });
      }

      // ── CALCUL DES PAGES ──
      const coverPageCount = (await PDFDocument.load(coverBytes)).getPageCount();
      const subPageCounts = await Promise.all(subsectionBuffers.map(async s => {
        const pdf = await PDFDocument.load(s.buffer);
        return pdf.getPageCount();
      }));

      // ── CONSTRUCTION DU SOMMAIRE ──
      const buildTocEntries = (tocPageCount: number) => {
        let running = coverPageCount + tocPageCount;
        const sectionMap: Record<number, { seqNum: number; title: string; pageNumber: number; subsections: any[] }> = {};

        subsectionBuffers.forEach((sub, idx) => {
          const pageStart = running + 1;
          running += subPageCounts[idx];

          if (!sectionMap[sub.seqNum]) {
            sectionMap[sub.seqNum] = {
              seqNum: sub.seqNum,
              title: sub.sectionTitle,
              pageNumber: pageStart,
              subsections: [],
            };
          }

          sectionMap[sub.seqNum].subsections.push({
            id: sub.subsectionId,
            title: sub.title,
            page: pageStart,
          });
        });

        return Object.values(sectionMap).sort((a, b) => a.seqNum - b.seqNum).map(s => ({
          sequentialNumber: s.seqNum,
          moduleTitle: s.title,
          pageNumber: s.pageNumber,
          subsections: s.subsections,
        }));
      };

      // Passe 1 — provisoire
      const provisionalEntries = buildTocEntries(1);
      const tocHtml1 = generateTocPage({ entries: provisionalEntries, isFr });
      const tocPage1 = await browser.newPage();
      await tocPage1.setContent(`<!DOCTYPE html><html><head><meta charset="UTF-8"/><style>${TOC_STYLES}</style></head><body>${tocHtml1}</body></html>`, { waitUntil: 'load' });
      const tocBytes1 = await tocPage1.pdf({ format: 'Letter', printBackground: true, displayHeaderFooter: false, margin: { top: '100px', bottom: '80px', left: '70px', right: '70px' } });
      await tocPage1.close();
      const realTocPageCount = (await PDFDocument.load(tocBytes1)).getPageCount();

      // Passe 2 — final
      const finalEntries = buildTocEntries(realTocPageCount);
      const tocHtml2 = generateTocPage({ entries: finalEntries, isFr });
      const tocPage2 = await browser.newPage();
      await tocPage2.setContent(`<!DOCTYPE html><html><head><meta charset="UTF-8"/><style>${TOC_STYLES}</style></head><body>${tocHtml2}</body></html>`, { waitUntil: 'load' });
      const tocBytes2 = await tocPage2.pdf({ format: 'Letter', printBackground: true, displayHeaderFooter: false, margin: { top: '100px', bottom: '80px', left: '70px', right: '70px' } });
      await tocPage2.close();

      // ── ASSEMBLAGE ──
      const merged = await PDFDocument.create();
      for (const buf of [Buffer.from(coverBytes), Buffer.from(tocBytes2), ...subsectionBuffers.map(s => s.buffer)]) {
        const src = await PDFDocument.load(buf);
        const pages = await merged.copyPages(src, src.getPageIndices());
        pages.forEach(p => merged.addPage(p));
      }

      // ── NUMÉROS DE PAGE ──
      const lastPageHtml = generateLastPage({
        companyName: (project.user as any)?.companyName || undefined,
        companyLogoFullB64: (project.user as any)?.companyLogoFullB64 || undefined,
        companyLogoB64: (project.user as any)?.companyLogoB64 || undefined,
        companyPhone: (project.user as any)?.companyPhone || undefined,
        companyEmail: (project.user as any)?.companyEmail || undefined,
        companyAddress: (project.user as any)?.companyAddress || undefined,
        companyWebsite: (project.user as any)?.companyWebsite || undefined,
        companyTagline: (project.user as any)?.companyTagline || undefined,
        year: project.year,
        language: lang,
      });
      const fullLastPageHtml = `<!DOCTYPE html><html><head><meta charset="UTF-8"/><style>@page{size:letter portrait;margin:0;}body{margin:0;padding:0;}</style></head><body>${lastPageHtml}</body></html>`;
      const lastPageBrowser = await browser.newPage();
      await lastPageBrowser.setContent(fullLastPageHtml, { waitUntil: 'load' });
      const lastPageBytes = await lastPageBrowser.pdf({
        format: 'Letter',
        printBackground: true,
        displayHeaderFooter: false,
        margin: { top: '0', bottom: '0', left: '0', right: '0' },
      });
      await lastPageBrowser.close();
      const lastPagePdf = await PDFDocument.load(lastPageBytes);
      const lastPagePdfPages = await merged.copyPages(lastPagePdf, lastPagePdf.getPageIndices());
      lastPagePdfPages.forEach(p => merged.addPage(p));

      // ── Numéros de page (skip couverture, sommaire et dernière page) ──
      const { rgb, StandardFonts } = await import('pdf-lib');
      const font = await merged.embedFont(StandardFonts.HelveticaBold);
      const regularFont = await merged.embedFont(StandardFonts.Helvetica);
      const pages = merged.getPages();
      const totalPages = pages.length;
      const guideLabel = isFr ? 'Guide du locataire' : 'Tenant Guide';
      pages.forEach((page, idx) => {
        if (idx < 2) return; // skip couverture + sommaire
        if (idx === totalPages - 1) return; // skip dernière page
        const { width } = page.getSize();
        const labelWidth = regularFont.widthOfTextAtSize(guideLabel, 9);
        page.drawText(guideLabel, { x: (width - labelWidth) / 2, y: 28, size: 9, font: regularFont, color: rgb(0.678, 0.678, 0.678) });
        page.drawText(String(idx + 1), { x: width - 65, y: 28, size: 10, font, color: rgb(0.663, 0.196, 0.149) });
      });

      const user = project.user as any;
      const client = project.client as any;
      const totalPagesGuide = merged.getPageCount();
      await this.drawWatermarks(
        merged,
        user?.companyLogoFullB64 || user?.companyLogoB64,
        client?.logoBase64,
        totalPagesGuide - 1,
      );

      const pdfBuffer = Buffer.from(await merged.save());

      // Construire le nom de fichier
      const projectNum = (project as any).projectNumber || (project as any).number || project.id.substring(0, 8);
      const buildingName = (project.building?.name || 'batiment')
        .replace(/[^a-zA-Z0-9À-ÿ\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-');
      const langLabel = lang.toUpperCase();
      const filename = `${projectNum}-${buildingName}-Guide-${langLabel}.pdf`;

      return { pdf: pdfBuffer, filename };
    } finally {
      await browser.close();
    }
  }

  private buildSection1Subsections(config: any, content: any, module3: any, savedModule3: any, isFr: boolean, isDoubleSignal: boolean, buildingAddress: string, project: any, planImplantation?: any): { id: string; title: string; html: string }[] {
    const fr = isFr;
    const responsableNom = config.responsableNom || '—';
    const responsableTitre = config.responsableTitre || '—';

    let orgHtml = '';
    if (module3 && savedModule3) {
      const mergedSections = (module3.sections || []).map((s: any) => {
        if (s.id === '3.1' && savedModule3.orgRoles) return { ...s, orgRoles: savedModule3.orgRoles };
        return s;
      });
      const { html31 } = renderModule3(mergedSections, isFr ? 'fr' : 'en', 1);
      orgHtml = html31;
    }

    const subHeader = (num: string, title: string) => `
      <div style="margin:20px 0 8px 0;">
        <span style="font-size:11pt;font-weight:700;color:#C0392B;">${num}</span>
        <span style="font-size:11pt;font-weight:700;color:#2C3E50;margin-left:8px;">${title}</span>
        <div style="height:2px;background-color:#E9ECEF;margin-top:6px;"></div>
      </div>
    `;

    const subs: { id: string; title: string; html: string }[] = [];

    // 1.1
    subs.push({
      id: '1.1',
      title: isFr ? '1.1 — INFORMATIONS AUX LOCATAIRES' : '1.1 — INFORMATION TO TENANTS',
      html: `
        <div>
          ${subHeader('1.1', fr ? 'INFORMATIONS AUX LOCATAIRES' : 'INFORMATION TO TENANTS')}
          <p style="font-size:10pt;font-weight:700;color:#2C3E50;margin-bottom:6px;">${fr ? 'Objectif du guide' : 'Guide objective'}</p>
          <p style="font-size:10pt;color:#495057;margin-bottom:16px;">${fr ? 'Le présent Guide du locataire a pour objectif d\'informer et de sensibiliser les occupants du bâtiment aux mesures de prévention et aux consignes d\'urgence en vigueur. Il vise à assurer la sécurité de tous en fournissant des instructions claires sur la conduite à adopter avant, pendant et après une situation d\'urgence.' : 'This Tenant Guide aims to inform and raise awareness among building occupants about prevention measures and emergency procedures in effect.'}</p>
          <p style="font-size:10pt;font-weight:700;color:#2C3E50;margin-bottom:6px;">${fr ? 'Distribution et mise à jour' : 'Distribution and updates'}</p>
          <p style="font-size:10pt;color:#495057;margin-bottom:8px;">${fr ? 'Chaque locataire reçoit une version du guide mise à jour par le gestionnaire d\'immeuble. Ce document doit être :' : 'Each tenant receives an updated version of the guide from the building manager. This document must be:'}</p>
          <ul style="font-size:10pt;color:#495057;padding-left:20px;margin-bottom:16px;">
            <li style="margin-bottom:6px;">${fr ? 'Conservé à portée de main par les responsables de chaque entreprise ou département locataire ;' : 'Kept within reach by the managers of each tenant company or department;'}</li>
            <li style="margin-bottom:6px;">${fr ? 'Diffusé à l\'ensemble des employés et nouveau personnel ;' : 'Distributed to all employees and new personnel;'}</li>
            <li style="margin-bottom:6px;">${fr ? 'Consulté régulièrement afin de maintenir une bonne connaissance des consignes de sécurité.' : 'Consulted regularly to maintain good knowledge of safety procedures.'}</li>
          </ul>
          <p style="font-size:10pt;font-weight:700;color:#2C3E50;margin-bottom:6px;">${fr ? 'Contenu du guide' : 'Guide contents'}</p>
          <ul style="font-size:10pt;color:#495057;padding-left:20px;margin-bottom:16px;">
            <li style="margin-bottom:6px;"><strong>${fr ? 'Points de rassemblement :' : 'Assembly points:'}</strong> ${fr ? 'Emplacements désignés à l\'extérieur du bâtiment où les occupants doivent se regrouper en cas d\'évacuation ;' : 'Designated locations outside the building where occupants must gather in case of evacuation;'}</li>
            <li style="margin-bottom:6px;"><strong>${fr ? 'Procédures d\'urgence simplifiées :' : 'Simplified emergency procedures:'}</strong> ${fr ? 'Étapes à suivre en cas d\'incendie, d\'alarme, de fuite de gaz, de déversement, ou de tout autre événement d\'urgence ;' : 'Steps to follow in case of fire, alarm, gas leak, spill, or any other emergency event;'}</li>
            <li style="margin-bottom:6px;"><strong>${fr ? 'Comportements sécuritaires :' : 'Safe behaviors:'}</strong> ${fr ? 'Bonnes pratiques quotidiennes en matière de prévention incendie et de sécurité civile ;' : 'Daily best practices for fire prevention and civil safety;'}</li>
            <li style="margin-bottom:6px;"><strong>${fr ? 'Rôles et responsabilités :' : 'Roles and responsibilities:'}</strong> ${fr ? 'Distinction entre les interventions de l\'équipe d\'urgence du bâtiment et les actions attendues des locataires.' : 'Distinction between building emergency team interventions and expected tenant actions.'}</li>
          </ul>
        </div>
      `,
    });

    // 1.2
    subs.push({
      id: '1.2',
      title: isFr ? '1.2 — RESPONSABILITÉ DU LOCATAIRE' : '1.2 — TENANT RESPONSIBILITIES',
      html: `
        <div>
          ${subHeader('1.2', fr ? 'RESPONSABILITÉ DU LOCATAIRE' : 'TENANT RESPONSIBILITIES')}
          <p style="font-size:10pt;font-weight:700;color:#2C3E50;margin-bottom:6px;">${fr ? 'Engagement général' : 'General commitment'}</p>
          <p style="font-size:10pt;color:#495057;margin-bottom:16px;">${fr ? 'La sécurité du bâtiment repose sur la collaboration active entre les occupants, les gestionnaires et l\'équipe d\'urgence du bâtiment.' : 'Building safety relies on active collaboration between occupants, managers, and the building emergency team.'}</p>
          <p style="font-size:10pt;font-weight:700;color:#2C3E50;margin-bottom:6px;">${fr ? 'Responsabilités administratives' : 'Administrative responsibilities'}</p>
          <ul style="font-size:10pt;color:#495057;padding-left:20px;margin-bottom:16px;">
            <li style="margin-bottom:8px;"><strong>${fr ? 'Désignation des responsables de secteur :' : 'Designation of sector wardens:'}</strong> ${fr ? 'chaque entreprise locataire doit nommer au moins un responsable de secteur par étage ou zone d\'occupation.' : 'each tenant company must appoint at least one sector warden per floor or occupancy zone.'}</li>
            <li style="margin-bottom:8px;"><strong>${fr ? 'Mise à jour des listes d\'évacuation :' : 'Update of evacuation lists:'}</strong> ${fr ? 'les locataires doivent transmettre régulièrement au gestionnaire du bâtiment la liste à jour des membres de leur équipe d\'évacuation.' : 'tenants must regularly provide the building manager with the updated list of evacuation team members.'}</li>
            <li style="margin-bottom:8px;"><strong>${fr ? 'Transmission des coordonnées d\'urgence :' : 'Emergency contact information:'}</strong> ${fr ? 'assurez-vous que les contacts internes et externes pertinents sont connus de tout votre personnel.' : 'ensure that relevant internal and external contacts are known to all your staff.'}</li>
          </ul>
          <p style="font-size:10pt;font-weight:700;color:#2C3E50;margin-bottom:6px;">${fr ? 'Prévention et entretien des zones locatives' : 'Prevention and maintenance of leased areas'}</p>
          <ul style="font-size:10pt;color:#495057;padding-left:20px;margin-bottom:16px;">
            <li style="margin-bottom:6px;"><strong>${fr ? 'Maintien des dégagements :' : 'Clearance maintenance:'}</strong> ${fr ? 'toutes les issues de secours doivent demeurer dégagées sur une largeur minimale d\'un mètre (42 pouces).' : 'all emergency exits must remain clear with a minimum width of one meter (42 inches).'}</li>
            <li style="margin-bottom:6px;"><strong>${fr ? 'Accessibilité des équipements :' : 'Equipment accessibility:'}</strong> ${fr ? 'les extincteurs, stations manuelles d\'alarme incendie et panneaux d\'information de sortie doivent être visibles et accessibles en tout temps.' : 'extinguishers, manual fire alarm stations, and exit signs must be visible and accessible at all times.'}</li>
            <li style="margin-bottom:6px;"><strong>${fr ? 'Signalement :' : 'Reporting:'}</strong> ${fr ? 'toute anomalie observée doit être signalée immédiatement à la sécurité.' : 'any observed anomaly must be reported immediately to security.'}</li>
          </ul>
          <div style="background-color:#F8F9FA;border:1px solid #E9ECEF;border-radius:4px;padding:16px;margin-top:8px;">
            <p style="font-size:10pt;font-weight:700;color:#2C3E50;margin-bottom:8px;">${fr ? 'Message du gestionnaire' : 'Manager\'s message'}</p>
            <p style="font-size:10pt;color:#495057;margin-bottom:12px;">${fr ? 'Pour toute question ou précision sur les mesures de sécurité, veuillez communiquer avec :' : 'For any questions regarding safety measures, please contact:'}</p>
            <p style="font-size:10pt;font-weight:600;color:#2C3E50;">${responsableNom} — ${responsableTitre}</p>
            ${project.building?.phone ? `<p style="font-size:10pt;color:#495057;">${project.building.phone}</p>` : ''}
          </div>
        </div>
      `,
    });

    // 1.3
    subs.push({
      id: '1.3',
      title: isFr ? '1.3 — RAPPEL DES BONNES PRATIQUES EN CAS D\'ALARME INCENDIE' : '1.3 — BEST PRACTICES REMINDER FOR FIRE ALARMS',
      html: `
        <div>
          ${subHeader('1.3', fr ? 'RAPPEL DES BONNES PRATIQUES EN CAS D\'ALARME INCENDIE' : 'BEST PRACTICES REMINDER FOR FIRE ALARMS')}
          <p style="font-size:10pt;color:#495057;margin-bottom:16px;">${fr ? 'En cas d\'alarme incendie, la sécurité de tous dépend de la rapidité, du calme et de la coordination des occupants.' : 'In case of fire alarm, everyone\'s safety depends on the speed, calm, and coordination of occupants.'}</p>
          ${isDoubleSignal ? `
            <p style="font-size:10pt;font-weight:700;color:#2C3E50;margin-bottom:6px;">${fr ? '1. Signal préparatoire (pré-alarme ou ALERTE)' : '1. Preparatory signal (pre-alarm or ALERT)'}</p>
            <ul style="font-size:10pt;color:#495057;padding-left:20px;margin-bottom:16px;">
              <li style="margin-bottom:6px;">${fr ? 'Restez attentif aux messages transmis par le système d\'alerte vocal.' : 'Stay attentive to messages from the voice alert system.'}</li>
              <li style="margin-bottom:6px;">${fr ? 'Cessez vos activités afin de demeurer disponible pour appliquer les consignes d\'évacuation.' : 'Stop your activities to remain available to apply evacuation instructions.'}</li>
              <li style="margin-bottom:6px;">${fr ? 'Préparez-vous à évacuer.' : 'Prepare to evacuate.'}</li>
            </ul>
          ` : ''}
          <p style="font-size:10pt;font-weight:700;color:#2C3E50;margin-bottom:6px;">${fr ? (isDoubleSignal ? '2. Signal d\'évacuation générale (ALARME)' : '1. Signal d\'évacuation générale (ALARME)') : (isDoubleSignal ? '2. General evacuation signal (ALARM)' : '1. General evacuation signal (ALARM)')}</p>
          <ul style="font-size:10pt;color:#495057;padding-left:20px;margin-bottom:16px;">
            <li style="margin-bottom:6px;">${fr ? 'Quittez immédiatement votre zone de travail.' : 'Immediately leave your work area.'}</li>
            <li style="margin-bottom:6px;"><strong>${fr ? 'N\'utilisez jamais les ascenseurs.' : 'Never use elevators.'}</strong></li>
            <li style="margin-bottom:6px;">${fr ? 'Fermez les portes derrière vous sans les verrouiller.' : 'Close doors behind you without locking them.'}</li>
            <li style="margin-bottom:6px;">${fr ? 'Dirigez-vous calmement vers le point de rassemblement extérieur désigné.' : 'Proceed calmly to the designated outdoor assembly point.'}</li>
          </ul>
          <div style="background-color:#EAFAF1;border:1px solid #A9DFBF;border-radius:4px;padding:12px;margin-top:8px;">
            <p style="font-size:10pt;color:#1E8449;">${fr ? 'En respectant ces bonnes pratiques, chaque locataire contribue à maintenir un environnement de travail sécuritaire.' : 'By following these best practices, each tenant contributes to maintaining a safe working environment.'}</p>
          </div>
        </div>
      `,
    });

    // 1.4
    subs.push({
      id: '1.4',
      title: isFr ? '1.4 — PLAN D\'IMPLANTATION AVEC EMPLACEMENT DU POINT DE RASSEMBLEMENT' : '1.4 — SITE PLAN WITH ASSEMBLY POINT LOCATION',
      html: `
        <div>
          ${subHeader('1.4', fr ? 'PLAN D\'IMPLANTATION AVEC EMPLACEMENT DU POINT DE RASSEMBLEMENT' : 'SITE PLAN WITH ASSEMBLY POINT LOCATION')}
          ${planImplantation?.imageBase64 ? `
            <div style="width:100%;text-align:center;margin-top:8px;">
              <img src="data:image/png;base64,${planImplantation.imageBase64}" style="max-width:100%;max-height:580px;object-fit:contain;display:block;margin:0 auto;" />
              ${planImplantation.name ? `<p style="font-size:9pt;color:#6C757D;margin-top:6px;font-style:italic;">${planImplantation.name}</p>` : ''}
            </div>
          ` : `<p style="font-size:10pt;color:#ADB5BD;font-style:italic;">${fr ? 'Aucun plan d\'implantation configuré dans le PMU.' : 'No site plan configured in the ERP.'}</p>`}
        </div>
      `,
    });

    // 1.5
    subs.push({
      id: '1.5',
      title: isFr ? '1.5 — RÔLES DES MEMBRES DE L\'ÉQUIPE D\'URGENCE' : '1.5 — EMERGENCY TEAM MEMBER ROLES',
      html: `
        <div>
          ${subHeader('1.5', fr ? 'RÔLES DES MEMBRES DE L\'ÉQUIPE D\'URGENCE' : 'EMERGENCY TEAM MEMBER ROLES')}
          <p style="font-size:10pt;color:#495057;margin-bottom:16px;">${fr ? 'L\'équipe d\'évacuation joue un rôle central dans la sécurité du bâtiment. En situation d\'urgence, sa mission est d\'assurer une évacuation rapide, ordonnée et sécuritaire de tous les occupants.' : 'The evacuation team plays a central role in building safety. In an emergency, its mission is to ensure a rapid, orderly, and safe evacuation of all occupants.'}</p>
          <p style="font-size:10pt;font-weight:700;color:#2C3E50;margin-bottom:6px;">${fr ? 'Responsabilités principales' : 'Main responsibilities'}</p>
          <ul style="font-size:10pt;color:#495057;padding-left:20px;margin-bottom:16px;">
            <li style="margin-bottom:6px;">${fr ? 'Appliquer les consignes du coordonnateur d\'urgence et relayer les directives à son secteur ;' : 'Apply emergency coordinator instructions and relay directives to their sector;'}</li>
            <li style="margin-bottom:6px;">${fr ? 'Encadrer l\'évacuation de façon méthodique ;' : 'Supervise evacuation methodically;'}</li>
            <li style="margin-bottom:6px;">${fr ? 'Fermer les portes derrière lui sans les verrouiller ;' : 'Close doors behind them without locking;'}</li>
            <li style="margin-bottom:6px;">${fr ? 'Aider les personnes en difficulté ou signaler leur présence à l\'accompagnateur désigné ;' : 'Assist persons in difficulty or signal their presence to the designated escort;'}</li>
            <li style="margin-bottom:6px;">${fr ? 'Rendre compte au coordonnateur dès l\'arrivée au point de rassemblement.' : 'Report to the coordinator upon arrival at the assembly point.'}</li>
          </ul>
        </div>
      `,
    });

    // 1.6
    subs.push({
      id: '1.6',
      title: isFr ? '1.6 — ORGANIGRAMME DE L\'ÉQUIPE D\'URGENCE' : '1.6 — EMERGENCY TEAM ORGANIZATIONAL CHART',
      html: `
        <div>
          ${subHeader('1.6', fr ? 'ORGANIGRAMME DE L\'ÉQUIPE D\'URGENCE' : 'EMERGENCY TEAM ORGANIZATIONAL CHART')}
          ${orgHtml || `<p style="color:#ADB5BD;font-style:italic;">${fr ? 'Organigramme non disponible.' : 'Organizational chart not available.'}</p>`}
        </div>
      `,
    });

    return subs;
  }

  private buildSection2Subsections(config: any, isFr: boolean, isDoubleSignal: boolean, isBOMA: boolean, buildingAddress: string): { id: string; title: string; html: string }[] {
    const fr = isFr;
    const subs: { id: string; title: string; html: string }[] = [];

    const important = (text: string) => `
      <div style="background-color:#FDEDEC;border-left:4px solid #C0392B;padding:10px 14px;margin:12px 0;border-radius:0 4px 4px 0;">
        <p style="font-size:9pt;font-weight:700;color:#C0392B;margin-bottom:4px;">IMPORTANT</p>
        <p style="font-size:9pt;color:#495057;">${text}</p>
      </div>
    `;

    const note = (text: string) => `
      <div style="background-color:#EBF5FB;border-left:4px solid #2980B9;padding:10px 14px;margin:12px 0;border-radius:0 4px 4px 0;">
        <p style="font-size:9pt;font-weight:700;color:#2980B9;margin-bottom:4px;">NOTE</p>
        <p style="font-size:9pt;color:#495057;">${text}</p>
      </div>
    `;

    const step = (title: string, desc: string) => `
      <div style="margin-bottom:10px;">
        <p style="font-size:10pt;font-weight:700;color:#2C3E50;margin-bottom:3px;">${title}</p>
        <p style="font-size:10pt;color:#495057;padding-left:12px;">${desc}</p>
      </div>
    `;

    const table = (headers: string[], rows: string[][]) => `
      <table style="width:100%;border-collapse:collapse;margin:12px 0;font-size:9pt;">
        <thead>
          <tr>
            ${headers.map(h => `<th style="padding:8px;color:#2C3E50;text-align:left;border:1px solid #DEE2E6;font-weight:700;background-color:#F8F9FA;">${h}</th>`).join('')}
          </tr>
        </thead>
        <tbody>
          ${rows.map((row, idx) => `
            <tr style="background-color:${idx % 2 === 0 ? '#FFFFFF' : '#F8F9FA'};">
              ${row.map((cell, cidx) => `<td style="padding:7px 8px;border:1px solid #DEE2E6;color:#2C3E50;vertical-align:top;${cidx === 0 ? 'font-weight:600;background-color:#F8F9FA;' : ''}">${cell}</td>`).join('')}
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;

    const subHeader = (num: string, title: string) => `
      <div style="margin:20px 0 8px 0;">
        <span style="font-size:11pt;font-weight:700;color:#C0392B;">${num}</span>
        <span style="font-size:11pt;font-weight:700;color:#2C3E50;margin-left:8px;">${title}</span>
        <div style="height:2px;background-color:#E9ECEF;margin-top:6px;"></div>
      </div>
    `;

    let procNum = 1;
    const pNum = () => isDoubleSignal ? `2.${procNum}` : `2.${procNum}`;

    // 2.1
    subs.push({
      id: '2.1',
      title: fr ? '2.1 — EN CAS DE DÉCOUVERTE DE FUMÉE OU DE FLAMME' : '2.1 — IN CASE OF SMOKE OR FLAME DISCOVERY',
      html: `<div>
        ${subHeader('2.1', fr ? 'EN CAS DE DÉCOUVERTE DE FUMÉE OU DE FLAMME' : 'IN CASE OF SMOKE OR FLAME DISCOVERY')}
        ${step(fr ? 'Restez calme.' : 'Stay calm.', fr ? 'Votre sécurité et celle des autres dépendent de votre capacité à suivre les instructions avec calme.' : 'Your safety and that of others depends on your ability to follow instructions calmly.')}
        ${step(fr ? 'Déclenchez l\'alarme incendie.' : 'Activate the fire alarm.', fr ? 'Activez immédiatement la station manuelle la plus proche.' : 'Immediately activate the nearest manual station.')}
        ${step(fr ? 'Évacuez le bâtiment.' : 'Evacuate the building.', fr ? 'Employez la sortie la plus proche et sécuritaire. N\'utilisez jamais les ascenseurs.' : 'Use the nearest and safest exit. Never use elevators.')}
        ${step(fr ? 'Rejoignez le point de rassemblement.' : 'Reach the assembly point.', fr ? 'Dirigez-vous vers la zone désignée à une distance sécuritaire du bâtiment.' : 'Proceed to the designated area at a safe distance from the building.')}
        ${step(fr ? 'Ne retournez pas à l\'intérieur.' : 'Do not return inside.', fr ? 'Attendez l\'autorisation officielle des services d\'urgence.' : 'Wait for official authorization from emergency services.')}
      </div>`,
    });

    // 2.2 — seulement si DOUBLE SIGNAL
    if (isDoubleSignal) {
      subs.push({
        id: '2.2',
        title: fr ? '2.2 — EN CAS D\'ALERTE INCENDIE' : '2.2 — IN CASE OF FIRE ALERT',
        html: `<div>
          ${subHeader('2.2', fr ? 'EN CAS D\'ALERTE INCENDIE' : 'IN CASE OF FIRE ALERT')}
          ${step(fr ? 'Restez calme et attentif.' : 'Stay calm and attentive.', fr ? 'Votre sécurité dépend de votre capacité à écouter et suivre les directives clairement.' : 'Your safety depends on your ability to listen and follow directives clearly.')}
          ${step(fr ? 'Cessez toute activité.' : 'Stop all activity.', fr ? 'Arrêtez immédiatement vos tâches en cours.' : 'Immediately stop your current tasks.')}
          ${step(fr ? 'Préparez-vous à évacuer.' : 'Prepare to evacuate.', fr ? 'Regroupez-vous près de la cage d\'escalier la plus proche.' : 'Gather near the nearest stairwell.')}
          ${step(fr ? 'Suivez les consignes officielles.' : 'Follow official instructions.', fr ? 'Écoutez attentivement les directives de l\'équipe d\'urgence.' : 'Listen carefully to emergency team directives.')}
          ${important(fr ? 'Si de la fumée ou des flammes sont visibles dans votre secteur, évacuez immédiatement.' : 'If smoke or flames are visible in your sector, evacuate immediately.')}
        </div>`,
      });
    }

    const n = (base: number) => isDoubleSignal ? base : base - 1;

    // 2.3 (ou 2.2)
    subs.push({
      id: isDoubleSignal ? '2.3' : '2.2',
      title: fr ? `${isDoubleSignal ? '2.3' : '2.2'} — EN CAS D\'ALARME INCENDIE` : `${isDoubleSignal ? '2.3' : '2.2'} — IN CASE OF FIRE ALARM`,
      html: `<div>
        ${subHeader(isDoubleSignal ? '2.3' : '2.2', fr ? 'EN CAS D\'ALARME INCENDIE' : 'IN CASE OF FIRE ALARM')}
        ${step(fr ? 'Restez calme et vigilant.' : 'Stay calm and vigilant.', fr ? 'Votre sécurité dépend de votre capacité à suivre les instructions avec clarté.' : 'Your safety depends on your ability to follow instructions with clarity.')}
        ${step(fr ? 'Évacuez le bâtiment.' : 'Evacuate the building.', fr ? 'Utilisez la sortie la plus proche sans récupérer vos effets personnels. N\'utilisez jamais les ascenseurs.' : 'Use the nearest exit without retrieving personal belongings. Never use elevators.')}
        ${step(fr ? 'Suivez les consignes officielles.' : 'Follow official instructions.', fr ? 'Écoutez et appliquez les directives de l\'équipe d\'urgence.' : 'Listen and apply emergency team directives.')}
        ${important(fr ? 'Il est strictement interdit de retourner à l\'intérieur du bâtiment sans autorisation préalable.' : 'It is strictly forbidden to return inside the building without prior authorization.')}
      </div>`,
    });

    // 2.4 (ou 2.3)
    subs.push({
      id: isDoubleSignal ? '2.4' : '2.3',
      title: fr ? `${isDoubleSignal ? '2.4' : '2.3'} — EN CAS DE FEU DE BATTERIE AU LITHIUM` : `${isDoubleSignal ? '2.4' : '2.3'} — IN CASE OF LITHIUM BATTERY FIRE`,
      html: `<div>
        ${subHeader(isDoubleSignal ? '2.4' : '2.3', fr ? 'EN CAS DE FEU DE BATTERIE AU LITHIUM' : 'IN CASE OF LITHIUM BATTERY FIRE')}
        ${step(fr ? 'Éloignez-vous immédiatement.' : 'Move away immediately.', fr ? 'Gardez une distance sécuritaire pour éviter les brûlures et l\'inhalation de fumées toxiques.' : 'Keep a safe distance to avoid burns and inhalation of toxic fumes.')}
        ${step(fr ? 'Alertez les secours.' : 'Alert emergency services.', fr ? 'Déclenchez la station manuelle la plus proche. Composez le 9-1-1.' : 'Activate the nearest manual station. Call 9-1-1.')}
        ${step(fr ? 'Ne tentez pas d\'intervenir.' : 'Do not attempt to intervene.', fr ? 'Les feux de batteries au lithium sont hautement volatiles.' : 'Lithium battery fires are highly volatile.')}
        ${important(fr ? 'Priorisez toujours votre sécurité. Quittez les lieux et laissez l\'intervention aux pompiers.' : 'Always prioritize your safety. Leave and let firefighters intervene.')}
      </div>`,
    });

    // 2.5 (ou 2.4)
    subs.push({
      id: isDoubleSignal ? '2.5' : '2.4',
      title: fr ? `${isDoubleSignal ? '2.5' : '2.4'} — EN CAS DE MANIFESTATION` : `${isDoubleSignal ? '2.5' : '2.4'} — IN CASE OF DEMONSTRATION`,
      html: `<div>
        ${subHeader(isDoubleSignal ? '2.5' : '2.4', fr ? 'EN CAS DE MANIFESTATION' : 'IN CASE OF DEMONSTRATION')}
        ${step(fr ? 'Restez à l\'intérieur du bâtiment.' : 'Stay inside the building.', fr ? 'Ne quittez pas l\'immeuble afin d\'assurer votre sécurité.' : 'Do not leave the building to ensure your safety.')}
        ${step(fr ? 'Suivez les consignes officielles.' : 'Follow official instructions.', fr ? 'Respectez les directives émises par les policiers et le personnel de sécurité.' : 'Follow directives from police and security personnel.')}
        ${step(fr ? 'Évitez toute confrontation.' : 'Avoid confrontation.', fr ? 'Évitez toute confrontation ou interaction avec les manifestants.' : 'Avoid any confrontation or interaction with demonstrators.')}
        ${step(fr ? 'Attendez les consignes de réintégration.' : 'Wait for re-entry instructions.', fr ? 'Un message officiel vous informera quand vous pouvez quitter ou entrer de nouveau.' : 'An official message will inform you when you can safely leave or re-enter.')}
      </div>`,
    });

    // 2.6 (ou 2.5)
    subs.push({
      id: isDoubleSignal ? '2.6' : '2.5',
      title: fr ? `${isDoubleSignal ? '2.6' : '2.5'} — EN CAS D\'INDIVIDU ARMÉ OU TIREUR ACTIF` : `${isDoubleSignal ? '2.6' : '2.5'} — IN CASE OF ARMED INDIVIDUAL OR ACTIVE SHOOTER`,
      html: `<div>
        ${subHeader(isDoubleSignal ? '2.6' : '2.5', fr ? 'EN CAS D\'INDIVIDU ARMÉ OU TIREUR ACTIF' : 'IN CASE OF ARMED INDIVIDUAL OR ACTIVE SHOOTER')}
        ${step(fr ? 'Évaluez rapidement la situation.' : 'Quickly assess the situation.', fr ? 'Restez calme et déterminez si une sortie sécuritaire est possible.' : 'Stay calm and determine if a safe exit is possible.')}
        ${step(fr ? 'Évacuez si c\'est sécuritaire.' : 'Evacuate if safe.', fr ? 'Quittez immédiatement le bâtiment sans prendre d\'effets personnels.' : 'Immediately leave the building without personal belongings.')}
        ${step(fr ? 'Confinez-vous si l\'évacuation est impossible.' : 'Confine yourself if evacuation is impossible.', fr ? 'Cherchez une zone sécuritaire avec porte verrouillable. Éteignez les lumières et restez silencieux.' : 'Find a secure area with a lockable door. Turn off lights and stay quiet.')}
        ${step(fr ? 'Restez en alerte.' : 'Stay alert.', fr ? 'Ne quittez pas votre cachette tant que les autorités n\'ont pas donné l\'autorisation officielle.' : 'Do not leave your hiding place until authorities have given official authorization.')}
        <div style="page-break-before:always;">
        <table style="width:100%;border-collapse:collapse;margin:12px 0;font-size:10pt;">
          <thead>
            <tr>
              <th style="padding:10px;color:#2C3E50;text-align:left;border:1px solid #DEE2E6;font-weight:700;background-color:#F8F9FA;width:30%;">${fr ? 'Catégorie' : 'Category'}</th>
              <th style="padding:10px;color:#2C3E50;text-align:left;border:1px solid #DEE2E6;font-weight:700;background-color:#F8F9FA;">${fr ? 'Détails à Collecter' : 'Details to Collect'}</th>
            </tr>
          </thead>
          <tbody>
            ${(fr ? [
              ['Identification', 'Nom (si connu) - Surnom ou alias'],
              ['Description physique', 'Âge approximatif - Taille - Poids - Couleur des yeux - Cheveux - Signes distinctifs'],
              ['Vêtements', 'Type et couleur du haut - Du bas - Couvre-chef - Chaussures'],
              ['Armement', 'Type(s) d\'arme(s) observé(s) - Autres objets suspects'],
              ['Comportement', 'État émotionnel - Actions spécifiques - Interactions'],
              ['Déplacements', 'Dernière localisation - Direction - Zones fréquentées'],
              ['Communication', 'Paroles ou menaces - Communication avec d\'autres'],
              ['Véhicule', 'Description - Numéro de plaque - Direction de fuite'],
              ['Informations supplémentaires', 'Connexions connues - Comportement antérieur notable'],
            ] : [
              ['Identification', 'Name (if known) - Nickname or alias'],
              ['Physical description', 'Approximate age - Height - Weight - Eye color - Hair - Distinguishing features'],
              ['Clothing', 'Type and color of top - Bottom - Headwear - Shoes'],
              ['Weapons', 'Type(s) of weapon(s) observed - Other suspicious items'],
              ['Behavior', 'Emotional state - Specific actions - Interactions'],
              ['Movement', 'Last known location - Direction - Frequented areas'],
              ['Communication', 'Words or threats - Communication with others'],
              ['Vehicle', 'Description - License plate - Direction of flight'],
              ['Supplementary information', 'Known connections - Notable prior behavior'],
            ]).map((row, idx) => `
              <tr style="background-color:${idx % 2 === 0 ? '#FFFFFF' : '#F8F9FA'};">
                <td style="padding:32px 10px;border:1px solid #DEE2E6;font-weight:600;color:#2C3E50;background-color:#F8F9FA;vertical-align:top;">${row[0]}</td>
                <td style="padding:32px 10px;border:1px solid #DEE2E6;color:#495057;vertical-align:top;">${row[1]}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        </div>
      </div>`,
    });

    // 2.7 (ou 2.6)
    subs.push({
      id: isDoubleSignal ? '2.7' : '2.6',
      title: fr ? `${isDoubleSignal ? '2.7' : '2.6'} — EN CAS DE VENTS VIOLENTS` : `${isDoubleSignal ? '2.7' : '2.6'} — IN CASE OF HIGH WINDS`,
      html: `<div>
        ${subHeader(isDoubleSignal ? '2.7' : '2.6', fr ? 'EN CAS DE VENTS VIOLENTS' : 'IN CASE OF HIGH WINDS')}
        ${step(fr ? 'Restez informé.' : 'Stay informed.', fr ? 'Surveillez les bulletins météorologiques. Éloignez-vous des fenêtres aux étages supérieurs.' : 'Monitor weather bulletins. Stay away from windows on upper floors.')}
        ${step(fr ? 'Restez à l\'intérieur.' : 'Stay inside.', fr ? 'Ne quittez pas le bâtiment sauf en cas d\'urgence absolue.' : 'Do not leave the building except in absolute emergency.')}
        ${step(fr ? 'Inspectez votre espace après l\'événement.' : 'Inspect your space after the event.', fr ? 'Effectuez une vérification visuelle pour repérer tout bris ou dommage.' : 'Visually inspect your environment for any breakage or damage.')}
        ${step(fr ? 'Signalez les problèmes.' : 'Report problems.', fr ? 'Avisez immédiatement la gestion de l\'immeuble de tout dommage.' : 'Immediately notify building management of any damage.')}
      </div>`,
    });

    // 2.8 (ou 2.7)
    subs.push({
      id: isDoubleSignal ? '2.8' : '2.7',
      title: fr ? `${isDoubleSignal ? '2.8' : '2.7'} — EN CAS DE PERSONNE COINCÉE DANS UN ASCENSEUR` : `${isDoubleSignal ? '2.8' : '2.7'} — IN CASE OF PERSON TRAPPED IN ELEVATOR`,
      html: `<div>
        ${subHeader(isDoubleSignal ? '2.8' : '2.7', fr ? 'EN CAS DE PERSONNE COINCÉE DANS UN ASCENSEUR' : 'IN CASE OF PERSON TRAPPED IN ELEVATOR')}
        ${step(fr ? 'Restez calme.' : 'Stay calm.', fr ? 'La plupart des pannes d\'ascenseur sont temporaires.' : 'Most elevator breakdowns are temporary.')}
        ${step(fr ? 'Demandez de l\'aide.' : 'Ask for help.', fr ? 'Utilisez le bouton d\'intercom ou l\'alarme. Si vous avez un téléphone, composez le 9-1-1.' : 'Use the intercom button or alarm. If you have a phone, call 9-1-1.')}
        ${step(fr ? 'Ne tentez aucune manœuvre.' : 'Do not attempt any maneuver.', fr ? 'Ne forcez pas les portes ni n\'essayez de sortir seul.' : 'Do not force doors or try to exit alone.')}
        ${note(fr ? 'Identifiez-vous clairement et mentionnez l\'adresse civique du bâtiment.' : 'Clearly identify yourself and mention the building civic address.')}
      </div>`,
    });

    // 2.9 (ou 2.8)
    subs.push({
      id: isDoubleSignal ? '2.9' : '2.8',
      title: fr ? `${isDoubleSignal ? '2.9' : '2.8'} — EN CAS DE FUITE DE GAZ NATUREL` : `${isDoubleSignal ? '2.9' : '2.8'} — IN CASE OF NATURAL GAS LEAK`,
      html: `<div>
        ${subHeader(isDoubleSignal ? '2.9' : '2.8', fr ? 'EN CAS DE FUITE DE GAZ NATUREL' : 'IN CASE OF NATURAL GAS LEAK')}
        ${step(fr ? 'Cessez toute activité.' : 'Immediately stop all activity.', fr ? 'Arrêtez tout appareil ou équipement en cours d\'utilisation.' : 'Stop all devices or equipment in use.')}
        ${step(fr ? 'Évacuez la zone.' : 'Evacuate the area.', fr ? 'Ne touchez à aucun interrupteur ou appareil électrique.' : 'Do not touch any switch or electrical device.')}
        ${step(fr ? 'Déclenchez l\'alarme.' : 'Activate the alarm.', fr ? 'Une fois à l\'extérieur, actionnez une station manuelle d\'alarme.' : 'Once outside, activate a manual alarm station.')}
        ${step(fr ? 'Suivez les directives officielles.' : 'Follow official directives.', fr ? 'Rendez-vous au point de rassemblement désigné.' : 'Proceed to the designated assembly point.')}
        ${important(fr ? 'N\'utilisez pas de téléphone portable ou d\'appareil électronique à proximité de la fuite.' : 'Do not use cell phones or electronic devices near the leak.')}
      </div>`,
    });

    // 2.10 (ou 2.9)
    subs.push({
      id: isDoubleSignal ? '2.10' : '2.9',
      title: fr ? `${isDoubleSignal ? '2.10' : '2.9'} — EN CAS D\'URGENCE MÉDICALE` : `${isDoubleSignal ? '2.10' : '2.9'} — IN CASE OF MEDICAL EMERGENCY`,
      html: `<div>
        ${subHeader(isDoubleSignal ? '2.10' : '2.9', fr ? 'EN CAS D\'URGENCE MÉDICALE' : 'IN CASE OF MEDICAL EMERGENCY')}
        ${step(fr ? 'Alertez un professionnel.' : 'Alert a professional.', fr ? 'Prévenez immédiatement un secouriste interne et le Coordonnateur d\'urgence.' : 'Immediately notify an internal first responder and the Emergency Coordinator.')}
        ${step(fr ? 'Appelez les secours.' : 'Call for help.', fr ? 'Composez le 9-1-1 si la victime présente des signes graves. Restez en ligne.' : 'Call 9-1-1 if the victim shows serious signs. Stay on the line.')}
        ${step(fr ? 'Facilitez l\'intervention.' : 'Facilitate the intervention.', fr ? 'Désignez une personne pour accueillir les services d\'urgence depuis l\'entrée principale.' : 'Designate a person to welcome emergency services from the main entrance.')}
        ${note(fr ? 'La formation aux premiers secours et à la RCR améliore considérablement la réponse initiale.' : 'First aid and CPR training considerably improves the initial response.')}
      </div>`,
    });

    // 2.11 (ou 2.10)
    subs.push({
      id: isDoubleSignal ? '2.11' : '2.10',
      title: fr ? `${isDoubleSignal ? '2.11' : '2.10'} — EN CAS DE PANNE DE COURANT` : `${isDoubleSignal ? '2.11' : '2.10'} — IN CASE OF POWER OUTAGE`,
      html: `<div>
        ${subHeader(isDoubleSignal ? '2.11' : '2.10', fr ? 'EN CAS DE PANNE DE COURANT' : 'IN CASE OF POWER OUTAGE')}
        ${step(fr ? 'Assurez votre sécurité.' : 'Ensure your safety.', fr ? 'Interrompez immédiatement toute activité électrique ou électronique.' : 'Immediately interrupt all electrical or electronic activity.')}
        ${step(fr ? 'Évitez les zones sombres.' : 'Avoid dark areas.', fr ? 'Dirigez-vous vers les endroits éclairés par la lumière naturelle ou les lampes d\'urgence.' : 'Move to areas lit by natural light or emergency lamps.')}
        ${step(fr ? 'Informez les responsables.' : 'Notify responsible persons.', fr ? 'Contactez le responsable du bâtiment pour signaler la panne.' : 'Contact the building manager to report the outage.')}
        ${note(fr ? 'Il est recommandé de disposer de lampes de poche d\'urgence dans des emplacements stratégiques.' : 'It is recommended to have emergency flashlights in strategic locations.')}
      </div>`,
    });

    // 2.12 (ou 2.11)
    subs.push({
      id: isDoubleSignal ? '2.12' : '2.11',
      title: fr ? `${isDoubleSignal ? '2.12' : '2.11'} — EN CAS DE DÉVERSEMENT DE MATIÈRE DANGEREUSE` : `${isDoubleSignal ? '2.12' : '2.11'} — IN CASE OF HAZARDOUS MATERIAL SPILL`,
      html: `<div>
        ${subHeader(isDoubleSignal ? '2.12' : '2.11', fr ? 'EN CAS DE DÉVERSEMENT DE MATIÈRE DANGEREUSE' : 'IN CASE OF HAZARDOUS MATERIAL SPILL')}
        ${step(fr ? 'Assurez la sécurité des occupants.' : 'Ensure occupant safety.', fr ? 'Éloignez-vous du produit. Ne touchez à rien dans la zone affectée.' : 'Move away from the product. Do not touch anything in the affected area.')}
        ${step(fr ? 'Alertez le Coordonnateur d\'urgence.' : 'Alert the Emergency Coordinator.', fr ? 'Informez immédiatement le Coordonnateur d\'urgence. Composez le 9-1-1 si nécessaire.' : 'Immediately inform the Emergency Coordinator. Call 9-1-1 if necessary.')}
        ${note(fr ? 'Si vous n\'êtes pas formé pour intervenir, éloignez-vous et attendez du personnel qualifié.' : 'If you are not trained to intervene, move away and wait for qualified personnel.')}
      </div>`,
    });

    // 2.13 (ou 2.12)
    subs.push({
      id: isDoubleSignal ? '2.13' : '2.12',
      title: fr ? `${isDoubleSignal ? '2.13' : '2.12'} — EN CAS DE MENACE OU D\'ALERTE À LA BOMBE` : `${isDoubleSignal ? '2.13' : '2.12'} — IN CASE OF BOMB THREAT OR ALERT`,
      html: `<div>
        ${subHeader(isDoubleSignal ? '2.13' : '2.12', fr ? 'EN CAS DE MENACE OU D\'ALERTE À LA BOMBE' : 'IN CASE OF BOMB THREAT OR ALERT')}
        ${step(fr ? 'Restez calme et concentré.' : 'Stay calm and focused.', fr ? 'Recueillez un maximum d\'informations précises sans alarmer votre entourage.' : 'Gather maximum precise information without alarming your surroundings.')}
        ${step(fr ? 'Prenez des notes détaillées.' : 'Take detailed notes.', fr ? 'Notez le ton de la voix, accent, nature des revendications, détails sur la bombe.' : 'Note the voice tone, accent, nature of demands, bomb details.')}
        ${step(fr ? 'Alertez immédiatement.' : 'Alert immediately.', fr ? 'Dès la fin de l\'appel, informez le Coordonnateur d\'urgence et composez le 9-1-1.' : 'As soon as the call ends, inform the Emergency Coordinator and call 9-1-1.')}
        ${important(fr ? 'L\'évaluation de la menace est effectuée par le Coordonnateur d\'urgence en collaboration avec la police.' : 'Threat assessment is performed by the Emergency Coordinator in collaboration with police.')}
        <div style="page-break-before:always;">
        <table style="width:100%;border-collapse:collapse;margin:12px 0;font-size:10pt;">
          <thead>
            <tr>
              <th style="padding:10px;color:#2C3E50;text-align:left;border:1px solid #DEE2E6;font-weight:700;background-color:#F8F9FA;width:35%;">${fr ? 'Information à Collecter' : 'Information to Collect'}</th>
              <th style="padding:10px;color:#2C3E50;text-align:left;border:1px solid #DEE2E6;font-weight:700;background-color:#F8F9FA;">${fr ? 'Détails à Noter' : 'Details to Note'}</th>
            </tr>
          </thead>
          <tbody>
            ${(fr ? [
              ['Identification de l\'appelant', 'Sexe, âge estimé, accent, particularités vocales'],
              ['Message de la menace', 'Description exacte, demande spécifique ou conditions'],
              ['Détails sur la bombe', 'Emplacement, heure de détonation prévue, type'],
              ['Arrière-plan sonore', 'Bruits spécifiques (trafic, gens, musique, etc.)'],
              ['Comportement de l\'appelant', 'Calme, agité, rationnel, irrationnel'],
              ['Durée de l\'appel', 'Heure de début et de fin'],
              ['Autres observations', 'Tout autre détail pertinent'],
            ] : [
              ['Caller identification', 'Gender, estimated age, accent, vocal characteristics'],
              ['Threat message', 'Exact description, specific demand or conditions'],
              ['Bomb details', 'Location, planned detonation time, type'],
              ['Background noise', 'Specific sounds (traffic, people, music, etc.)'],
              ['Caller behavior', 'Calm, agitated, rational, irrational'],
              ['Call duration', 'Start and end time'],
              ['Other observations', 'Any other relevant details'],
            ]).map((row, idx) => `
              <tr style="background-color:${idx % 2 === 0 ? '#FFFFFF' : '#F8F9FA'};">
                <td style="padding:32px 10px;border:1px solid #DEE2E6;font-weight:600;color:#2C3E50;background-color:#F8F9FA;vertical-align:top;">${row[0]}</td>
                <td style="padding:32px 10px;border:1px solid #DEE2E6;color:#495057;vertical-align:top;">${row[1]}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        </div>
      </div>`,
    });

    // 2.14 (ou 2.13)
    const { P015_IMAGES } = require('../generator/procedures/p015_images.asset');
    subs.push({
      id: isDoubleSignal ? '2.14' : '2.13',
      title: fr ? `${isDoubleSignal ? '2.14' : '2.13'} — EN CAS DE DÉCOUVERTE DE COLIS SUSPECT` : `${isDoubleSignal ? '2.14' : '2.13'} — IN CASE OF SUSPICIOUS PACKAGE DISCOVERY`,
      html: `<div>
        ${subHeader(isDoubleSignal ? '2.14' : '2.13', fr ? 'EN CAS DE DÉCOUVERTE DE COLIS SUSPECT' : 'IN CASE OF SUSPICIOUS PACKAGE DISCOVERY')}
        ${step(fr ? 'Ne touchez à rien.' : 'Do not touch anything.', fr ? 'Ne déplacez pas le colis et n\'essayez pas de l\'ouvrir. Éloignez-vous de la zone.' : 'Do not move the package and do not attempt to open it. Move away from the area.')}
        ${step(fr ? 'Alertez immédiatement.' : 'Alert immediately.', fr ? 'Composez le 9-1-1 et informez le Coordonnateur d\'urgence.' : 'Call 9-1-1 and inform the Emergency Coordinator.')}
        ${step(fr ? 'Sécurisez le périmètre.' : 'Secure the perimeter.', fr ? 'Établissez un périmètre de sécurité d\'au moins 50 mètres autour du colis.' : 'Establish a security perimeter of at least 50 meters around the package.')}
        ${step(fr ? 'Évitez les appareils électroniques.' : 'Avoid electronic devices.', fr ? 'N\'utilisez pas de téléphone portable ou radio à proximité du colis.' : 'Do not use cell phones or radios near the package.')}
        ${important(fr ? 'Certains signes : absence d\'adresse de retour, odeur chimique, fils visibles, poids anormal.' : 'Some signs: no return address, chemical smell, visible wires, abnormal weight.')}
        <div style="page-break-before:always;text-align:center;margin-top:20px;">
          <img src="${fr ? P015_IMAGES.base64FR : P015_IMAGES.base64EN}" style="max-width:100%;max-height:800px;display:block;margin:0 auto;" />
          <p style="font-size:8pt;color:#6C757D;margin-top:8px;font-style:italic;">${fr ? 'Guide de gestion du courrier suspect' : 'Guide to managing suspicious mail'}</p>
        </div>
      </div>`,
    });

    return subs;
  }

  private buildSection3Subsections(isFr: boolean): { id: string; title: string; html: string }[] {
    const fr = isFr;
    const subs: { id: string; title: string; html: string }[] = [];

    const subHeader = (num: string, title: string) => `
      <div style="margin:20px 0 8px 0;">
        <span style="font-size:11pt;font-weight:700;color:#C0392B;">${num}</span>
        <span style="font-size:11pt;font-weight:700;color:#2C3E50;margin-left:8px;">${title}</span>
        <div style="height:2px;background-color:#E9ECEF;margin-top:6px;"></div>
      </div>
    `;

    const thStyle = `padding:8px;color:#2C3E50;font-size:9pt;font-weight:700;border:1px solid #DEE2E6;background-color:#F8F9FA;`;
    const tdStyle = `border:1px solid #DEE2E6;padding:8px;vertical-align:top;`;
    const tdBgStyle = `border:1px solid #DEE2E6;padding:8px;background-color:#F8F9FA;font-size:9pt;font-weight:600;color:#2C3E50;vertical-align:top;`;

    const roleTableRows = `
      <tr style="height:40px;">
        <td style="${tdBgStyle}">${fr ? 'Responsable de secteur' : 'Sector manager'}</td>
        <td style="${tdStyle}"></td>
        <td style="${tdStyle}"></td>
      </tr>
      <tr style="height:40px;">
        <td style="${tdBgStyle}">${fr ? 'Responsable de secteur (remplaçant)' : 'Sector manager (alternate)'}</td>
        <td style="${tdStyle}"></td>
        <td style="${tdStyle}"></td>
      </tr>
      <tr style="height:40px;">
        <td style="${tdBgStyle}">${fr ? 'Accompagnateur pour personne nécessitant l\'aide à l\'évacuation' : 'Escort for person needing evacuation assistance'}</td>
        <td style="${tdStyle}"></td>
        <td style="${tdStyle}"></td>
      </tr>
      <tr style="height:40px;">
        <td style="${tdBgStyle}">${fr ? 'Accompagnateur pour personne nécessitant l\'aide à l\'évacuation' : 'Escort for person needing evacuation assistance'}</td>
        <td style="${tdStyle}"></td>
        <td style="${tdStyle}"></td>
      </tr>
    `;

    const ppnaeTableRows = `
      <tr style="height:40px;">
        <td style="${tdStyle}"></td>
        <td style="${tdStyle}"></td>
        <td style="${tdStyle}"></td>
      </tr>
      <tr style="height:40px;">
        <td style="${tdStyle}"></td>
        <td style="${tdStyle}"></td>
        <td style="${tdStyle}"></td>
      </tr>
    `;

    const registreRows = Array.from({ length: 18 }, () => `
      <tr style="height:38px;">
        <td style="${tdStyle}"></td>
        <td style="${tdStyle}"></td>
        <td style="${tdStyle}"></td>
        <td style="${tdStyle}"></td>
      </tr>
    `).join('');

    // 3.1
    subs.push({
      id: '3.1',
      title: fr ? '3.1 — TABLEAU DES ÉQUIPES D\'ÉVACUATION LOCATAIRES' : '3.1 — TENANT EVACUATION TEAM TABLE',
      html: `
        <div>
          ${subHeader('3.1', fr ? 'TABLEAU DES ÉQUIPES D\'ÉVACUATION LOCATAIRES' : 'TENANT EVACUATION TEAM TABLE')}

          <div style="margin-bottom:16px;">
            <div style="display:flex;gap:30px;margin-bottom:12px;font-size:10pt;">
              <div style="flex:1;">
                <label style="font-weight:600;color:#2C3E50;">${fr ? 'Nom de l\'entreprise :' : 'Company name:'}</label>
                <div style="border-bottom:1px solid #2C3E50;height:20px;margin-top:4px;"></div>
              </div>
              <div style="flex:0.5;">
                <label style="font-weight:600;color:#2C3E50;">${fr ? 'Étage :' : 'Floor:'}</label>
                <div style="border-bottom:1px solid #2C3E50;height:20px;margin-top:4px;"></div>
              </div>
              <div style="flex:0.7;">
                <label style="font-weight:600;color:#2C3E50;">${fr ? 'Suite :' : 'Suite:'}</label>
                <div style="border-bottom:1px solid #2C3E50;height:20px;margin-top:4px;"></div>
              </div>
            </div>
            <div style="font-size:9pt;">
              <label style="font-weight:600;color:#2C3E50;">${fr ? 'Quart de travail :' : 'Work shift:'}</label>
              <div style="border-bottom:1px solid #2C3E50;height:20px;margin-top:4px;"></div>
              <p style="font-size:8pt;color:#6C757D;margin-top:2px;">${fr ? '(remplir une fiche par quart de travail, si applicable)' : '(fill one form per work shift, if applicable)'}</p>
            </div>
          </div>

          <table style="width:100%;border-collapse:collapse;margin-bottom:16px;">
            <thead>
              <tr>
                <th style="${thStyle}width:35%;">${fr ? 'RÔLE' : 'ROLE'}</th>
                <th style="${thStyle}width:35%;">${fr ? 'NOM' : 'NAME'}</th>
                <th style="${thStyle}width:30%;">${fr ? 'COORDONNÉES CELLULAIRES' : 'CELL COORDINATES'}</th>
              </tr>
            </thead>
            <tbody>${roleTableRows}</tbody>
          </table>

          <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
            <thead>
              <tr>
                <th style="${thStyle}width:40%;">${fr ? 'NOM DE LA PERSONNE NÉCESSITANT L\'AIDE À L\'ÉVACUATION' : 'NAME OF PERSON REQUIRING EVACUATION ASSISTANCE'}</th>
                <th style="${thStyle}width:30%;">${fr ? 'NATURE DU HANDICAP' : 'TYPE OF DISABILITY'}</th>
                <th style="${thStyle}width:30%;">${fr ? 'COORDONNÉES CELLULAIRES' : 'CELL COORDINATES'}</th>
              </tr>
            </thead>
            <tbody>${ppnaeTableRows}</tbody>
          </table>

          <p style="font-size:9pt;color:#C0392B;font-weight:600;margin-bottom:12px;">
            ${fr ? 'Merci de bien vouloir remettre une copie de ce registre rempli au Responsable du PMU ou à la console de sécurité et de fournir une mise à jour, au besoin.' : 'Please provide a copy of this completed register to the PMU Manager or security console and provide updates as needed.'}
          </p>
          <p style="font-size:9pt;color:#2C3E50;">
            ${fr ? 'Merci de votre collaboration,<br/>La Direction' : 'Thank you for your cooperation,<br/>Management'}
          </p>
        </div>
      `,
    });

    // 3.2
    subs.push({
      id: '3.2',
      title: fr ? '3.2 — REGISTRES DES PERSONNES NÉCESSITANT L\'AIDE À L\'ÉVACUATION' : '3.2 — REGISTER OF PERSONS REQUIRING EVACUATION ASSISTANCE',
      html: `
        <div>
          ${subHeader('3.2', fr ? 'REGISTRES DES PERSONNES NÉCESSITANT L\'AIDE À L\'ÉVACUATION' : 'REGISTER OF PERSONS REQUIRING EVACUATION ASSISTANCE')}
          <p style="font-size:10pt;color:#2C3E50;margin-bottom:16px;">
            ${fr ? 'Cette liste doit être à jour et disponible pour le service incendie dans le plan de sécurité incendie.' : 'This list must be current and available to the fire service in the fire safety plan.'}
          </p>
          <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
            <thead>
              <tr>
                <th style="${thStyle}width:25%;">${fr ? 'NOM' : 'NAME'}</th>
                <th style="${thStyle}width:15%;">${fr ? 'ÉTAGE' : 'FLOOR'}</th>
                <th style="${thStyle}width:30%;">${fr ? 'NOM DE L\'ACCOMPAGNATEUR' : 'ESCORT NAME'}</th>
                <th style="${thStyle}width:30%;">${fr ? 'COORDONNÉES CELLULAIRES' : 'CELL COORDINATES'}</th>
              </tr>
            </thead>
            <tbody>${registreRows}</tbody>
          </table>
        </div>
      `,
    });

    return subs;
  }

  private async drawWatermarks(
    pdfDoc: PDFDocument,
    coroLogoBase64: string | undefined,
    clientLogoBase64: string | undefined,
    skipLastPageIndex?: number,
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
        console.warn('Impossible d\'intégrer un logo filigrane :', err);
        return null;
      }
    };

    const coroImage = await embedLogo(coroLogoBase64);
    const clientImage = await embedLogo(clientLogoBase64);

    if (!coroImage && !clientImage) return;

    // Skip couverture (index 0) et sommaire (index 1)
    pages.forEach((page, idx) => {
      if (idx < 2) return;
      if (skipLastPageIndex !== undefined && idx >= skipLastPageIndex) return;

      const { width, height } = page.getSize();

      if (coroImage) {
        const { width: logoW, height: logoH } = computeFittedSize(coroImage.width, coroImage.height);
        page.drawImage(coroImage, {
          x: 40,
          y: 28 + 5 - logoH / 2,
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
    });
  }

  private guideStyles(): string {
    return `
      .section-header { margin-bottom: 16px; }
    `;
  }
}