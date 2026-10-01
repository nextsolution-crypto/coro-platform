import type { Locale } from '@/lib/site/locale';
import type { LegalContent } from '@/app/privacy/content';

/**
 * /terms content — MIG-06. Legal copy is frozen verbatim from the pre-migration implementation (see
 * tests/fixtures/terms-baseline.json for the preservation baseline). This file changes NOTHING about the legal
 * text: same sections, same order, same wording, same dates, same legal identity. Only the presentation layer moved.
 * Section 13 additionally carries a `privacyLink` marker (rendered by TermsV2's `extra` callback), matching the
 * pre-migration page's inline link to the Privacy Policy.
 */
export type TermsSection = LegalContent['sections'][number] & { readonly privacyLink?: boolean; readonly smsLinks?: boolean };
export type TermsContent = Omit<LegalContent, 'sections'> & { readonly sections: readonly TermsSection[]; readonly privacyLinkLabel: string };

const LAST_UPDATED_FR = '10 septembre 2026';
const LAST_UPDATED_EN = 'September 10, 2026';

const fr: TermsContent = {
  metaTitle: 'Conditions d’utilisation CORO | Plateforme SaaS',
  metaDescription: 'Consultez les conditions d’utilisation de la plateforme SaaS CORO, incluant les règles d’accès, les responsabilités, la propriété intellectuelle, les abonnements et les modalités du service.',
  title: 'Conditions d’utilisation',
  eyebrow: 'Cadre d’utilisation de la plateforme',
  updated: `Dernière mise à jour : ${LAST_UPDATED_FR}`,
  intro: 'Les présentes conditions encadrent l’accès et l’utilisation du site Web, de la plateforme SaaS CORO et des services qui y sont associés. CORO est le nom commercial utilisé pour l’exploitation de la plateforme. En utilisant CORO ou en créant un compte, vous acceptez d’être lié par les présentes conditions ainsi que par les modalités commerciales applicables à votre abonnement.',
  contactLabel: 'CORO',
  privacyLinkLabel: 'Consulter la Politique de confidentialité',
  sections: [
    { title: '1. Objet et portée', paragraphs: [
      'CORO est une plateforme SaaS professionnelle exploitée par Mathieu Montaroux, entreprise individuelle immatriculée au Registraire des entreprises du Québec sous le nom utilisé CORO, NEQ 2282543935. La plateforme est destinée notamment à la création, à la structuration, à la gestion, à la révision et à l’exportation de documents de conformité liés aux mesures d’urgence, à la sécurité incendie, à la continuité des activités, à la gestion de crise et à d’autres domaines connexes.',
      'Les présentes conditions s’appliquent aux visiteurs du site, aux utilisateurs autorisés de la plateforme et, lorsque pertinent, aux organisations ayant souscrit aux services CORO.',
    ] },
    { title: '2. Nature professionnelle de la plateforme', paragraphs: [
      'CORO est un outil de soutien au travail professionnel. La plateforme peut structurer des informations, automatiser certaines tâches, proposer du contenu ou faciliter la production de documents, mais elle ne remplace pas l’analyse, le jugement, la validation ni la responsabilité d’un professionnel qualifié.',
      'L’utilisateur demeure responsable de vérifier l’exactitude, la pertinence, la conformité et l’adaptation à son contexte de tout contenu, document, procédure ou livrable produit ou modifié à l’aide de CORO.',
    ] },
    { title: '3. Création et sécurité du compte', paragraphs: [
      'Certaines fonctions nécessitent un compte utilisateur. Vous devez fournir des renseignements exacts, maintenir vos informations à jour et protéger vos identifiants de connexion.',
      'Vous êtes responsable des activités réalisées avec votre compte, sauf lorsqu’elles résultent d’un accès non autorisé qui ne vous est pas imputable. Vous devez nous aviser rapidement si vous soupçonnez une compromission, un accès non autorisé ou un incident de sécurité.',
    ] },
    { title: '4. Utilisateurs autorisés et organisation cliente', paragraphs: [
      'Lorsqu’un compte est fourni dans le cadre d’un abonnement organisationnel, l’utilisation est limitée aux utilisateurs autorisés par l’organisation cliente et selon les rôles ou droits qui leur sont attribués.',
      'L’organisation cliente est responsable de la gestion de ses utilisateurs, de l’attribution appropriée des accès et de l’utilisation de la plateforme par les personnes qu’elle autorise, sous réserve des responsabilités propres à CORO.',
    ] },
    { title: '5. Utilisation acceptable', paragraphs: ['Il est interdit d’utiliser CORO pour :'], bullets: [
      'Violer une loi, un règlement, une ordonnance ou les droits d’un tiers.',
      'Introduire du code malveillant, contourner les mesures de sécurité ou tenter d’obtenir un accès non autorisé.',
      'Perturber, surcharger, sonder ou tester la plateforme d’une manière susceptible d’affecter sa sécurité ou sa disponibilité sans autorisation écrite.',
      'Utiliser les comptes, identifiants ou droits d’accès d’une autre personne sans autorisation.',
      'Copier, désassembler, décompiler, rétroconcevoir ou tenter d’extraire le code source de CORO, sauf dans la mesure expressément permise par la loi.',
      'Revendre, sous-licencier ou rendre disponible la plateforme à des tiers sauf lorsqu’une entente écrite avec CORO l’autorise.',
      'Utiliser CORO d’une manière frauduleuse, abusive ou susceptible de porter atteinte à la sécurité, à l’intégrité ou à la réputation du service.',
    ] },
    { title: '6. Contenu et données du client', paragraphs: [
      'Sous réserve des droits nécessaires à la fourniture du service, le client conserve ses droits sur les données, textes, documents, fichiers, images, plans et autres contenus qu’il téléverse, saisit ou crée dans son espace CORO.',
      'Le client accorde à CORO les droits limités nécessaires pour héberger, traiter, sauvegarder, reproduire techniquement et afficher ces contenus uniquement afin de fournir, maintenir, sécuriser et améliorer les services conformément à l’entente applicable et à la politique de confidentialité.',
      'Le client est responsable de s’assurer qu’il possède les droits et autorisations nécessaires pour utiliser et transmettre les contenus qu’il place dans la plateforme.',
    ] },
    { title: '7. Propriété intellectuelle de CORO', paragraphs: [
      'La plateforme CORO, son architecture, son code, ses interfaces, sa marque et ses signes distinctifs, ses éléments graphiques, ses modèles, ses fonctionnalités, sa documentation et les éléments propriétaires qui lui sont associés sont protégés par les lois applicables en matière de propriété intellectuelle.',
      'Aucun droit de propriété sur CORO n’est transféré à l’utilisateur. Sous réserve du respect des présentes conditions et du paiement des frais applicables, l’utilisateur bénéficie uniquement d’un droit limité, non exclusif, non transférable et révocable d’utiliser la plateforme pendant la durée de son accès autorisé.',
    ] },
    { title: '8. Contenu généré, automatisé ou assisté par intelligence artificielle', paragraphs: [
      'Certaines fonctions de CORO peuvent utiliser des mécanismes automatisés ou des fonctions assistées par intelligence artificielle pour faciliter la rédaction, la structuration ou l’adaptation de contenu.',
      'Tout contenu généré ou suggéré doit être révisé et validé par un utilisateur compétent avant d’être utilisé, approuvé, remis à un client ou intégré à un document officiel. CORO ne garantit pas qu’un contenu automatisé soit complet, exempt d’erreurs ou adapté à toutes les situations.',
    ] },
    { title: '9. Abonnements, tarifs et paiement', paragraphs: [
      'Les fonctionnalités, limites d’utilisation, tarifs, modalités de facturation et durées applicables sont ceux indiqués au moment de la souscription, dans une proposition commerciale, une commande ou une entente distincte.',
      'Sauf indication contraire dans l’entente applicable, les taxes exigibles s’ajoutent aux montants affichés. Des modalités particulières peuvent s’appliquer aux comptes Entreprise, aux essais gratuits, aux promotions ou aux ententes négociées.',
    ] },
    { title: '10. Essais gratuits et fonctionnalités précommerciales', paragraphs: [
      'CORO peut offrir des essais gratuits, fonctions bêta, aperçus ou fonctionnalités en développement. Ces éléments peuvent être modifiés, limités ou retirés et peuvent ne pas bénéficier du même niveau d’engagement de service que les fonctionnalités généralement disponibles.',
    ] },
    { title: '11. Disponibilité, maintenance et évolution du service', paragraphs: [
      'CORO vise à maintenir un service fiable, mais ne garantit pas que la plateforme sera disponible sans interruption ni erreur en tout temps. Des interruptions peuvent notamment survenir pour maintenance, mise à niveau, correction, sécurité, défaillance d’un fournisseur ou événement hors de notre contrôle raisonnable.',
      'Nous pouvons faire évoluer l’interface, les fonctions, les procédures techniques et l’architecture de CORO afin d’améliorer le service, maintenir la sécurité ou répondre à de nouvelles exigences, sous réserve des engagements contractuels applicables.',
    ] },
    { title: '12. Sauvegarde, exportation et conservation', paragraphs: [
      'CORO met en œuvre des mécanismes de sauvegarde et de continuité adaptés à son infrastructure. Toutefois, le client demeure responsable d’exporter et de conserver les copies de ses livrables qu’il juge nécessaires à ses propres obligations opérationnelles, réglementaires ou d’archivage.',
      'Les règles de conservation ou de suppression après la fin d’un abonnement peuvent être précisées dans l’entente applicable ou la politique de confidentialité.',
    ] },
    { title: '13. Confidentialité et protection des renseignements personnels', paragraphs: [
      'L’utilisation de renseignements personnels dans CORO est assujettie à notre Politique de confidentialité et aux lois applicables. Les organisations clientes demeurent également responsables de leurs propres obligations concernant les renseignements qu’elles recueillent et saisissent dans la plateforme.',
    ], privacyLink: true },
    { title: '13A. CORO — Messages SMS Sentinelle Population', paragraphs: [
      'En vous inscrivant, vous acceptez de recevoir des codes de vérification ainsi que, selon le programme choisi, des alertes de sécurité publique, des préalertes, des consignes de protection, des mises à jour d’incident, des messages de fin d’alerte et des exercices ou tests. La fréquence des messages varie.',
      'Des frais de messagerie et de données peuvent s’appliquer. Répondez STOP pour vous désabonner ou HELP pour obtenir de l’aide. Le consentement n’est pas une condition d’achat.',
      'Pour obtenir de l’aide, communiquez avec CORO à info@getcoro.io ou au +1 514 791-7871. Les transporteurs ne sont pas responsables des messages retardés ou non livrés.',
    ], smsLinks: true },
    { title: '14. Suspension et résiliation', paragraphs: [
      'CORO peut suspendre ou restreindre l’accès lorsqu’une mesure est raisonnablement nécessaire pour protéger la sécurité du service, prévenir une utilisation abusive, répondre à une obligation légale, remédier à un défaut de paiement ou faire cesser une violation importante des présentes conditions.',
      'Les modalités de résiliation, de non-renouvellement et de fin de service applicables à un abonnement payant sont celles prévues dans l’offre, la commande ou l’entente commerciale concernée.',
    ] },
    { title: '15. Exclusion de garantie', paragraphs: [
      'Dans la mesure permise par la loi, CORO est fourni selon sa disponibilité et ne garantit pas que la plateforme répondra à tous les besoins particuliers d’un utilisateur ni que tout document produit à l’aide de la plateforme répondra automatiquement à toutes les exigences légales, réglementaires, contractuelles, municipales, sectorielles ou propres à un bâtiment.',
      'L’utilisateur doit effectuer les validations professionnelles et réglementaires nécessaires avant de se fier à un livrable ou de le diffuser.',
    ] },
    { title: '16. Limitation de responsabilité', paragraphs: [
      'Dans la mesure permise par la loi et sous réserve de toute responsabilité qui ne peut légalement être exclue ou limitée, CORO n’est pas responsable des dommages indirects, accessoires, spéciaux ou consécutifs résultant de l’utilisation ou de l’impossibilité d’utiliser la plateforme.',
      'Toute limitation monétaire particulière de responsabilité applicable à un abonnement commercial peut être précisée dans l’entente conclue avec le client. Aucune disposition des présentes conditions ne vise à exclure une responsabilité lorsqu’une telle exclusion est interdite par la loi.',
    ] },
    { title: '17. Services et liens de tiers', paragraphs: [
      'CORO peut intégrer ou fournir des liens vers des services exploités par des tiers. Ces services demeurent régis par leurs propres conditions et politiques. CORO n’est pas responsable des services de tiers qu’il ne contrôle pas, sous réserve des obligations qui lui incombent lorsqu’il choisit un fournisseur pour fournir ses propres services.',
    ] },
    { title: '18. Modifications des conditions', paragraphs: [
      'CORO peut modifier les présentes conditions pour refléter l’évolution de la plateforme, de ses pratiques ou des exigences légales. Lorsque des changements importants affectent les droits ou obligations des utilisateurs, un avis approprié est fourni lorsque requis.',
      'La date de la dernière mise à jour est indiquée au début de cette page.',
    ] },
    { title: '19. Droit applicable et juridiction', paragraphs: [
      'Sous réserve des règles impératives qui pourraient s’appliquer, les présentes conditions sont régies par les lois en vigueur dans la province de Québec et les lois fédérales du Canada applicables au Québec.',
      'Tout différend est soumis aux tribunaux compétents du Québec, dans le district judiciaire applicable, sauf lorsqu’une autre règle de compétence impérative s’applique ou qu’une entente commerciale écrite prévoit un mécanisme différent.',
    ] },
    { title: '20. Contact', paragraphs: [
      'Pour toute question concernant les présentes conditions ou l’utilisation de CORO, vous pouvez nous contacter aux coordonnées suivantes :',
    ], contact: true },
  ],
};

