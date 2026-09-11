export interface CertificationData {
  projectId: string;
  projectName: string;
  documentType: string;
  buildingName: string;
  year: number;
  versionId: string;
  versionNumber: number;
  approvedBy: string | null;
  approvedAt: string | Date | null;
  signatureId: string;
  signedBy: string;
  signedEmail: string;
  signedAt: string | Date;
  comment: string | null;
}

const escapeHtml = (value: unknown): string =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

const DOCUMENT_TYPE_LABELS: Record<string, { fr: string; en: string }> = {
  PMU: { fr: 'Plan de mesures d’urgence', en: 'Emergency Response Plan' },
  PSI: { fr: 'Plan de sécurité incendie', en: 'Fire Safety Plan' },
  PCA: { fr: 'Plan de continuité des affaires', en: 'Business Continuity Plan' },
  PGC: { fr: 'Plan de gestion de crise', en: 'Crisis Management Plan' },
  PRA: { fr: 'Plan de reprise des activités', en: 'Disaster Recovery Plan' },
  PUE: { fr: 'Plan d’urgence environnementale', en: 'Environmental Emergency Plan' },
};

function formatDate(value: string | Date | null, lang: 'fr' | 'en'): string {
  if (!value) return '—';

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '—';

  return new Intl.DateTimeFormat(lang === 'fr' ? 'fr-CA' : 'en-CA', {
    dateStyle: 'long',
    timeStyle: 'short',
    timeZone: 'America/Toronto',
  }).format(date);
}

export const CERTIFICATION_STYLES = `
  * { box-sizing: border-box; }

  html, body {
    width: 8.5in;
    height: 11in;
    margin: 0;
    padding: 0;
    font-family: Arial, Helvetica, sans-serif;
    color: #17324d;
    background: #ffffff;
  }

  .cert-page {
    position: relative;
    width: 8.5in;
    height: 11in;
    padding: 0.72in 0.72in 0.65in;
    overflow: hidden;
  }

  .cert-topline {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 10px;
    background: #17324d;
  }

  .cert-kicker {
    margin-top: 10px;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 2.2px;
    text-transform: uppercase;
    color: #a93226;
  }

  .cert-title {
    margin: 12px 0 8px;
    font-size: 29px;
    line-height: 1.08;
    font-weight: 700;
    color: #17324d;
  }

  .cert-intro {
    max-width: 6.7in;
    margin: 0 0 25px;
    font-size: 11.5px;
    line-height: 1.55;
    color: #536475;
  }

  .cert-card {
    margin-bottom: 15px;
    border: 1px solid #dbe3ea;
    border-radius: 8px;
    overflow: hidden;
    break-inside: avoid;
  }

  .cert-card-title {
    padding: 9px 13px;
    background: #f2f5f7;
    border-bottom: 1px solid #dbe3ea;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 1.25px;
    text-transform: uppercase;
    color: #17324d;
  }

  .cert-grid {
    display: grid;
    grid-template-columns: 1.45in 1fr;
  }

  .cert-label,
  .cert-value {
    min-height: 30px;
    padding: 7px 12px;
    border-bottom: 1px solid #edf1f4;
    font-size: 10.5px;
    line-height: 1.35;
  }

  .cert-label {
    font-weight: 700;
    color: #667787;
    background: #fbfcfd;
  }

  .cert-value {
    color: #17324d;
    word-break: break-word;
  }

  .cert-grid > :nth-last-child(-n+2) {
    border-bottom: 0;
  }

  .cert-signature {
    border-left: 4px solid #a93226;
  }

  .cert-comment {
    white-space: pre-wrap;
  }

  .cert-integrity {
    margin-top: 17px;
    padding: 13px 15px;
    border-radius: 8px;
    background: #17324d;
    color: #ffffff;
    font-size: 9.5px;
    line-height: 1.5;
  }

  .cert-integrity strong {
    color: #ffffff;
  }

  .cert-ref {
    margin-top: 8px;
    font-family: "Courier New", monospace;
    font-size: 8.5px;
    line-height: 1.45;
    word-break: break-all;
    color: #d9e3eb;
  }

  .cert-footer {
    position: absolute;
    left: 0.72in;
    right: 0.72in;
    bottom: 0.47in;
    padding-top: 9px;
    border-top: 1px solid #dbe3ea;
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 8.5px;
    color: #7a8996;
  }

  .cert-coro {
    font-weight: 700;
    letter-spacing: 1.5px;
    color: #17324d;
  }
`;

