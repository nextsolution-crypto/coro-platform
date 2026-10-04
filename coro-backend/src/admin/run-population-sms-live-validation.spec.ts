import { parseMode } from './run-population-sms-live-validation';

describe('population SMS live validation CLI', () => {
  it.each(['DRY_RUN', 'LIVE'] as const)('accepts explicit mode %s', (mode) => {
    expect(parseMode(mode)).toBe(mode);
  });

  it.each([undefined, '', 'live', 'DRY-RUN'])(
    'fails closed for mode %s',
    (mode) => {
      expect(() => parseMode(mode)).toThrow(
        'POPULATION_SMS_LIVE_VALIDATION_MODE doit etre DRY_RUN ou LIVE.',
      );
    },
  );
});
