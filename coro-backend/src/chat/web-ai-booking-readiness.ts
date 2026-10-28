/**
 * Future booking boundary for WEB-AI. No adapter is registered in WEB-AI-04/05:
 * the public assistant cannot create or modify a real reservation.
 */
export type WebAIBookingReadinessLevel = 'INFORMATION_ONLY' | 'AVAILABILITY_PROPOSAL';

export interface WebAIBookingReadinessRequest {
  level: WebAIBookingReadinessLevel;
  language: 'fr-CA' | 'en-CA';
  timezone: string;
}

export interface WebAIBookingReadinessResult {
  bookingCreated: false;
  externalCallMade: false;
  available: false;
  reason: 'BOOKING_NOT_ACTIVATED';
}

export const WEB_AI_BOOKING_ACTIVATED = false as const;

export function evaluateBookingReadiness(_request: WebAIBookingReadinessRequest): WebAIBookingReadinessResult {
  return { bookingCreated: false, externalCallMade: false, available: false, reason: 'BOOKING_NOT_ACTIVATED' };
}
