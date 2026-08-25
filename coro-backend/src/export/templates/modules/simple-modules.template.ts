// ============================================================
// CORO — Générateurs HTML pour modules simples (M1, M2, M7, M8)
// ============================================================

import { escapeHtml } from '../cover.template';

// ============================================================
// MODULE 1 — Texte simple
// ============================================================

export function renderModule1(sections: any[]): string {
  return sections.map((section, idx) => renderModule1Section(section, idx > 0)).join('');
}

// Rend une seule section de Module 1 — permet à export.service.ts de générer
// chaque section dans son propre appel Puppeteer, pour connaître sa vraie page
export function renderModule1Section(section: any, withPageBreak: boolean): string {
  return `
    <div class="${withPageBreak ? 'page-break' : ''}">
      <div class="section-header">
        <span class="section-id">${section.id}</span>
        <span class="section-title-line2">${escapeHtml(section.title)}</span>
        <div class="section-bar"></div>
      </div>
      ${renderFormattedText(section.content || '')}
    </div>
  `;
}

// ============================================================
// MODULE 2 — Tableaux téléphoniques
// ============================================================

export function renderModule2(sections: any[], lang: 'fr' | 'en'): string {
  return sections.map((section, idx) => renderModule2Section(section, idx, lang)).join('');
}

