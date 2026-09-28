import type { Locale } from '@/lib/site/locale';

/**
 * /privacy content — MIG-06. Legal copy is frozen verbatim from the pre-migration implementation (see
 * tests/fixtures/privacy-baseline.json for the preservation baseline). This file changes NOTHING about the legal
 * text: same sections, same order, same wording, same dates, same legal identity. Only the presentation layer moved.
 */
export type LegalSection = { readonly title: string; readonly paragraphs?: readonly string[]; readonly bullets?: readonly string[]; readonly contact?: boolean };
export type LegalContent = {
  readonly metaTitle: string; readonly metaDescription: string; readonly title: string; readonly eyebrow: string;
  readonly updated: string; readonly intro: string; readonly sections: readonly LegalSection[];
  readonly contactLabel: string;
};

const LAST_UPDATED_FR = '10 septembre 2026';
const LAST_UPDATED_EN = 'September 10, 2026';

const fr: LegalContent = {
  metaTitle: 'Politique de confidentialité CORO | Protection des données',
  metaDescription: 'Consultez la politique de confidentialité de CORO et découvrez comment la plateforme protège, utilise, conserve et gère les renseignements personnels.',
  title: 'Politique de confidentialité',
  eyebrow: 'Protection des renseignements personnels',
  updated: `Dernière mise à jour : ${LAST_UPDATED_FR}`,
  intro: 'CORO accorde une grande importance à la protection des renseignements personnels. La présente politique explique, de manière transparente, quels renseignements peuvent être recueillis lorsque vous visitez notre site Web, demandez une démonstration ou utilisez la plateforme CORO, pourquoi ils sont utilisés, avec qui ils peuvent être communiqués et quels sont vos droits.',
  contactLabel: 'Responsable de la protection des renseignements personnels',
  sections: [
    { title: '1. Portée de la politique', paragraphs: [
      'La présente politique s’applique aux renseignements personnels recueillis dans le cadre de l’exploitation de CORO, plateforme SaaS exploitée sous le nom CORO par Mathieu Montaroux, entreprise individuelle immatriculée au Registraire des entreprises du Québec, NEQ 2282543935. Elle couvre notamment le site getcoro.io, la plateforme app.getcoro.io, nos formulaires, nos communications et nos services de soutien.',
      'Un renseignement personnel est un renseignement qui concerne une personne physique et qui permet, directement ou indirectement, de l’identifier.',
    ] },
    { title: '2. Renseignements que nous pouvons recueillir', paragraphs: ['Selon votre interaction avec CORO, nous pouvons recueillir les catégories de renseignements suivantes :'], bullets: [
      'Renseignements d’identification et de contact, comme le nom, l’adresse courriel, le numéro de téléphone, le titre ou la fonction professionnelle et l’organisation représentée.',
      'Renseignements liés à un compte, comme l’adresse courriel de connexion, le rôle utilisateur, les préférences de langue et les paramètres du compte.',
      'Contenu professionnel saisi dans la plateforme, notamment les renseignements liés aux projets, bâtiments, plans, procédures, documents, commentaires, révisions et approbations.',
      'Renseignements transmis lorsque vous communiquez avec nous, demandez une démonstration, du soutien ou des renseignements.',
      'Données techniques et de sécurité nécessaires au fonctionnement du service, comme l’adresse IP, les journaux de connexion et d’activité, les informations sur le navigateur ou l’appareil et les événements de sécurité.',
      'Renseignements administratifs ou de facturation lorsque ceux-ci sont nécessaires à la gestion d’un abonnement ou d’une relation commerciale.',
    ] },
    { title: '3. Pourquoi nous utilisons ces renseignements', paragraphs: ['Nous utilisons les renseignements personnels uniquement pour des fins déterminées et légitimes liées à nos activités et à la fourniture de CORO.'], bullets: [
      'Créer, administrer et sécuriser les comptes utilisateurs.',
      'Fournir les fonctionnalités de la plateforme et permettre la gestion des projets et documents.',
      'Répondre aux demandes de démonstration, d’information, de soutien et de service.',
      'Gérer les abonnements, les relations clients et, lorsqu’applicable, la facturation.',
      'Maintenir la sécurité, prévenir les accès non autorisés, diagnostiquer les incidents et assurer la fiabilité de la plateforme.',
      'Améliorer l’expérience utilisateur, la performance et les fonctionnalités de CORO.',
      'Respecter nos obligations légales, réglementaires, contractuelles et de tenue de dossiers.',
    ] },
    { title: '4. Consentement', paragraphs: [
      'Lorsque la loi l’exige, CORO obtient un consentement valide avant de recueillir, d’utiliser ou de communiquer des renseignements personnels. Le consentement demandé est adapté à la nature et à la sensibilité des renseignements ainsi qu’aux fins poursuivies.',
      'Vous pouvez retirer votre consentement lorsque la loi le permet, sous réserve des obligations légales ou contractuelles applicables et d’un préavis raisonnable.',
    ] },
    { title: '5. Renseignements professionnels contenus dans les projets', paragraphs: [
      'Les organisations clientes peuvent saisir dans CORO des renseignements nécessaires à leurs projets et documents. Dans ce contexte, le client demeure responsable de s’assurer qu’il dispose des autorisations nécessaires pour transmettre à CORO les renseignements personnels qu’il choisit d’intégrer à la plateforme.',
      'CORO traite ces renseignements pour fournir le service demandé, selon les paramètres du compte, les instructions du client et les obligations applicables.',
    ] },
    { title: '6. Communication à des tiers et fournisseurs', paragraphs: [
      'CORO ne vend pas les renseignements personnels. Nous pouvons toutefois faire appel à des fournisseurs de services qui nous aident à exploiter, sécuriser, maintenir ou soutenir la plateforme. Ces fournisseurs ne reçoivent que les renseignements nécessaires à l’exécution de leurs fonctions et sont assujettis aux mesures contractuelles ou autres protections appropriées.',
      'Des renseignements peuvent également être communiqués lorsque la loi l’exige, pour répondre à une ordonnance valide, protéger nos droits, prévenir une fraude ou un incident de sécurité, ou dans le cadre d’une opération commerciale autorisée par la loi.',
    ] },
    { title: '7. Hébergement et localisation des données', paragraphs: [
      'CORO héberge les données de la plateforme au Canada. Notre architecture est conçue afin de favoriser la souveraineté des données et de répondre aux attentes des organisations canadiennes en matière de protection de l’information.',
      'Lorsque des renseignements personnels doivent être communiqués ou traités à l’extérieur du Québec, CORO effectue les évaluations requises et met en place les mesures de protection appropriées conformément à la législation applicable.',
    ] },
    { title: '8. Mesures de sécurité', paragraphs: [
      'CORO applique des mesures administratives, techniques et organisationnelles raisonnables afin de protéger les renseignements personnels contre la perte, le vol, l’accès, l’utilisation, la communication ou la modification non autorisés.',
      'Ces mesures comprennent notamment des contrôles d’accès, le chiffrement des communications, la protection des comptes, la journalisation, des sauvegardes et des mécanismes de surveillance. Aucun système ne pouvant offrir une sécurité absolue, nos mesures sont revues et adaptées en fonction des risques et de l’évolution de la plateforme.',
    ] },
    { title: '9. Conservation et destruction', paragraphs: [
      'Les renseignements personnels sont conservés uniquement pendant la période nécessaire aux fins pour lesquelles ils ont été recueillis, pour fournir les services, respecter nos obligations contractuelles et légales, résoudre les différends ou protéger nos droits.',
      'À la fin de la période de conservation applicable, les renseignements sont détruits de façon sécuritaire ou anonymisés lorsque la loi le permet et lorsque l’anonymisation répond aux exigences applicables.',
    ] },
    { title: '10. Témoins de connexion et technologies similaires', paragraphs: [
      'Le site Web et la plateforme peuvent utiliser des témoins de connexion ou des technologies similaires nécessaires au fonctionnement, à la sécurité, à la gestion des sessions et aux préférences de l’utilisateur.',
      'Lorsque des témoins non essentiels nécessitant un consentement sont utilisés, les choix appropriés sont présentés à l’utilisateur conformément aux exigences applicables. Les paramètres du navigateur peuvent également permettre de contrôler certains témoins.',
    ] },
    { title: '11. Vos droits', paragraphs: [
      'Sous réserve des exceptions prévues par la loi, vous pouvez demander l’accès aux renseignements personnels que CORO détient à votre sujet et demander leur rectification s’ils sont inexacts, incomplets ou équivoques.',
      'Selon la législation applicable, vous pouvez également disposer d’autres droits, notamment relativement au retrait du consentement, à la cessation de diffusion, à la désindexation ou à la portabilité de certains renseignements informatisés.',
    ] },
    { title: '12. Incidents de confidentialité', paragraphs: [
      'CORO maintient un processus de gestion des incidents de confidentialité. Lorsqu’un incident présente un risque de préjudice sérieux ou lorsqu’une notification est autrement requise par la loi, CORO prend les mesures nécessaires, avise les personnes et autorités concernées lorsque requis et conserve les registres prévus par la législation applicable.',
    ] },
    { title: '13. Responsable de la protection des renseignements personnels', paragraphs: [
      'Toute question, demande d’accès, demande de rectification, demande relative à vos droits ou plainte concernant la protection des renseignements personnels peut être adressée au Responsable de la protection des renseignements personnels de CORO :',
    ], contact: true },
    { title: '14. Modifications de la politique', paragraphs: [
      'CORO peut modifier la présente politique afin de refléter l’évolution de ses pratiques, de ses services ou des exigences légales. La version en vigueur est celle publiée sur cette page et la date de la dernière mise à jour est indiquée au début du document.',
    ] },
    { title: '15. Lois applicables', paragraphs: [
      'CORO traite les renseignements personnels conformément aux lois applicables en matière de protection de la vie privée, notamment la Loi sur la protection des renseignements personnels dans le secteur privé du Québec et, lorsqu’elle s’applique, la Loi sur la protection des renseignements personnels et les documents électroniques du Canada.',
    ] },
  ],
};

