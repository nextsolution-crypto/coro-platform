// ============================================================
// CORO — Générateurs HTML pour modules simples (M1, M2, M7, M8)
// ============================================================

import { escapeHtml } from '../cover.template';

// ============================================================
// MODULE 1 — Texte simple
// ============================================================

export function renderModule1(sections: any[]): string {
  return sections.map((section, idx) => `
    <div class="${idx > 0 ? 'page-break' : ''}">
      <div class="section-header">
        <span class="section-id">${section.id}</span>
        <span class="section-title-line2">${escapeHtml(section.title)}</span>
        <div class="section-bar"></div>
      </div>
      ${renderFormattedText(section.content || '')}
    </div>
  `).join('');
}

// ============================================================
// MODULE 2 — Tableaux téléphoniques
// ============================================================

export function renderModule2(sections: any[], lang: 'fr' | 'en'): string {
  return sections.map((section, idx) => {
    // Cas spécial — 2.1 Numéros d'urgence : 2 colonnes, sans en-tête, 9-1-1 fusionné
    if (section.id === '2.1') {
      const entries21 = section.entries || [];
      const rows21 = entries21.map((entry: any, i: number) => `
        <tr>
          <td style="width:60%;">${escapeHtml(entry.role || '')}</td>
          ${i === 0 ? `
            <td rowspan="${entries21.length}" style="text-align:center;font-size:22pt;font-weight:800;color:#C0392B;vertical-align:middle;">
              ${escapeHtml(entries21[0]?.phone || '9-1-1')}
            </td>
          ` : ''}
        </tr>
      `).join('');

      const internalEmergencyHtml = section.internalEmergencyNumber ? `
        <div style="margin-top:20px;display:flex;align-items:center;gap:10px;">
          <span style="font-weight:600;color:#2C3E50;">${lang === 'fr' ? 'Numéro d\'urgence interne' : 'Internal emergency number'} :</span>
          <span style="font-size:14pt;font-weight:800;color:#C0392B;">${escapeHtml(section.internalEmergencyNumber)}</span>
        </div>
      ` : '';

      return `
        <div class="${idx > 0 ? 'page-break' : ''}">
          <div class="section-header">
            <span class="section-id">${section.id}</span>
            <span class="section-title-line2">${escapeHtml(section.title)}</span>
            <div class="section-bar"></div>
          </div>
          <table>
            <tbody>${rows21}</tbody>
          </table>
          ${internalEmergencyHtml}
        </div>
      `;
    }

    const isExternal = section.type === 'external_table';
    const headerLabels = section.columns
      ? section.columns
      : isExternal
        ? (lang === 'fr' ? ['Rôle / Équipement', 'Téléphone'] : ['Role / Equipment', 'Phone'])
        : (lang === 'fr' ? ['Rôle / Équipement', 'Nom', 'Téléphone'] : ['Role / Equipment', 'Name', 'Phone']);

    const rows = (section.entries || []).map((entry: any) => {
      if (isExternal) {
        return `<tr>
          <td>${escapeHtml(entry.role || '')}</td>
          <td>${escapeHtml(entry.phone || '')}</td>
        </tr>`;
      }
      return `<tr>
        <td>${escapeHtml(entry.role || '')}</td>
        <td>${escapeHtml(entry.name || '')}</td>
        <td>${escapeHtml(entry.phone || '')}</td>
      </tr>`;
    }).join('');

    return `
      <div class="${idx > 0 ? 'page-break' : ''}">
        <div class="section-header">
          <span class="section-id">${section.id}</span>
          <span class="section-title-line2">${escapeHtml(section.title)}</span>
          <div class="section-bar"></div>
        </div>
        <table>
          <thead><tr>${headerLabels.map(l => `<th>${l}</th>`).join('')}</tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    `;
  }).join('');
}

// ============================================================
// MODULE 7 — Description du site (texte + tableau quarts simplifié)
// ============================================================

// ============================================================
// MODULE 8 — Registres et annexes (9 sous-sections)
// ============================================================