// Rend une seule section de Module 2 — permet à export.service.ts de générer
// chaque section dans son propre appel Puppeteer, pour connaître sa vraie page
export function renderModule2Section(section: any, idx: number, lang: 'fr' | 'en', moduleSeqNumber: number = 2): string {
  {
    const displayNumber = `${moduleSeqNumber}.${idx + 1}`;

    // Cas spécial — 2.1 Numéros d'urgence : 2 colonnes, sans en-tête, 9-1-1 fusionné
    if (section.id === '2.1') {
      const entries21 = section.entries || [];
      
      // Séparer les entrées 9-1-1 (sans numéro individuel) des autres
      const urgenceEntries = entries21.filter((e: any) => !e.phone || e.phone === '' || e.phone === '9-1-1');
      const autresEntries = entries21.filter((e: any) => e.phone && e.phone !== '' && e.phone !== '9-1-1');

      // Lignes 9-1-1 fusionnées
      const rows911 = urgenceEntries.map((entry: any, i: number) => `
        <tr>
          <td style="width:60%;">${escapeHtml(entry.role || '')}</td>
          ${i === 0 ? `
            <td rowspan="${urgenceEntries.length}" style="text-align:center;font-size:22pt;font-weight:800;color:#C0392B;vertical-align:middle;">
              9-1-1
            </td>
          ` : ''}
        </tr>
      `).join('');

      // Lignes avec numéro individuel (hôpital, ville, etc.)
      const rowsAutres = autresEntries.map((entry: any) => `
        <tr>
          <td style="width:60%;">${escapeHtml(entry.role || '')}</td>
          <td style="text-align:center;font-weight:700;color:#2C3E50;">${escapeHtml(entry.phone || '')}</td>
        </tr>
      `).join('');

      const internalEmergencyHtml = section.internalEmergencyNumber ? `
        <div style="margin-top:20px;display:flex;align-items:center;gap:10px;">
          <span style="font-weight:600;color:#2C3E50;">${lang === 'fr' ? 'Numéro d\'urgence interne' : 'Internal emergency number'} :</span>
          <span style="font-size:14pt;font-weight:800;color:#C0392B;">${escapeHtml(section.internalEmergencyNumber)}</span>
        </div>
      ` : '';

      return `
        <div>
          <div class="section-header">
            <span class="section-id">${displayNumber}</span>
            <span class="section-title-line2">${escapeHtml(section.title)}</span>
            <div class="section-bar"></div>
          </div>
          <table>
            <tbody>
              ${rows911}
              ${autresEntries.length > 0 ? `
                <tr style="background-color:#F8F9FA;">
                  <td colspan="2" style="padding:4px 8px;font-size:8pt;color:#ADB5BD;font-style:italic;">
                    ${lang === 'fr' ? 'Autres numéros d\'urgence' : 'Other emergency numbers'}
                  </td>
                </tr>
                ${rowsAutres}
              ` : ''}
            </tbody>
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

    const forcePageBreak = section.id === '2.4'; // Ressources externes démarre toujours une nouvelle page

    // Définir les largeurs de colonnes selon le type
      const colWidths = isExternal
        ? ['70%', '30%']
        : ['35%', '40%', '25%'];

      const colGroupHtml = `<colgroup>${colWidths.map(w => `<col style="width:${w};">`).join('')}</colgroup>`;

      return `
      <div class="no-break ${forcePageBreak ? 'page-break' : ''}" style="margin-top:${(!forcePageBreak && idx > 0) ? '28px' : '0'};">
        <div class="section-header">
          <span class="section-id">${displayNumber}</span>
          <span class="section-title-line2">${escapeHtml(section.title)}</span>
          <div class="section-bar"></div>
        </div>
        <table>
          ${colGroupHtml}
          <thead><tr>${headerLabels.map(l => `<th>${l}</th>`).join('')}</tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    `;
  }
}

// ============================================================
// MODULE 7 — Description du site (texte + tableau quarts simplifié)
// ============================================================

// ============================================================
// MODULE 8 — Registres et annexes (9 sous-sections)
// ============================================================

export function renderModule8(module8Data: any, lang: 'fr' | 'en', moduleSeqNumber: number = 8): { id: string; title: string; html: string }[] {
  if (!module8Data) module8Data = {};
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
    '8.10': 'ANNEXE — INCENDIE DE BATTERIES LITHIUM-ION',
    '8.11': 'REGISTRE D\'ANALYSE DE RISQUE — PROCÉDURES CLIMATIQUES BOMA',
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
    '8.10': 'APPENDIX — LITHIUM-ION BATTERY FIRE',
    '8.11': 'RISK ANALYSIS REGISTER — BOMA CLIMATE PROCEDURES',
  };

  const sectionHeader = (id: string) => {
    const subNum = id === '8.10' ? 10 : parseInt(id.split('.')[1], 10);
    const displayId = `${moduleSeqNumber}.${subNum}`;
    return `
      <div class="section-header">
        <span class="section-id">${displayId}</span>
        <span class="section-title-line2">${titles[id]}</span>
        <div class="section-bar"></div>
      </div>
    `;
  };

  // 8.1 — Registre de formation
  const defaultRows = Array.from({ length: 18 }, () => ({ nom: '', titre: '', date: '', formateur: '' }));
  const s81Entries = (module8Data.section8_1 && module8Data.section8_1.length > 0)
    ? module8Data.section8_1
    : defaultRows;
  const s81Rows = s81Entries.map((e: any) => `
    <tr style="height:36px;">
      <td style="min-height:36px;">${escapeHtml(e.nom || '')}</td>
      <td style="min-height:36px;">${escapeHtml(e.titre || '')}</td>
      <td style="min-height:36px;width:15%;">${escapeHtml(e.date || '')}</td>
      <td style="min-height:36px;width:20%;">${escapeHtml(e.formateur || '')}</td>
    </tr>
  `).join('');
  const s81 = `
    <div>
      ${sectionHeader('8.1')}
      <p style="font-size:9pt;color:#6C757D;margin-bottom:12px;font-style:italic;">
        ${isFr ? 'À compléter manuellement lors des formations.' : 'To be completed manually during training sessions.'}
      </p>
      <table style="width:100%;">
        <thead>
          <tr>
            <th style="width:30%;">${isFr ? 'Nom' : 'Name'}</th>
            <th style="width:35%;">${isFr ? 'Titre / Fonction' : 'Title / Function'}</th>
            <th style="width:15%;">Date</th>
            <th style="width:20%;">${isFr ? 'Formateur' : 'Trainer'}</th>
          </tr>
        </thead>
        <tbody>${s81Rows}</tbody>
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
    
    <div style="background-color:#F8F9FA;border:1px solid #DEE2E6;padding:12px;margin-bottom:16px;font-weight:600;font-size:10pt;color:#2C3E50;">
      ${isFr ? 'Informations et détails' : 'Information and Details'}
    </div>

    <table style="width:100%;border-collapse:collapse;margin-bottom:16px;">
      <tbody>
        <tr>
          <td style="width:50%;padding:10px;border:1px solid #DEE2E6;font-weight:600;color:#2C3E50;">${isFr ? 'Adresse de l\'événement :' : 'Event address:'}</td>
          <td style="width:50%;padding:10px;border:1px solid #DEE2E6;color:#495057;">${escapeHtml(r.adresse || '')}</td>
        </tr>
        <tr>
          <td style="padding:10px;border:1px solid #DEE2E6;font-weight:600;color:#2C3E50;">${isFr ? 'Téléphone contact :' : 'Contact phone:'}</td>
          <td style="padding:10px;border:1px solid #DEE2E6;color:#495057;">${escapeHtml(r.telephoneContact || '')}</td>
        </tr>
        <tr>
          <td style="width:50%;padding:10px;border:1px solid #DEE2E6;font-weight:600;color:#2C3E50;">${isFr ? 'Date de l\'événement :' : 'Date of event:'}</td>
          <td style="width:50%;padding:10px;border:1px solid #DEE2E6;color:#495057;">${escapeHtml(r.dateEvenement || '')}</td>
        </tr>
        <tr>
          <td style="width:50%;padding:10px;border:1px solid #DEE2E6;font-weight:600;color:#2C3E50;">${isFr ? 'Heure :' : 'Time:'}</td>
          <td style="width:50%;padding:10px;border:1px solid #DEE2E6;color:#495057;">${escapeHtml(r.heure || '')}</td>
        </tr>
        <tr>
          <td style="padding:10px;border:1px solid #DEE2E6;font-weight:600;color:#2C3E50;">${isFr ? 'Coordonnateur d\'urgence :' : 'Emergency coordinator:'}</td>
          <td style="padding:10px;border:1px solid #DEE2E6;color:#495057;">${escapeHtml(r.coordonnateurUrgence || '')}</td>
        </tr>
      </tbody>
    </table>

    <div style="margin-bottom:16px;">
      <div style="font-weight:600;color:#2C3E50;margin-bottom:6px;font-size:10pt;">${isFr ? 'Type d\'événement' : 'Event type'}</div>
      <div style="display:flex;gap:20px;padding:8px 0;">
        <label style="display:flex;align-items:center;gap:6px;font-size:10pt;color:#495057;">
          <span style="width:14px;height:14px;border:1px solid #DEE2E6;display:inline-block;text-align:center;line-height:14px;">${r.typeEvenement === 'exercice' ? '☑' : '☐'}</span>
          ${isFr ? 'Exercice d\'évacuation' : 'Evacuation drill'}
        </label>
        <label style="display:flex;align-items:center;gap:6px;font-size:10pt;color:#495057;">
          <span style="width:14px;height:14px;border:1px solid #DEE2E6;display:inline-block;text-align:center;line-height:14px;">${r.typeEvenement === 'non-fondee' ? '☑' : '☐'}</span>
          ${isFr ? 'Évacuation non-fondée' : 'Unfounded evacuation'}
        </label>
        <label style="display:flex;align-items:center;gap:6px;font-size:10pt;color:#495057;">
          <span style="width:14px;height:14px;border:1px solid #DEE2E6;display:inline-block;text-align:center;line-height:14px;">${r.typeEvenement === 'fondee' ? '☑' : '☐'}</span>
          ${isFr ? 'Évacuation fondée' : 'Founded evacuation'}
        </label>
      </div>
    </div>

    <table style="width:100%;border-collapse:collapse;margin-bottom:16px;">
      <tbody>
        <tr>
          <td style="width:50%;padding:10px;border:1px solid #DEE2E6;font-weight:600;color:#2C3E50;">${isFr ? 'Cause' : 'Cause'}</td>
          <td style="width:50%;padding:10px;border:1px solid #DEE2E6;color:#495057;">${escapeHtml(r.cause || '')}</td>
        </tr>
        <tr>
          <td style="width:50%;padding:10px;border:1px solid #DEE2E6;font-weight:600;color:#2C3E50;">${isFr ? 'Heure de déclenchement :' : 'Trigger time:'}</td>
          <td style="width:50%;padding:10px;border:1px solid #DEE2E6;color:#495057;">${escapeHtml(r.heureDeclenchement || '')}</td>
        </tr>
      </tbody>
    </table>

    <div style="margin-bottom:8px;">
      <div style="font-weight:600;color:#2C3E50;margin-bottom:3px;font-size:10pt;">${isFr ? 'Déroulement :' : 'Course of events:'}</div>
      <div style="min-height:40px;padding:6px;border:1px solid #DEE2E6;background-color:#FFFFFF;color:#495057;font-size:8pt;">
        ${escapeHtml(r.deroulement || '').replace(/\n/g, '<br/>')}
      </div>
    </div>

    <div style="margin-bottom:8px;">
      <div style="font-weight:600;color:#2C3E50;margin-bottom:3px;font-size:10pt;">${isFr ? 'Recommandation :' : 'Recommendation:'}</div>
      <div style="min-height:40px;padding:6px;border:1px solid #DEE2E6;background-color:#FFFFFF;color:#495057;font-size:8pt;">
        ${escapeHtml(r.recommandation || '').replace(/\n/g, '<br/>')}
      </div>
    </div>

    <table style="width:100%;border-collapse:collapse;margin-bottom:12px;">
      <tbody>
        <tr>
          <td style="width:70%;padding:8px;border:1px solid #DEE2E6;font-weight:600;color:#2C3E50;">${isFr ? 'Temps pour l\'évacuation complète :' : 'Time for complete evacuation:'}</td>
          <td style="width:30%;padding:8px;border:1px solid #DEE2E6;color:#495057;">${escapeHtml(r.tempsEvacuationComplete || '')}</td>
        </tr>
      </tbody>
    </table>

    <div style="display:flex;gap:30px;margin-top:12px;">
      <div style="width:50%;">
        <div style="font-weight:600;color:#2C3E50;margin-bottom:8px;font-size:10pt;">${isFr ? 'Signature du responsable du PMU :' : 'Signature of PMU manager:'}</div>
        <div style="min-height:35px;border:1px solid #DEE2E6;"></div>
      </div>
      <div style="width:50%;">
        <div style="font-weight:600;color:#2C3E50;margin-bottom:8px;font-size:10pt;">Date :</div>
        <div style="min-height:35px;border:1px solid #DEE2E6;"></div>
      </div>
    </div>
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
  const s810 = renderLithiumAnnexe(module8Data.section8_10, isFr, sectionHeader, moduleSeqNumber);

  // 8.11 — Registre d'analyse de risque BOMA
  const priorityColor = (p: string) => {
    if (p === 'Élevée' || p === 'High') return '#C0392B';
    if (p === 'Moyenne' || p === 'Medium') return '#F39C12';
    return '#27AE60';
  };
  const priorityBg = (p: string) => {
    if (p === 'Élevée' || p === 'High') return '#FDEDEC';
    if (p === 'Moyenne' || p === 'Medium') return '#FEF9E7';
    return '#EAFAF1';
  };
  const priorityIcon = (p: string) => {
    if (p === 'Élevée' || p === 'High') return '🔴';
    if (p === 'Moyenne' || p === 'Medium') return '🟠';
    return '🟢';
  };

  const s811Data = module8Data.section8_11 || null;
  const s811Tables = s811Data?.tables || [];

  const s811Html = s811Tables.length === 0 ? `
    <div>
      ${sectionHeader('8.11')}
      <p style="color:#ADB5BD;">${isFr ? 'Aucune donnée d\'analyse de risque.' : 'No risk analysis data.'}</p>
    </div>
  ` : `
    <div>
      ${sectionHeader('8.11')}
      ${s811Tables.map((table: any, tIdx: number) => `
        <div style="${tIdx > 0 ? 'margin-top:32px;' : ''}">
          <div class="boma-table-title">
            ${table.procedure} — ${table.title}
          </div>
          <table style="width:100%;border-collapse:collapse;font-size:9pt;">
            <thead>
              <tr>
                <th style="padding:8px;text-align:left;border:1px solid #DEE2E6;width:20%;background-color:#F8F9FA;color:#2C3E50;">${isFr ? 'Catégorie' : 'Category'}</th>
                <th style="padding:8px;text-align:left;border:1px solid #DEE2E6;width:32%;background-color:#F8F9FA;color:#2C3E50;">${isFr ? 'Zones / éléments à vérifier' : 'Zones / Elements to Check'}</th>
                <th style="padding:8px;text-align:left;border:1px solid #DEE2E6;width:33%;background-color:#F8F9FA;color:#2C3E50;">${isFr ? 'Risque associé' : 'Associated Risk'}</th>
                <th style="padding:8px;text-align:center;border:1px solid #DEE2E6;width:15%;background-color:#F8F9FA;color:#2C3E50;">${isFr ? 'Priorité' : 'Priority'}</th>
              </tr>
            </thead>
            <tbody>
              ${(table.rows || []).map((row: any, rIdx: number) => `
                <tr style="background-color:${rIdx % 2 === 0 ? '#FFFFFF' : '#F8F9FA'};">
                  <td style="padding:7px 8px;border:1px solid #DEE2E6;font-weight:600;color:#2C3E50;">${escapeHtml(row.categorie || '')}</td>
                  <td style="padding:7px 8px;border:1px solid #DEE2E6;color:#495057;">${escapeHtml(row.zones || '')}</td>
                  <td style="padding:7px 8px;border:1px solid #DEE2E6;color:#495057;">${escapeHtml(row.risque || '')}</td>
                  <td style="padding:7px 8px;border:1px solid #DEE2E6;text-align:center;">
                    <span style="display:inline-block;padding:3px 8px;border-radius:12px;font-size:8pt;font-weight:700;background-color:${priorityBg(row.priorite)};color:${priorityColor(row.priorite)};">
                      ${priorityIcon(row.priorite)} ${escapeHtml(row.priorite || '')}
                    </span>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `).join('')}
    </div>
  `;

  return [
    { id: '8.1', title: titles['8.1'], html: s81 },
    { id: '8.2', title: titles['8.2'], html: s82 },
    { id: '8.3', title: titles['8.3'], html: s83 },
    { id: '8.4', title: titles['8.4'], html: s84 },
    { id: '8.5', title: titles['8.5'], html: s85 },
    { id: '8.6', title: titles['8.6'], html: s86 },
    { id: '8.7', title: titles['8.7'], html: s87 },
    { id: '8.8', title: titles['8.8'], html: s88 },
    { id: '8.9', title: titles['8.9'], html: s89 },
    { id: '8.10', title: titles['8.10'], html: s810 },
    { id: '8.11', title: titles['8.11'], html: s811Html },
  ];
}

// ============================================================
// MODULE 8.10 — Annexe : Incendie de batteries lithium-ion
// ============================================================

function renderLithiumAnnexe(data: any, isFr: boolean, sectionHeader: (id: string) => string, moduleSeqNumber: number): string {
  data = data || {};

  const checkbox = (checked: boolean) => checked ? '☑' : '☐';

  const infoRow = (label: string, value: string) => `
    <tr>
      <td style="font-weight:600;width:45%;">${label}</td>
      <td>${value || '—'}</td>
    </tr>
  `;

  const checkItem = (checked: boolean, label: string) => `
    <div style="display:flex;align-items:center;gap:8px;padding:3px 0;">
      <span style="font-size:12pt;color:${checked ? '#C0392B' : '#ADB5BD'};">${checkbox(checked)}</span>
      <span style="font-size:10pt;color:#495057;">${escapeHtml(label)}</span>
    </div>
  `;

  const subHeading = (text: string) => `<p style="font-size:9pt;font-weight:700;color:#C0392B;text-transform:uppercase;letter-spacing:0.5px;margin:16px 0 6px 0;">${text}</p>`;
  const baseNum = `${moduleSeqNumber}.10`;

  const warningBox = (text: string) => `
    <div style="display:flex;gap:8px;padding:10px 14px;margin-top:10px;background-color:#FEF9E7;border:1px solid #FAD7A0;border-radius:4px;">
      <span style="color:#F39C12;">⚠</span>
      <span style="font-size:9pt;color:#7D6608;">${escapeHtml(text)}</span>
    </div>
  `;

  const t = isFr ? {
    s1: 'Sources d\'eau et d\'alimentations disponibles',
    s2: 'Informations d\'intervention',
    s3: 'Estimation de la présence de véhicules électriques',
    s4: 'Présence de bornes de recharge',
    s5: 'Types de véhicules potentiellement présents',
    s6: 'Contraintes du stationnement',
    s7: 'Zones à risque identifiées',
    s8: 'Coupures et contrôles énergétiques',
    s9: 'Détection incendie vs intervention spécifique lithium-ion',
    s10: 'Mesures de sécurité opérationnelles',
  } : {
    s1: 'Available water sources and supplies',
    s2: 'Intervention information',
    s3: 'Estimated presence of electric vehicles',
    s4: 'Presence of charging stations',
    s5: 'Types of vehicles potentially present',
    s6: 'Parking constraints',
    s7: 'Identified risk zones',
    s8: 'Energy shutoffs and controls',
    s9: 'Fire detection vs lithium-ion specific intervention',
    s10: 'Operational safety measures',
  };

  return `
    <div>
      ${sectionHeader('8.10')}

      ${subHeading(`${baseNum}.1 — ${t.s1}`)}
      ${checkItem(data.bornesFontaines, isFr ? 'Bornes-fontaines publiques' : 'Public fire hydrants')}
      ${data.bornesFontaines ? `<table><tbody>${infoRow(isFr ? 'Distance approximative' : 'Approximate distance', (data.distanceBornesFontaines || '—') + ' m')}</tbody></table>` : ''}
      ${checkItem(data.raccordsPompiers, isFr ? 'Raccords pompiers (si applicables)' : 'Fire department connections (if applicable)')}
      ${data.raccordsPompiers ? `<table><tbody>${infoRow(isFr ? 'Localisation' : 'Location', data.localisationRaccords)}</tbody></table>` : ''}
      <p style="font-size:9pt;font-weight:600;color:#6C757D;margin-top:10px;">${isFr ? 'Alimentation du système' : 'System supply'}</p>
      ${checkItem(data.alimentationSprinklers, 'Sprinklers')}
      ${checkItem(data.alimentationColonneSeche, isFr ? 'Colonne sèche' : 'Dry standpipe')}
      ${checkItem(data.alimentationAutre, (isFr ? 'Autre : ' : 'Other: ') + (data.alimentationAutreTexte || ''))}
      ${checkItem(data.reserveEauSite, (isFr ? 'Réserve d\'eau sur site' : 'On-site water reserve') + (data.reserveEauSite ? ` — ${data.capaciteReserve || '—'} L` : ''))}
      ${data.autresSourcesEau ? `<table><tbody>${infoRow(isFr ? 'Autres sources' : 'Other sources', data.autresSourcesEau)}</tbody></table>` : ''}

      ${subHeading(`${baseNum}.2 — ${t.s2}`)}
      ${checkItem(data.accesSouterrain, isFr ? 'Accès souterrain' : 'Underground access')}
      <table><tbody>${infoRow(isFr ? 'Contraintes d\'accès connues' : 'Known access constraints', data.contraintesAcces)}</tbody></table>

      ${subHeading(`${baseNum}.3 — ${t.s3}`)}
      <table><tbody>${infoRow(isFr ? 'Nombre moyen estimé' : 'Estimated average number', data.nombreVehiculesEstime)}</tbody></table>
      <p style="font-size:9pt;font-weight:600;color:#6C757D;margin-top:10px;">${isFr ? 'Méthode d\'estimation' : 'Estimation method'}</p>
      ${checkItem(data.methodeDonneesOccupation, isFr ? 'Données d\'occupation du stationnement' : 'Parking occupancy data')}
      ${checkItem(data.methodeTauxOccupation, isFr ? 'Taux d\'occupation moyen par immeuble' : 'Average occupancy rate per building')}
      ${checkItem(data.methodeAutre, (isFr ? 'Autre : ' : 'Other: ') + (data.methodeAutreTexte || ''))}
      ${warningBox(isFr ? 'Cette estimation demeure approximative et peut varier selon l\'heure, le jour et l\'achalandage.' : 'This estimate remains approximate and may vary depending on the time, day, and traffic.')}

      ${subHeading(`${baseNum}.4 — ${t.s4}`)}
      <table><tbody>${infoRow(isFr ? 'Nombre de bornes' : 'Number of charging stations', data.nombreBornes)}</tbody></table>
      <p style="font-size:9pt;font-weight:600;color:#6C757D;margin-top:10px;">${isFr ? 'Type de bornes' : 'Charging station type'}</p>
      ${checkItem(data.typeBorneNiveau2, isFr ? 'Niveau 2 (AC)' : 'Level 2 (AC)')}
      ${checkItem(data.typeBorneRapideDC, isFr ? 'Recharge rapide (DC)' : 'Fast charging (DC)')}
      ${checkItem(data.typeBorneAutre, (isFr ? 'Autre : ' : 'Other: ') + (data.typeBorneAutreTexte || ''))}
      <table style="margin-top:8px;"><tbody>
        ${infoRow(isFr ? 'Tension nominale' : 'Nominal voltage', data.tensionNominale ? data.tensionNominale + ' V' : '')}
        ${infoRow(isFr ? 'Courant maximal' : 'Maximum current', data.courantMaximal ? data.courantMaximal + ' A' : '')}
      </tbody></table>
      ${warningBox(isFr ? 'Ces informations sont indicatives et peuvent varier selon les équipements et les véhicules connectés.' : 'This information is indicative and may vary depending on equipment and connected vehicles.')}
      <p style="font-size:9pt;font-weight:600;color:#6C757D;margin-top:10px;">${isFr ? 'Localisation des bornes' : 'Charging station location'}</p>
      ${checkItem(data.localisationStationnementInterieur, isFr ? 'Stationnement intérieur' : 'Indoor parking')}
      ${checkItem(data.localisationStationnementExterieur, isFr ? 'Stationnement extérieur' : 'Outdoor parking')}
      ${checkItem(data.localisationZoneSpecifique, (isFr ? 'Zone spécifique : ' : 'Specific zone: ') + (data.localisationZoneSpecifiqueTexte || ''))}

      ${subHeading(`${baseNum}.5 — ${t.s5}`)}
      ${checkItem(data.vehiculeElectrique, isFr ? 'Véhicules électriques (VE)' : 'Electric vehicles (EV)')}
      ${checkItem(data.vehiculeHybrideRechargeable, isFr ? 'Véhicules hybrides rechargeables' : 'Plug-in hybrid vehicles')}
      ${checkItem(data.vehiculeUtilitaireElectrique, isFr ? 'Véhicules utilitaires électriques' : 'Electric utility vehicles')}
      ${checkItem(data.vehiculeVisiteurInconnu, isFr ? 'Véhicules visiteurs (type inconnu)' : 'Visitor vehicles (unknown type)')}
      ${warningBox(isFr ? 'L\'identification précise du type de batterie peut ne pas être possible à l\'arrivée des secours.' : 'Precise identification of battery type may not be possible upon arrival of emergency responders.')}

      ${subHeading(`${baseNum}.6 — ${t.s6}`)}
      <table><tbody>
        ${infoRow(isFr ? 'Hauteur libre maximale' : 'Maximum clear height', data.hauteurLibreMax)}
        ${infoRow(isFr ? 'Largeur des voies de circulation' : 'Width of travel lanes', data.largeurVoies)}
      </tbody></table>
      <p style="font-size:9pt;font-weight:600;color:#6C757D;margin-top:10px;">${isFr ? 'Contraintes connues' : 'Known constraints'}</p>
      ${checkItem(data.contrainteHauteurLimitee, isFr ? 'Hauteur sous plafond limitée' : 'Limited ceiling clearance')}
      ${checkItem(data.contrainteAccesRestreint, isFr ? 'Accès restreint aux véhicules lourds' : 'Restricted access for heavy vehicles')}
      ${checkItem(data.contrainteRayonsVirage, isFr ? 'Rayons de virage réduits' : 'Reduced turning radius')}
      ${checkItem(data.contrainteAutres, (isFr ? 'Autres : ' : 'Other: ') + (data.contrainteAutresTexte || ''))}

      ${subHeading(`${baseNum}.7 — ${t.s7}`)}
      ${checkItem(data.zoneAiresRecharge, isFr ? 'Aires de recharge' : 'Charging areas')}
      ${checkItem(data.zoneStationnementInterieur, isFr ? 'Stationnement intérieur' : 'Indoor parking')}
      ${checkItem(data.zoneProximiteStructures, isFr ? 'Proximité de structures ou locaux techniques' : 'Proximity to structures or technical rooms')}
      ${checkItem(data.zoneAutres, (isFr ? 'Autres : ' : 'Other: ') + (data.zoneAutresTexte || ''))}

      ${subHeading(`${baseNum}.8 — ${t.s8}`)}
      <table><tbody>
        ${infoRow(isFr ? 'Dispositif de coupure manuelle' : 'Manual shutoff device', data.dispositifCoupureManuelle === 'oui' ? (isFr ? 'Oui' : 'Yes') : data.dispositifCoupureManuelle === 'non' ? (isFr ? 'Non' : 'No') : '')}
        ${infoRow(isFr ? 'Localisation' : 'Location', data.localisationCoupureManuelle)}
        ${infoRow(isFr ? 'Coupure électrique principale du secteur' : 'Main sector electrical shutoff', data.localisationCoupureElectrique)}
      </tbody></table>
      ${warningBox(isFr ? 'Avertissement important : la coupure électrique n\'élimine pas le risque thermique associé à une batterie lithium-ion.' : 'Important warning: the electrical shutoff does not eliminate the thermal risk associated with a lithium-ion battery.')}

      ${subHeading(`${baseNum}.9 — ${t.s9}`)}
      <p style="font-size:10pt;font-weight:700;color:#495057;margin-bottom:4px;">${isFr ? 'Détection et alarme incendie' : 'Fire detection and alarm'}</p>
      <ul style="margin:4px 0 10px 0;padding-left:18px;font-size:10pt;color:#495057;">
        <li>${isFr ? 'Les systèmes de détection incendie (fumée, chaleur) peuvent être activés lors d\'un événement impliquant une batterie lithium-ion.' : 'Fire detection systems (smoke, heat) may be activated during an event involving a lithium-ion battery.'}</li>
        <li>${isFr ? 'Ces systèmes ont pour objectif d\'alerter les occupants, de déclencher l\'évacuation, et d\'aviser les services d\'urgence.' : 'These systems aim to alert occupants, trigger evacuation, and notify emergency services.'}</li>
      </ul>
      <p style="font-size:10pt;font-weight:700;color:#495057;margin-bottom:4px;">${isFr ? 'Intervention interne — Limites' : 'Internal intervention — Limits'}</p>
      <p style="font-size:10pt;font-weight:700;color:#495057;">${isFr ? 'La brigade interne ou le personnel du site ne doit pas intervenir directement sur un incendie de batterie lithium-ion.' : 'The internal brigade or site personnel must not intervene directly on a lithium-ion battery fire.'}</p>
      <p style="font-size:10pt;font-weight:700;color:#495057;margin-top:8px;margin-bottom:4px;">${isFr ? 'En cas de suspicion ou de confirmation' : 'In case of suspicion or confirmation'}</p>
      <ul style="margin:4px 0;padding-left:18px;font-size:10pt;color:#495057;">
        <li>${isFr ? 'Maintenir une distance de sécurité' : 'Maintain a safety distance'}</li>
        <li>${isFr ? 'Évacuer la zone concernée' : 'Evacuate the affected area'}</li>
        <li>${isFr ? 'Isoler le secteur si possible' : 'Isolate the sector if possible'}</li>
        <li>${isFr ? 'Attendre l\'arrivée des services d\'urgence' : 'Wait for emergency services to arrive'}</li>
      </ul>
      <p style="font-size:10pt;color:#495057;margin-top:8px;">${isFr ? 'Aucune tentative d\'extinction directe ne doit être effectuée par le personnel interne.' : 'No direct extinguishing attempt should be made by internal personnel.'}</p>

      ${subHeading(`${baseNum}.10 — ${t.s10}`)}
      <ul style="margin:4px 0;padding-left:18px;font-size:10pt;color:#495057;">
        <li>${isFr ? 'Maintenir une distance sécuritaire minimale autour du véhicule impliqué' : 'Maintain a minimum safe distance around the vehicle involved'}</li>
        <li>${isFr ? 'Tenir compte du risque de réinflammation' : 'Account for the risk of reignition'}</li>
        <li>${isFr ? 'Prévoir une surveillance prolongée post-incident' : 'Plan for extended post-incident monitoring'}</li>
        <li>${isFr ? 'Coordonner étroitement avec les services d\'incendie' : 'Coordinate closely with fire services'}</li>
      </ul>
    </div>
  `;
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
  let tableHeaders: string[] = [];

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
      if (tableRowIdx === 0) {
        tableHeaders = cells;
        html += '<thead><tr>';
      } else if (tableRowIdx === 1) {
        html += '<tbody><tr>';
      } else {
        html += '<tr>';
      }
      if (tag === 'th') {
        html += cells.map(cell => `<th>${renderInlineBold(fixOrphanColon(escapeHtml(cell)))}</th>`).join('');
      } else {
        html += cells.map((cell, ci) => {
          const escaped = escapeHtml(cell);
          const colored = colorizeCell(escaped, tableHeaders[ci] || '', ci);
          return `<td>${renderInlineBold(fixOrphanColon(colored))}</td>`;
        }).join('');
      }
      html += '</tr>';
      if (tableRowIdx === 0) html += '</thead>';
      tableRowIdx++;
      continue;
    } else if (inTable) {
      html += '</tbody></table>';
      inTable = false;
    }

    if (line.startsWith('@@ALERT_WARNING:')) {
      if (inList) { html += '</ul>'; inList = false; }
      if (inTable) { html += '</tbody></table>'; inTable = false; }
      const parts = line.replace('@@ALERT_WARNING:', '').split('||');
      const title = parts[0] || '';
      const body = (parts[1] || '').replace(/\\n/g, '<br/>');
      html += `<div style="padding:10px 14px;margin:12px 0;background:#FEF9E7;border-left:4px solid #F39C12;border-radius:3px;"><p style="font-weight:700;color:#F39C12;margin:0 0 4px;">⚠️ ${escapeHtml(title)}</p><p style="font-size:9.5pt;color:#7D6608;margin:0;">${escapeHtml(body)}</p></div>`;
    } else if (line.startsWith('@@ALERT_SUCCESS:')) {
      if (inList) { html += '</ul>'; inList = false; }
      if (inTable) { html += '</tbody></table>'; inTable = false; }
      const parts = line.replace('@@ALERT_SUCCESS:', '').split('||');
      const title = parts[0] || '';
      const body = (parts[1] || '').replace(/\\n/g, '<br/>');
      html += `<div style="padding:10px 14px;margin:12px 0;background:#EAFAF1;border-left:4px solid #27AE60;border-radius:3px;"><p style="font-weight:700;color:#27AE60;margin:0 0 4px;">✅ ${escapeHtml(title)}</p><p style="font-size:9.5pt;color:#1E8449;margin:0;">${escapeHtml(body)}</p></div>`;
    } else if (line.startsWith('@@ALERT_INFO:')) {
      if (inList) { html += '</ul>'; inList = false; }
      if (inTable) { html += '</tbody></table>'; inTable = false; }
      const parts = line.replace('@@ALERT_INFO:', '').split('||');
      const title = parts[0] || '';
      const body = (parts[1] || '').replace(/\\n/g, '<br/>');
      html += `<div style="padding:10px 14px;margin:12px 0;background:#EBF5FB;border-left:4px solid #2980B9;border-radius:3px;"><p style="font-weight:700;color:#2980B9;margin:0 0 4px;">ℹ️ ${escapeHtml(title)}</p><p style="font-size:9.5pt;color:#1A5276;margin:0;">${escapeHtml(body)}</p></div>`;
    } else if (line.startsWith('**') && line.endsWith('**') && line.length > 4) {
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
  // Espace insécable avant : ; , et »
  return text
    .replace(/ (:)/g, '\u00A0$1')
    .replace(/ (;)/g, '\u00A0$1')
    .replace(/ (,)/g, '\u00A0$1');
}

function colorizeCell(text: string, header: string, colIndex: number): string {
  const h = header.toLowerCase();
  const t = text.trim();

  // ── Niveaux de risque ──
  if (t === '9 - ÉLEVÉ' || t === '9 - HIGH' || t === '6 - ÉLEVÉ' || t === '6 - HIGH') {
    return `<span style="font-weight:700;color:#C0392B;background:#FDEDEC;padding:2px 6px;border-radius:3px;">${t}</span>`;
  }
  if (t === '4 - MOYEN' || t === '4 - MEDIUM' || t === '3 - MOYEN' || t === '3 - MEDIUM') {
    return `<span style="font-weight:700;color:#F39C12;background:#FEF9E7;padding:2px 6px;border-radius:3px;">${t}</span>`;
  }
  if (t === '1 - FAIBLE' || t === '2 - FAIBLE' || t === '1 - LOW' || t === '2 - LOW') {
    return `<span style="font-weight:700;color:#27AE60;background:#EAFAF1;padding:2px 6px;border-radius:3px;">${t}</span>`;
  }

  // ── Priorités P1 / P2 / P3 ──
  if (t === 'P1') return `<span style="font-weight:700;color:#C0392B;background:#FDEDEC;padding:2px 8px;border-radius:10px;">${t}</span>`;
  if (t === 'P2') return `<span style="font-weight:700;color:#F39C12;background:#FEF9E7;padding:2px 8px;border-radius:10px;">${t}</span>`;
  if (t === 'P3') return `<span style="font-weight:700;color:#27AE60;background:#EAFAF1;padding:2px 8px;border-radius:10px;">${t}</span>`;

  // ── Statuts fournisseurs ──
  if (t === '✅ Prêt' || t === '✅ Ready') return `<span style="font-weight:700;color:#27AE60;">${t}</span>`;
  if (t === '⚠️ Partiel' || t === '⚠️ Partial') return `<span style="font-weight:700;color:#F39C12;">${t}</span>`;
  if (t === '🔴 À confirmer' || t === '🔴 To confirm') return `<span style="font-weight:700;color:#C0392B;">${t}</span>`;

  // ── Niveaux incident ──
  if (t.includes('NIVEAU 1') || t.includes('LEVEL 1')) return `<span style="font-weight:700;color:#27AE60;">${t}</span>`;
  if (t.includes('NIVEAU 2') || t.includes('LEVEL 2')) return `<span style="font-weight:700;color:#F39C12;">${t}</span>`;
  if (t.includes('NIVEAU 3') || t.includes('LEVEL 3')) return `<span style="font-weight:700;color:#C0392B;">${t}</span>`;

  // ── Colonnes spéciales ──
  if ((h.includes('impact') || h.includes('probabilité') || h.includes('probability')) && (t === '3 - Sévère' || t === '3 - Severe' || t === '3 - Élevée' || t === '3 - High')) {
    return `<span style="font-weight:700;color:#C0392B;">${t}</span>`;
  }
  if ((h.includes('impact') || h.includes('probabilité') || h.includes('probability')) && (t === '2 - Modéré' || t === '2 - Moderate' || t === '2 - Moyenne' || t === '2 - Medium')) {
    return `<span style="font-weight:700;color:#F39C12;">${t}</span>`;
  }
  if ((h.includes('impact') || h.includes('probabilité') || h.includes('probability')) && (t === '1 - Faible' || t === '1 - Low')) {
    return `<span style="font-weight:700;color:#27AE60;">${t}</span>`;
  }

  // ── RTO courts = priorité élevée ──
  if (h.includes('rto') && (t === '1h' || t === '1 heure' || t === '4h' || t === '4 heures')) {
    return `<span style="font-weight:700;color:#C0392B;">${t}</span>`;
  }

  return text;
}

// ============================================================
// UTILITAIRE — Convertit **texte** en <strong>texte</strong>
// n'importe où dans une ligne (gras inline, pas seulement
// quand toute la ligne est un titre)
// ============================================================

function renderInlineBold(text: string): string {
  return text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
}