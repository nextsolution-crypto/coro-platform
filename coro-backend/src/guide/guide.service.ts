import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import puppeteer from 'puppeteer';
import { PDFDocument } from 'pdf-lib';
import { generateCoverPage } from '../export/templates/cover.template';
import { COVER_STYLES } from '../export/templates/cover.styles';
import { generateTocPage, TOC_STYLES } from '../export/templates/toc.template';
import { BASE_STYLES } from '../export/templates/base.styles';
import { renderModule3 } from '../export/templates/modules/module3.template';

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

    try {
      // ── COUVERTURE ──
      const coverHtml = generateCoverPage({
        documentType: project.documentType,
        documentTypeLabel: isFr ? 'GUIDE DU LOCATAIRE' : 'TENANT GUIDE',
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
      });

      const coverPage = await browser.newPage();
      await coverPage.setContent(`<!DOCTYPE html><html><head><meta charset="UTF-8"/><style>${COVER_STYLES}@page{size:letter portrait;margin:0;}</style></head><body>${coverHtml}</body></html>`, { waitUntil: 'load' });
      const coverBytes = await coverPage.pdf({ format: 'Letter', printBackground: true, displayHeaderFooter: false, margin: { top: '0', bottom: '0', left: '0', right: '0' } });
      await coverPage.close();

      // ── SECTIONS ──
      const sections = this.buildSections(config, content, module3, savedModule3, isFr, isDoubleSignal, isBOMA, buildingAddress, project);
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
      const buildTocEntries = (tocPageCount: number) => {
        let running = 1 + tocPageCount;
        return sectionBuffers.map((s, idx) => {
          const start = running + 1;
          running += pageCounts[idx + 1];
          return { sequentialNumber: s.seqNum, moduleTitle: s.title, pageNumber: start, subsections: [] };
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

  private buildSections(config: any, content: any, module3: any, savedModule3: any, isFr: boolean, isDoubleSignal: boolean, isBOMA: boolean, buildingAddress: string, project: any) {
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
    const intro = this.buildSection1(config, content, module3, savedModule3, isFr, isDoubleSignal, buildingAddress, project, sectionHeader, subHeader);
    sections.push({ seqNum: 1, title: isFr ? 'Introduction' : 'Introduction', html: intro });

    // ── SECTION 2 : PROCÉDURES ──
    const procedures = this.buildSection2(config, isFr, isDoubleSignal, isBOMA, sectionHeader, subHeader, buildingAddress);
    sections.push({ seqNum: 2, title: isFr ? 'Procédures équipe d\'urgence' : 'Emergency Team Procedures', html: procedures });

    // ── SECTION 3 : RAPPORTS ET REGISTRES ──
    const registres = this.buildSection3(isFr, sectionHeader, subHeader);
    sections.push({ seqNum: 3, title: isFr ? 'Rapports et registres' : 'Reports and Registers', html: registres });

    return sections;
  }

  private buildSection1(config: any, content: any, module3: any, savedModule3: any, isFr: boolean, isDoubleSignal: boolean, buildingAddress: string, project: any, sectionHeader: Function, subHeader: Function): string {
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

        ${subHeader('1.2', isFr ? 'RESPONSABILITÉ DU LOCATAIRE' : 'TENANT RESPONSIBILITIES')}
        <p style="font-size:10pt;color:#495057;margin-bottom:8px;">
          ${isFr ? 'En tant que locataire, vous avez les responsabilités suivantes :' : 'As a tenant, you have the following responsibilities:'}
        </p>
        <ul style="font-size:10pt;color:#495057;padding-left:20px;margin-bottom:12px;">
          ${isFr ? `
            <li style="margin-bottom:6px;">Connaître les procédures d'évacuation de l'immeuble</li>
            <li style="margin-bottom:6px;">Connaître les sorties de secours les plus proches de votre local</li>
            <li style="margin-bottom:6px;">Connaître l'emplacement du point de rassemblement</li>
            <li style="margin-bottom:6px;">Informer vos employés des procédures d'urgence</li>
            <li style="margin-bottom:6px;">Désigner un responsable d'évacuation pour votre étage ou local</li>
            <li style="margin-bottom:6px;">Signaler toute situation dangereuse à la direction de l'immeuble</li>
            <li style="margin-bottom:6px;">Ne jamais bloquer les sorties de secours ou les couloirs</li>
          ` : `
            <li style="margin-bottom:6px;">Know the building evacuation procedures</li>
            <li style="margin-bottom:6px;">Know the nearest emergency exits from your premises</li>
            <li style="margin-bottom:6px;">Know the location of the assembly point</li>
            <li style="margin-bottom:6px;">Inform your employees of emergency procedures</li>
            <li style="margin-bottom:6px;">Designate an evacuation officer for your floor or premises</li>
            <li style="margin-bottom:6px;">Report any dangerous situation to building management</li>
            <li style="margin-bottom:6px;">Never block emergency exits or corridors</li>
          `}
        </ul>

        ${subHeader('1.3', isFr ? 'RAPPEL DES BONNES PRATIQUES EN CAS D\'ALARME INCENDIE' : 'BEST PRACTICES REMINDER FOR FIRE ALARMS')}
        ${isDoubleSignal ? `
          <div style="background-color:#FEF9E7;border:1px solid #FAD7A0;border-radius:4px;padding:12px;margin-bottom:12px;">
            <p style="font-size:10pt;font-weight:700;color:#F39C12;margin-bottom:6px;">⚠ ${isFr ? 'SIGNAL PRÉPARATOIRE' : 'PREPARATORY SIGNAL'}</p>
            <p style="font-size:10pt;color:#495057;">
              ${isFr
                ? 'Lors du signal préparatoire (bip intermittent), l\'équipe de première intervention se met en alerte. Les occupants restent en place et se préparent à évacuer si nécessaire.'
                : 'When the preparatory signal sounds (intermittent beep), the first response team goes on alert. Occupants remain in place and prepare to evacuate if necessary.'}
            </p>
          </div>
        ` : ''}
        <div style="background-color:#FDEDEC;border:1px solid #F1948A;border-radius:4px;padding:12px;margin-bottom:12px;">
          <p style="font-size:10pt;font-weight:700;color:#C0392B;margin-bottom:6px;">🚨 ${isFr ? 'SIGNAL D\'ÉVACUATION' : 'EVACUATION SIGNAL'}</p>
          <p style="font-size:10pt;color:#495057;">
            ${isFr
              ? 'Lors du signal d\'évacuation (son continu), tous les occupants doivent évacuer immédiatement le bâtiment en empruntant les sorties de secours et se rendre au point de rassemblement.'
              : 'When the evacuation signal sounds (continuous sound), all occupants must immediately evacuate the building using emergency exits and proceed to the assembly point.'}
          </p>
        </div>
        <ul style="font-size:10pt;color:#495057;padding-left:20px;">
          ${isFr ? `
            <li style="margin-bottom:6px;">Ne jamais utiliser les ascenseurs lors d'une évacuation</li>
            <li style="margin-bottom:6px;">Fermer les portes derrière vous sans les verrouiller</li>
            <li style="margin-bottom:6px;">Ne pas retourner dans le bâtiment avant l'autorisation des autorités</li>
            <li style="margin-bottom:6px;">Aider les personnes à mobilité réduite si possible</li>
          ` : `
            <li style="margin-bottom:6px;">Never use elevators during evacuation</li>
            <li style="margin-bottom:6px;">Close doors behind you without locking them</li>
            <li style="margin-bottom:6px;">Do not return to the building until authorized by authorities</li>
            <li style="margin-bottom:6px;">Assist persons with reduced mobility if possible</li>
          `}
        </ul>

        ${subHeader('1.4', isFr ? 'PLAN D\'IMPLANTATION AVEC EMPLACEMENT DU POINT DE RASSEMBLEMENT' : 'SITE PLAN WITH ASSEMBLY POINT LOCATION')}
        <p style="font-size:10pt;color:#ADB5BD;font-style:italic;">
          ${isFr ? 'Voir plan d\'implantation joint au document.' : 'See site plan attached to this document.'}
        </p>

        ${subHeader('1.5', isFr ? 'RÔLES DES MEMBRES DE L\'ÉQUIPE D\'URGENCE' : 'EMERGENCY TEAM MEMBER ROLES')}
        <p style="font-size:10pt;color:#495057;margin-bottom:8px;">
          ${isFr
            ? 'L\'équipe d\'urgence de l\'immeuble est composée des membres suivants :'
            : 'The building\'s emergency team is composed of the following members:'}
        </p>
        <table style="width:100%;border-collapse:collapse;margin-bottom:16px;">
          <thead>
            <tr style="background-color:#2C3E50;">
              <th style="padding:8px;color:#FFFFFF;font-size:10pt;text-align:left;">${isFr ? 'Rôle' : 'Role'}</th>
              <th style="padding:8px;color:#FFFFFF;font-size:10pt;text-align:left;">${isFr ? 'Responsabilités principales' : 'Main responsibilities'}</th>
            </tr>
          </thead>
          <tbody>
            <tr style="background-color:#F8F9FA;">
              <td style="padding:8px;border:1px solid #DEE2E6;font-weight:600;color:#C0392B;">${isFr ? 'Coordonnateur d\'urgence' : 'Emergency coordinator'}</td>
              <td style="padding:8px;border:1px solid #DEE2E6;font-size:9pt;color:#495057;">${isFr ? 'Coordonne toutes les opérations d\'urgence et prend les décisions finales' : 'Coordinates all emergency operations and makes final decisions'}</td>
            </tr>
            <tr>
              <td style="padding:8px;border:1px solid #DEE2E6;font-weight:600;color:#C0392B;">${isFr ? 'Agent de sécurité' : 'Security officer'}</td>
              <td style="padding:8px;border:1px solid #DEE2E6;font-size:9pt;color:#495057;">${isFr ? 'Assure la sécurité des occupants et contrôle les accès' : 'Ensures occupant safety and controls access'}</td>
            </tr>
            <tr style="background-color:#F8F9FA;">
              <td style="padding:8px;border:1px solid #DEE2E6;font-weight:600;color:#C0392B;">${isFr ? 'Responsable d\'étage' : 'Floor warden'}</td>
              <td style="padding:8px;border:1px solid #DEE2E6;font-size:9pt;color:#495057;">${isFr ? 'Supervise l\'évacuation de son étage et s\'assure que tous les occupants évacuent' : 'Supervises floor evacuation and ensures all occupants evacuate'}</td>
            </tr>
          </tbody>
        </table>

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