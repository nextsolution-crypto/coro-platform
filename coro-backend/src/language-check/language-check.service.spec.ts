import { LanguageCheckService } from './language-check.service';

describe('LanguageCheckService degraded mode', () => {
  afterEach(() => jest.restoreAllMocks());

  it('returns an explicit empty degraded result when LanguageTool is unavailable', async () => {
    jest.spyOn(global, 'fetch').mockRejectedValueOnce(new Error('offline'));

    await expect(
      new LanguageCheckService().checkText('Texte synthétique', 'fr'),
    ).resolves.toEqual({ matches: [], unavailable: true });
  });
});
