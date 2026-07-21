// ============================================================
// CORO — Générateur HTML Module 4 : Procédures
// Règle : chaque procédure démarre une nouvelle page,
//         le 1er rôle partage la page titre, les suivants
//         démarrent chacun leur propre page.
//         Bandeau de couleur (headerColor) en haut de chaque
//         page appartenant à la procédure.
// ============================================================

import { escapeHtml } from '../cover.template';

interface ProcedureStep {
  id: string;
  textFR: string;
  textEN: string;
  isBold?: boolean;
  isRed?: boolean;
  isList?: boolean;
  subSteps?: ProcedureStep[];
}

interface RoleSection {
  roleCode: string;
  roleLabelFR: string;
  roleLabelEN: string;
  steps: ProcedureStep[];
}

interface ReferenceImage {
  id: string;
  captionFR: string;
  captionEN: string;
  base64FR: string;  // data:image/png;base64,... ou data:image/jpeg;base64,...
  base64EN: string;
  mimeType?: string; // 'image/png' ou 'image/jpeg', optionnel (utilisé pour validation)
}

interface ProcedureTemplate {
  id: string;
  code: string;
  titleFR: string;
  titleEN: string;
  headerColor?: string;
  phase?: string;
  directivesGenerales?: ProcedureStep[];
  roleSections: RoleSection[];
  referenceImages?: ReferenceImage[];
}

// ============================================================
// BANDEAU DE COULEUR — 10px pleine largeur, collé en haut de page
// ============================================================

// renderColorBar retirée — la bande colorée est maintenant dessinée
// directement avec pdf-lib après fusion, voir drawProcedureColorBars
// dans export.service.ts (cohérent avec filigranes et numéros de page)

// ============================================================
// RENDU D'UNE ÉTAPE (avec sous-étapes récursives)
// ============================================================

function renderStep(step: ProcedureStep, lang: 'fr' | 'en', buildingAddress: string, config: any = {}): string {
  const text = lang === 'fr' ? step.textFR : step.textEN;
  const formattedText = formatStepText(text, buildingAddress, config);

  const classes = ['step'];
  if (step.isRed) classes.push('step-red');

  let html = `<div class="${classes.join(' ')}">${formattedText}</div>`;

  if (step.subSteps && step.subSteps.length > 0) {
    html += `<ul class="substeps">`;
    for (const sub of step.subSteps) {
      const subText = lang === 'fr' ? sub.textFR : sub.textEN;
      html += `<li>${formatStepText(subText, buildingAddress, config)}</li>`;
    }
    html += `</ul>`;
  }

  return html;
}

// Convertit **gras** en <strong>, puis remplace les placeholders
function formatStepText(text: string, buildingAddress: string, config: any = {}): string {
  if (!text) return '';
  const replaced = replacePlaceholders(text, buildingAddress, config);
  const escaped = escapeHtml(replaced);
  return escaped.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
}

// ============================================================
// RENDU DU CONTENU D'UN RÔLE (sans le wrapper de page)
// ============================================================

function renderRoleContent(
  role: RoleSection,
  lang: 'fr' | 'en',
  procTitle: string,
  buildingAddress: string,
  phase?: string,
  procCode?: string,
  config: any = {},
): string {
  const roleLabel = lang === 'fr' ? role.roleLabelFR : role.roleLabelEN;
  const stepsHtml = role.steps.map(s => renderStep(s, lang, buildingAddress, config)).join('');

  // Pastille Alerte (orange) / Alarme (rouge) — uniquement pour P003/P004
  let phaseDot = '';
  if (procCode === 'P003' && phase === 'alerte') {
    phaseDot = `<span style="display:inline-block;width:9px;height:9px;border-radius:50%;background-color:#FF6600;margin-right:6px;vertical-align:middle;"></span>`;
  } else if (procCode === 'P004') {
    phaseDot = `<span style="display:inline-block;width:9px;height:9px;border-radius:50%;background-color:#FF0000;margin-right:6px;vertical-align:middle;"></span>`;
  }

  return `
    <p style="font-size:9pt;color:#ADB5BD;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">
      ${phaseDot}${escapeHtml(procTitle)}
    </p>
    <div class="role-header">${escapeHtml(roleLabel)}</div>
    ${stepsHtml}
  `;
}

