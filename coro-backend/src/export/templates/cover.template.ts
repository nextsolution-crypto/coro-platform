// ============================================================
// CORO — Template de la page de couverture (v6 — logo réel + design final)
// ============================================================

export interface CoverData {
  documentType: string;
  documentTypeLabel: string;
  buildingName: string;
  buildingType: string;
  buildingAddress: string;
  buildingPhotoBase64?: string;
  clientName: string;
  clientPhone?: string;
  year: number;
  language: 'fr' | 'en';
  clientLogoBase64?: string;
  coroLogoBase64?: string;
  coroPhone?: string;
  coroEmail?: string;
  revisionDate?: string;
  revisionType?: string;
  versionNumber?: number;
  guideMention?: string;
}

export function generateCoverPage(data: CoverData): string {
  const isFr = data.language === 'fr';

  const labels = {
    edition: isFr ? 'Édition' : 'Edition',
    client: isFr ? 'Client' : 'Client',
    preparedBy: isFr ? 'Préparé par' : 'Prepared by',
    tagline: isFr ? 'Expert-conseil en résilience et mesures d\'urgence' : 'Expert advisory in resilience and emergency planning',
    creationDate: isFr ? 'Date de création' : 'Creation date',
    version: isFr ? 'Version' : 'Version',
    confidential: isFr ? 'Document confidentiel — Diffusion restreinte' : 'Confidential document — Restricted distribution',
    phone: isFr ? 'Téléphone' : 'Phone',
  };

  const monthNames = isFr
    ? ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre']
    : ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  const now = new Date();

  // Utilise la date du relevé/révision si disponible, sinon la date système
  let fullDate: string;
  if (data.revisionDate) {
    const revDate = new Date(data.revisionDate + 'T00:00:00');
    const revMonth = monthNames[revDate.getMonth()];
    fullDate = isFr
      ? `${revDate.getDate()} ${revMonth} ${revDate.getFullYear()}`
      : `${revMonth} ${revDate.getDate()}, ${revDate.getFullYear()}`;
  } else {
    const currentMonth = monthNames[now.getMonth()];
    fullDate = isFr
      ? `${now.getDate()} ${currentMonth} ${now.getFullYear()}`
      : `${currentMonth} ${now.getDate()}, ${now.getFullYear()}`;
  }

  const REVISION_TYPE_LABELS: Record<string, { fr: string; en: string }> = {
    'Creation initiale': { fr: 'Création initiale', en: 'Initial creation' },
    'Création initiale': { fr: 'Création initiale', en: 'Initial creation' },
    'Mise a jour annuelle': { fr: 'Mise à jour annuelle', en: 'Annual update' },
    'Mise à jour annuelle': { fr: 'Mise à jour annuelle', en: 'Annual update' },
    'Mise a jour suite a incident': { fr: 'Mise à jour suite à incident', en: 'Update following incident' },
    'Mise à jour suite a incident': { fr: 'Mise à jour suite à incident', en: 'Update following incident' },
    'Mise a jour suite a renovation': { fr: 'Mise à jour suite à rénovation', en: 'Update following renovation' },
    'Mise à jour suite a renovation': { fr: 'Mise à jour suite à rénovation', en: 'Update following renovation' },
    'Mise a jour suite a changement occupation': { fr: 'Mise à jour suite à changement d\'occupation', en: 'Update following occupancy change' },
    'Mise à jour suite a changement occupation': { fr: 'Mise à jour suite à changement d\'occupation', en: 'Update following occupancy change' },
  };

  const rawRevisionType = data.revisionType || 'Création initiale';
  const revisionTypeLabel = REVISION_TYPE_LABELS[rawRevisionType]?.[isFr ? 'fr' : 'en'] || rawRevisionType;
  const versionLabel = `${data.versionNumber || 1}.0`;

  // Sépare le label de type de document en deux lignes
  const words = data.documentTypeLabel.split(' ');
  let line1: string;
  let line2: string;

  // Découpage intelligent selon le type de document
  if (data.documentType === 'PCA') {
    line1 = 'PLAN DE CONTINUITÉ';
    line2 = 'DES AFFAIRES';
  } else if (data.documentType === 'PSI') {
    line1 = 'PLAN DE SÉCURITÉ';
    line2 = 'INCENDIE';
  } else if (data.documentType === 'PMU') {
    line1 = 'PLAN DE MESURES';
    line2 = 'D\'URGENCE';
  } else {
    line1 = words[0] + (words[1] ? ' ' + words[1] : '');
    line2 = words.slice(2).join(' ');
    if (!line2) { line1 = words[0]; line2 = words.slice(1).join(' '); }
  }
  // Mettre en majuscules
  line1 = line1.toUpperCase();
  line2 = line2.toUpperCase();

  const clientLogoHtml = data.clientLogoBase64
    ? `<img src="${data.clientLogoBase64}" style="max-height:40px;max-width:150px;object-fit:contain;margin-bottom:8px;" />`
    : '';

  const coroLogoHtml = data.coroLogoBase64
    ? `<img src="${data.coroLogoBase64}" style="max-height:34px;max-width:160px;object-fit:contain;" />`
    : `<div class="cover-logo-fallback">CORO</div>`;

  const coroContactHtml = `
    ${data.coroPhone ? `
    <div class="cover-contact-row">
      <svg class="cover-contact-icon" viewBox="0 0 24 24" fill="none" stroke="#C0392B" stroke-width="2">
        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
      </svg>
      <span>${escapeHtml(data.coroPhone)}</span>
    </div>` : ''}
    ${data.coroEmail ? `
    <div class="cover-contact-row">
      <svg class="cover-contact-icon" viewBox="0 0 24 24" fill="none" stroke="#C0392B" stroke-width="2">
        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
        <polyline points="22,6 12,13 2,6"/>
      </svg>
      <span>${escapeHtml(data.coroEmail)}</span>
    </div>` : ''}
  `;

  // Photo du bâtiment, ou bandeau gris neutre si aucune photo n'a été uploadée
  const photoSection = data.buildingPhotoBase64
    ? `<div class="cover-photo" style="background-image:url('${data.buildingPhotoBase64}');"></div>`
    : `<div class="cover-photo cover-photo-placeholder"></div>`;

  return `
    <div class="cover-page">

      <div class="cover-photo-wrap">
        ${photoSection}
      </div>

      <div class="cover-redbar"></div>

      <div class="cover-body">
        <h1 class="cover-title-line1">${escapeHtml(line1)}</h1>
        <h1 class="cover-title-line2">${escapeHtml(line2 || data.documentTypeLabel.toUpperCase())}</h1>
        <div class="cover-title-rule"></div>
        <p class="cover-edition">${labels.edition.toUpperCase()} ${data.year}</p>

        <div class="cover-info-row">
          <div class="cover-info-col">
            <p class="cover-info-heading">${labels.client.toUpperCase()}</p>
            ${clientLogoHtml}
            <p class="cover-info-name">${escapeHtml(data.clientName)}</p>
            <p class="cover-info-line">${escapeHtml(data.buildingAddress)}</p>
            ${data.clientPhone ? `<p class="cover-info-line">${labels.phone} : ${escapeHtml(data.clientPhone)}</p>` : ''}
          </div>
          <div class="cover-info-col">
            <p class="cover-info-heading">${labels.preparedBy.toUpperCase()}</p>
            <div class="cover-coro-row">
              ${coroLogoHtml}
            </div>
            <p class="cover-info-tagline">${labels.tagline}</p>
            ${coroContactHtml}
          </div>
        </div>
      </div>

      <div class="cover-footer-dark">
        <div style="display:flex;justify-content:space-between;align-items:center;width:100%;">
          <div style="display:flex;flex-direction:column;gap:4px;">
            <span>${revisionTypeLabel} : ${fullDate}</span>
            <span>${labels.version} : ${versionLabel}</span>
            <span>${labels.confidential}</span>
          </div>
          ${data.guideMention ? `<span style="font-weight:700;color:#FFFFFF;border:2px solid rgba(255,255,255,0.7);border-radius:20px;padding:8px 18px;font-size:14px;">${escapeHtml(data.guideMention)}</span>` : ''}
        </div>
      </div>
    </div>
  `;
}

