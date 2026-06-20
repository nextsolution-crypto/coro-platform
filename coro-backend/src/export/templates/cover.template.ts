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
  const currentMonth = monthNames[now.getMonth()];
  const fullDate = isFr
    ? `${now.getDate()} ${currentMonth} ${now.getFullYear()}`
    : `${currentMonth} ${now.getDate()}, ${now.getFullYear()}`;

  // Sépare le label de type de document en deux lignes
  const words = data.documentTypeLabel.split(' ');
  let line1 = words[0] + (words[1] ? ' ' + words[1] : '');
  let line2 = words.slice(2).join(' ');
  if (!line2) { line1 = words[0]; line2 = words.slice(1).join(' '); }

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
        <h1 class="cover-title-line1">${escapeHtml(line1.toUpperCase())}</h1>
        <h1 class="cover-title-line2">${escapeHtml((line2 || data.documentTypeLabel).toUpperCase())}</h1>
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
        <span>${labels.creationDate} : ${fullDate}</span>
        <span>${labels.version} : 1.0</span>
        <span>${labels.confidential}</span>
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