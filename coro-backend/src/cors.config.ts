export const CORS_ALLOWED_HEADERS = [
  'Content-Type',
  'Authorization',
  'Idempotency-Key',
  'X-Expected-Document-Version',
  // Jeton de borne en en-tête plutôt que dans l'adresse (audit M3-01).
  'X-Kiosk-Token',
  // Protection CSRF des sessions client en cookie (audit M3-05).
  'X-Requested-With',
] as const;
