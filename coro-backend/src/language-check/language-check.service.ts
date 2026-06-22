import { Injectable } from '@nestjs/common';

const LANGUAGETOOL_URL = 'http://localhost:8081/v2/check';

@Injectable()
export class LanguageCheckService {
  async checkText(text: string, language: 'fr' | 'en') {
    if (!text || text.trim().length === 0) {
      return { matches: [] };
    }

    const langCode = language === 'fr' ? 'fr' : 'en-US';

    const params = new URLSearchParams();
    params.append('text', text);
    params.append('language', langCode);

    const response = await fetch(LANGUAGETOOL_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params,
    });

    if (!response.ok) {
      throw new Error(`LanguageTool a répondu avec le statut ${response.status}`);
    }

    return response.json();
  }
}