export function generateCertificationPage(
  data: CertificationData,
  lang: 'fr' | 'en',
): string {
  const isFr = lang === 'fr';
  const docLabel =
    DOCUMENT_TYPE_LABELS[data.documentType]?.[lang] || data.documentType;

  const labels = isFr
    ? {
        kicker: 'Traçabilité documentaire',
        title: 'Certification du document',
        intro:
          'Cette page atteste l’approbation interne et la signature électronique de la version documentaire identifiée ci-dessous dans la plateforme CORO.',
        document: 'Document',
        approval: 'Approbation interne',
        signature: 'Signature client',
        integrity: 'Intégrité documentaire',
        type: 'Type',
        project: 'Projet',
        building: 'Bâtiment',
        year: 'Année',
        version: 'Version',
        approvedBy: 'Approuvé par',
        approvedAt: 'Date d’approbation',
        signedBy: 'Signé par',
        email: 'Courriel',
        signedAt: 'Date de signature',
        comment: 'Commentaire',
        noComment: 'Aucun commentaire',
        signatureRef: 'Référence de signature',
        versionRef: 'Référence de version',
        projectRef: 'Référence de projet',
        integrityText:
          'La signature ci-dessous est rattachée à cette version précise du document. Les données techniques de traçabilité sont conservées par CORO dans la piste d’audit.',
        generatedBy: 'Certification générée par CORO',
      }
    : {
        kicker: 'Document traceability',
        title: 'Document Certification',
        intro:
          'This page certifies the internal approval and electronic signature of the document version identified below in the CORO platform.',
        document: 'Document',
        approval: 'Internal approval',
        signature: 'Client signature',
        integrity: 'Document integrity',
        type: 'Type',
        project: 'Project',
        building: 'Building',
        year: 'Year',
        version: 'Version',
        approvedBy: 'Approved by',
        approvedAt: 'Approval date',
        signedBy: 'Signed by',
        email: 'Email',
        signedAt: 'Signature date',
        comment: 'Comment',
        noComment: 'No comment',
        signatureRef: 'Signature reference',
        versionRef: 'Version reference',
        projectRef: 'Project reference',
        integrityText:
          'The signature below is linked to this specific document version. Technical traceability data is retained by CORO in the audit trail.',
        generatedBy: 'Certification generated by CORO',
      };

  return `
    <main class="cert-page">
      <div class="cert-topline"></div>

      <div class="cert-kicker">${labels.kicker}</div>
      <h1 class="cert-title">${labels.title}</h1>
      <p class="cert-intro">${labels.intro}</p>

      <section class="cert-card">
        <div class="cert-card-title">${labels.document}</div>
        <div class="cert-grid">
          <div class="cert-label">${labels.type}</div>
          <div class="cert-value">${escapeHtml(docLabel)}</div>

          <div class="cert-label">${labels.project}</div>
          <div class="cert-value">${escapeHtml(data.projectName)}</div>

          <div class="cert-label">${labels.building}</div>
          <div class="cert-value">${escapeHtml(data.buildingName)}</div>

          <div class="cert-label">${labels.year}</div>
          <div class="cert-value">${escapeHtml(data.year)}</div>

          <div class="cert-label">${labels.version}</div>
          <div class="cert-value">v${escapeHtml(data.versionNumber)}</div>
        </div>
      </section>

      <section class="cert-card">
        <div class="cert-card-title">${labels.approval}</div>
        <div class="cert-grid">
          <div class="cert-label">${labels.approvedBy}</div>
          <div class="cert-value">${escapeHtml(data.approvedBy || '—')}</div>

          <div class="cert-label">${labels.approvedAt}</div>
          <div class="cert-value">${escapeHtml(formatDate(data.approvedAt, lang))}</div>
        </div>
      </section>

      <section class="cert-card cert-signature">
        <div class="cert-card-title">${labels.signature}</div>
        <div class="cert-grid">
          <div class="cert-label">${labels.signedBy}</div>
          <div class="cert-value"><strong>${escapeHtml(data.signedBy)}</strong></div>

          <div class="cert-label">${labels.email}</div>
          <div class="cert-value">${escapeHtml(data.signedEmail)}</div>

          <div class="cert-label">${labels.signedAt}</div>
          <div class="cert-value">${escapeHtml(formatDate(data.signedAt, lang))}</div>

          <div class="cert-label">${labels.comment}</div>
          <div class="cert-value cert-comment">${escapeHtml(data.comment || labels.noComment)}</div>
        </div>
      </section>

      <section class="cert-integrity">
        <strong>${labels.integrity}</strong><br />
        ${labels.integrityText}
        <div class="cert-ref">
          ${labels.signatureRef}: ${escapeHtml(data.signatureId)}<br />
          ${labels.versionRef}: ${escapeHtml(data.versionId)}<br />
          ${labels.projectRef}: ${escapeHtml(data.projectId)}
        </div>
      </section>

      <footer class="cert-footer">
        <span class="cert-coro">CORO</span>
        <span>${labels.generatedBy}</span>
      </footer>
    </main>
  `;
}