// ============================================================
// RENDU DES IMAGES DE RÉFÉRENCE (à la fin de la procédure)
// ============================================================

function renderReferenceImages(images: ReferenceImage[] | undefined, lang: 'fr' | 'en'): string {
  if (!images || images.length === 0) {
    return '';
  }

  let html = `<div class="reference-images-section" style="margin-top:24px;padding-top:16px;border-top:1px solid #DEE2E6;">`;

  for (const img of images) {
    const base64 = lang === 'fr' ? img.base64FR : img.base64EN;
    const caption = lang === 'fr' ? img.captionFR : img.captionEN;

    html += `
      <div class="reference-image-item" style="text-align:center;margin-bottom:16px;">
        <img 
          src="${escapeHtml(base64)}" 
          alt="${escapeHtml(caption)}"
          style="max-width:100%;max-height:800px;height:auto;display:block;margin:0 auto 8px;"
        />
        <p style="font-size:8pt;color:#6C757D;margin:0;font-style:italic;">
          ${escapeHtml(caption)}
        </p>
      </div>
    `;
  }

  html += `</div>`;
  return html;
}

// ============================================================
// SCHÉMA PÉDAGOGIQUE — Méthode STOP / RÉFLÉCHIR / AGIR
// Affiché uniquement sur P001 (Directives générales)
// ============================================================

function renderStopReflechirAgir(lang: 'fr' | 'en'): string {
  const isFr = lang === 'fr';

  const t = isFr ? {
    heading: 'MÉTHODE',
    stop: 'ARRÊTER', reflect: 'RÉFLÉCHIR', act: 'AGIR',
    before: 'Avant de réagir...',
    stopDesc: 'Arrêtez-vous. Prenez une pause, respirez et réfléchissez à ce que vous allez faire. Évitez d\'agir impulsivement.',
    reflectDesc: 'Quelle est la situation ? Quelles actions pourriez-vous entreprendre pour résoudre le problème ? Quelle est la meilleure solution ?',
    actDesc: 'Faites ce qui est le mieux pour vous et les autres. Agissez de manière réfléchie et responsable, et ajustez si nécessaire.',
  } : {
    heading: 'METHOD',
    stop: 'STOP', reflect: 'THINK', act: 'ACT',
    before: 'Before reacting...',
    stopDesc: 'Stop. Take a pause, breathe, and think about what you are going to do. Avoid acting impulsively.',
    reflectDesc: 'What is the situation? What actions could you take to resolve the problem? What is the best solution?',
    actDesc: 'Do what is best for you and others. Act thoughtfully and responsibly, and adjust if necessary.',
  };

  return `
    <div class="stop-think-act">
      <p class="sta-heading">
        ${t.heading} <span class="sta-red">${t.stop}</span>, <span class="sta-yellow">${t.reflect}</span>, <span class="sta-green">${t.act}</span>
      </p>

      <div class="sta-lights">
        <span class="sta-light sta-light-red"></span>
        <span class="sta-light sta-light-yellow"></span>
        <span class="sta-light sta-light-green"></span>
      </div>

      <p class="sta-before">${t.before}</p>

      <div class="sta-row">
        <div class="sta-step">
          <div class="sta-bubble sta-bubble-red">${t.stop}</div>
          <p class="sta-desc">${t.stopDesc}</p>
        </div>
        <div class="sta-step">
          <div class="sta-bubble sta-bubble-yellow">${t.reflect}</div>
          <p class="sta-desc">${t.reflectDesc}</p>
        </div>
        <div class="sta-step">
          <div class="sta-bubble sta-bubble-green">${t.act}</div>
          <p class="sta-desc">${t.actDesc}</p>
        </div>
      </div>
    </div>
  `;
}

