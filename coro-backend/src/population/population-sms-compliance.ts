import { PopulationPreferredLanguage } from '@prisma/client';

export const POPULATION_SMS_CONSENT_SOURCE = 'PUBLIC_PORTAL';
export const POPULATION_SMS_CONSENT_SURFACE =
  'SENTINELLE_POPULATION_REGISTRATION';

const SMS_DISCLOSURE = {
  FR: [
    'J’accepte de recevoir de CORO — Sentinelle Population des codes de vérification et les communications du programme sélectionné, notamment des alertes de sécurité, consignes, mises à jour, fins d’alerte et exercices/tests.',
    'La fréquence des messages varie.',
    'Des frais de messagerie et de données peuvent s’appliquer.',
    'Répondez STOP pour vous désabonner ou HELP pour obtenir de l’aide.',
    'Le consentement n’est pas une condition d’achat.',
    'Conditions d’utilisation : https://getcoro.io/terms',
    'Politique de confidentialité : https://getcoro.io/privacy',
  ].join(' '),
  EN: [
    'I agree to receive verification codes and communications from CORO — Sentinelle Population for the selected program, including safety alerts, instructions, updates, all-clear messages, and exercises/tests.',
    'Message frequency varies.',
    'Message and data rates may apply.',
    'Reply STOP to unsubscribe or HELP for help.',
    'Consent is not a condition of purchase.',
    'Terms of Service: https://getcoro.io/terms',
    'Privacy Policy: https://getcoro.io/privacy',
  ].join(' '),
} as const;

export function populationSmsCarrierDisclosure(
  language: PopulationPreferredLanguage,
) {
  return SMS_DISCLOSURE[language];
}

const normalize = (value: string | null | undefined) =>
  value?.replace(/\s+/g, ' ').trim() || null;

export function buildPopulationSmsConsentSnapshot(input: {
  language: PopulationPreferredLanguage;
  programConsentText: string | null;
  programPrivacyText: string | null;
}) {
  return [
    normalize(input.programConsentText),
    normalize(input.programPrivacyText),
    populationSmsCarrierDisclosure(input.language),
  ]
    .filter((value): value is string => value !== null)
    .join('\n\n');
}
