// ============================================================
// CORO — Page sommaire / table des matières (PDF)
// Liste chaque module avec ses sous-sections et leur page,
// inséré en page 2 (juste après la couverture)
// ============================================================

export interface TocSubsection {
  id: string;
  title: string;
  page: number;
}

export interface TocEntry {
  sequentialNumber: number;
  moduleTitle: string;
  pageNumber: number;
  subsections: TocSubsection[];
}

export interface TocData {
  entries: TocEntry[];
  isFr: boolean;
}

export function generateTocPage(data: TocData): string {
  const { entries, isFr } = data;

  const title = isFr ? 'TABLE DES MATIÈRES' : 'TABLE OF CONTENTS';

  const renderSubrow = (sequentialNumber: number, sub: TocSubsection) => `
    <div class="toc-subrow">
      <a href="#toc-target-module-${sequentialNumber}" class="toc-sub-link">
        <span class="toc-sub-title">${escapeHtmlLocal(sub.title)}</span>
        <span class="toc-sub-dots"></span>
        <span class="toc-sub-pagenum">${sub.page}</span>
      </a>
    </div>
  `;

  const entriesHtml = entries.map(entry => {
    const [firstSub, ...restSubs] = entry.subsections;

    // Le titre du module + sa 1ère sous-section restent groupés (jamais coupés)
    const headerBlock = `
      <div class="toc-entry-header">
        <a href="#toc-target-module-${entry.sequentialNumber}" class="toc-main-link">
          <span class="toc-number">${entry.sequentialNumber}</span>
          <span class="toc-title">${escapeHtmlLocal(entry.moduleTitle)}</span>
          <span class="toc-dots"></span>
          <span class="toc-main-pagenum">${entry.pageNumber}</span>
        </a>
        ${firstSub ? renderSubrow(entry.sequentialNumber, firstSub) : ''}
      </div>
    `;

    // Les sous-sections suivantes se répartissent librement entre les pages
    const restHtml = restSubs.map(sub => renderSubrow(entry.sequentialNumber, sub)).join('');

    return `<div class="toc-entry">${headerBlock}${restHtml}</div>`;
  }).join('');

  return `
    <div class="toc-container">
      <h1 class="toc-main-title">${title}</h1>
      <div class="toc-bar"></div>
      <div class="toc-list">
        ${entriesHtml}
      </div>
    </div>
  `;
}

export const TOC_STYLES = `
  html, body {
    margin: 0;
    padding: 0;
  }

  .toc-container {
    font-family: Arial, sans-serif;
    color: #2C3E50;
  }

  .toc-main-title {
    font-size: 28px;
    font-weight: 800;
    text-transform: uppercase;
    color: #2C3E50;
    margin: 0 0 8px 0;
  }

  .toc-bar {
    width: 70px;
    height: 4px;
    background-color: #C0392B;
    border-radius: 2px;
    margin-bottom: 30px;
  }

  .toc-list {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .toc-entry {
    margin-bottom: 6px;
  }

  .toc-entry-header {
    break-inside: avoid;
  }

  .toc-main-link, .toc-sub-link {
    display: flex;
    align-items: baseline;
    text-decoration: none;
    color: inherit;
    flex-wrap: wrap;
  }

  .toc-main-link {
    padding: 6px 0;
  }

  .toc-number {
    width: 28px;
    height: 28px;
    border-radius: 6px;
    background-color: #C0392B;
    color: #FFFFFF;
    font-size: 13px;
    font-weight: 800;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-right: 12px;
    flex-shrink: 0;
  }

  .toc-title {
    font-size: 14px;
    font-weight: 700;
    color: #2C3E50;
    flex-shrink: 1;
    min-width: 0;
  }

  .toc-dots {
    flex: 1 1 60px;
    min-width: 60px;
    border-bottom: 1px dotted #CED4DA;
    margin: 0 8px;
    transform: translateY(-4px);
  }

  .toc-main-pagenum {
    font-size: 13px;
    font-weight: 700;
    color: #C0392B;
    flex-shrink: 0;
    min-width: 24px;
    text-align: right;
  }

  .toc-subrow {
    padding-left: 40px;
  }

  .toc-sub-link {
    padding: 3px 0;
  }

  .toc-sub-title {
    font-size: 11.5pt;
    color: #6C757D;
    flex-shrink: 1;
    min-width: 0;
  }

  .toc-sub-dots {
    flex: 1 1 60px;
    min-width: 60px;
    border-bottom: 1px dotted #E9ECEF;
    margin: 0 8px;
    transform: translateY(-3px);
  }

  .toc-sub-pagenum {
    font-size: 11pt;
    color: #ADB5BD;
    flex-shrink: 0;
    min-width: 24px;
    text-align: right;
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