export function renderModule8(module8Data: any, lang: 'fr' | 'en'): string {
  if (!module8Data) return '';
  const isFr = lang === 'fr';

  const titles: Record<string, string> = isFr ? {
    '8.1': 'REGISTRE DE FORMATION',
    '8.2': 'EXEMPLES DE MESSAGES PHONIQUES',
    '8.3': 'RAPPORT D\'ÉVACUATION',
    '8.4': 'INSPECTIONS ET SURVEILLANCES DES RISQUES',
    '8.5': 'REGISTRE D\'ÉVACUATION PAR SECTEURS',
    '8.6': 'RAPPORT D\'INSPECTION DES ÉQUIPEMENTS DE PROTECTION INCENDIE',
    '8.7': 'CADENASSAGE ET ESPACE CLOS',
    '8.8': 'PERMIS DE TRAVAIL À CHAUD ET DEMANDE D\'ÉVITEMENT',
    '8.9': 'COPIE À L\'ENTREPRENEUR',
  } : {
    '8.1': 'TRAINING REGISTER',
    '8.2': 'EXAMPLES OF PHONETIC MESSAGES',
    '8.3': 'EVACUATION REPORT',
    '8.4': 'RISK INSPECTIONS AND MONITORING',
    '8.5': 'EVACUATION REGISTER BY SECTOR',
    '8.6': 'FIRE PROTECTION EQUIPMENT INSPECTION REPORT',
    '8.7': 'LOCKOUT/TAGOUT AND CONFINED SPACES',
    '8.8': 'HOT WORK PERMIT AND COMPONENT BYPASS REQUEST',
    '8.9': 'COPY TO CONTRACTOR',
  };

  const sectionHeader = (id: string) => `
    <div class="section-header">
      <span class="section-id">${id}</span>
      <span class="section-title-line2">${titles[id]}</span>
      <div class="section-bar"></div>
    </div>
  `;

  // 8.1 — Registre de formation
  const s81Rows = (module8Data.section8_1 || []).map((e: any) => `
    <tr>
      <td>${escapeHtml(e.nom || '')}</td>
      <td>${escapeHtml(e.titre || '')}</td>
      <td>${escapeHtml(e.date || '')}</td>
      <td>${escapeHtml(e.formateur || '')}</td>
    </tr>
  `).join('');
  const s81 = `
    <div>
      ${sectionHeader('8.1')}
      <table>
        <thead><tr><th>${isFr ? 'Nom' : 'Name'}</th><th>${isFr ? 'Titre / Fonction' : 'Title / Function'}</th><th>Date</th><th>${isFr ? 'Formateur' : 'Trainer'}</th></tr></thead>
        <tbody>${s81Rows || `<tr><td colspan="4" style="text-align:center;color:#ADB5BD;">—</td></tr>`}</tbody>
      </table>
    </div>
  `;

  // 8.2 — Messages phoniques
  const s82Rows = (module8Data.section8_2 || []).map((m: any) => `
    <tr>
      <td style="font-weight:700;color:#C0392B;">${escapeHtml(m.evenement || '')}</td>
      <td style="font-size:9pt;">${escapeHtml(m.messageFR || '').replace(/\n/g, '<br/>')}</td>
      <td style="font-size:9pt;">${escapeHtml(m.messageEN || '').replace(/\n/g, '<br/>')}</td>
    </tr>
  `).join('');
  const s82 = `
    <div class="page-break">
      ${sectionHeader('8.2')}
      <table>
        <thead><tr><th>${isFr ? 'Événement' : 'Event'}</th><th>${isFr ? 'Message français' : 'French message'}</th><th>${isFr ? 'Message anglais' : 'English message'}</th></tr></thead>
        <tbody>${s82Rows}</tbody>
      </table>
    </div>
  `;

  // 8.3 — Rapport d'évacuation
  const r = module8Data.section8_3 || {};
  const s83 = `
    <div class="page-break">
      ${sectionHeader('8.3')}
      <table>
        <tbody>
          <tr><td style="width:30%;font-weight:600;">${isFr ? 'Adresse' : 'Address'}</td><td>${escapeHtml(r.adresse || '')}</td></tr>
          <tr><td style="font-weight:600;">${isFr ? 'Téléphone contact' : 'Contact phone'}</td><td>${escapeHtml(r.telephoneContact || '')}</td></tr>
          <tr><td style="font-weight:600;">${isFr ? 'Date / Heure' : 'Date / Time'}</td><td>${escapeHtml(r.dateEvenement || '')} ${escapeHtml(r.heure || '')}</td></tr>
          <tr><td style="font-weight:600;">${isFr ? 'Coordonnateur d\'urgence' : 'Emergency coordinator'}</td><td>${escapeHtml(r.coordonnateurUrgence || '')}</td></tr>
          <tr><td style="font-weight:600;">${isFr ? 'Type d\'événement' : 'Event type'}</td><td>${escapeHtml(r.typeEvenement || '')}</td></tr>
          <tr><td style="font-weight:600;">${isFr ? 'Cause' : 'Cause'}</td><td>${escapeHtml(r.cause || '')}</td></tr>
          <tr><td style="font-weight:600;">${isFr ? 'Déroulement' : 'Course of events'}</td><td>${escapeHtml(r.deroulement || '')}</td></tr>
          <tr><td style="font-weight:600;">${isFr ? 'Recommandation' : 'Recommendation'}</td><td>${escapeHtml(r.recommandation || '')}</td></tr>
          <tr><td style="font-weight:600;">${isFr ? 'Temps d\'évacuation' : 'Evacuation time'}</td><td>${escapeHtml(r.tempsEvacuationComplete || '')}</td></tr>
        </tbody>
      </table>
    </div>
  `;

  // 8.4 — Inspections et surveillances
  const s84Rows = (module8Data.section8_4 || []).map((row: any) => `
    <tr>
      <td style="font-weight:600;">${escapeHtml(row.equipement || '')}</td>
      <td>${escapeHtml(row.codeNorme || '')}</td>
      <td style="font-family:monospace;font-size:9pt;">${escapeHtml(row.article || '')}</td>
      <td>${escapeHtml(row.observations || '')}</td>
    </tr>
  `).join('');
  const s84 = `
    <div class="page-break">
      ${sectionHeader('8.4')}
      <table>
        <thead><tr><th>${isFr ? 'Équipement' : 'Equipment'}</th><th>${isFr ? 'Code / Norme' : 'Code / Standard'}</th><th>Article</th><th>Observations</th></tr></thead>
        <tbody>${s84Rows}</tbody>
      </table>
    </div>
  `;

  // 8.5 — Registre d'évacuation par secteurs
  const s85Rows = (module8Data.section8_5 || []).map((row: any) => `
    <tr>
      <td style="text-align:center;font-weight:700;">${escapeHtml(row.etage || '')}</td>
      <td style="text-align:center;">${row.evacue ? '☑' : '☐'}</td>
      <td>${escapeHtml(row.notes || '')}</td>
    </tr>
  `).join('');
  const s85 = `
    <div class="page-break">
      ${sectionHeader('8.5')}
      <table>
        <thead><tr><th>${isFr ? 'Étage / Secteur' : 'Floor / Sector'}</th><th>${isFr ? 'Évacué?' : 'Evacuated?'}</th><th>${isFr ? 'Autres informations' : 'Other information'}</th></tr></thead>
        <tbody>${s85Rows}</tbody>
      </table>
    </div>
  `;

  // 8.6, 8.7, 8.8, 8.9 — Sections texte
  const textSection = (id: string, content: string) => `
    <div class="page-break">
      ${sectionHeader(id)}
      ${renderFormattedText(content || '')}
    </div>
  `;

  const s86 = textSection('8.6', module8Data.section8_6);
  const s87 = textSection('8.7', module8Data.section8_7);
  const s88 = textSection('8.8', module8Data.section8_8);
  const s89 = textSection('8.9', module8Data.section8_9);

  return s81 + s82 + s83 + s84 + s85 + s86 + s87 + s88 + s89;
}

