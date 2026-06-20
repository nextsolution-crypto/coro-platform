export const COVER_STYLES = `
  * {
    box-sizing: border-box;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  body {
    font-family: 'Segoe UI', Arial, sans-serif;
    color: #2C3E50;
    margin: 0;
    padding: 0;
  }

  /* ── Page de couverture (v6 — photo pleine largeur + titre noir/rouge) ── */
  .cover-page {
    height: 100vh;
    width: 100%;
    display: flex;
    flex-direction: column;
  }

  .cover-photo-wrap {
    height: 450px;
    overflow: hidden;
  }

  .cover-photo {
    width: 100%;
    height: 100%;
    background-size: cover;
    background-position: center;
  }

  .cover-photo-placeholder {
    background-color: #DEE2E6;
  }

  .cover-redbar {
    height: 8px;
    background-color: #C0392B;
  }

  .cover-body {
    padding: 40px 50px 0 50px;
    background-color: #FFFFFF;
  }

  .cover-title-line1 {
    color: #2C3E50;
    font-size: 44pt;
    font-weight: 900;
    line-height: 1.1;
    margin: 0;
  }

  .cover-title-line2 {
    color: #C0392B;
    font-size: 44pt;
    font-weight: 900;
    line-height: 1.1;
    margin: 0 0 18px 0;
  }

  .cover-title-rule {
    width: 70px;
    height: 3px;
    background-color: #C0392B;
    margin-bottom: 18px;
  }

  .cover-edition {
    font-size: 11pt;
    font-weight: 700;
    color: #ADB5BD;
    letter-spacing: 1.5px;
    margin: 0 0 70px 0;
  }

  .cover-info-row {
    display: flex;
    gap: 60px;
  }

  .cover-info-col {
    flex: 1;
  }

  .cover-info-heading {
    font-size: 9pt;
    font-weight: 700;
    color: #C0392B;
    letter-spacing: 1px;
    border-bottom: 2px solid #F1948A;
    padding-bottom: 8px;
    margin: 0 0 14px 0;
  }

  .cover-info-name {
    font-size: 13pt;
    font-weight: 700;
    color: #2C3E50;
    margin: 0 0 4px 0;
  }

  .cover-info-line {
    font-size: 10.5pt;
    color: #6C757D;
    margin: 2px 0;
  }

  .cover-info-tagline {
    font-size: 9.5pt;
    color: #ADB5BD;
    margin: 4px 0 0 0;
    line-height: 1.4;
  }

  .cover-coro-row {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 2px;
  }

  .cover-logo-accent {
    color: #C0392B;
  }

  .cover-logo-fallback {
    font-size: 16pt;
    font-weight: 900;
    color: #2C3E50;
  }

  .cover-footer-dark {
    background-color: #2C3E50;
    color: rgba(255,255,255,0.65);
    font-size: 8.5pt;
    padding: 16px 50px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-top: auto;
  }

  .cover-footer-item {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .cover-contact-row {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 6px;
  }

  .cover-contact-row span {
    font-size: 9.5pt;
    color: #6C757D;
  }

  .cover-contact-icon {
    width: 13px;
    height: 13px;
    flex-shrink: 0;
  }
`;