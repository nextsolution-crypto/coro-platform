import { PopulationPreferredLanguage } from '@prisma/client';
import {
  buildPopulationSmsConsentSnapshot,
  populationSmsCarrierDisclosure,
} from './population-sms-compliance';

describe('Population SMS compliance disclosure', () => {
  it.each([PopulationPreferredLanguage.FR, PopulationPreferredLanguage.EN])(
    'contains the carrier-required evidence in %s',
    (language) => {
      const disclosure = populationSmsCarrierDisclosure(language);
      expect(disclosure).toMatch(/STOP/);
      expect(disclosure).toMatch(/HELP/);
      expect(disclosure).toContain('https://getcoro.io/terms');
      expect(disclosure).toContain('https://getcoro.io/privacy');
      expect(disclosure).toMatch(
        language === PopulationPreferredLanguage.FR
          ? /fréquence des messages varie/i
          : /message frequency varies/i,
      );
    },
  );

  it('normalizes only controlled server content into the evidence snapshot', () => {
    expect(
      buildPopulationSmsConsentSnapshot({
        language: PopulationPreferredLanguage.EN,
        programConsentText: '  Program   consent  ',
        programPrivacyText: ' Program privacy ',
      }),
    ).toBe(
      `Program consent\n\nProgram privacy\n\n${populationSmsCarrierDisclosure(PopulationPreferredLanguage.EN)}`,
    );
  });
});
