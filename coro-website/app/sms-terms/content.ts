import type { LegalContent } from '@/app/privacy/content';
import type { Locale } from '@/lib/site/locale';

export type SmsTermsSection = LegalContent['sections'][number] & {
  readonly legalLinks?: boolean;
};

export type SmsTermsContent = Omit<LegalContent, 'sections'> & {
  readonly sections: readonly SmsTermsSection[];
  readonly privacyLabel: string;
  readonly generalTermsLabel: string;
};

const fr: SmsTermsContent = {
  metaTitle: 'Conditions des messages SMS CORO | Sentinelle Population',
  metaDescription:
    'Conditions applicables aux messages SMS de CORO — Sentinelle Population au Canada.',
  title: 'Conditions des messages SMS',
  eyebrow: 'CORO — Sentinelle Population',
  updated: 'Date d’entrée en vigueur : 13 octobre 2026',
  intro:
    'Les présentes conditions décrivent les messages texte offerts par CORO pour Sentinelle Population. Elles complètent les Conditions d’utilisation et la Politique de confidentialité de CORO. Une organisation exploitante choisit le programme et son contenu; CORO fournit la technologie de communication.',
  contactLabel: 'Soutien CORO',
  privacyLabel: 'Politique de confidentialité',
  generalTermsLabel: 'Conditions générales d’utilisation',
  sections: [
    {
      title: '1. Adhésion volontaire',
      paragraphs: [
        'L’inscription aux SMS est volontaire. Vous devez sélectionner le canal SMS et confirmer explicitement le consentement affiché; la case n’est pas cochée par défaut. Le consentement SMS n’est pas une condition d’achat.',
      ],
    },
    {
      title: '2. Catégories de messages',
      paragraphs: [
        'Selon le programme sélectionné, les messages peuvent comprendre des codes de vérification à usage unique, des avis de test ou d’exercice, des alertes de sécurité ou d’urgence, des consignes de protection, des mises à jour opérationnelles et des messages de fin d’alerte.',
        'La classification réglementaire ou transporteur peut varier selon le contexte et le contenu. Une alerte de sécurité n’est pas automatiquement considérée comme transactionnelle.',
      ],
    },
    {
      title: '3. Fréquence et frais',
      paragraphs: [
        'La fréquence des messages varie selon les événements du programme. Des frais de messagerie et de données peuvent s’appliquer selon votre forfait mobile.',
      ],
    },
    {
      title: '4. Désabonnement et aide',
      paragraphs: [
        'Répondez STOP pour vous désabonner des SMS. Un STOP reçu est appliqué globalement aux SMS Sentinelle Population destinés à ce numéro et ne réactive pas automatiquement un autre programme. Une préférence propre à un programme ne neutralise pas ce désabonnement global.',
        'Répondez HELP pour obtenir l’aide de base offerte par le fournisseur de messagerie. Pour joindre CORO, écrivez à info@getcoro.io ou composez le +1 514 791-7871. CORO ne promet pas de réponse SMS distincte à HELP ni de message de confirmation distinct après STOP.',
        'Une réinscription ne survient jamais automatiquement. Une nouvelle adhésion explicite peut être nécessaire, sous réserve de la suppression globale et des règles applicables.',
      ],
    },
    {
      title: '5. Livraison et urgences',
      paragraphs: [
        'La livraison des SMS n’est pas garantie et peut être retardée ou empêchée par le réseau, l’appareil, le fournisseur ou le transporteur. Les transporteurs ne sont pas responsables des messages retardés ou non livrés.',
        'Sentinelle Population ne remplace pas les services d’urgence. En cas d’urgence immédiate, utilisez les services d’urgence officiels applicables, notamment le 911 lorsqu’approprié.',
      ],
    },
    {
      title: '6. Confidentialité et conditions générales',
      paragraphs: [
        'Le numéro mobile, la preuve d’adhésion et les événements nécessaires à la livraison, à la sécurité et au désabonnement sont traités conformément à la Politique de confidentialité de CORO.',
      ],
      legalLinks: true,
    },
    {
      title: '7. Soutien',
      paragraphs: [
        'Toute question sur ces conditions ou le programme SMS peut être adressée au soutien CORO :',
      ],
      contact: true,
    },
  ],
};

const en: SmsTermsContent = {
  metaTitle: 'CORO SMS Terms | Sentinelle Population',
  metaDescription:
    'Terms applicable to CORO — Sentinelle Population SMS messages in Canada.',
  title: 'SMS Terms',
  eyebrow: 'CORO — Sentinelle Population',
  updated: 'Effective date: October 13, 2026',
  intro:
    'These terms describe the text messages offered by CORO for Sentinelle Population. They supplement CORO’s Terms of Service and Privacy Policy. An operating organization selects the program and its content; CORO provides the communication technology.',
  contactLabel: 'CORO Support',
  privacyLabel: 'Privacy Policy',
  generalTermsLabel: 'General Terms of Service',
  sections: [
    {
      title: '1. Voluntary enrollment',
      paragraphs: [
        'SMS enrollment is voluntary. You must select the SMS channel and affirmatively accept the displayed disclosure; the checkbox is unchecked by default. SMS consent is not a condition of purchase.',
      ],
    },
    {
      title: '2. Message categories',
      paragraphs: [
        'Depending on the selected program, messages may include one-time verification codes, test or exercise notices, safety or emergency alerts, protective-action instructions, operational updates, and all-clear messages.',
        'Regulatory or carrier classification may vary with context and content. A safety alert is not automatically considered transactional.',
      ],
    },
    {
      title: '3. Frequency and charges',
      paragraphs: [
        'Message frequency varies based on program events. Message and data rates may apply under your mobile plan.',
      ],
    },
    {
      title: '4. Opt-out and help',
      paragraphs: [
        'Reply STOP to unsubscribe from SMS. A received STOP applies globally to Sentinelle Population SMS sent to that number and does not automatically reactivate another program. A program-level preference cannot override this global opt-out.',
        'Reply HELP for the basic help offered by the messaging provider. To contact CORO, email info@getcoro.io or call +1 514 791-7871. CORO does not promise a separate SMS HELP response or a separate confirmation message after STOP.',
        'Re-enrollment never occurs automatically. A new affirmative opt-in may be required, subject to the global suppression and applicable rules.',
      ],
    },
    {
      title: '5. Delivery and emergencies',
      paragraphs: [
        'SMS delivery is not guaranteed and may be delayed or prevented by the network, device, provider, or carrier. Carriers are not liable for delayed or undelivered messages.',
        'Sentinelle Population is not a substitute for emergency services. For an immediate emergency, use the applicable official emergency services, including 911 where appropriate.',
      ],
    },
    {
      title: '6. Privacy and general terms',
      paragraphs: [
        'The mobile number, opt-in evidence, and events required for delivery, security, and opt-out processing are handled in accordance with CORO’s Privacy Policy.',
      ],
      legalLinks: true,
    },
    {
      title: '7. Support',
      paragraphs: [
        'Questions about these terms or the SMS program may be directed to CORO Support:',
      ],
      contact: true,
    },
  ],
};

export const smsTermsContent: Record<Locale, SmsTermsContent> = { fr, en };
