export const SMS_TERMS_URL = "https://getcoro.io/terms";
export const SMS_PRIVACY_URL = "https://getcoro.io/privacy";

export const SMS_CARRIER_DISCLOSURE = {
  fr: {
    intro:
      "J’accepte de recevoir de CORO — Sentinelle Population des codes de vérification et les communications du programme sélectionné, notamment des alertes de sécurité, consignes, mises à jour, fins d’alerte et exercices/tests.",
    frequency: "La fréquence des messages varie.",
    rates: "Des frais de messagerie et de données peuvent s’appliquer.",
    keywords:
      "Répondez STOP pour vous désabonner ou HELP pour obtenir de l’aide.",
    purchase: "Le consentement n’est pas une condition d’achat.",
    terms: "Conditions d’utilisation",
    privacy: "Politique de confidentialité",
  },
  en: {
    intro:
      "I agree to receive verification codes and communications from CORO — Sentinelle Population for the selected program, including safety alerts, instructions, updates, all-clear messages, and exercises/tests.",
    frequency: "Message frequency varies.",
    rates: "Message and data rates may apply.",
    keywords: "Reply STOP to unsubscribe or HELP for help.",
    purchase: "Consent is not a condition of purchase.",
    terms: "Terms of Service",
    privacy: "Privacy Policy",
  },
} as const;

export const SMS_CONFIRMATION_DISCLOSURE = {
  fr: "Inscription Sentinelle Population confirmée. La fréquence des messages varie. Des frais de messagerie et de données peuvent s’appliquer. Répondez STOP pour vous désabonner ou HELP pour obtenir de l’aide.",
  en: "Sentinelle Population registration confirmed. Message frequency varies. Message and data rates may apply. Reply STOP to unsubscribe or HELP for help.",
} as const;