// ============================================================
// UTILITAIRE — échapper le HTML pour éviter les injections
// ============================================================

export function escapeHtml(str: string): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// ============================================================
// CORO — Dernière page du document (branding organisation émettrice)
// ============================================================

export interface LastPageData {
  companyName?: string;
  companyLogoFullB64?: string;
  companyLogoB64?: string;
  companyPhone?: string;
  companyEmail?: string;
  companyAddress?: string;
  companyWebsite?: string;
  companyTagline?: string;
  year: number;
  language: 'fr' | 'en';
}

export function generateLastPage(data: LastPageData): string {
  const isFr = data.language === 'fr';
  const year = data.year || new Date().getFullYear();
  const companyName = escapeHtml(data.companyName || '');
  const tagline = escapeHtml(data.companyTagline || '');
  const phone = escapeHtml(data.companyPhone || '');
  const email = escapeHtml(data.companyEmail || '');
  const address = escapeHtml(data.companyAddress || '');
  const website = escapeHtml(data.companyWebsite || '');

  return `
    <div style="
      width:100%;
      height:100vh;
      position:relative;
      overflow:hidden;
      background-color:#FFFFFF;
      font-family:'Helvetica Neue', Arial, sans-serif;
    ">
      <!-- Fond gris haut gauche -->
      <div style="
        position:absolute;
        top:0; left:0;
        width:65%; height:68%;
        background-color:#C8C8C8;
        z-index:1;
      "></div>

      <!-- Carré rouge foncé — derrière le bloc rouge, devant le gris -->
      <div style="
        position:absolute;
        top:24%; left:22%;
        width:16%; height:20%;
        background-color:#A93226;
        opacity:0.85;
        z-index:3;
      "></div>

      <!-- Petit carré transparent avec bordure rouge -->
      <div style="
        position:absolute;
        top:43%; left:7%;
        width:5%; height:6%;
        background-color:transparent;
        border:2px solid #C0392B;
        z-index:3;
      "></div>

      <!-- Petit cercle blanc décoratif -->
      <div style="
        position:absolute;
        top:56%; left:26%;
        width:14px; height:14px;
        background-color:#FFFFFF;
        border-radius:50%;
        z-index:6;
      "></div>

      <!-- Bloc rouge principal -->
      <div style="
        position:absolute;
        top:30%; right:0;
        width:65%; height:62%;
        background-color:#C0392B;
        z-index:4;
        display:flex;
        flex-direction:column;
        justify-content:center;
        padding:50px 60px;
        box-sizing:border-box;
      ">
                <!-- Nom de l'organisation -->
        <div style="font-size:36px;font-weight:700;color:#FFFFFF;margin-bottom:28px;letter-spacing:2px;">${companyName}</div>
        <!-- Ligne de séparation -->
        <div style="width:70px;height:2px;background-color:rgba(255,255,255,0.5);margin-bottom:24px;"></div>

        <!-- Tagline -->
        ${tagline ? `
          <p style="font-size:14px;color:rgba(255,255,255,0.90);line-height:1.6;margin-bottom:28px;font-weight:400;">${tagline}</p>
        ` : ''}

        <!-- Coordonnées -->
        <div style="display:flex;flex-direction:column;gap:12px;">
          ${phone ? `
            <div style="display:flex;align-items:center;gap:12px;">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.75)" stroke-width="2" style="flex-shrink:0;">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.21 12 19.79 19.79 0 0 1 1.14 3.38 2 2 0 0 1 3.12 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.09 8.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
              </svg>
              <span style="font-size:14px;color:#FFFFFF;font-weight:500;">${phone}</span>
            </div>
          ` : ''}
          ${email ? `
            <div style="display:flex;align-items:center;gap:12px;">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.75)" stroke-width="2" style="flex-shrink:0;">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                <polyline points="22,6 12,13 2,6"/>
              </svg>
              <span style="font-size:14px;color:#FFFFFF;font-weight:500;">${email}</span>
            </div>
          ` : ''}
          ${website ? `
            <div style="display:flex;align-items:center;gap:12px;">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.75)" stroke-width="2" style="flex-shrink:0;">
                <circle cx="12" cy="12" r="10"/>
                <line x1="2" y1="12" x2="22" y2="12"/>
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
              </svg>
              <span style="font-size:14px;color:#FFFFFF;font-weight:500;">${website}</span>
            </div>
          ` : ''}
          ${address ? `
            <div style="display:flex;align-items:center;gap:12px;">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.75)" stroke-width="2" style="flex-shrink:0;">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                <circle cx="12" cy="10" r="3"/>
              </svg>
              <span style="font-size:14px;color:#FFFFFF;font-weight:500;">${address}</span>
            </div>
          ` : ''}
        </div>
      </div>

      <!-- Pied de page — grand rectangle avec contour rouge -->
      <div style="
        position:absolute;
        bottom:0; left:0; right:0;
        height:110px;
        background-color:#FFFFFF;
        z-index:5;
        display:flex;
        align-items:center;
        padding:0 30px;
      ">
        <div style="
          border:2px solid #C0392B;
          border-radius:4px;
          padding:16px 28px;
          width:50%;
        ">
          <p style="font-size:12px;color:#6C757D;margin:0;font-weight:500;">
            ${isFr ? `Tous droits réservés @${year}` : `All rights reserved @${year}`}
          </p>
        </div>
      </div>
    </div>
  `;
}