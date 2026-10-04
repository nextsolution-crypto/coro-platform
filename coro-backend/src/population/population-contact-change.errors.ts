import { HttpException, HttpStatus } from '@nestjs/common';

export type PopulationContactChangeErrorCode =
  | 'CONTACT_CHANGE_UNAVAILABLE'
  | 'CONTACT_CHANGE_INVALID_DESTINATION'
  | 'CONTACT_CHANGE_NO_CHANGE'
  | 'CONTACT_CHANGE_CONFLICT'
  | 'CONTACT_CHANGE_NOT_AUTHORIZED'
  | 'CONTACT_CHANGE_INVALID_CHALLENGE'
  | 'CONTACT_CHANGE_EXPIRED'
  | 'CONTACT_CHANGE_INVALID_OTP'
  | 'CONTACT_CHANGE_ATTEMPTS_EXHAUSTED'
  | 'CONTACT_CHANGE_CANCELLED'
  | 'CONTACT_CHANGE_SUPERSEDED'
  | 'CONTACT_CHANGE_DELIVERY_FAILED'
  | 'CONTACT_CHANGE_RESEND_UNAVAILABLE'
  | 'CONTACT_CHANGE_CONSENT_REQUIRED'
  | 'CONTACT_CHANGE_CONSENT_STALE'
  | 'CONTACT_CHANGE_CHANNEL_DISABLED'
  | 'CONTACT_CHANGE_DESTINATION_SUPPRESSED';

export class PopulationContactChangeError extends HttpException {
  constructor(
    public readonly code: PopulationContactChangeErrorCode,
    status = HttpStatus.BAD_REQUEST,
  ) {
    super(
      {
        code,
        message:
          'La demande de changement de coordonnées ne peut pas être traitée.',
      },
      status,
    );
  }
}