// ============================================================
// UTILITAIRE — Convertit le texte markdown-like en HTML
// (même logique que formatContent du frontend)
// ============================================================

export function renderFormattedText(content: string): string {
  if (!content) return '';
  const lines = content.split('\n');
  let html = '';
  let inList = false;
  let inTable = false;
  let tableRowIdx = 0;

  const isTableRow = (line: string) => line.trim().startsWith('|') && line.trim().endsWith('|');
  const isTableSeparator = (line: string) => /^\|[\s\-:|]+\|$/.test(line.trim());

  const parseTableCells = (line: string) =>
    line.trim().slice(1, -1).split('|').map(cell => cell.trim());

  for (const line of lines) {
    if (isTableRow(line)) {
      if (isTableSeparator(line)) continue; // ligne |---|---|---| ignorée

      if (!inTable) {
        if (inList) { html += '</ul>'; inList = false; }
        html += '<table>';
        inTable = true;
        tableRowIdx = 0;
      }

      const cells = parseTableCells(line);
      const tag = tableRowIdx === 0 ? 'th' : 'td';
      if (tableRowIdx === 0) html += '<thead><tr>';
      else if (tableRowIdx === 1) html += '<tbody><tr>';
      else html += '<tr>';

      html += cells.map(cell => `<${tag}>${renderInlineBold(fixOrphanColon(escapeHtml(cell)))}</${tag}>`).join('');
      html += '</tr>';
      if (tableRowIdx === 0) html += '</thead>';

      tableRowIdx++;
      continue;
    } else if (inTable) {
      html += '</tbody></table>';
      inTable = false;
    }

    if (line.startsWith('**') && line.endsWith('**') && line.length > 4) {
      if (inList) { html += '</ul>'; inList = false; }
      html += `<h3 class="no-break-after" style="color:#2C3E50;font-weight:700;margin:16px 0 6px;font-size:12pt;">${escapeHtml(line.replace(/\*\*/g, ''))}</h3>`;
    } else if (line.startsWith('- ')) {
      if (!inList) { html += '<ul>'; inList = true; }
      html += `<li>${renderInlineBold(fixOrphanColon(escapeHtml(line.substring(2))))}</li>`;
    } else if (line.trim() === '') {
      if (inList) { html += '</ul>'; inList = false; }
    } else {
      if (inList) { html += '</ul>'; inList = false; }
      html += `<p>${renderInlineBold(fixOrphanColon(escapeHtml(line)))}</p>`;
    }
  }
  if (inList) html += '</ul>';
  if (inTable) html += '</tbody></table>';
  return html;
}

// ============================================================
// UTILITAIRE — Empêche le ":" de se retrouver seul en début de
// ligne en remplaçant l'espace qui le précède par une espace
// insécable (typographie correcte + évite la "veuve")
// ============================================================

function fixOrphanColon(text: string): string {
  return text.replace(/ (:)/g, '\u00A0$1');
}

// ============================================================
// UTILITAIRE — Convertit **texte** en <strong>texte</strong>
// n'importe où dans une ligne (gras inline, pas seulement
// quand toute la ligne est un titre)
// ============================================================

function renderInlineBold(text: string): string {
  return text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
}