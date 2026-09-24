/** Lab copy for zone 07. CTA and proof copy are Lab proposals, not production copy. Trust items are limited to what the current site already states. */
const fr = {
  zone: {
    title: 'Conversion et confiance',
    principles: ['La conversion est la prochaine étape, pas une interruption.', 'La confiance se prouve.'],
    lead: 'Conclure une page avec la qualité de son héros : une suite logique, des preuves vérifiables et un pied de page qui sert de fondation.',
    demo: 'Contenu de laboratoire. Le formulaire est une démonstration : aucun envoi, aucun témoin lu ou écrit, aucune donnée transmise. Aucun logo client, témoignage, certification ou chiffre n’est représenté.',
    open: 'Vue isolée',
    studies: { a: 'A — CTA clair', b: 'B — CTA sombre', c: 'C — Formulaire de demande', d: 'D — Confiance et preuves', e: 'E — Pied de page V2', end: 'Séquence de fin de page' },
    leads: {
      a: 'Après une page calme : un CTA ouvert, sans grande carte. Déclaration, filet, action.',
      b: 'Après un contenu opérationnel sombre : un CTA compact et décisif, sur une seule ligne.',
      c: 'Un formulaire précis. Les six états se pilotent ci-dessous ; aucun envoi n’est possible.',
      d: 'Chaque affirmation renvoie à la page du site qui la porte. Ce qui n’est pas vérifié est marqué À valider.',
      e: 'Le futur pied de page unique : marque, navigation, accès, puis mentions légales et coordonnées.',
      end: 'Contenu → preuve → CTA → pied de page.',
    },
  },
  cta: {
    label: 'Démonstration',
    statement: 'Voir CORO dans votre environnement.',
    support: 'Une démonstration structurée autour de vos bâtiments, de vos plans et de vos opérations.',
    primary: 'Demander une démonstration', secondary: 'Voir la sécurité et l’hébergement', cue: 'Ou écrivez à',
  },
  form: {
    states: 'État de démonstration',
    list: [['default', 'Par défaut'], ['focus', 'Focus'], ['error', 'Erreur de validation'], ['submitting', 'Envoi'], ['success', 'Succès'], ['failure', 'Erreur générale']] as const,
    referral: 'CR-DEMO01',
    contract: 'Contrat de production à préserver : cookies coro_referral_code et coro_referral_first_touch, destination Formspree existante. Rien de cela n’est lu, écrit ou appelé ici.',
    hint: 'Astuce : utilisez Tab pour parcourir les champs. Le bouton d’envoi valide localement, puis simule l’envoi.',
  },
  trust: {
    label: 'Repères de confiance',
    heading: 'La confiance se prouve.',
    items: [
      { code: 'CANADA', title: 'Données hébergées au Canada', text: 'Infrastructure d’hébergement située à Toronto, Ontario.', source: { label: 'Source · Sécurité et hébergement', href: '/security' } },
      { code: 'FR / EN', title: 'Plateforme et documents bilingues', text: 'Le site et les documents existent en français et en anglais.', source: { label: 'Source · Documents', href: '/gestion-documentaire' } },
      { code: 'SÉCURITÉ', title: 'Chiffrement, contrôle des accès, sauvegardes', text: 'Les mesures sont décrites en détail sur la page dédiée.', source: { label: 'Source · Sécurité', href: '/security' } },
      { code: 'TRAÇABILITÉ', title: 'Validation et historique des documents', text: 'Formulation à confirmer auprès du produit avant publication.', review: 'À valider avant publication' },
    ] as const,
    contactLabel: 'Coordonnées réelles', contactSource: 'Source · Contact',
  },
  end: {
    label: 'Fin de page · démonstration',
    statementBefore: 'Un plan n’est utile ', statementEm: 'que s’il peut être appliqué', statementAfter: '.',
    support: 'Texte d’exemple tiré des lignes éditoriales : la page se termine sur des preuves, puis sur la suite logique.',
  },
} as const;

const en = {
  zone: {
    title: 'Conversion and trust',
    principles: ['Conversion is the next step, not an interruption.', 'Trust is demonstrated.'],
    lead: 'End a page with the quality of its hero: a logical next step, verifiable proof and a footer that acts as the foundation.',
    demo: 'Laboratory content. The form is a demonstration: nothing is sent, no cookie is read or written, no data is transmitted. No customer logo, testimonial, certification or figure is represented.',
    open: 'Isolated view',
    studies: { a: 'A — Light CTA', b: 'B — Dark CTA', c: 'C — Request form', d: 'D — Trust and proof', e: 'E — V2 footer', end: 'Page-ending sequence' },
    leads: {
      a: 'After a calm page: an open CTA, no big card. Statement, rule, action.',
      b: 'After dark operational content: a compact, decisive CTA on a single line.',
      c: 'A precise form. The six states are driven below; sending is not possible.',
      d: 'Every claim points to the site page that carries it. Anything unverified is marked To review.',
      e: 'The future single footer: brand, navigation, access, then legal and contact details.',
      end: 'Content → proof → CTA → footer.',
    },
  },
  cta: {
    label: 'Demonstration',
    statement: 'See CORO in your environment.',
    support: 'A demonstration structured around your buildings, plans and operations.',
    primary: 'Request a demo', secondary: 'View security and hosting', cue: 'Or write to',
  },
  form: {
    states: 'Demonstration state',
    list: [['default', 'Default'], ['focus', 'Focus'], ['error', 'Validation error'], ['submitting', 'Submitting'], ['success', 'Success'], ['failure', 'General error']] as const,
    referral: 'CR-DEMO01',
    contract: 'Production contract to preserve: cookies coro_referral_code and coro_referral_first_touch, and the existing Formspree destination. None of it is read, written or called here.',
    hint: 'Tip: use Tab to move through the fields. The send button validates locally, then simulates sending.',
  },
  trust: {
    label: 'Trust markers',
    heading: 'Trust is demonstrated.',
    items: [
      { code: 'CANADA', title: 'Data hosted in Canada', text: 'Hosting infrastructure located in Toronto, Ontario.', source: { label: 'Source · Security and hosting', href: '/security' } },
      { code: 'FR / EN', title: 'Bilingual platform and documents', text: 'The site and the documents exist in French and English.', source: { label: 'Source · Documents', href: '/gestion-documentaire' } },
      { code: 'SECURITY', title: 'Encryption, access control, backups', text: 'The measures are described in detail on the dedicated page.', source: { label: 'Source · Security', href: '/security' } },
      { code: 'TRACEABILITY', title: 'Document validation and history', text: 'Wording to be confirmed with the product before publication.', review: 'To review before publication' },
    ] as const,
    contactLabel: 'Real contact details', contactSource: 'Source · Contact',
  },
  end: {
    label: 'Page end · demonstration',
    statementBefore: 'A plan is only useful ', statementEm: 'if it can be applied', statementAfter: '.',
    support: 'Sample text from the editorial guidelines: the page ends on proof, then on the logical next step.',
  },
} as const;

export const conversionCopy = { fr, en } as const;
export const conversionViewKeys = ['conversion-a', 'conversion-b', 'conversion-c', 'conversion-d', 'conversion-e', 'conversion-end'] as const;
export type ConversionViewKey = (typeof conversionViewKeys)[number];
