import { evaluateBookingReadiness, WEB_AI_BOOKING_ACTIVATED } from './web-ai-booking-readiness';

describe('WEB-AI booking readiness boundary', () => {
  it('keeps both information and availability levels fail-closed without external effects', () => {
    expect(WEB_AI_BOOKING_ACTIVATED).toBe(false);
    for (const level of ['INFORMATION_ONLY', 'AVAILABILITY_PROPOSAL'] as const) {
      expect(evaluateBookingReadiness({ level, language: 'fr-CA', timezone: 'America/Toronto' })).toEqual({
        bookingCreated: false,
        externalCallMade: false,
        available: false,
        reason: 'BOOKING_NOT_ACTIVATED',
      });
    }
  });
});
