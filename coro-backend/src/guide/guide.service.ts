import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import puppeteer from 'puppeteer';
import { PDFDocument } from 'pdf-lib';
import { generateCoverPage } from '../export/templates/cover.template';
import { COVER_STYLES } from '../export/templates/cover.styles';
import { generateTocPage, TOC_STYLES } from '../export/templates/toc.template';
import { BASE_STYLES } from '../export/templates/base.styles';
import { renderModule3 } from '../export/templates/modules/module3.template';
import { PDFDocument as PDFDocLib } from 'pdf-lib';

@Injectable()
export class GuideService {
  constructor(private prisma: PrismaService) {}

  async generateGuide(projectId: string, organizationId: string, lang: 'fr' | 'en'): Promise<Buffer> {
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

      // ── SECTIONS ──
      const sections = this.buildSections(config, content, module3, savedModule3, isFr, isDoubleSignal, isBOMA, buildingAddress, project, planImplantation);
      const sectionBuffers: { buffer: Buffer; seqNum: number; title: string }[] = [];

      for (const section of sections) {
        const html = `<!DOCTYPE html><html lang="${lang}"><head><meta charset="UTF-8"/><style>${BASE_STYLES}${this.guideStyles()}</style></head><body>${section.html}</body></html>`;
        const page = await browser.newPage();
        await page.setContent(html, { waitUntil: 'load' });
        const bytes = await page.pdf({
          format: 'Letter', printBackground: true, displayHeaderFooter: false,
          margin: { top: '100px', bottom: '80px', left: '50px', right: '50px' },
        });
        await page.close();
        sectionBuffers.push({ buffer: Buffer.from(bytes), seqNum: section.seqNum, title: section.title });
      }

      // ── SOMMAIRE ──
      const allBuffers = [Buffer.from(coverBytes), ...sectionBuffers.map(s => s.buffer)];
      const pageCounts: number[] = [];
      for (const buf of allBuffers) {
        const pdf = await PDFDocument.load(buf);
        pageCounts.push(pdf.getPageCount());
      }

      // Calcul des pages de départ (1=couverture, 1=sommaire provisoire)
      const subsectionsBySection: Record<number, { id: string; title: string }[]> = {
        1: isFr ? [
          { id: '1.1', title: '1.1 — INFORMATIONS AUX LOCATAIRES' },
          { id: '1.2', title: '1.2 — RESPONSABILITÉ DU LOCATAIRE' },
          { id: '1.3', title: '1.3 — RAPPEL DES BONNES PRATIQUES EN CAS D\'ALARME INCENDIE' },
          { id: '1.4', title: '1.4 — PLAN D\'IMPLANTATION AVEC EMPLACEMENT DU POINT DE RASSEMBLEMENT' },
          { id: '1.5', title: '1.5 — RÔLES DES MEMBRES DE L\'ÉQUIPE D\'URGENCE' },
          { id: '1.6', title: '1.6 — ORGANIGRAMME DE L\'ÉQUIPE D\'URGENCE' },
        ] : [
          { id: '1.1', title: '1.1 — INFORMATION TO TENANTS' },
          { id: '1.2', title: '1.2 — TENANT RESPONSIBILITIES' },
          { id: '1.3', title: '1.3 — BEST PRACTICES REMINDER FOR FIRE ALARMS' },
          { id: '1.4', title: '1.4 — SITE PLAN WITH ASSEMBLY POINT LOCATION' },
          { id: '1.5', title: '1.5 — EMERGENCY TEAM MEMBER ROLES' },
          { id: '1.6', title: '1.6 — EMERGENCY TEAM ORGANIZATIONAL CHART' },
        ],
        2: isFr ? [
          { id: '2.1', title: '2.1 — EN CAS DE DÉCOUVERTE DE FUMÉE OU DE FLAMME' },
          { id: '2.2', title: '2.2 — EN CAS D\'ALERTE INCENDIE' },
          { id: '2.3', title: '2.3 — EN CAS D\'ALARME INCENDIE' },
          { id: '2.4', title: '2.4 — EN CAS DE FEU DE BATTERIE AU LITHIUM' },
          { id: '2.5', title: '2.5 — EN CAS DE MANIFESTATION' },
          { id: '2.6', title: '2.6 — EN CAS D\'INDIVIDU ARMÉ OU TIREUR ACTIF' },
          { id: '2.7', title: '2.7 — EN CAS DE VENTS VIOLENTS' },
          { id: '2.8', title: '2.8 — EN CAS DE PERSONNE COINCÉE DANS UN ASCENSEUR' },
          { id: '2.9', title: '2.9 — EN CAS DE FUITE DE GAZ NATUREL' },
          { id: '2.10', title: '2.10 — EN CAS D\'URGENCE MÉDICALE' },
          { id: '2.11', title: '2.11 — EN CAS DE PANNE DE COURANT' },
          { id: '2.12', title: '2.12 — EN CAS DE DÉVERSEMENT DE MATIÈRE DANGEREUSE' },
          { id: '2.13', title: '2.13 — EN CAS DE MENACE OU D\'ALERTE À LA BOMBE' },
          { id: '2.14', title: '2.14 — EN CAS DE DÉCOUVERTE DE COLIS SUSPECT' },
        ] : [
          { id: '2.1', title: '2.1 — IN CASE OF SMOKE OR FLAME DISCOVERY' },
          { id: '2.2', title: '2.2 — IN CASE OF FIRE ALERT' },
          { id: '2.3', title: '2.3 — IN CASE OF FIRE ALARM' },
          { id: '2.4', title: '2.4 — IN CASE OF LITHIUM BATTERY FIRE' },
          { id: '2.5', title: '2.5 — IN CASE OF DEMONSTRATION' },
          { id: '2.6', title: '2.6 — IN CASE OF ARMED INDIVIDUAL OR ACTIVE SHOOTER' },
          { id: '2.7', title: '2.7 — IN CASE OF HIGH WINDS' },
          { id: '2.8', title: '2.8 — IN CASE OF PERSON TRAPPED IN ELEVATOR' },
          { id: '2.9', title: '2.9 — IN CASE OF NATURAL GAS LEAK' },
          { id: '2.10', title: '2.10 — IN CASE OF MEDICAL EMERGENCY' },
          { id: '2.11', title: '2.11 — IN CASE OF POWER OUTAGE' },
          { id: '2.12', title: '2.12 — IN CASE OF HAZARDOUS MATERIAL SPILL' },
          { id: '2.13', title: '2.13 — IN CASE OF BOMB THREAT OR ALERT' },
          { id: '2.14', title: '2.14 — IN CASE OF SUSPICIOUS PACKAGE DISCOVERY' },
        ],
        3: isFr ? [
          { id: '3.1', title: '3.1 — TABLEAU DES ÉQUIPES D\'ÉVACUATION LOCATAIRES' },
          { id: '3.2', title: '3.2 — REGISTRE DES PERSONNES NÉCESSITANT L\'AIDE À L\'ÉVACUATION' },
        ] : [
          { id: '3.1', title: '3.1 — TENANT EVACUATION TEAM TABLE' },
          { id: '3.2', title: '3.2 — REGISTER OF PERSONS REQUIRING EVACUATION ASSISTANCE' },
        ],
      };

      const buildTocEntries = (tocPageCount: number) => {
        let running = 1 + tocPageCount;
        return sectionBuffers.map((s, idx) => {
          const start = running + 1;
          running += pageCounts[idx + 1];
          return {
            sequentialNumber: s.seqNum,
            moduleTitle: s.title,
            pageNumber: start,
            subsections: (subsectionsBySection[s.seqNum] || []).map(sub => ({
              id: sub.id,
              title: sub.title,
              page: start,
            })),
          };
        });
      };

      const provisionalEntries = buildTocEntries(1);
      const tocHtml1 = generateTocPage({ entries: provisionalEntries, isFr });
      const tocPage1 = await browser.newPage();
      await tocPage1.setContent(`<!DOCTYPE html><html><head><meta charset="UTF-8"/><style>${TOC_STYLES}</style></head><body>${tocHtml1}</body></html>`, { waitUntil: 'load' });
      const tocBytes1 = await tocPage1.pdf({ format: 'Letter', printBackground: true, displayHeaderFooter: false, margin: { top: '100px', bottom: '80px', left: '70px', right: '70px' } });
      await tocPage1.close();
      const realTocPageCount = (await PDFDocument.load(tocBytes1)).getPageCount();

      const finalEntries = buildTocEntries(realTocPageCount);
      const tocHtml2 = generateTocPage({ entries: finalEntries, isFr });
      const tocPage2 = await browser.newPage();
      await tocPage2.setContent(`<!DOCTYPE html><html><head><meta charset="UTF-8"/><style>${TOC_STYLES}</style></head><body>${tocHtml2}</body></html>`, { waitUntil: 'load' });
      const tocBytes2 = await tocPage2.pdf({ format: 'Letter', printBackground: true, displayHeaderFooter: false, margin: { top: '100px', bottom: '80px', left: '70px', right: '70px' } });
      await tocPage2.close();

      // ── ASSEMBLAGE ──
      const merged = await PDFDocument.create();
      for (const buf of [Buffer.from(coverBytes), Buffer.from(tocBytes2), ...sectionBuffers.map(s => s.buffer)]) {
        const src = await PDFDocument.load(buf);
        const pages = await merged.copyPages(src, src.getPageIndices());
        pages.forEach(p => merged.addPage(p));
      }

      // Numéros de page
      const { rgb, StandardFonts } = await import('pdf-lib');
      const font = await merged.embedFont(StandardFonts.HelveticaBold);
      const regularFont = await merged.embedFont(StandardFonts.Helvetica);
      const pages = merged.getPages();
      const guideLabel = isFr ? 'Guide du locataire' : 'Tenant Guide';
      pages.forEach((page, idx) => {
        if (idx < 2) return; // skip couverture + sommaire
        const { width } = page.getSize();
        const labelWidth = regularFont.widthOfTextAtSize(guideLabel, 9);
        page.drawText(guideLabel, { x: (width - labelWidth) / 2, y: 28, size: 9, font: regularFont, color: rgb(0.678, 0.678, 0.678) });
        page.drawText(String(idx + 1), { x: width - 65, y: 28, size: 10, font, color: rgb(0.663, 0.196, 0.149) });
      });

      return Buffer.from(await merged.save());
    } finally {
      await browser.close();
    }
  }

  private buildSections(config: any, content: any, module3: any, savedModule3: any, isFr: boolean, isDoubleSignal: boolean, isBOMA: boolean, buildingAddress: string, project: any, planImplantation?: any): { seqNum: number; title: string; html: string }[] {
    const sections: { seqNum: number; title: string; html: string }[] = [];
    let seq = 0;

    const sectionHeader = (title: string) => {
      seq++;
      return `
        <div class="section-header">
          <span class="section-id">${seq}</span>
          <span class="section-title-line2">${title}</span>
          <div class="section-bar"></div>
        </div>
      `;
    };

    const subHeader = (num: string, title: string) => `
      <div style="margin:20px 0 8px 0;">
        <span style="font-size:11pt;font-weight:700;color:#C0392B;">${num}</span>
        <span style="font-size:11pt;font-weight:700;color:#2C3E50;margin-left:8px;">${title}</span>
        <div style="height:2px;background-color:#E9ECEF;margin-top:6px;"></div>
      </div>
    `;

    // ── SECTION 1 : INTRODUCTION ──
    const intro = this.buildSection1(config, content, module3, savedModule3, isFr, isDoubleSignal, buildingAddress, project, sectionHeader, subHeader, planImplantation);
    sections.push({ seqNum: 1, title: isFr ? 'Introduction' : 'Introduction', html: intro });

    // ── SECTION 2 : PROCÉDURES ──
    const procedures = this.buildSection2(config, isFr, isDoubleSignal, isBOMA, sectionHeader, subHeader, buildingAddress);
    sections.push({ seqNum: 2, title: isFr ? 'Procédures équipe d\'urgence' : 'Emergency Team Procedures', html: procedures });

    // ── SECTION 3 : RAPPORTS ET REGISTRES ──
    const registres = this.buildSection3(isFr, sectionHeader, subHeader);
    sections.push({ seqNum: 3, title: isFr ? 'Rapports et registres' : 'Reports and Registers', html: registres });

    return sections;
  }

  private buildSection1(config: any, content: any, module3: any, savedModule3: any, isFr: boolean, isDoubleSignal: boolean, buildingAddress: string, project: any, sectionHeader: (title: string) => string, subHeader: (num: string, title: string) => string, planImplantation?: any): string {
    const fr = isFr;
    const pointRassemblement = config.pointRassemblement || '—';
    const pointRassemblement2 = config.pointRassemblement2 || '';
    const responsableNom = config.responsableNom || '—';
    const responsableTitre = config.responsableTitre || '—';
    const urgenceInterne = content?.module2?.internalEmergencyNumber || '';

    // Organigramme Module 3
    let orgHtml = '';
    if (module3 && savedModule3) {
      const mergedSections = (module3.sections || []).map((s: any) => {
        if (s.id === '3.1' && savedModule3.orgRoles) return { ...s, orgRoles: savedModule3.orgRoles };
        return s;
      });
      const { html31 } = renderModule3(mergedSections, isFr ? 'fr' : 'en', 1);
      orgHtml = html31;
    }

    return `
      <div>
        ${sectionHeader(isFr ? 'INTRODUCTION' : 'INTRODUCTION')}

        ${subHeader('1.1', fr ? 'INFORMATIONS AUX LOCATAIRES' : 'INFORMATION TO TENANTS')}
        
        <p style="font-size:10pt;font-weight:700;color:#2C3E50;margin-bottom:6px;">
          ${fr ? 'Objectif du guide' : 'Guide objective'}
        </p>
        <p style="font-size:10pt;color:#495057;margin-bottom:16px;">
          ${fr
            ? 'Le présent Guide du locataire a pour objectif d\'informer et de sensibiliser les occupants du bâtiment aux mesures de prévention et aux consignes d\'urgence en vigueur. Il vise à assurer la sécurité de tous en fournissant des instructions claires sur la conduite à adopter avant, pendant et après une situation d\'urgence.'
            : 'This Tenant Guide aims to inform and raise awareness among building occupants about prevention measures and emergency procedures in effect. It aims to ensure the safety of all by providing clear instructions on conduct before, during, and after an emergency situation.'}
        </p>

        <p style="font-size:10pt;font-weight:700;color:#2C3E50;margin-bottom:6px;">
          ${fr ? 'Distribution et mise à jour' : 'Distribution and updates'}
        </p>
        <p style="font-size:10pt;color:#495057;margin-bottom:8px;">
          ${fr
            ? 'Chaque locataire reçoit une version du guide mise à jour par le gestionnaire d\'immeuble. Ce document doit être :'
            : 'Each tenant receives an updated version of the guide from the building manager. This document must be:'}
        </p>
        <ul style="font-size:10pt;color:#495057;padding-left:20px;margin-bottom:16px;">
          ${fr ? `
            <li style="margin-bottom:6px;">Conservé à portée de main par les responsables de chaque entreprise ou département locataire ;</li>
            <li style="margin-bottom:6px;">Diffusé à l'ensemble des employés et nouveau personnel ;</li>
            <li style="margin-bottom:6px;">Consulté régulièrement afin de maintenir une bonne connaissance des consignes de sécurité.</li>
          ` : `
            <li style="margin-bottom:6px;">Kept within reach by the managers of each tenant company or department;</li>
            <li style="margin-bottom:6px;">Distributed to all employees and new personnel;</li>
            <li style="margin-bottom:6px;">Consulted regularly to maintain good knowledge of safety procedures.</li>
          `}
        </ul>

        <p style="font-size:10pt;font-weight:700;color:#2C3E50;margin-bottom:6px;">
          ${fr ? 'Contenu du guide' : 'Guide contents'}
        </p>
        <p style="font-size:10pt;color:#495057;margin-bottom:8px;">
          ${fr ? 'Le guide comprend les éléments essentiels suivants :' : 'The guide includes the following essential elements:'}
        </p>
        <ul style="font-size:10pt;color:#495057;padding-left:20px;margin-bottom:16px;">
          ${fr ? `
            <li style="margin-bottom:6px;"><strong>Points de rassemblement :</strong> Emplacements désignés à l'extérieur du bâtiment où les occupants doivent se regrouper en cas d'évacuation ;</li>
            <li style="margin-bottom:6px;"><strong>Procédures d'urgence simplifiées :</strong> Étapes à suivre en cas d'incendie, d'alarme, de fuite de gaz, de déversement, ou de tout autre événement d'urgence ;</li>
            <li style="margin-bottom:6px;"><strong>Comportements sécuritaires :</strong> Bonnes pratiques quotidiennes en matière de prévention incendie et de sécurité civile&nbsp;;</li>
            <li style="margin-bottom:6px;"><strong>Rôles et responsabilités :</strong> Distinction entre les interventions de l'équipe d'urgence du bâtiment et les actions attendues des locataires.</li>
          ` : `
            <li style="margin-bottom:6px;"><strong>Assembly points:</strong> Designated locations outside the building where occupants must gather in case of evacuation;</li>
            <li style="margin-bottom:6px;"><strong>Simplified emergency procedures:</strong> Steps to follow in case of fire, alarm, gas leak, spill, or any other emergency event;</li>
            <li style="margin-bottom:6px;"><strong>Safe behaviors:</strong> Daily best practices for fire prevention and civil safety;</li>
            <li style="margin-bottom:6px;"><strong>Roles and responsibilities:</strong> Distinction between building emergency team interventions and expected tenant actions.</li>
          `}
        </ul>

        <div class="page-break">
        ${subHeader('1.2', fr ? 'RESPONSABILITÉ DU LOCATAIRE' : 'TENANT RESPONSIBILITIES')}

        <p style="font-size:10pt;font-weight:700;color:#2C3E50;margin-bottom:6px;">
          ${fr ? 'Engagement général' : 'General commitment'}
        </p>
        <p style="font-size:10pt;color:#495057;margin-bottom:16px;">
          ${fr
            ? 'La sécurité du bâtiment repose sur la collaboration active entre les occupants, les gestionnaires et l\'équipe d\'urgence du bâtiment. Chaque locataire a un rôle essentiel à jouer pour assurer une évacuation ordonnée, une intervention rapide et la prévention des risques au quotidien.'
            : 'Building safety relies on active collaboration between occupants, managers, and the building emergency team. Each tenant plays an essential role in ensuring orderly evacuation, rapid response, and daily risk prevention.'}
        </p>

        <p style="font-size:10pt;font-weight:700;color:#2C3E50;margin-bottom:6px;">
          ${fr ? 'Responsabilités administratives' : 'Administrative responsibilities'}
        </p>
        <ul style="font-size:10pt;color:#495057;padding-left:20px;margin-bottom:16px;">
          ${fr ? `
            <li style="margin-bottom:8px;"><strong>Désignation des responsables de secteur :</strong> chaque entreprise locataire doit nommer au moins un responsable de secteur par étage ou zone d'occupation. Cette personne agit comme lien direct avec le coordonnateur d'urgence.</li>
            <li style="margin-bottom:8px;"><strong>Mise à jour des listes d'évacuation :</strong> les locataires doivent transmettre régulièrement au gestionnaire du bâtiment la liste à jour :
              <ul style="padding-left:20px;margin-top:6px;">
                <li style="margin-bottom:4px;">des membres de leur équipe d'évacuation si il y a&nbsp;;</li>
                <li style="margin-bottom:4px;">des personnes nécessitant une assistance particulière et de leur accompagnateur désigné.</li>
              </ul>
            </li>
            <li style="margin-bottom:8px;"><strong>Transmission des coordonnées d'urgence :</strong> assurez-vous que les contacts internes et externes pertinents sont connus de tout votre personnel.</li>
          ` : `
            <li style="margin-bottom:8px;"><strong>Designation of sector wardens:</strong> each tenant company must appoint at least one sector warden per floor or occupancy zone. This person acts as a direct link with the emergency coordinator.</li>
            <li style="margin-bottom:8px;"><strong>Update of evacuation lists:</strong> tenants must regularly provide the building manager with the updated list of evacuation team members and persons requiring special assistance.</li>
            <li style="margin-bottom:8px;"><strong>Emergency contact information:</strong> ensure that relevant internal and external contacts are known to all your staff.</li>
          `}
        </ul>

        <p style="font-size:10pt;font-weight:700;color:#2C3E50;margin-bottom:6px;">
          ${fr ? 'Formation et sensibilisation' : 'Training and awareness'}
        </p>
        <ul style="font-size:10pt;color:#495057;padding-left:20px;margin-bottom:16px;">
          ${fr ? `
            <li style="margin-bottom:6px;">Chaque membre de l'équipe d'évacuation doit avoir reçu une formation sur le Plan de mesures d'urgence (PMU) et connaître précisément les procédures applicables à son secteur.</li>
            <li style="margin-bottom:6px;"><strong>Participation obligatoire :</strong> chaque occupant doit participer aux séances de formation et aux exercices d'évacuation organisés par l'équipe de gestion de votre bâtiment.</li>
            <li style="margin-bottom:6px;"><strong>Formation des nouveaux employés :</strong> tout nouvel employé doit recevoir une brève formation interne sur les consignes d'évacuation et les comportements sécuritaires à adopter.</li>
            <li style="margin-bottom:6px;"><strong>Mise à jour annuelle :</strong> les responsables de secteur sont invités à participer à la formation annuelle portant sur les procédures d'urgence, afin de demeurer informés des ajustements apportés au PMU.</li>
          ` : `
            <li style="margin-bottom:6px;">Each evacuation team member must have received training on the Emergency Response Plan (ERP) and know the procedures applicable to their sector.</li>
            <li style="margin-bottom:6px;"><strong>Mandatory participation:</strong> each occupant must participate in training sessions and evacuation drills organized by your building management team.</li>
            <li style="margin-bottom:6px;"><strong>New employee training:</strong> all new employees must receive brief internal training on evacuation procedures and safe behaviors.</li>
            <li style="margin-bottom:6px;"><strong>Annual update:</strong> sector wardens are invited to participate in annual training on emergency procedures to stay informed of ERP changes.</li>
          `}
        </ul>

        <p style="font-size:10pt;font-weight:700;color:#2C3E50;margin-bottom:6px;">
          ${fr ? 'Prévention et entretien des zones locatives' : 'Prevention and maintenance of leased areas'}
        </p>
        <ul style="font-size:10pt;color:#495057;padding-left:20px;margin-bottom:16px;">
          ${fr ? `
            <li style="margin-bottom:6px;"><strong>Maintien des dégagements :</strong> toutes les issues de secours doivent demeurer dégagées sur une largeur minimale d'un mètre (42 pouces).</li>
            <li style="margin-bottom:6px;"><strong>Accessibilité des équipements :</strong> les extincteurs, stations manuelles d'alarme incendie et panneaux d'information de sortie doivent être visibles et accessibles en tout temps.</li>
            <li style="margin-bottom:6px;"><strong>Connaissance des installations :</strong> les employés doivent connaître les emplacements des sorties d'urgence, extincteurs, alarmes et points de rassemblement.</li>
            <li style="margin-bottom:6px;"><strong>Signalement :</strong> toute anomalie observée (bris, obstruction, panneau manquant, etc.) doit être signalée immédiatement à la sécurité.</li>
          ` : `
            <li style="margin-bottom:6px;"><strong>Clearance maintenance:</strong> all emergency exits must remain clear with a minimum width of one meter (42 inches).</li>
            <li style="margin-bottom:6px;"><strong>Equipment accessibility:</strong> extinguishers, manual fire alarm stations, and exit signs must be visible and accessible at all times.</li>
            <li style="margin-bottom:6px;"><strong>Knowledge of facilities:</strong> employees must know the locations of emergency exits, extinguishers, alarms, and assembly points.</li>
            <li style="margin-bottom:6px;"><strong>Reporting:</strong> any observed anomaly must be reported immediately to security.</li>
          `}
        </ul>

        <p style="font-size:10pt;font-weight:700;color:#2C3E50;margin-bottom:6px;">
          ${fr ? 'Risques liés aux batteries au lithium' : 'Lithium battery risks'}
        </p>
        <ul style="font-size:10pt;color:#495057;padding-left:20px;margin-bottom:16px;">
          ${fr ? `
            <li style="margin-bottom:6px;"><strong>Reconnaissance des signes de défaillance :</strong> fumée, odeur de brûlé, bruit anormal, suintement ou surchauffe doivent être signalés sans délai.</li>
            <li style="margin-bottom:8px;"><strong>Mesures de sécurité :</strong>
              <ul style="padding-left:20px;margin-top:6px;">
                <li style="margin-bottom:4px;">Ne jamais manipuler un appareil suspect&nbsp;;</li>
                <li style="margin-bottom:4px;">S'éloigner du secteur et fermer les portes pour contenir les fumées&nbsp;;</li>
                <li style="margin-bottom:4px;">Prévenir la sécurité ou la direction de l'immeuble immédiatement.</li>
              </ul>
            </li>
            <li style="margin-bottom:6px;"><strong>Responsabilité collective :</strong> le respect des règles d'entreposage et de recharge des batteries au lithium est obligatoire dans tous les locaux.</li>
          ` : `
            <li style="margin-bottom:6px;"><strong>Recognition of failure signs:</strong> smoke, burning smell, abnormal noise, leaking, or overheating must be reported without delay.</li>
            <li style="margin-bottom:8px;"><strong>Safety measures:</strong>
              <ul style="padding-left:20px;margin-top:6px;">
                <li style="margin-bottom:4px;">Never handle a suspicious device;</li>
                <li style="margin-bottom:4px;">Move away from the area and close doors to contain fumes;</li>
                <li style="margin-bottom:4px;">Notify building security or management immediately.</li>
              </ul>
            </li>
            <li style="margin-bottom:6px;"><strong>Collective responsibility:</strong> compliance with lithium battery storage and charging rules is mandatory in all premises.</li>
          `}
        </ul>

        <p style="font-size:10pt;font-weight:700;color:#2C3E50;margin-bottom:6px;">
          ${fr ? 'Participation aux exercices d\'évacuation' : 'Participation in evacuation drills'}
        </p>
        <ul style="font-size:10pt;color:#495057;padding-left:20px;margin-bottom:16px;">
          ${fr ? `
            <li style="margin-bottom:6px;"><strong>Engagement :</strong> la participation des locataires et de leur personnel aux exercices d'évacuation est essentielle pour assurer la sécurité collective et la conformité du bâtiment.</li>
            <li style="margin-bottom:6px;"><strong>Comportement attendu :</strong> suivre les consignes du coordonnateur d'urgence, se rendre calmement au point de rassemblement et attendre le signal de retour.</li>
          ` : `
            <li style="margin-bottom:6px;"><strong>Commitment:</strong> participation of tenants and their staff in evacuation drills is essential for collective safety and building compliance.</li>
            <li style="margin-bottom:6px;"><strong>Expected behavior:</strong> follow emergency coordinator instructions, proceed calmly to the assembly point, and wait for the return signal.</li>
          `}
        </ul>

        <div style="background-color:#F8F9FA;border:1px solid #E9ECEF;border-radius:4px;padding:16px;margin-top:8px;">
          <p style="font-size:10pt;font-weight:700;color:#2C3E50;margin-bottom:8px;">
            ${fr ? 'Message du gestionnaire' : 'Manager\'s message'}
          </p>
          <p style="font-size:10pt;color:#495057;margin-bottom:12px;">
            ${fr
              ? 'Nous comptons sur la collaboration et le sens des responsabilités de chaque locataire pour maintenir un environnement de travail sécuritaire et conforme aux normes en vigueur. Pour toute question ou précision sur les mesures de sécurité, veuillez communiquer avec :'
              : 'We rely on the collaboration and sense of responsibility of each tenant to maintain a safe working environment that complies with applicable standards. For any questions regarding safety measures, please contact:'}
          </p>
          <p style="font-size:10pt;font-weight:600;color:#2C3E50;">${responsableNom} — ${responsableTitre}</p>
          ${project.building?.phone ? `<p style="font-size:10pt;color:#495057;">${project.building.phone}</p>` : ''}
        </div>
        </div>

        </div><div class="page-break">
        ${subHeader('1.3', fr ? 'RAPPEL DES BONNES PRATIQUES EN CAS D\'ALARME INCENDIE' : 'BEST PRACTICES REMINDER FOR FIRE ALARMS')}

        <p style="font-size:10pt;color:#495057;margin-bottom:16px;">
          ${fr
            ? 'En cas d\'alarme incendie, la sécurité de tous dépend de la rapidité, du calme et de la coordination des occupants. Suivez attentivement les consignes ci-dessous pour assurer une évacuation ordonnée et sécuritaire.'
            : 'In case of fire alarm, everyone\'s safety depends on the speed, calm, and coordination of occupants. Follow the instructions below carefully to ensure an orderly and safe evacuation.'}
        </p>

        ${isDoubleSignal ? `
          <p style="font-size:10pt;font-weight:700;color:#2C3E50;margin-bottom:6px;">
            ${fr ? '1. Signal préparatoire (pré-alarme ou ALERTE)' : '1. Preparatory signal (pre-alarm or ALERT)'}
          </p>
          <p style="font-size:10pt;color:#495057;margin-bottom:8px;">
            ${fr
              ? 'Ce signal indique qu\'une situation d\'urgence est en cours d\'évaluation et qu\'une évacuation pourrait être imminente.'
              : 'This signal indicates that an emergency situation is being assessed and evacuation may be imminent.'}
          </p>
          <p style="font-size:10pt;color:#495057;margin-bottom:6px;font-style:italic;">
            ${fr ? 'Actions à entreprendre immédiatement :' : 'Actions to take immediately:'}
          </p>
          <ul style="font-size:10pt;color:#495057;padding-left:20px;margin-bottom:16px;">
            ${fr ? `
              <li style="margin-bottom:6px;">Restez attentif aux messages transmis par le système d'alerte vocal et par vos responsables de secteur.</li>
              <li style="margin-bottom:6px;">Cessez vos activités afin de demeurer disponible pour appliquer les consignes d'évacuation.</li>
              <li style="margin-bottom:8px;">Préparez-vous à évacuer :
                <ul style="padding-left:20px;margin-top:6px;">
                  <li style="margin-bottom:4px;">Enfilez des vêtements adaptés aux conditions extérieures&nbsp;;</li>
                  <li style="margin-bottom:4px;">Évitez de rassembler des objets personnels encombrants.</li>
                </ul>
              </li>
              <li style="margin-bottom:6px;"><strong>Communiquez avec votre responsable de secteur :</strong> assurez-vous de connaître les directives spécifiques à votre étage.</li>
              <li style="margin-bottom:6px;"><strong>Soyez vigilant :</strong> si vous percevez des signes évidents d'incendie (fumée, chaleur, odeur), évacuez immédiatement sans attendre l'ordre officiel.</li>
            ` : `
              <li style="margin-bottom:6px;">Stay attentive to messages from the voice alert system and your sector wardens.</li>
              <li style="margin-bottom:6px;">Stop your activities to remain available to apply evacuation instructions.</li>
              <li style="margin-bottom:8px;">Prepare to evacuate:
                <ul style="padding-left:20px;margin-top:6px;">
                  <li style="margin-bottom:4px;">Put on clothing suitable for outdoor conditions;</li>
                  <li style="margin-bottom:4px;">Avoid gathering bulky personal items.</li>
                </ul>
              </li>
              <li style="margin-bottom:6px;"><strong>Communicate with your sector warden:</strong> make sure you know the specific directives for your floor.</li>
              <li style="margin-bottom:6px;"><strong>Stay vigilant:</strong> if you notice obvious signs of fire (smoke, heat, odor), evacuate immediately without waiting for an official order.</li>
            `}
          </ul>
        ` : ''}

        <p style="font-size:10pt;font-weight:700;color:#2C3E50;margin-bottom:6px;">
          ${fr
            ? (isDoubleSignal ? '2. Signal d\'évacuation générale (ALARME)' : '1. Signal d\'évacuation générale (ALARME)')
            : (isDoubleSignal ? '2. General evacuation signal (ALARM)' : '1. General evacuation signal (ALARM)')}
        </p>
        <p style="font-size:10pt;color:#495057;margin-bottom:8px;">
          ${fr
            ? 'Lorsque l\'alarme incendie retentit, l\'évacuation est obligatoire. Agissez rapidement et dans le calme.'
            : 'When the fire alarm sounds, evacuation is mandatory. Act quickly and calmly.'}
        </p>
        <p style="font-size:10pt;color:#495057;margin-bottom:6px;font-style:italic;">
          ${fr ? 'Consignes à suivre :' : 'Instructions to follow:'}
        </p>
        <ul style="font-size:10pt;color:#495057;padding-left:20px;margin-bottom:16px;">
          ${fr ? `
            <li style="margin-bottom:6px;">Quittez immédiatement votre zone de travail en empruntant les issues de secours indiquées sur les plans d'évacuation.</li>
            <li style="margin-bottom:6px;"><strong>N'utilisez jamais les ascenseurs.</strong> Utilisez uniquement les escaliers.</li>
            <li style="margin-bottom:6px;"><strong>Gardez les mains libres :</strong> laissez sur place tout objet volumineux, sac, ou boisson chaude qui pourrait ralentir votre déplacement.</li>
            <li style="margin-bottom:6px;">Fermez les portes derrière vous sans les verrouiller pour limiter la propagation de la fumée.</li>
            <li style="margin-bottom:6px;">Dirigez-vous calmement vers le point de rassemblement extérieur désigné.</li>
            <li style="margin-bottom:6px;"><strong>Aidez les autres au besoin :</strong> si une personne nécessite de l'assistance, signalez-la immédiatement à un responsable de secteur ou à un membre de l'équipe d'évacuation.</li>
          ` : `
            <li style="margin-bottom:6px;">Immediately leave your work area using the emergency exits indicated on evacuation plans.</li>
            <li style="margin-bottom:6px;"><strong>Never use elevators.</strong> Use stairs only.</li>
            <li style="margin-bottom:6px;"><strong>Keep hands free:</strong> leave behind any bulky objects, bags, or hot beverages that could slow your movement.</li>
            <li style="margin-bottom:6px;">Close doors behind you without locking them to limit smoke spread.</li>
            <li style="margin-bottom:6px;">Proceed calmly to the designated outdoor assembly point.</li>
            <li style="margin-bottom:6px;"><strong>Help others if needed:</strong> if someone requires assistance, immediately notify a sector warden or evacuation team member.</li>
          `}
        </ul>

        <p style="font-size:10pt;font-weight:700;color:#2C3E50;margin-bottom:6px;">
          ${fr
            ? (isDoubleSignal ? '3. Arrivée au point de rassemblement' : '2. Arrivée au point de rassemblement')
            : (isDoubleSignal ? '3. Arrival at assembly point' : '2. Arrival at assembly point')}
        </p>
        <p style="font-size:10pt;color:#495057;margin-bottom:8px;">
          ${fr ? 'Une fois à l\'extérieur du bâtiment :' : 'Once outside the building:'}
        </p>
        <ul style="font-size:10pt;color:#495057;padding-left:20px;margin-bottom:16px;">
          ${fr ? `
            <li style="margin-bottom:6px;">Restez avec votre groupe de travail et attendez les consignes du coordonnateur d'urgence ou du service incendie.</li>
            <li style="margin-bottom:6px;">Ne retournez jamais à l'intérieur tant que le bâtiment n'a pas été déclaré sécuritaire par les autorités compétentes.</li>
            <li style="margin-bottom:6px;">Restez attentif aux messages transmis par haut-parleur, téléphone ou application interne.</li>
          ` : `
            <li style="margin-bottom:6px;">Stay with your work group and wait for instructions from the emergency coordinator or fire department.</li>
            <li style="margin-bottom:6px;">Never return inside until the building has been declared safe by competent authorities.</li>
            <li style="margin-bottom:6px;">Stay attentive to messages via loudspeaker, phone, or internal application.</li>
          `}
        </ul>

        <p style="font-size:10pt;font-weight:700;color:#2C3E50;margin-bottom:6px;">
          ${fr
            ? (isDoubleSignal ? '4. Comportement attendu' : '3. Comportement attendu')
            : (isDoubleSignal ? '4. Expected behavior' : '3. Expected behavior')}
        </p>
        <ul style="font-size:10pt;color:#495057;padding-left:20px;margin-bottom:16px;">
          ${fr ? `
            <li style="margin-bottom:6px;"><strong>Calme et discipline :</strong> évitez de crier, courir ou retourner chercher des objets personnels.</li>
            <li style="margin-bottom:6px;"><strong>Respect des consignes :</strong> suivez uniquement les directives émises par l'équipe d'urgence ou du service incendie.</li>
            <li style="margin-bottom:6px;"><strong>Esprit collectif :</strong> votre vigilance et votre collaboration facilitent l'intervention rapide des secours et assurent la sécurité de l'ensemble des occupants.</li>
          ` : `
            <li style="margin-bottom:6px;"><strong>Calm and discipline:</strong> avoid shouting, running, or going back for personal belongings.</li>
            <li style="margin-bottom:6px;"><strong>Following instructions:</strong> only follow directives from the emergency team or fire department.</li>
            <li style="margin-bottom:6px;"><strong>Collective spirit:</strong> your vigilance and collaboration facilitate rapid emergency response and ensure the safety of all occupants.</li>
          `}
        </ul>

        <div style="background-color:#EAFAF1;border:1px solid #A9DFBF;border-radius:4px;padding:12px;margin-top:8px;">
          <p style="font-size:10pt;color:#1E8449;">
            ${fr
              ? 'En respectant ces bonnes pratiques, chaque locataire contribue à maintenir un environnement de travail sécuritaire, à réduire les risques et à soutenir l\'efficacité des opérations d\'urgence coordonnées par l\'équipe d\'urgence.'
              : 'By following these best practices, each tenant contributes to maintaining a safe working environment, reducing risks, and supporting the effectiveness of emergency operations coordinated by the emergency team.'}
          </p>
        </div>

        </div><div class="page-break">
        ${subHeader('1.4', fr ? 'PLAN D\'IMPLANTATION AVEC EMPLACEMENT DU POINT DE RASSEMBLEMENT' : 'SITE PLAN WITH ASSEMBLY POINT LOCATION')}
        ${planImplantation?.imageBase64 ? `
          <div style="width:100%;text-align:center;margin-top:8px;">
            <img src="data:image/png;base64,${planImplantation.imageBase64}"
              style="max-width:100%;max-height:580px;object-fit:contain;display:block;margin:0 auto;" />
            ${planImplantation.name ? `<p style="font-size:9pt;color:#6C757D;margin-top:6px;font-style:italic;">${planImplantation.name}</p>` : ''}
          </div>
        ` : `
          <p style="font-size:10pt;color:#ADB5BD;font-style:italic;">
            ${fr ? 'Aucun plan d\'implantation configuré dans le PMU.' : 'No site plan configured in the ERP.'}
          </p>
        `}

        </div><div class="page-break">
        ${subHeader('1.5', fr ? 'RÔLES DES MEMBRES DE L\'ÉQUIPE D\'URGENCE' : 'EMERGENCY TEAM MEMBER ROLES')}

        <p style="font-size:10pt;color:#495057;margin-bottom:16px;">
          ${fr
            ? 'L\'équipe d\'évacuation joue un rôle central dans la sécurité du bâtiment. En situation d\'urgence, sa mission est d\'assurer une évacuation rapide, ordonnée et sécuritaire de tous les occupants. Une équipe bien formée et identifiable est la clé d\'une intervention réussie.'
            : 'The evacuation team plays a central role in building safety. In an emergency, its mission is to ensure a rapid, orderly, and safe evacuation of all occupants. A well-trained and identifiable team is the key to a successful intervention.'}
        </p>

        <p style="font-size:10pt;font-weight:700;color:#2C3E50;margin-bottom:6px;">
          ${fr ? 'Organisation et suppléance' : 'Organization and substitution'}
        </p>
        <ul style="font-size:10pt;color:#495057;padding-left:20px;margin-bottom:16px;">
          ${fr ? `
            <li style="margin-bottom:6px;">Dans le contexte du travail hybride, il est essentiel de prévoir des remplaçants formés capables d'assurer la relève du responsable de secteur en cas d'absence.</li>
            <li style="margin-bottom:6px;">Chaque étage ou zone doit ainsi compter au minimum deux personnes formées à la coordination d'évacuation.</li>
            <li style="margin-bottom:6px;">Les suppléants doivent connaître les points de rassemblement, les itinéraires d'évacuation et les personnes nécessitant une assistance particulière.</li>
          ` : `
            <li style="margin-bottom:6px;">In the context of hybrid work, it is essential to have trained substitutes capable of replacing the sector warden in case of absence.</li>
            <li style="margin-bottom:6px;">Each floor or zone must have at least two people trained in evacuation coordination.</li>
            <li style="margin-bottom:6px;">Substitutes must know the assembly points, evacuation routes, and persons requiring special assistance.</li>
          `}
        </ul>

        <p style="font-size:10pt;font-weight:700;color:#2C3E50;margin-bottom:6px;">
          ${fr ? 'Identification et visibilité' : 'Identification and visibility'}
        </p>
        <ul style="font-size:10pt;color:#495057;padding-left:20px;margin-bottom:16px;">
          ${fr ? `
            <li style="margin-bottom:6px;">Les membres de l'équipe d'évacuation doivent être facilement identifiables par un dossard, brassard ou badge de couleur vive.</li>
            <li style="margin-bottom:6px;">Cette identification visuelle facilite la communication, réduit la confusion et permet aux occupants de repérer immédiatement une personne ressource en cas de panique.</li>
          ` : `
            <li style="margin-bottom:6px;">Evacuation team members must be easily identifiable by a brightly colored vest, armband, or badge.</li>
            <li style="margin-bottom:6px;">This visual identification facilitates communication, reduces confusion, and allows occupants to immediately identify a resource person in case of panic.</li>
          `}
        </ul>

        <p style="font-size:10pt;font-weight:700;color:#2C3E50;margin-bottom:6px;">
          ${fr ? 'Responsabilités principales' : 'Main responsibilities'}
        </p>
        <p style="font-size:10pt;color:#495057;margin-bottom:8px;">
          ${fr ? 'Chaque membre de l\'équipe doit :' : 'Each team member must:'}
        </p>
        <ul style="font-size:10pt;color:#495057;padding-left:20px;margin-bottom:16px;">
          ${fr ? `
            <li style="margin-bottom:6px;">Appliquer les consignes du coordonnateur d'urgence et relayer les directives à son secteur&nbsp;;</li>
            <li style="margin-bottom:6px;">Encadrer l'évacuation de façon méthodique, en s'assurant que personne ne demeure dans les locaux&nbsp;;</li>
            <li style="margin-bottom:6px;">Fermer les portes derrière lui sans les verrouiller pour limiter la propagation de la fumée&nbsp;;</li>
            <li style="margin-bottom:6px;">Aider les personnes en difficulté ou signaler leur présence à l'accompagnateur désigné&nbsp;;</li>
            <li style="margin-bottom:6px;">Rendre compte au coordonnateur dès l'arrivée au point de rassemblement.</li>
          ` : `
            <li style="margin-bottom:6px;">Apply emergency coordinator instructions and relay directives to their sector;</li>
            <li style="margin-bottom:6px;">Supervise evacuation methodically, ensuring no one remains in the premises;</li>
            <li style="margin-bottom:6px;">Close doors behind them without locking to limit smoke spread;</li>
            <li style="margin-bottom:6px;">Assist persons in difficulty or signal their presence to the designated escort;</li>
            <li style="margin-bottom:6px;">Report to the coordinator upon arrival at the assembly point.</li>
          `}
        </ul>

        </div><div class="page-break">
        ${subHeader('1.6', isFr ? 'ORGANIGRAMME DE L\'ÉQUIPE D\'URGENCE' : 'EMERGENCY TEAM ORGANIZATIONAL CHART')}
        ${orgHtml || `<p style="color:#ADB5BD;font-style:italic;">${isFr ? 'Organigramme non disponible.' : 'Organizational chart not available.'}</p>`}
      </div>
    `;
  }

  private buildSection2(config: any, isFr: boolean, isDoubleSignal: boolean, isBOMA: boolean, sectionHeader: Function, subHeader: Function, buildingAddress: string): string {
    const proc = (num: string, title: string, steps: string[]) => `
      ${subHeader(num, title)}
      <ol style="font-size:10pt;color:#495057;padding-left:20px;margin-bottom:16px;">
        ${steps.map(s => `<li style="margin-bottom:6px;">${s}</li>`).join('')}
      </ol>
    `;

    const fr = isFr;

    return `
      <div class="page-break">
        ${sectionHeader(fr ? 'PROCÉDURES ÉQUIPE D\'URGENCE' : 'EMERGENCY TEAM PROCEDURES')}

        ${proc('2.1', fr ? 'EN CAS DE DÉCOUVERTE DE FUMÉE OU DE FLAMME' : 'IN CASE OF SMOKE OR FLAME DISCOVERY', fr ? [
          'Gardez votre calme.',
          'N\'essayez pas d\'éteindre le feu vous-même sauf s\'il est très petit et que vous êtes formé.',
          'Activez la station manuelle d\'alarme incendie la plus proche.',
          'Composez le 9-1-1 et signalez l\'incendie.',
          'Évacuez immédiatement le bâtiment par les sorties de secours.',
          'Ne prenez pas les ascenseurs.',
          'Rendez-vous au point de rassemblement.',
        ] : [
          'Stay calm.',
          'Do not attempt to extinguish the fire yourself unless it is very small and you are trained.',
          'Activate the nearest manual fire alarm station.',
          'Call 9-1-1 and report the fire.',
          'Immediately evacuate the building using emergency exits.',
          'Do not use elevators.',
          'Proceed to the assembly point.',
        ])}

        ${proc('2.2', fr ? 'EN CAS D\'ALERTE INCENDIE' : 'IN CASE OF FIRE ALERT', fr ? [
          'Restez calme et attentif aux instructions de l\'équipe d\'urgence.',
          'Préparez-vous à évacuer.',
          'Identifiez la sortie de secours la plus proche.',
          'Attendez le signal d\'évacuation ou les instructions du responsable d\'étage.',
        ] : [
          'Stay calm and attentive to emergency team instructions.',
          'Prepare to evacuate.',
          'Identify the nearest emergency exit.',
          'Wait for the evacuation signal or floor warden instructions.',
        ])}

        ${proc('2.3', fr ? 'EN CAS D\'ALARME INCENDIE' : 'IN CASE OF FIRE ALARM', fr ? [
          'Évacuez immédiatement dès le déclenchement de l\'alarme.',
          'Empruntez les escaliers — ne prenez jamais les ascenseurs.',
          'Fermez les portes derrière vous sans les verrouiller.',
          'Suivez les indications du responsable d\'étage.',
          `Rendez-vous au point de rassemblement : <strong>${config.pointRassemblement || '—'}</strong>`,
          'Ne retournez pas dans le bâtiment avant l\'autorisation des pompiers.',
        ] : [
          'Evacuate immediately upon alarm activation.',
          'Use stairways — never use elevators.',
          'Close doors behind you without locking them.',
          'Follow floor warden instructions.',
          `Proceed to assembly point: <strong>${config.pointRassemblement || '—'}</strong>`,
          'Do not return to the building until authorized by firefighters.',
        ])}

        ${proc('2.4', fr ? 'EN CAS DE FEU DE BATTERIE AU LITHIUM' : 'IN CASE OF LITHIUM BATTERY FIRE', fr ? [
          'N\'essayez pas d\'éteindre le feu vous-même.',
          'Activez l\'alarme incendie.',
          'Composez le 9-1-1.',
          'Évacuez immédiatement la zone.',
          'Signalez la présence de batteries lithium aux pompiers à leur arrivée.',
        ] : [
          'Do not attempt to extinguish the fire yourself.',
          'Activate the fire alarm.',
          'Call 9-1-1.',
          'Immediately evacuate the area.',
          'Inform firefighters of lithium battery presence upon their arrival.',
        ])}

        ${proc('2.5', fr ? 'EN CAS DE MANIFESTATION' : 'IN CASE OF DEMONSTRATION', fr ? [
          'Restez calme et évitez de vous approcher de la manifestation.',
          'Informez la direction de l\'immeuble ou la sécurité.',
          'Suivez les instructions de l\'équipe d\'urgence.',
          'Si la situation devient dangereuse, éloignez-vous et composez le 9-1-1.',
        ] : [
          'Stay calm and avoid approaching the demonstration.',
          'Inform building management or security.',
          'Follow emergency team instructions.',
          'If the situation becomes dangerous, move away and call 9-1-1.',
        ])}

        ${proc('2.6', fr ? 'EN CAS D\'INDIVIDU ARMÉ OU TIREUR ACTIF' : 'IN CASE OF ARMED INDIVIDUAL OR ACTIVE SHOOTER', fr ? [
          'COUREZ : Évacuez immédiatement si vous pouvez le faire en sécurité.',
          'CACHEZ-VOUS : Si vous ne pouvez pas fuir, cachez-vous dans une pièce verrouillée, éteignez les lumières.',
          'COMBATTEZ : En dernier recours seulement, si votre vie est en danger immédiat.',
          'Composez le 9-1-1 dès que vous êtes en sécurité.',
          'Attendez l\'arrivée des forces de l\'ordre.',
        ] : [
          'RUN: Evacuate immediately if you can do so safely.',
          'HIDE: If you cannot flee, hide in a locked room, turn off lights.',
          'FIGHT: As a last resort only, if your life is in immediate danger.',
          'Call 9-1-1 as soon as you are safe.',
          'Wait for law enforcement arrival.',
        ])}

        ${proc('2.7', fr ? 'EN CAS DE VENTS VIOLENTS' : 'IN CASE OF HIGH WINDS', fr ? [
          'Éloignez-vous des fenêtres et des portes vitrées.',
          'Ne quittez pas le bâtiment si des objets volent à l\'extérieur.',
          'Rendez-vous dans un couloir intérieur ou une pièce sans fenêtre.',
          'Suivez les instructions de l\'équipe d\'urgence.',
        ] : [
          'Stay away from windows and glass doors.',
          'Do not leave the building if objects are flying outside.',
          'Go to an interior hallway or room without windows.',
          'Follow emergency team instructions.',
        ])}

        ${proc('2.8', fr ? 'EN CAS DE PERSONNE COINCÉE DANS UN ASCENSEUR' : 'IN CASE OF PERSON TRAPPED IN ELEVATOR', fr ? [
          'Appuyez sur le bouton d\'alarme de l\'ascenseur.',
          'Utilisez le téléphone d\'urgence dans l\'ascenseur si disponible.',
          'Restez calme — l\'ascenseur est sécuritaire.',
          'Si vous êtes à l\'extérieur, informez immédiatement la sécurité ou la direction.',
          'Ne tentez pas d\'ouvrir les portes de force.',
        ] : [
          'Press the elevator alarm button.',
          'Use the emergency phone in the elevator if available.',
          'Stay calm — the elevator is safe.',
          'If you are outside, immediately inform security or management.',
          'Do not attempt to force the doors open.',
        ])}

        ${proc('2.9', fr ? 'EN CAS DE FUITE DE GAZ NATUREL' : 'IN CASE OF NATURAL GAS LEAK', fr ? [
          'N\'allumez aucun interrupteur ni appareil électrique.',
          'Ne fumez pas et n\'utilisez pas de flamme.',
          'Évacuez immédiatement le local ou l\'étage.',
          'Activez l\'alarme incendie.',
          'Composez le 9-1-1 depuis l\'extérieur.',
          'Signalez la fuite à la direction de l\'immeuble.',
        ] : [
          'Do not turn on any switches or electrical appliances.',
          'Do not smoke or use open flames.',
          'Immediately evacuate the premises or floor.',
          'Activate the fire alarm.',
          'Call 9-1-1 from outside.',
          'Report the leak to building management.',
        ])}

        ${proc('2.10', fr ? 'EN CAS D\'URGENCE MÉDICALE' : 'IN CASE OF MEDICAL EMERGENCY', fr ? [
          'Composez le 9-1-1 immédiatement.',
          'Restez avec la personne jusqu\'à l\'arrivée des secours.',
          'Si disponible, utilisez le défibrillateur (DEA) en cas d\'arrêt cardiaque.',
          'Envoyez quelqu\'un accueillir les ambulanciers à l\'entrée.',
          'Informez la direction de l\'immeuble.',
        ] : [
          'Call 9-1-1 immediately.',
          'Stay with the person until help arrives.',
          'If available, use the defibrillator (AED) in case of cardiac arrest.',
          'Send someone to meet paramedics at the entrance.',
          'Inform building management.',
        ])}

        ${proc('2.11', fr ? 'EN CAS DE PANNE DE COURANT' : 'IN CASE OF POWER OUTAGE', fr ? [
          'Restez calme — l\'éclairage d\'urgence s\'activera automatiquement.',
          'Ne quittez pas votre position immédiatement.',
          'Attendez les instructions de l\'équipe d\'urgence.',
          'Si vous devez évacuer, utilisez les escaliers éclairés.',
          'Signalez toute personne bloquée dans un ascenseur.',
        ] : [
          'Stay calm — emergency lighting will activate automatically.',
          'Do not leave your position immediately.',
          'Wait for emergency team instructions.',
          'If you must evacuate, use lighted stairways.',
          'Report anyone trapped in an elevator.',
        ])}

        ${proc('2.12', fr ? 'EN CAS DE DÉVERSEMENT DE MATIÈRE DANGEREUSE' : 'IN CASE OF HAZARDOUS MATERIAL SPILL', fr ? [
          'Évacuez immédiatement la zone affectée.',
          'N\'essayez pas de nettoyer le déversement vous-même.',
          'Fermez les portes pour confiner la zone.',
          'Composez le 9-1-1 et informez la direction.',
          'Signalez le type de produit si vous le connaissez.',
        ] : [
          'Immediately evacuate the affected area.',
          'Do not attempt to clean up the spill yourself.',
          'Close doors to contain the area.',
          'Call 9-1-1 and inform management.',
          'Report the type of product if known.',
        ])}

        ${proc('2.13', fr ? 'EN CAS DE MENACE OU D\'ALERTE À LA BOMBE' : 'IN CASE OF BOMB THREAT OR ALERT', fr ? [
          'Si vous recevez une menace par téléphone, gardez la personne en ligne le plus longtemps possible.',
          'Notez tous les détails : voix, accent, bruits de fond, message exact.',
          'Informez immédiatement la direction et composez le 9-1-1.',
          'N\'activez pas les téléphones cellulaires ou radios à proximité d\'un objet suspect.',
          'Suivez les instructions d\'évacuation des autorités.',
        ] : [
          'If you receive a phone threat, keep the person on the line as long as possible.',
          'Note all details: voice, accent, background noise, exact message.',
          'Immediately inform management and call 9-1-1.',
          'Do not activate cell phones or radios near a suspicious object.',
          'Follow evacuation instructions from authorities.',
        ])}

        ${proc('2.14', fr ? 'EN CAS DE DÉCOUVERTE DE COLIS SUSPECT' : 'IN CASE OF SUSPICIOUS PACKAGE DISCOVERY', fr ? [
          'Ne touchez pas, ne déplacez pas et ne tentez pas d\'ouvrir le colis.',
          'Éloignez-vous immédiatement et maintenez une distance de sécurité.',
          'Informez la sécurité ou la direction de l\'immeuble.',
          'Composez le 9-1-1.',
          'Évacuez la zone selon les instructions des autorités.',
        ] : [
          'Do not touch, move, or attempt to open the package.',
          'Move away immediately and maintain a safe distance.',
          'Inform building security or management.',
          'Call 9-1-1.',
          'Evacuate the area according to authority instructions.',
        ])}
      </div>
    `;
  }

  private buildSection3(isFr: boolean, sectionHeader: Function, subHeader: Function): string {
    const fr = isFr;
    const defaultRows = Array.from({ length: 15 }, () => '').map(() => `
      <tr style="height:32px;">
        <td style="border:1px solid #DEE2E6;padding:4px;"></td>
        <td style="border:1px solid #DEE2E6;padding:4px;"></td>
        <td style="border:1px solid #DEE2E6;padding:4px;"></td>
        <td style="border:1px solid #DEE2E6;padding:4px;"></td>
        <td style="border:1px solid #DEE2E6;padding:4px;"></td>
      </tr>
    `).join('');

    const ppnaeRows = Array.from({ length: 10 }, () => '').map(() => `
      <tr style="height:32px;">
        <td style="border:1px solid #DEE2E6;padding:4px;"></td>
        <td style="border:1px solid #DEE2E6;padding:4px;"></td>
        <td style="border:1px solid #DEE2E6;padding:4px;"></td>
        <td style="border:1px solid #DEE2E6;padding:4px;"></td>
      </tr>
    `).join('');

    return `
      <div class="page-break">
        ${sectionHeader(fr ? 'RAPPORTS ET REGISTRES' : 'REPORTS AND REGISTERS')}

        ${subHeader('3.1', fr ? 'TABLEAU DES ÉQUIPES D\'ÉVACUATION LOCATAIRES' : 'TENANT EVACUATION TEAM TABLE')}
        <p style="font-size:9pt;color:#6C757D;font-style:italic;margin-bottom:8px;">
          ${fr ? 'À compléter par chaque locataire.' : 'To be completed by each tenant.'}
        </p>
        <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
          <thead>
            <tr style="background-color:#2C3E50;">
              <th style="padding:8px;color:#FFFFFF;font-size:9pt;border:1px solid #2C3E50;width:25%;">${fr ? 'Nom' : 'Name'}</th>
              <th style="padding:8px;color:#FFFFFF;font-size:9pt;border:1px solid #2C3E50;width:25%;">${fr ? 'Titre / Fonction' : 'Title / Function'}</th>
              <th style="padding:8px;color:#FFFFFF;font-size:9pt;border:1px solid #2C3E50;width:20%;">${fr ? 'Rôle d\'urgence' : 'Emergency role'}</th>
              <th style="padding:8px;color:#FFFFFF;font-size:9pt;border:1px solid #2C3E50;width:15%;">${fr ? 'Téléphone' : 'Phone'}</th>
              <th style="padding:8px;color:#FFFFFF;font-size:9pt;border:1px solid #2C3E50;width:15%;">${fr ? 'Local / Étage' : 'Office / Floor'}</th>
            </tr>
          </thead>
          <tbody>${defaultRows}</tbody>
        </table>

        ${subHeader('3.2', fr ? 'REGISTRE DES PERSONNES NÉCESSITANT L\'AIDE À L\'ÉVACUATION (PPNAE)' : 'REGISTER OF PERSONS REQUIRING EVACUATION ASSISTANCE')}
        <p style="font-size:9pt;color:#6C757D;font-style:italic;margin-bottom:8px;">
          ${fr
            ? 'Personnes à mobilité réduite ou nécessitant une assistance particulière lors d\'une évacuation.'
            : 'Persons with reduced mobility or requiring special assistance during evacuation.'}
        </p>
        <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
          <thead>
            <tr style="background-color:#C0392B;">
              <th style="padding:8px;color:#FFFFFF;font-size:9pt;border:1px solid #C0392B;width:25%;">${fr ? 'Nom' : 'Name'}</th>
              <th style="padding:8px;color:#FFFFFF;font-size:9pt;border:1px solid #C0392B;width:20%;">${fr ? 'Local / Étage' : 'Office / Floor'}</th>
              <th style="padding:8px;color:#FFFFFF;font-size:9pt;border:1px solid #C0392B;width:30%;">${fr ? 'Nature de l\'assistance requise' : 'Type of assistance required'}</th>
              <th style="padding:8px;color:#FFFFFF;font-size:9pt;border:1px solid #C0392B;width:25%;">${fr ? 'Personne responsable' : 'Responsible person'}</th>
            </tr>
          </thead>
          <tbody>${ppnaeRows}</tbody>
        </table>
      </div>
    `;
  }

  private guideStyles(): string {
    return `
      .section-header { margin-bottom: 16px; }
    `;
  }
}