const en: LegalContent = {
  metaTitle: 'CORO Privacy Policy | Data Protection',
  metaDescription: 'Read CORO’s privacy policy and learn how the platform protects, uses, retains and manages personal information.',
  title: 'Privacy Policy',
  eyebrow: 'Personal information protection',
  updated: `Last updated: ${LAST_UPDATED_EN}`,
  intro: 'CORO places great importance on protecting personal information. This policy explains, transparently, what information may be collected when you visit our website, request a demonstration or use the CORO platform, why it is used, with whom it may be shared and what rights you have.',
  contactLabel: 'Privacy Officer',
  sections: [
    { title: '1. Scope of this policy', paragraphs: [
      'This policy applies to personal information collected in connection with the operation of CORO, a SaaS platform operated under the CORO trade name by Mathieu Montaroux, a sole proprietorship registered with the Québec Enterprise Register, NEQ 2282543935. It applies in particular to getcoro.io, app.getcoro.io, our forms, communications and support services.',
      'Personal information is information about an identifiable individual, whether the individual can be identified directly or indirectly.',
    ] },
    { title: '2. Information we may collect', paragraphs: ['Depending on how you interact with CORO, we may collect the following categories of information:'], bullets: [
      'Identification and contact information such as name, email address, telephone number, professional title or role and represented organization.',
      'Account information such as login email, user role, language preferences and account settings.',
      'Professional content entered into the platform, including information relating to projects, buildings, plans, procedures, documents, comments, reviews and approvals.',
      'Information provided when you contact us, request a demonstration, support or information.',
      'Technical and security data necessary to operate the service, such as IP address, login and activity logs, browser or device information and security events.',
      'Administrative or billing information where required to manage a subscription or commercial relationship.',
    ] },
    { title: '3. Why we use this information', paragraphs: ['We use personal information only for identified and legitimate purposes related to our activities and the delivery of CORO.'], bullets: [
      'Create, administer and secure user accounts.',
      'Provide platform features and allow projects and documents to be managed.',
      'Respond to demonstration, information, support and service requests.',
      'Manage subscriptions, customer relationships and, where applicable, billing.',
      'Maintain security, prevent unauthorized access, diagnose incidents and ensure platform reliability.',
      'Improve the user experience, performance and functionality of CORO.',
      'Meet legal, regulatory, contractual and record-keeping obligations.',
    ] },
    { title: '4. Consent', paragraphs: [
      'Where required by law, CORO obtains valid consent before collecting, using or disclosing personal information. Consent is adapted to the nature and sensitivity of the information and the purposes involved.',
      'You may withdraw consent where permitted by law, subject to applicable legal or contractual obligations and reasonable notice.',
    ] },
    { title: '5. Professional information contained in projects', paragraphs: [
      'Customer organizations may enter information required for their projects and documents into CORO. In this context, the customer remains responsible for ensuring it has the necessary authority to provide CORO with any personal information it chooses to include in the platform.',
      'CORO processes that information to provide the requested service, according to account settings, customer instructions and applicable obligations.',
    ] },
    { title: '6. Disclosure to third parties and service providers', paragraphs: [
      'CORO does not sell personal information. We may, however, use service providers that help us operate, secure, maintain or support the platform. Those providers receive only the information necessary to perform their functions and are subject to appropriate contractual or other safeguards.',
      'Information may also be disclosed when required by law, to respond to a valid order, protect our rights, prevent fraud or a security incident, or as part of a business transaction permitted by law.',
    ] },
    { title: '7. Hosting and data location', paragraphs: [
      'CORO hosts platform data in Canada. Our architecture is designed to support data sovereignty and the expectations of Canadian organizations regarding information protection.',
      'Where personal information must be disclosed or processed outside Quebec, CORO conducts the required assessments and implements appropriate safeguards in accordance with applicable legislation.',
    ] },
    { title: '8. Security safeguards', paragraphs: [
      'CORO applies reasonable administrative, technical and organizational safeguards designed to protect personal information against loss, theft and unauthorized access, use, disclosure or modification.',
      'These measures include access controls, encrypted communications, account protection, logging, backups and monitoring mechanisms. Because no system can provide absolute security, safeguards are reviewed and adapted based on risk and the evolution of the platform.',
    ] },
    { title: '9. Retention and destruction', paragraphs: [
      'Personal information is retained only for as long as necessary for the purposes for which it was collected, to provide services, meet contractual and legal obligations, resolve disputes or protect our rights.',
      'At the end of the applicable retention period, information is securely destroyed or anonymized where permitted by law and where the anonymization meets applicable requirements.',
    ] },
    { title: '10. Cookies and similar technologies', paragraphs: [
      'The website and platform may use cookies or similar technologies required for operation, security, session management and user preferences.',
      'Where non-essential cookies require consent, appropriate choices are presented to the user in accordance with applicable requirements. Browser settings may also allow users to control certain cookies.',
    ] },
    { title: '11. Your rights', paragraphs: [
      'Subject to exceptions provided by law, you may request access to personal information CORO holds about you and request correction if it is inaccurate, incomplete or ambiguous.',
      'Depending on applicable legislation, you may also have other rights relating to withdrawal of consent, cessation of dissemination, de-indexation or portability of certain computerized information.',
    ] },
    { title: '12. Privacy incidents', paragraphs: [
      'CORO maintains a privacy incident management process. When an incident creates a risk of serious harm or notification is otherwise required by law, CORO takes the necessary steps, notifies affected individuals and authorities when required, and maintains the records required by applicable legislation.',
    ] },
    { title: '13. Privacy Officer', paragraphs: [
      'Questions, access requests, correction requests, requests relating to your privacy rights or complaints concerning personal information may be directed to CORO’s Privacy Officer:',
    ], contact: true },
    { title: '14. Changes to this policy', paragraphs: [
      'CORO may modify this policy to reflect changes to its practices, services or legal requirements. The version in force is the version published on this page and the date of the most recent update appears at the beginning of the document.',
    ] },
    { title: '15. Applicable privacy laws', paragraphs: [
      'CORO processes personal information in accordance with applicable privacy legislation, including Quebec’s Act respecting the protection of personal information in the private sector and, where applicable, Canada’s Personal Information Protection and Electronic Documents Act.',
    ] },
  ],
};

export const privacyContent: Record<Locale, LegalContent> = { fr, en };

export const legalIdentity = {
  name: 'CORO', neq: 'NEQ 2282543935', addressLines: ['2879 Boul. Pierre-Bernard', 'Montréal (QC), H1L 4R2', 'Canada'],
  email: 'info@getcoro.io', phone: '+1 (514) 791-7871',
} as const;
