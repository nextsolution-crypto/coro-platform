// ============================================================
// CORO — Styles CSS de base pour l'export PDF
// Utilisé par toutes les pages du corps du document (8.5x11)
// ============================================================

export const BASE_STYLES = `
  @page {
    size: letter portrait;
    margin: 100px 50px 80px 50px;
  }

  * {
    box-sizing: border-box;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  body {
    font-family: 'Segoe UI', Arial, sans-serif;
    color: #2C3E50;
    font-size: 11pt;
    line-height: 1.6;
    margin: 0;
    padding: 0;
  }

  /* ── Saut de page ── */
  .page-break {
    page-break-before: always;
  }

  .no-break {
    page-break-inside: avoid;
  }

  .no-break-after {
    page-break-after: avoid;
  }

  /* ── En-tête de section (style M2/M8) ── */
  .section-header {
    margin-bottom: 24px;
  }

  .section-header .section-id {
    display: inline-block;
    background-color: #F8F9FA;
    border: 1px solid #DEE2E6;
    color: #6C757D;
    font-size: 9pt;
    font-weight: bold;
    padding: 4px 10px;
    border-radius: 4px;
    margin-bottom: 8px;
  }

  .section-header .section-title-line1 {
    display: block;
    font-size: 11pt;
    font-weight: 600;
    color: #6C757D;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .section-header .section-title-line2 {
    display: block;
    font-size: 26pt;
    font-weight: 900;
    color: #2C3E50;
    text-transform: uppercase;
    line-height: 1.1;
  }

  .section-header .section-bar {
    height: 3px;
    background-color: #C0392B;
    margin-top: 8px;
    width: 100%;
  }

  /* ── Texte courant ── */
  p {
    margin: 8px 0;
    color: #495057;
  }

  strong {
    color: #2C3E50;
    font-weight: 700;
  }

  ul, ol {
    margin: 8px 0;
    padding-left: 24px;
  }

  li {
    margin: 4px 0;
    color: #495057;
  }

  .text-red {
    color: #C0392B;
    font-weight: 700;
  }

  /* ── Tableaux ── */
  table {
    width: 100%;
    border-collapse: collapse;
    margin: 16px 0;
    font-size: 10pt;
  }

  th {
    background-color: #F8F9FA;
    color: #6C757D;
    text-align: left;
    font-size: 9pt;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.3px;
    padding: 8px 10px;
    border: 1px solid #DEE2E6;
  }

  td {
    padding: 6px 10px;
    border: 1px solid #DEE2E6;
    color: #495057;
  }

  tr:nth-child(even) td {
    background-color: #F8F9FA;
  }

  /* ── Module 4 — Procédures ── */
  .procedure-page {
    page-break-before: always;
  }

  .procedure-header {
    background-color: #2C3E50;
    color: #FFFFFF;
    padding: 16px 20px;
    border-radius: 6px;
    margin-bottom: 20px;
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .procedure-header .proc-code {
    font-size: 10pt;
    font-weight: 700;
    background-color: rgba(255,255,255,0.15);
    padding: 3px 10px;
    border-radius: 4px;
  }

  .procedure-header h2 {
    font-size: 16pt;
    font-weight: 800;
    margin: 0;
    text-transform: uppercase;
  }

  .role-page {
    page-break-before: always;
  }

  .role-header {
    background-color: #F39C12;
    color: #FFFFFF;
    padding: 10px 18px;
    border-radius: 6px;
    margin-bottom: 18px;
    font-size: 13pt;
    font-weight: 700;
    text-transform: uppercase;
  }

  .step {
    margin-bottom: 10px;
  }

  .step.step-red {
    color: #C0392B;
    font-weight: 700;
  }

  .substeps {
    list-style: disc;
    margin-left: 20px;
  }

  /* ── Checklist (P001 — cases à cocher) ── */
  .checklist {
    list-style: none;
    margin: 16px 0 50px 0;
    padding: 16px 20px;
    border: 2px solid #C0392B;
    border-radius: 6px;
  }

  .checklist li {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    margin-bottom: 12px;
    font-size: 11pt;
    color: #2C3E50;
  }

  .checkbox-icon {
    color: #C0392B;
    font-size: 14pt;
    line-height: 1.3;
    flex-shrink: 0;
  }

  /* ── Méthode STOP / RÉFLÉCHIR / AGIR ── */
  .stop-think-act {
    margin-top: 50px;
    padding: 24px;
    background-color: #F8F9FA;
    border-radius: 8px;
  }

  .sta-heading {
    text-align: center;
    font-size: 18pt;
    font-weight: 900;
    color: #2C3E50;
    text-transform: uppercase;
    margin: 0 0 16px 0;
  }

  .sta-red    { color: #C0392B; }
  .sta-yellow { color: #F39C12; }
  .sta-green  { color: #27AE60; }

  .sta-lights {
    display: flex;
    justify-content: center;
    gap: 14px;
    margin-bottom: 8px;
  }

  .sta-light {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    display: inline-block;
  }

  .sta-light-red    { background-color: #C0392B; }
  .sta-light-yellow { background-color: #F39C12; }
  .sta-light-green  { background-color: #27AE60; }

  .sta-before {
    text-align: center;
    font-size: 12pt;
    font-style: italic;
    color: #6C757D;
    margin: 0 0 20px 0;
  }

  .sta-row {
    display: flex;
    gap: 16px;
  }

  .sta-step {
    flex: 1;
    text-align: center;
  }

  .sta-bubble {
    color: #FFFFFF;
    font-size: 12pt;
    font-weight: 800;
    text-transform: uppercase;
    border-radius: 50px;
    padding: 14px 8px;
    margin-bottom: 10px;
  }

  .sta-bubble-red    { background-color: #C0392B; }
  .sta-bubble-yellow { background-color: #F39C12; }
  .sta-bubble-green  { background-color: #27AE60; }

  .sta-desc {
    font-size: 9pt;
    color: #495057;
    line-height: 1.4;
    margin: 0;
  }
`;