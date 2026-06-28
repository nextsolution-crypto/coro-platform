// ============================================================
// CORO — Générateur HTML Module 3 : Organigramme + Membres
// Reproduit fidèlement la structure top/full/left-right de l'éditeur
// ============================================================

import { escapeHtml } from '../cover.template';

export function renderModule3(sections: any[], lang: 'fr' | 'en', moduleSeqNumber: number = 3): { html31: string; html32: string; has32: boolean } {
  const isFr = lang === 'fr';
  const s31 = sections.find((s: any) => s.id === '3.1');
  const s32 = sections.find((s: any) => s.id === '3.2');

  const sectionHeader = (id: string, title: string) => {
    const subNum = id.split('.')[1];
    const displayId = `${moduleSeqNumber}.${subNum}`;
    return `
      <div class="section-header">
        <span class="section-id">${displayId}</span>
        <span class="section-title-line2">${escapeHtml(title)}</span>
        <div class="section-bar"></div>
      </div>
    `;
  };

  // ── 3.1 — Organigramme (reproduit la structure top/full/left/right) ──
  const allRoles = (s31?.orgRoles || []).filter((r: any) => r.isActive);

  const sortByOrder = (a: any, b: any) => (a.order ?? 0) - (b.order ?? 0);

  const topRoles   = allRoles.filter((r: any) => r.column === 'top').sort(sortByOrder);
  const fullRoles  = allRoles.filter((r: any) => r.column === 'full').sort(sortByOrder);
  const leftRoles  = allRoles.filter((r: any) => r.column === 'left').sort(sortByOrder);
  const rightRoles = allRoles.filter((r: any) => r.column === 'right').sort(sortByOrder);

  const renderBox = (role: any) => {
    const label = isFr ? role.label : role.label_en;
    const note = isFr ? role.note : role.note_en;
    const border = role.borderColor ? `border:2px solid ${role.borderColor};` : '';

    return `
      <div style="
        background-color:${role.color || '#2C3E50'};
        color:${role.textColor || '#FFFFFF'};
        ${border}
        padding:8px 14px;
        border-radius:4px;
        font-size:10pt;
        font-weight:700;
        text-transform:uppercase;
        text-align:center;
        margin-bottom:6px;
      ">
        ${escapeHtml(label)}
        ${note ? `<div style="font-size:8pt;font-weight:400;text-transform:none;margin-top:2px;">${escapeHtml(note)}</div>` : ''}
      </div>
    `;
  };

  const topHtml = topRoles.map(renderBox).join('');
  const fullHtml = fullRoles.length > 0
    ? `<div style="border-top:1px solid #E9ECEF;padding-top:10px;margin-top:6px;">${fullRoles.map(renderBox).join('')}</div>`
    : '';

  let columnsHtml = '';
  if (leftRoles.length > 0 || rightRoles.length > 0) {
    const headerRow = rightRoles.length > 0
      ? `
        <div style="display:flex;gap:14px;margin-bottom:8px;">
          <div style="flex:1;text-align:center;font-size:9pt;font-weight:700;color:#6C757D;background-color:#F8F9FA;border-radius:4px;padding:4px 0;">
            ${isFr ? 'RESPONSABILITÉ DU GESTIONNAIRE' : 'MANAGEMENT RESPONSIBILITY'}
          </div>
          <div style="flex:1;text-align:center;font-size:9pt;font-weight:700;color:#6C757D;background-color:#F8F9FA;border-radius:4px;padding:4px 0;">
            ${isFr ? 'RESPONSABILITÉ DU LOCATAIRE' : 'TENANT RESPONSIBILITY'}
          </div>
        </div>
      `
      : '';

    columnsHtml = `
      <div style="border-top:1px solid #E9ECEF;padding-top:10px;margin-top:6px;">
        ${headerRow}
        <div style="display:flex;gap:14px;align-items:flex-start;">
          <div style="flex:1;">${leftRoles.map(renderBox).join('')}</div>
          ${rightRoles.length > 0 ? `<div style="flex:1;">${rightRoles.map(renderBox).join('')}</div>` : ''}
        </div>
      </div>
    `;
  }

  const html31 = `
    <div>
      ${sectionHeader('3.1', s31?.title || (isFr ? 'ORGANIGRAMME' : 'ORGANIZATIONAL CHART'))}
      <div style="border:1px solid #E9ECEF;border-radius:8px;padding:14px;">
        ${topHtml}
        ${fullHtml}
        ${columnsHtml}
      </div>
    </div>
  `;

  // ── 3.2 — Tableau des membres ──
  const members = s32?.members || [];

  // N'affiche les lignes "Fin de semaine" que si au moins une contient une vraie donnée
  const hasWeekendData = members.some((m: any) =>
    m.schedule === 'weekend' && (m.personneDesignee || m.substitut)
  );
  const visibleMembers = hasWeekendData
    ? members
    : members.filter((m: any) => m.schedule !== 'weekend');

  const shiftLabel: Record<string, string> = isFr
    ? { jour: 'Jour', soir: 'Soir', nuit: 'Nuit' }
    : { jour: 'Day', soir: 'Evening', nuit: 'Night' };

  const scheduleLabel: Record<string, string> = isFr
    ? { semaine: 'Semaine', weekend: 'Fin de semaine' }
    : { semaine: 'Weekday', weekend: 'Weekend' };

  const memberRows = visibleMembers.map((m: any) => `
    <tr>
      <td style="font-weight:600;">${escapeHtml(isFr ? m.roleLabel : m.roleLabel_en)}</td>
      <td>${scheduleLabel[m.schedule] || m.schedule}</td>
      <td>${shiftLabel[m.shift] || m.shift}</td>
      <td>${escapeHtml(m.personneDesignee || '—')}</td>
      <td>${escapeHtml(m.substitut || '—')}</td>
    </tr>
  `).join('');

  const html32 = `
    <div class="page-break">
      ${sectionHeader('3.2', s32?.title || (isFr ? 'LISTE DES MEMBRES' : 'MEMBER LIST'))}
      <table>
        <thead>
          <tr>
            <th>${isFr ? 'Rôle' : 'Role'}</th>
            <th>${isFr ? 'Horaire' : 'Schedule'}</th>
            <th>${isFr ? 'Quart' : 'Shift'}</th>
            <th>${isFr ? 'Personne désignée' : 'Designated person'}</th>
            <th>${isFr ? 'Substitut' : 'Substitute'}</th>
          </tr>
        </thead>
        <tbody>${memberRows}</tbody>
      </table>
    </div>
  `;

  return { html31, html32, has32: !!s32 };
}