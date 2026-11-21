import { createHmac, randomInt } from 'node:crypto';

// NIP Sentinelle (audit M5-02, décision du 21 nov. 2026).
//
// - Les NIP ne sont plus stockés en clair : seule une empreinte HMAC-SHA256
//   à clé secrète est gardée (`pinHash`). Avec 10^6 combinaisons, un simple
//   hachage se casse en une seconde ; la clé, gardée hors de la base
//   (SENTINELLE_PIN_HMAC_KEY), rend une fuite de la base seule inexploitable.
// - Les nouveaux NIP ont 6 chiffres (NIST SP 800-63B). Les anciens NIP à
//   4 chiffres restent valides : ils sont convertis en empreinte au démarrage
//   ou à leur première utilisation.

export const NEW_PIN_LENGTH = 6;

const DEVELOPMENT_ONLY_KEY = 'coro-development-only-sentinelle-pin-key';

let missingKeyLogged = false;

export function pinHmacKey(): string | null {
  const configured = process.env.SENTINELLE_PIN_HMAC_KEY?.trim();
  if (configured && configured.length >= 32) return configured;
  if (process.env.NODE_ENV === 'production') {
    if (!missingKeyLogged) {
      missingKeyLogged = true;
      console.error(
        '[ALERTE] SENTINELLE_PIN_HMAC_KEY absente ou trop courte (32 caractères minimum) : les NIP restent stockés en clair.',
      );
    }
    return null;
  }
  return DEVELOPMENT_ONLY_KEY;
}

export function pinDigest(buildingId: string, pin: string, key: string | null = pinHmacKey()): string | null {
  if (!key) return null;
  return createHmac('sha256', key).update(`sentinelle-pin:v1:${buildingId}:${pin}`).digest('hex');
}

export function generatePin(length: number = NEW_PIN_LENGTH): string {
  const min = 10 ** (length - 1);
  return randomInt(min, min * 10).toString();
}

export function isValidPinFormat(pin: unknown): pin is string {
  return typeof pin === 'string' && /^(\d{4}|\d{6})$/.test(pin);
}

/** Champs d'identification retirés de toute réponse envoyée au portail. */
export function withoutPinSecrets<T extends Record<string, any>>(employee: T): Omit<T, 'pin' | 'pinHash'> {
  if (!employee) return employee;
  const { pin: _pin, pinHash: _pinHash, ...rest } = employee;
  return rest;
}
