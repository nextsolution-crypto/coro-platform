import { Injectable, Logger } from '@nestjs/common';

const LANGUAGETOOL_URL = 'http://localhost:8081/v2/check';

@Injectable()
export class LanguageCheckService {
  private readonly logger = new Logger(LanguageCheckService.name);

  async checkText(text: string, language: 'fr' | 'en') {
    if (!text || text.trim().length === 0) return { matches: [] };

    const params = new URLSearchParams();
    params.append('text', text);
    params.append('language', language === 'fr' ? 'fr' : 'en-US');

    try {
      const response = await fetch(LANGUAGETOOL_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params,
      });
      if (!response.ok) throw new Error(`HTTP_${response.status}`);
      return response.json();
    } catch {
      this.logger.warn('LanguageTool unavailable; returning no suggestions.');
      return { matches: [], unavailable: true };
    }
  }
}
