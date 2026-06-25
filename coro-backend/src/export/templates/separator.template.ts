// ============================================================
// CORO — Page séparateur de module (PDF)
// Page pleine page rouge avant chaque module exporté,
// avec numéro séquentiel (selon l'ordre choisi à l'export)
// dans un carré arrondi, suivi du titre du module
// ============================================================

export interface SeparatorData {
  sequentialNumber: number;
  moduleTitle: string;
  documentTypeLabel: string;
  buildingName: string;
  year: number;
}

export function generateSeparatorPage(data: SeparatorData): string {
  const { sequentialNumber, moduleTitle, documentTypeLabel, buildingName, year } = data;

  return `
    <div class="separator-page">
      <div class="module-number-square">${sequentialNumber}</div>
      <div class="module-title">${escapeHtmlLocal(moduleTitle)}</div>
      <div class="module-divider"></div>
      <div class="module-subtitle">${escapeHtmlLocal(documentTypeLabel)}</div>
      </div>
  `;
}

export const SEPARATOR_STYLES = `
  html, body {
    margin: 0;
    padding: 0;
  }

  .separator-page {
    width: 8.5in;
    height: 11in;
    background: linear-gradient(135deg, #C0392B 0%, #A93226 100%);
    position: relative;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    color: #FFFFFF;
    box-sizing: border-box;
    page-break-after: always;
  }

  .module-number-square {
    width: 96px;
    height: 96px;
    border-radius: 14px;
    border: 3px solid #FFFFFF;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 42px;
    font-weight: 800;
    margin-bottom: 32px;
    font-family: Arial, sans-serif;
  }

  .module-title {
    font-size: 38px;
    font-weight: 800;
    text-transform: uppercase;
    text-align: center;
    letter-spacing: 1px;
    max-width: 80%;
    line-height: 1.25;
    font-family: Arial, sans-serif;
  }

  .module-divider {
    width: 70px;
    height: 4px;
    background-color: #FFFFFF;
    margin: 22px 0;
    border-radius: 2px;
  }

  .module-subtitle {
    font-size: 13px;
    font-weight: 400;
    opacity: 0.85;
    text-transform: uppercase;
    letter-spacing: 2px;
    margin-top: 6px;
    font-family: Arial, sans-serif;
  }

  .corner-mark-left {
    position: absolute;
    bottom: 36px;
    left: 40px;
    font-size: 10px;
    opacity: 0.6;
    letter-spacing: 1px;
    font-family: Arial, sans-serif;
  }

  .corner-mark-right {
    position: absolute;
    bottom: 36px;
    right: 60px;
    font-size: 10px;
    opacity: 0.6;
    letter-spacing: 1px;
    font-family: Arial, sans-serif;
  }
`;

function escapeHtmlLocal(str: string): string {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}