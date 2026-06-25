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

interface ProcedureTemplate {
  id: string;
  code: string;
  titleFR: string;
  titleEN: string;
  headerColor?: string;
  directivesGenerales?: ProcedureStep[];
  roleSections: RoleSection[];
}

// ============================================================
// BANDEAU DE COULEUR — 10px pleine largeur, collé en haut de page
// ============================================================

function renderColorBar(color?: string): string {
  // Désactivé temporairement — à revisiter avec une approche plus stable
  return '';
}

// ============================================================
// RENDU D'UNE ÉTAPE (avec sous-étapes récursives)
// ============================================================

function renderStep(step: ProcedureStep, lang: 'fr' | 'en', buildingAddress: string): string {
  const text = lang === 'fr' ? step.textFR : step.textEN;
  const formattedText = formatStepText(text, buildingAddress);

  const classes = ['step'];
  if (step.isRed) classes.push('step-red');

  let html = `<div class="${classes.join(' ')}">${formattedText}</div>`;

  if (step.subSteps && step.subSteps.length > 0) {
    html += `<ul class="substeps">`;
    for (const sub of step.subSteps) {
      const subText = lang === 'fr' ? sub.textFR : sub.textEN;
      html += `<li>${formatStepText(subText, buildingAddress)}</li>`;
    }
    html += `</ul>`;
  }

  return html;
}

// Convertit **gras** en <strong>, puis remplace les placeholders
function formatStepText(text: string, buildingAddress: string): string {
  if (!text) return '';
  const replaced = replacePlaceholders(text, buildingAddress);
  const escaped = escapeHtml(replaced);
  return escaped.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
}

// ============================================================
// RENDU DU CONTENU D'UN RÔLE (sans le wrapper de page)
// ============================================================

function renderRoleContent(role: RoleSection, lang: 'fr' | 'en', procTitle: string, buildingAddress: string): string {
  const roleLabel = lang === 'fr' ? role.roleLabelFR : role.roleLabelEN;
  const stepsHtml = role.steps.map(s => renderStep(s, lang, buildingAddress)).join('');

  return `
    <p style="font-size:9pt;color:#ADB5BD;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">
      ${escapeHtml(procTitle)}
    </p>
    <div class="role-header">${escapeHtml(roleLabel)}</div>
    ${stepsHtml}
  `;
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

export function renderProcedure(proc: ProcedureTemplate, lang: 'fr' | 'en', buildingAddress: string): string {
  const title = lang === 'fr' ? proc.titleFR : proc.titleEN;
  const colorBar = renderColorBar(proc.headerColor);

  // Cas spécial — P001 Directives générales
  if (proc.directivesGenerales && proc.directivesGenerales.length > 0) {
    const items = proc.directivesGenerales.map(d => {
      const text = lang === 'fr' ? d.textFR : d.textEN;
      const style = d.isBold ? 'font-weight:700;' : '';
      return `
        <li style="${style}">
          <span class="checkbox-icon">☑</span>
          <span>${formatStepText(text, buildingAddress)}</span>
        </li>
      `;
    }).join('');

    return `
      <div class="procedure-page">
        ${colorBar}
        <div class="procedure-header">
          <span class="proc-code">${proc.code}</span>
          <h2>${escapeHtml(title)}</h2>
        </div>
        <ul class="checklist">${items}</ul>
        ${renderStopReflechirAgir(lang)}
      </div>
    `;
  }

  // Procédure normale — header + 1er rôle sur la même page,
  // puis 1 page par rôle suivant
  const [firstRole, ...remainingRoles] = proc.roleSections;

  const firstPageHtml = `
    <div class="procedure-page">
      ${colorBar}
      <div class="procedure-header">
        <span class="proc-code">${proc.code}</span>
        <h2>${escapeHtml(title)}</h2>
      </div>
      ${firstRole ? renderRoleContent(firstRole, lang, title, buildingAddress) : ''}
    </div>
  `;

  const remainingRolesHtml = remainingRoles.map(role => `
    <div class="role-page">
      ${colorBar}
      ${renderRoleContent(role, lang, title, buildingAddress)}
    </div>
  `).join('');

  return firstPageHtml + remainingRolesHtml;
}

// ============================================================
// EXPORT PRINCIPAL — Rendu de toutes les procédures du Module 4
// ============================================================

export function renderModule4(procedures: ProcedureTemplate[], lang: 'fr' | 'en', buildingAddress: string): string {
  return procedures.map(proc => renderProcedure(proc, lang, buildingAddress)).join('');
}

// ============================================================
// REMPLACE LES PLACEHOLDERS PAR LES VRAIES DONNÉES DU BÂTIMENT
// ============================================================

function replacePlaceholders(text: string, buildingAddress: string): string {
  if (!text) return text;
  return text
    .replace(/\[ADRESSE COMPLÈTE DU SITE\]/gi, buildingAddress)
    .replace(/\[lieu\]/gi, buildingAddress);
}