const en: TermsContent = {
  metaTitle: 'CORO Terms of Use | SaaS Platform',
  metaDescription: 'Read the CORO SaaS platform Terms of Use, including access rules, responsibilities, intellectual property, subscriptions and service terms.',
  title: 'Terms of Use',
  eyebrow: 'Platform use framework',
  updated: `Last updated: ${LAST_UPDATED_EN}`,
  intro: 'These terms govern access to and use of the CORO website, CORO SaaS platform and related services. CORO is the trade name used to operate the platform. By using CORO or creating an account, you agree to be bound by these terms and by the commercial terms applicable to your subscription.',
  contactLabel: 'CORO',
  privacyLinkLabel: 'Read the Privacy Policy',
  sections: [
    { title: '1. Purpose and scope', paragraphs: [
      'CORO is a professional SaaS platform operated by Mathieu Montaroux, a sole proprietorship registered with the Québec Enterprise Register under the trade name CORO, NEQ 2282543935. The platform is intended, among other things, for the creation, structuring, management, review and export of compliance documentation related to emergency management, fire safety, business continuity, crisis management and related fields.',
      'These terms apply to website visitors, authorized platform users and, where relevant, organizations subscribing to CORO services.',
    ] },
    { title: '2. Professional nature of the platform', paragraphs: [
      'CORO is a tool that supports professional work. The platform may structure information, automate certain tasks, suggest content or facilitate document production, but it does not replace professional analysis, judgment, validation or accountability.',
      'Users remain responsible for verifying the accuracy, relevance, compliance and contextual suitability of any content, document, procedure or deliverable produced or modified using CORO.',
    ] },
    { title: '3. Account creation and security', paragraphs: [
      'Some functions require a user account. You must provide accurate information, keep account information current and protect your login credentials.',
      'You are responsible for activity carried out through your account except where it results from unauthorized access not attributable to you. You must promptly notify us if you suspect compromise, unauthorized access or a security incident.',
    ] },
    { title: '4. Authorized users and customer organization', paragraphs: [
      'Where an account is provided under an organizational subscription, use is limited to users authorized by the customer organization and according to the roles or permissions assigned to them.',
      'The customer organization is responsible for managing its users, assigning appropriate access and the use of the platform by people it authorizes, subject to CORO’s own responsibilities.',
    ] },
    { title: '5. Acceptable use', paragraphs: ['You may not use CORO to:'], bullets: [
      'Violate any law, regulation, order or third-party right.',
      'Introduce malicious code, bypass security measures or attempt to obtain unauthorized access.',
      'Disrupt, overload, probe or test the platform in a way that could affect security or availability without written authorization.',
      'Use another person’s account, credentials or access rights without authorization.',
      'Copy, disassemble, decompile, reverse engineer or attempt to extract CORO source code except to the extent expressly permitted by law.',
      'Resell, sublicense or make the platform available to third parties unless expressly authorized in writing by CORO.',
      'Use CORO fraudulently, abusively or in a way likely to harm the security, integrity or reputation of the service.',
    ] },
    { title: '6. Customer content and data', paragraphs: [
      'Subject to the rights required to provide the service, customers retain their rights in the data, text, documents, files, images, plans and other content they upload, enter or create in their CORO workspace.',
      'Customers grant CORO the limited rights required to host, process, back up, technically reproduce and display that content solely to provide, maintain, secure and improve the services in accordance with the applicable agreement and Privacy Policy.',
      'Customers are responsible for ensuring they have the rights and authorizations required to use and transmit content placed in the platform.',
    ] },
    { title: '7. CORO intellectual property', paragraphs: [
      'The CORO platform, its architecture, code, interfaces, brand and distinctive signs, graphic elements, templates, features, documentation, and associated proprietary materials are protected by applicable intellectual property laws.',
      'No ownership right in CORO is transferred to the user. Subject to compliance with these terms and payment of applicable fees, users receive only a limited, non-exclusive, non-transferable and revocable right to use the platform for the duration of their authorized access.',
    ] },
    { title: '8. Generated, automated or AI-assisted content', paragraphs: [
      'Certain CORO features may use automated mechanisms or AI-assisted functionality to facilitate drafting, structuring or adaptation of content.',
      'Generated or suggested content must be reviewed and validated by a competent user before it is used, approved, delivered to a client or incorporated into an official document. CORO does not guarantee that automated content will be complete, error-free or suitable for every situation.',
    ] },
    { title: '9. Subscriptions, pricing and payment', paragraphs: [
      'Applicable features, usage limits, pricing, billing terms and subscription periods are those shown at the time of purchase or specified in a commercial proposal, order form or separate agreement.',
      'Unless otherwise stated in the applicable agreement, required taxes are added to displayed amounts. Special terms may apply to Enterprise accounts, free trials, promotions or negotiated agreements.',
    ] },
    { title: '10. Free trials and pre-release features', paragraphs: [
      'CORO may offer free trials, beta functions, previews or features under development. These may be changed, limited or withdrawn and may not receive the same service commitments as generally available features.',
    ] },
    { title: '11. Availability, maintenance and evolution of the service', paragraphs: [
      'CORO aims to maintain a reliable service but does not guarantee that the platform will be uninterrupted or error-free at all times. Interruptions may occur for maintenance, upgrades, corrections, security, provider failures or events beyond our reasonable control.',
      'We may evolve CORO’s interface, features, technical procedures and architecture to improve the service, maintain security or meet new requirements, subject to applicable contractual commitments.',
    ] },
    { title: '12. Backups, exports and retention', paragraphs: [
      'CORO implements backup and continuity mechanisms appropriate to its infrastructure. Customers remain responsible for exporting and retaining copies of deliverables they consider necessary for their own operational, regulatory or archival obligations.',
      'Retention or deletion rules following the end of a subscription may be specified in the applicable agreement or Privacy Policy.',
    ] },
    { title: '13. Privacy and personal information', paragraphs: [
      'Use of personal information in CORO is subject to our Privacy Policy and applicable law. Customer organizations also remain responsible for their own obligations concerning information they collect and enter into the platform.',
    ], privacyLink: true },
    { title: '13A. CORO — Sentinelle Population text messages', paragraphs: [
      'By subscribing, you agree to receive verification codes and, depending on the selected program, public-safety alerts, pre-alerts, protective-action instructions, incident updates, all-clear messages, and exercises or tests. Message frequency varies.',
      'Message and data rates may apply. Reply STOP to unsubscribe or HELP for help. Consent is not a condition of purchase.',
      'For help, contact CORO at info@getcoro.io or +1 514 791-7871. Carriers are not liable for delayed or undelivered messages.',
    ], smsLinks: true },
    { title: '14. Suspension and termination', paragraphs: [
      'CORO may suspend or restrict access where reasonably necessary to protect service security, prevent abuse, comply with a legal obligation, address non-payment or stop a material violation of these terms.',
      'Termination, non-renewal and end-of-service terms applicable to a paid subscription are those stated in the relevant offer, order or commercial agreement.',
    ] },
    { title: '15. Disclaimer of warranties', paragraphs: [
      'To the extent permitted by law, CORO is provided subject to availability and does not warrant that the platform will meet every specific user requirement or that any document produced using CORO will automatically meet every legal, regulatory, contractual, municipal, sector-specific or building-specific requirement.',
      'Users must carry out the professional and regulatory validations required before relying on or distributing a deliverable.',
    ] },
    { title: '16. Limitation of liability', paragraphs: [
      'To the extent permitted by law, and subject to liability that cannot legally be excluded or limited, CORO is not liable for indirect, incidental, special or consequential damages arising from the use of or inability to use the platform.',
      'Any specific monetary limitation of liability applicable to a commercial subscription may be stated in the agreement with the customer. Nothing in these terms is intended to exclude liability where exclusion is prohibited by law.',
    ] },
    { title: '17. Third-party services and links', paragraphs: [
      'CORO may integrate with or link to services operated by third parties. Those services remain subject to their own terms and policies. CORO is not responsible for third-party services it does not control, subject to obligations CORO assumes when selecting a provider to deliver its own services.',
    ] },
    { title: '18. Changes to these terms', paragraphs: [
      'CORO may modify these terms to reflect changes to the platform, its practices or legal requirements. Where material changes affect user rights or obligations, appropriate notice will be provided where required.',
      'The date of the most recent update appears at the beginning of this page.',
    ] },
    { title: '19. Governing law and jurisdiction', paragraphs: [
      'Subject to any mandatory rules that may apply, these terms are governed by the laws of the Province of Quebec and the federal laws of Canada applicable in Quebec.',
      'Any dispute is submitted to the competent courts of Quebec in the applicable judicial district unless a mandatory jurisdiction rule applies or a written commercial agreement provides a different mechanism.',
    ] },
    { title: '20. Contact', paragraphs: [
      'If you have questions about these terms or the use of CORO, you may contact us at:',
    ], contact: true },
  ],
};

export const termsContent: Record<Locale, TermsContent> = { fr, en };