// ============================================================
// RENDU D'UNE PROCÉDURE COMPLÈTE
// (P001 directives générales = cas spécial sans rôles)
// ============================================================

export function renderProcedure(proc: ProcedureTemplate, lang: 'fr' | 'en', buildingAddress: string, config: any = {}): string {
  const title = lang === 'fr' ? proc.titleFR : proc.titleEN;

  // Cas spécial — P001 Directives générales
  if (proc.directivesGenerales && proc.directivesGenerales.length > 0) {
    const items = proc.directivesGenerales.map(d => {
      const text = lang === 'fr' ? d.textFR : d.textEN;
      const style = d.isBold ? 'font-weight:700;' : '';
      return `
        <li style="${style}">
          <span class="checkbox-icon">☑</span>
          <span>${formatStepText(text, buildingAddress, config)}</span>
        </li>
      `;
    }).join('');

    return `
      <div class="procedure-page">
        <div class="procedure-header">
          <span class="proc-code">${proc.code}</span>
        </div>
        <ul class="checklist">${items}</ul>
        ${renderStopReflechirAgir(lang)}
        ${renderReferenceImages(proc.referenceImages, lang)}
      </div>
    `;
  }

  // Procédure normale — header + 1er rôle sur la même page,
  // puis 1 page par rôle suivant
  const [firstRole, ...remainingRoles] = proc.roleSections;

  const firstPageHtml = `
    <div class="procedure-page">
      <div class="procedure-header">
        <span class="proc-code">${proc.code}</span>
      </div>
      ${firstRole ? renderRoleContent(firstRole, lang, title, buildingAddress, proc.phase, proc.code, config) : ''}
    </div>
  `;

  const remainingRolesHtml = remainingRoles.map(role => `
    <div class="role-page">
      ${renderRoleContent(role, lang, title, buildingAddress, proc.phase, proc.code, config)}
    </div>
  `).join('');

  // Ajouter les images de référence APRÈS tous les rôles
  const imagesHtml = renderReferenceImages(proc.referenceImages, lang);

  return firstPageHtml + remainingRolesHtml + imagesHtml;
}

// ============================================================
// EXPORT PRINCIPAL — Rendu de toutes les procédures du Module 4
// ============================================================

export function renderModule4(procedures: ProcedureTemplate[], lang: 'fr' | 'en', buildingAddress: string, config: any = {}): string {
  return procedures.map(proc => renderProcedure(proc, lang, buildingAddress, config)).join('');
}

// ============================================================
// REMPLACE LES PLACEHOLDERS PAR LES VRAIES DONNÉES DU BÂTIMENT
// ============================================================

function replacePlaceholders(text: string, buildingAddress: string, config: any = {}): string {
  if (!text) return text;

  // Recherche la localisation du DEA dans la liste équipements de premiers soins
  const deaEntry = (config.equipementsSoins || []).find((e: any) => e.type === 'Defibrillateur (DEA)');
  const deaLieu = deaEntry?.lieu || '[emplacement à préciser]';
  const gazLieu = config.gazNaturelLieu || '[emplacement à préciser]';

  return text
    .replace(/\[ADRESSE COMPLÈTE DU SITE\]/gi, buildingAddress)
    .replace(/\[COMPLETE SITE ADDRESS\]/gi, buildingAddress)
    .replace(/\[lieu\]/gi, buildingAddress)
    .replace(/\[LOCALISATION VALVE GAZ\]/gi, gazLieu)
    .replace(/\[GAS VALVE LOCATION\]/gi, gazLieu)
    .replace(/\[LOCALISATION DEA\]/gi, deaLieu)
    .replace(/\[DEA LOCATION\]/gi, deaLieu);
}