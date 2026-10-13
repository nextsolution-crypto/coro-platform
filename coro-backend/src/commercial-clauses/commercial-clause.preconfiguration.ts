import {
  CommercialClauseApplicabilityScope,
  CommercialClauseCategory,
} from '@prisma/client';
import type { ClauseParameterDefinition } from './commercial-clause.registry';

export const B01_PRECONFIGURATION_CONFIRMATION = 'APPLY_B01_STANDARD_DRAFTS';
export const B01_PREVIOUS_DRAFT_PROVENANCE =
  'CORO_B01_STANDARD_DRAFT_2026-10-13_LEGAL_REVIEW_REQUIRED';
export const B01_DRAFT_PROVENANCE =
  'CORO_B01_FOUNDER_POLICY_ALIGNMENT_2026-10-13_LEGAL_REVIEW_REQUIRED';

export type StandardClauseDraft = {
  category: CommercialClauseCategory;
  titleFR: string;
  titleEN: string;
  textFR: string;
  textEN: string;
  isRequired: boolean;
  applicabilities: CommercialClauseApplicabilityScope[];
  parameters: ClauseParameterDefinition[];
  legalReviewNotes: string;
  legalReferences: readonly string[];
};

export const B01_OFFICIAL_LEGAL_REFERENCES = [
  'https://www.legisquebec.gouv.qc.ca/fr/document/lc/CCQ-1991',
  'https://www.legisquebec.gouv.qc.ca/fr/document/lc/C-11',
  'https://www.legisquebec.gouv.qc.ca/fr/document/lc/P-39.1',
  'https://www.legisquebec.gouv.qc.ca/fr/document/lc/C-1.1',
  'https://www.revenuquebec.ca/fr/entreprises/taxes/tpstvh-et-tvq/',
] as const;

const all = ['ALL_OFFERS'] as CommercialClauseApplicabilityScope[];
const conditional = ['COMBINED_OFFER'] as CommercialClauseApplicabilityScope[];
const p = (
  key: string,
  type: ClauseParameterDefinition['type'],
): ClauseParameterDefinition => ({ key, type, required: true });

const b01PreviousStandardClauseDrafts: Array<
  Omit<StandardClauseDraft, 'legalReferences'>
> = [
  {
    category: 'OFFER_VALIDITY',
    titleFR: 'Validité de l’offre',
    titleEN: 'Offer validity',
    isRequired: true,
    applicabilities: all,
    parameters: [p('offerValidityDays', 'DURATION_DAYS')],
    legalReviewNotes: 'Confirmer le point de départ à l’émission officielle.',
    textFR:
      'L’offre demeure valide pendant quatre-vingt-dix (90) jours civils suivant sa date d’émission officielle. Après cette période, CORO peut retirer l’offre ou en réviser les conditions avant toute acceptation.',
    textEN:
      'The offer remains valid for ninety (90) calendar days following its official issuance date. After that period, CORO may withdraw the offer or revise its terms before acceptance.',
  },
  {
    category: 'CURRENCY_AND_TAXES',
    titleFR: 'Devise et taxes',
    titleEN: 'Currency and taxes',
    isRequired: true,
    applicabilities: all,
    parameters: [],
    legalReviewNotes:
      'Valider la formulation TPS/TVQ et les ventes hors Québec.',
    textFR:
      'Les montants sont exprimés dans la devise indiquée par l’autorité économique officielle de l’offre, soit en dollars canadiens lorsqu’elle indique CAD. Les taxes applicables, notamment la TPS et la TVQ, s’ajoutent aux montants indiqués sauf mention expresse contraire.',
    textEN:
      'Amounts are stated in the currency identified by the offer’s official economic authority, in Canadian dollars when it specifies CAD. Applicable taxes, including GST and QST, are added to stated amounts unless expressly indicated otherwise.',
  },
  {
    category: 'PAYMENT_TERMS',
    titleFR: 'Modalités de paiement',
    titleEN: 'Payment terms',
    isRequired: true,
    applicabilities: all,
    parameters: [p('paymentDeadlineDays', 'DURATION_DAYS')],
    legalReviewNotes: 'Net 30 approuvé; mécanismes de recouvrement à valider.',
    textFR:
      'Chaque somme facturée est payable dans les trente (30) jours civils suivant la date de la facture. Le Client doit signaler de bonne foi toute contestation avant l’échéance et acquitter sans délai la portion non contestée.',
    textEN:
      'Each invoiced amount is payable within thirty (30) calendar days after the invoice date. The Customer must raise any good-faith dispute before the due date and promptly pay the undisputed portion.',
  },
  {
    category: 'INVOICING',
    titleFR: 'Facturation',
    titleEN: 'Invoicing',
    isRequired: true,
    applicabilities: all,
    parameters: [],
    legalReviewNotes: 'Confirmer les exigences de facturation électronique.',
    textFR:
      'CORO facture les frais selon l’échéancier et la cadence indiqués dans l’offre acceptée. Les factures sont transmises électroniquement aux coordonnées désignées par le Client, qui demeure responsable de leur mise à jour.',
    textEN:
      'CORO invoices fees according to the schedule and cadence stated in the accepted offer. Invoices are delivered electronically to the contact details designated by the Customer, who remains responsible for keeping them current.',
  },
  {
    category: 'SAAS_SUBSCRIPTION',
    titleFR: 'Abonnement SaaS',
    titleEN: 'SaaS subscription',
    isRequired: true,
    applicabilities: all,
    parameters: [p('subscriptionTermMonths', 'DURATION_MONTHS')],
    legalReviewNotes: 'Durée initiale de 12 mois approuvée.',
    textFR:
      'L’abonnement confère, pour une période initiale de douze (12) mois civils, un droit limité, non exclusif et non transférable d’accéder aux fonctions expressément souscrites. Il ne crée aucun droit sur un module, une capacité ou un service qui n’est pas identifié dans l’offre acceptée et provisionné séparément.',
    textEN:
      'The subscription grants, for an initial term of twelve (12) calendar months, a limited, non-exclusive and non-transferable right to access the functions expressly subscribed to. It creates no right to any module, capability or service not identified in the accepted offer and separately provisioned.',
  },
  {
    category: 'RENEWAL',
    titleFR: 'Renouvellement',
    titleEN: 'Renewal',
    isRequired: true,
    applicabilities: all,
    parameters: [p('renewalNoticeDays', 'DURATION_DAYS')],
    legalReviewNotes:
      'Durée de renouvellement TO_CONFIRM; ne pas approuver avant décision.',
    textFR:
      'Le renouvellement automatique est prévu en principe, sous réserve de la durée de renouvellement qui demeure À CONFIRMER. Chaque partie pourra donner un avis écrit de non-renouvellement au moins trente (30) jours civils avant la fin du terme alors applicable.',
    textEN:
      'Automatic renewal is intended in principle, subject to a renewal term that remains TO BE CONFIRMED. Either party may give written notice of non-renewal at least thirty (30) calendar days before the end of the then-current term.',
  },
  {
    category: 'TERMINATION',
    titleFR: 'Résiliation',
    titleEN: 'Termination',
    isRequired: true,
    applicabilities: all,
    parameters: [],
    legalReviewNotes: 'Délai de remède TO_CONFIRM.',
    textFR:
      'Une partie pourra résilier l’entente en cas de manquement important non corrigé après un avis écrit et l’expiration d’un délai de remède À CONFIRMER. Les droits acquis, sommes exigibles et obligations qui, par leur nature, survivent à la résiliation demeurent applicables.',
    textEN:
      'A party may terminate the agreement for a material breach that remains uncured after written notice and a cure period TO BE CONFIRMED. Accrued rights, amounts due and obligations that by their nature survive termination remain effective.',
  },
  {
    category: 'SUSPENSION',
    titleFR: 'Suspension',
    titleEN: 'Suspension',
    isRequired: true,
    applicabilities: all,
    parameters: [],
    legalReviewNotes: 'Valider avis, urgence et proportionnalité.',
    textFR:
      'CORO pourra suspendre de façon proportionnée un accès lorsque cela est raisonnablement nécessaire pour la sécurité, l’intégrité du service, une exigence légale ou un défaut de paiement important, après avis lorsque les circonstances le permettent. La suspension ne vaut pas résiliation et les parties collaborent afin de rétablir le service.',
    textEN:
      'CORO may proportionately suspend access when reasonably necessary for security, service integrity, a legal requirement or a material payment default, with notice where circumstances permit. Suspension is not termination, and the parties will cooperate to restore service.',
  },
  {
    category: 'SUPPORT_AND_MAINTENANCE',
    titleFR: 'Soutien et maintenance',
    titleEN: 'Support and maintenance',
    isRequired: true,
    applicabilities: all,
    parameters: [],
    legalReviewNotes: 'SLA et heures de soutien TO_CONFIRM.',
    textFR:
      'CORO fournit le soutien et la maintenance décrits dans l’offre ou une annexe applicable. Aucun délai d’intervention, service continu 24/7 ou niveau de service particulier n’est garanti tant qu’un SLA approuvé n’a pas été expressément intégré.',
    textEN:
      'CORO provides the support and maintenance described in the offer or an applicable schedule. No response time, continuous 24/7 service or specific service level is guaranteed unless an approved SLA is expressly incorporated.',
  },
  {
    category: 'SERVICE_AVAILABILITY',
    titleFR: 'Disponibilité du service',
    titleEN: 'Service availability',
    isRequired: true,
    applicabilities: all,
    parameters: [],
    legalReviewNotes: 'SLA TO_CONFIRM; exclusions et maintenance à valider.',
    textFR:
      'CORO déploie des mesures raisonnables pour maintenir la disponibilité technique du service, sous réserve des maintenances, dépendances tierces et événements hors de son contrôle. Le service ne garantit ni la livraison universelle de messages ni un résultat d’urgence, réglementaire ou opérationnel.',
    textEN:
      'CORO uses reasonable measures to maintain the technical availability of the service, subject to maintenance, third-party dependencies and events beyond its control. The service does not guarantee universal message delivery or any emergency, regulatory or operational outcome.',
  },
  {
    category: 'IMPLEMENTATION',
    titleFR: 'Implantation',
    titleEN: 'Implementation',
    isRequired: false,
    applicabilities: conditional,
    parameters: [p('implementationSchedule', 'TEXT')],
    legalReviewNotes: 'Échéancier propre à chaque offre.',
    textFR:
      'Les activités d’implantation, livrables, dépendances et responsabilités sont ceux décrits dans l’offre acceptée. Les échéances supposent la collaboration diligente du Client et seront ajustées de bonne foi si une dépendance ou information requise est retardée.',
    textEN:
      'Implementation activities, deliverables, dependencies and responsibilities are those described in the accepted offer. Timelines assume the Customer’s diligent cooperation and will be adjusted in good faith if a required dependency or information is delayed.',
  },
  {
    category: 'PROFESSIONAL_SERVICES',
    titleFR: 'Services professionnels',
    titleEN: 'Professional services',
    isRequired: false,
    applicabilities: ['PROFESSIONAL_SERVICES'],
    parameters: [],
    legalReviewNotes: 'Distinguer clairement conseil et logiciel.',
    textFR:
      'Les services professionnels sont distincts de l’accès au logiciel et sont limités au mandat décrit dans l’offre. Les recommandations de CORO ne constituent ni une approbation réglementaire ni une garantie de conformité ou de résultat.',
    textEN:
      'Professional services are separate from software access and are limited to the engagement described in the offer. CORO recommendations do not constitute regulatory approval or a guarantee of compliance or outcome.',
  },
  {
    category: 'SCOPE_CHANGE',
    titleFR: 'Modification de portée',
    titleEN: 'Scope changes',
    isRequired: true,
    applicabilities: all,
    parameters: [],
    legalReviewNotes: 'Processus de changement à harmoniser avec les offres.',
    textFR:
      'Toute modification importante de la portée, des volumes, des livrables ou des hypothèses doit être convenue par écrit. CORO présentera, lorsque pertinent, les incidences sur les frais et l’échéancier avant l’exécution du changement.',
    textEN:
      'Any material change to scope, volumes, deliverables or assumptions must be agreed in writing. Where applicable, CORO will present the effect on fees and timelines before performing the change.',
  },
  {
    category: 'CUSTOMER_OBLIGATIONS',
    titleFR: 'Obligations du Client',
    titleEN: 'Customer obligations',
    isRequired: true,
    applicabilities: all,
    parameters: [],
    legalReviewNotes: 'Valider responsabilités et utilisateurs autorisés.',
    textFR:
      'Le Client fournit des renseignements exacts, maintient ses accès et coordonnées, obtient les consentements requis et utilise le service conformément aux lois et à la documentation applicable. Les données saisies par le Client ne sont pas réputées vérifiées indépendamment par CORO.',
    textEN:
      'The Customer provides accurate information, maintains its access credentials and contact details, obtains required consents and uses the service in accordance with applicable law and documentation. Customer-entered data is not deemed independently verified by CORO.',
  },
  {
    category: 'DELAYS',
    titleFR: 'Délais',
    titleEN: 'Delays',
    isRequired: true,
    applicabilities: all,
    parameters: [p('delayThresholdDays', 'DURATION_DAYS')],
    legalReviewNotes: 'Seuil TO_CONFIRM.',
    textFR:
      'Chaque partie informe rapidement l’autre d’un retard prévisible. Les conséquences d’un retard attribuable au Client, à un tiers ou à une dépendance seront évaluées de bonne foi; tout seuil contractuel demeure À CONFIRMER.',
    textEN:
      'Each party will promptly inform the other of a foreseeable delay. The effects of a delay attributable to the Customer, a third party or a dependency will be assessed in good faith; any contractual threshold remains TO BE CONFIRMED.',
  },
  {
    category: 'ADDITIONAL_FEES',
    titleFR: 'Frais additionnels',
    titleEN: 'Additional fees',
    isRequired: false,
    applicabilities: conditional,
    parameters: [p('additionalServiceRateMinor', 'MONEY_MINOR')],
    legalReviewNotes: 'SMS et autres frais TO_CONFIRM.',
    textFR:
      'Aucun frais additionnel n’est exigible sans fondement dans l’offre acceptée ou une modification convenue. Les frais de messagerie SMS, d’usage excédentaire, de déplacement ou de service spécialisé demeurent À CONFIRMER lorsqu’ils ne sont pas expressément chiffrés.',
    textEN:
      'No additional fee is payable unless supported by the accepted offer or an agreed change. SMS messaging, excess usage, travel and specialized-service fees remain TO BE CONFIRMED unless expressly priced.',
  },
  {
    category: 'PENALTIES',
    titleFR: 'Pénalités et intérêts',
    titleEN: 'Penalties and interest',
    isRequired: false,
    applicabilities: conditional,
    parameters: [p('penaltyAmountMinor', 'MONEY_MINOR')],
    legalReviewNotes: 'Aucun montant approuvé; validation juridique requise.',
    textFR:
      'Aucune pénalité ni somme forfaitaire n’est applicable à moins d’être expressément indiquée dans l’offre acceptée et permise par la loi. Tout montant ou mécanisme demeure À CONFIRMER et doit faire l’objet d’une revue juridique.',
    textEN:
      'No penalty or liquidated amount applies unless expressly stated in the accepted offer and permitted by law. Any amount or mechanism remains TO BE CONFIRMED and requires legal review.',
  },
  {
    category: 'CONFIDENTIALITY',
    titleFR: 'Confidentialité',
    titleEN: 'Confidentiality',
    isRequired: true,
    applicabilities: all,
    parameters: [],
    legalReviewNotes: 'Valider exclusions et durée de survie.',
    textFR:
      'Chaque partie protège les renseignements confidentiels de l’autre avec des mesures au moins raisonnables et les utilise uniquement pour exécuter l’entente. Cette obligation ne vise pas les renseignements devenus publics sans faute, reçus licitement d’un tiers ou dont la divulgation est exigée par la loi.',
    textEN:
      'Each party protects the other’s confidential information using at least reasonable safeguards and uses it only to perform the agreement. This obligation does not cover information made public without fault, lawfully received from a third party or required to be disclosed by law.',
  },
  {
    category: 'DATA_PROTECTION',
    titleFR: 'Protection des renseignements personnels',
    titleEN: 'Protection of personal information',
    isRequired: true,
    applicabilities: all,
    parameters: [],
    legalReviewNotes:
      'Aligner avec politiques, rôles et ententes de traitement applicables.',
    textFR:
      'Chaque partie respecte les lois applicables en matière de protection des renseignements personnels. CORO applique des mesures de sécurité raisonnables à l’information sous son contrôle, et le Client demeure responsable de l’autorité, des avis et des consentements nécessaires pour les renseignements qu’il fournit.',
    textEN:
      'Each party complies with applicable privacy laws. CORO applies reasonable security safeguards to information under its control, and the Customer remains responsible for the authority, notices and consents required for information it provides.',
  },
  {
    category: 'DATA_RETENTION_AND_RETURN',
    titleFR: 'Conservation et retour des données',
    titleEN: 'Data retention and return',
    isRequired: true,
    applicabilities: all,
    parameters: [],
    legalReviewNotes: 'Durée de conservation TO_CONFIRM.',
    textFR:
      'Les modalités d’exportation, de retour et de suppression des données suivent l’entente, les capacités techniques et les obligations légales applicables. La période de conservation après la fin des services demeure À CONFIRMER; aucune conservation indéfinie n’est promise.',
    textEN:
      'Data export, return and deletion follow the agreement, technical capabilities and applicable legal obligations. The retention period after services end remains TO BE CONFIRMED; indefinite retention is not promised.',
  },
  {
    category: 'INTELLECTUAL_PROPERTY',
    titleFR: 'Propriété intellectuelle',
    titleEN: 'Intellectual property',
    isRequired: true,
    applicabilities: all,
    parameters: [],
    legalReviewNotes: 'Valider livrables sur mesure et licences tierces.',
    textFR:
      'Chaque partie conserve ses droits antérieurs. CORO conserve les droits sur sa plateforme, ses méthodes et ses améliorations; le Client conserve les droits sur ses données et reçoit uniquement les droits d’utilisation expressément prévus pour les livrables.',
    textEN:
      'Each party retains its pre-existing rights. CORO retains rights in its platform, methods and improvements; the Customer retains rights in its data and receives only the expressly stated use rights for deliverables.',
  },
  {
    category: 'LIABILITY',
    titleFR: 'Responsabilité',
    titleEN: 'Liability',
    isRequired: true,
    applicabilities: all,
    parameters: [],
    legalReviewNotes:
      'Plafond et exclusions TO_CONFIRM; revue juridique obligatoire.',
    textFR:
      'La responsabilité de chaque partie demeure soumise au droit applicable et aux exclusions valides qui seront convenues. Le plafond de responsabilité, ses exceptions et le traitement des dommages indirects demeurent À CONFIRMER; la présente version ne crée aucune limitation non approuvée.',
    textEN:
      'Each party’s liability remains subject to applicable law and valid exclusions to be agreed. The liability cap, its exceptions and the treatment of indirect damages remain TO BE CONFIRMED; this draft creates no unapproved limitation.',
  },
  {
    category: 'FORCE_MAJEURE',
    titleFR: 'Force majeure',
    titleEN: 'Force majeure',
    isRequired: true,
    applicabilities: all,
    parameters: [],
    legalReviewNotes: 'Aligner avec le Code civil du Québec.',
    textFR:
      'Une partie n’est pas responsable d’un défaut causé par un événement imprévisible et irrésistible hors de son contrôle raisonnable, sous réserve de ses obligations de mitigation et d’information. Les obligations de paiement déjà exigibles ne sont pas automatiquement éteintes.',
    textEN:
      'A party is not liable for a failure caused by an unforeseeable and irresistible event beyond its reasonable control, subject to its duties to mitigate and provide notice. Payment obligations already due are not automatically discharged.',
  },
  {
    category: 'GOVERNING_LAW',
    titleFR: 'Droit applicable',
    titleEN: 'Governing law',
    isRequired: true,
    applicabilities: all,
    parameters: [p('applicableJurisdiction', 'JURISDICTION')],
    legalReviewNotes: 'Confirmer district judiciaire et contexte hors Québec.',
    textFR:
      'L’entente est régie par les lois applicables au Québec et les lois fédérales du Canada qui s’y appliquent, sans égard aux règles de conflit. Le tribunal ou district compétent demeure À CONFIRMER avant approbation juridique.',
    textEN:
      'The agreement is governed by the laws applicable in Québec and the federal laws of Canada applicable there, without regard to conflict-of-law rules. The competent court or judicial district remains TO BE CONFIRMED before legal approval.',
  },
  {
    category: 'ACCEPTANCE',
    titleFR: 'Acceptation',
    titleEN: 'Acceptance',
    isRequired: true,
    applicabilities: all,
    parameters: [],
    legalReviewNotes:
      'Distinguer émission, acceptation électronique et signature externe.',
    textFR:
      'L’émission d’une proposition ne constitue pas son acceptation. L’entente prend effet uniquement selon le mécanisme d’acceptation approuvé, avec la preuve électronique ou la signature externe requise; aucune date de signature ne peut être présumée ou antidatée.',
    textEN:
      'Issuance of a proposal does not constitute acceptance. The agreement takes effect only through the approved acceptance mechanism with the required electronic evidence or external signature; no signature date may be presumed or backdated.',
  },
];

export const B01_PREVIOUS_STANDARD_CLAUSE_DRAFTS: StandardClauseDraft[] =
  b01PreviousStandardClauseDrafts.map((draft) => ({
    ...draft,
    legalReferences: B01_OFFICIAL_LEGAL_REFERENCES,
  }));

const founderPolicyAlignment: Partial<
  Record<
    CommercialClauseCategory,
    Pick<StandardClauseDraft, 'textFR' | 'textEN' | 'legalReviewNotes'>
  >
> = {
  RENEWAL: {
    legalReviewNotes:
      'Mécanisme commercial confirmé; droits impératifs et articulation avec les dates contractuelles à valider juridiquement.',
    textFR:
      'Après la période initiale de douze (12) mois civils, l’abonnement se renouvelle automatiquement pour des périodes successives de douze (12) mois civils, sauf si l’une des parties transmet à l’autre un avis écrit de non-renouvellement au moins trente (30) jours civils avant l’expiration du terme alors applicable. Les dates du terme initial, de chaque renouvellement et de l’échéance de l’avis sont déterminées par les dates contractuelles canoniques de l’offre acceptée; aucune date de signature, de prise d’effet ou de renouvellement n’est présumée ni appliquée rétroactivement. Les droits impératifs applicables demeurent réservés.',
    textEN:
      'After the initial term of twelve (12) calendar months, the subscription automatically renews for successive periods of twelve (12) calendar months unless either party gives the other written notice of non-renewal at least thirty (30) calendar days before the then-current term expires. The initial term, each renewal and the notice deadline are determined from the canonical contractual dates of the accepted offer; no signature, effective or renewal date is presumed or applied retroactively. Applicable mandatory rights remain reserved.',
  },
  TERMINATION: {
    legalReviewNotes:
      'Délai de remède commercial confirmé; exceptions légales et manquements graves à valider juridiquement.',
    textFR:
      'Sous réserve des droits et exceptions prévus par la loi, une partie peut résilier l’entente pour un manquement contractuel important de l’autre partie qui demeure non corrigé trente (30) jours civils après la réception d’un avis écrit décrivant le manquement. Ce délai s’applique réciproquement lorsqu’un remède est possible. Un avis ne suspend ni ne résilie automatiquement l’entente. Les cas où la loi permet une résiliation immédiate, ainsi que les manquements graves ou irrémédiables, doivent faire l’objet d’une appréciation distincte. Aucune pénalité de résiliation n’est créée par la présente clause.',
    textEN:
      'Subject to rights and exceptions under applicable law, either party may terminate the agreement for the other party’s material contractual breach that remains uncured thirty (30) calendar days after receipt of written notice describing the breach. This period applies reciprocally where cure is possible. Notice does not automatically suspend or terminate the agreement. Circumstances where immediate termination is permitted by law, as well as serious or irremediable breaches, require separate assessment. This clause creates no termination penalty.',
  },
  SUPPORT_AND_MAINTENANCE: {
    legalReviewNotes:
      'Valider les canaux réellement offerts et une éventuelle annexe spécialisée Sentinelle/Population avant approbation.',
    textFR:
      'Le soutien standard de CORO est offert du lundi au vendredi, de 9 h à 17 h, heure de l’Amérique/Toronto, à l’exclusion des jours fériés applicables au Québec, par les canaux de soutien effectivement mis à disposition. Aucun soutien 24/7, délai garanti de réponse ou de résolution, ni niveau de service quantifié n’est inclus. Tout engagement de soutien critique pour CORO Sentinelle ou Sentinelle Population exige une entente distincte expressément convenue avant son application.',
    textEN:
      'CORO standard support is available Monday through Friday, from 9:00 a.m. to 5:00 p.m. America/Toronto time, excluding applicable Québec statutory holidays, through the support channels actually made available. No 24/7 support, guaranteed response or resolution time, or quantified service level is included. Any critical-support commitment for CORO Sentinelle or Sentinelle Population requires a separate agreement expressly accepted before it applies.',
  },
  SERVICE_AVAILABILITY: {
    legalReviewNotes:
      'Aucun SLA quantifié approuvé; dépendances, maintenance et engagements spécialisés à valider.',
    textFR:
      'CORO met en œuvre des mesures raisonnables pour maintenir la disponibilité technique du service, sous réserve des maintenances, dépendances tierces et événements hors de son contrôle raisonnable. Aucun pourcentage de disponibilité, délai de rétablissement ou résultat d’urgence, réglementaire ou opérationnel n’est garanti par la présente clause. L’acceptation par un fournisseur, l’envoi et la livraison confirmée d’une communication constituent des événements distincts, et la livraison universelle de messages n’est pas garantie.',
    textEN:
      'CORO uses reasonable measures to maintain the technical availability of the service, subject to maintenance, third-party dependencies and events beyond its reasonable control. This clause provides no guaranteed availability percentage, restoration time, or emergency, regulatory or operational outcome. Provider acceptance, dispatch and confirmed delivery of a communication are distinct events, and universal message delivery is not guaranteed.',
  },
  SCOPE_CHANGE: {
    legalReviewNotes:
      'Processus de changement à harmoniser avec les offres; toute exclusivité exige une entente spécialisée.',
    textFR:
      'Toute modification importante de la portée, des volumes, des livrables ou des hypothèses doit être convenue par écrit. CORO présente, lorsque pertinent, les incidences sur les frais et l’échéancier avant l’exécution du changement. Aucune exclusivité n’est comprise dans l’abonnement standard ni accordée automatiquement. Toute exclusivité exceptionnelle exige une entente distincte et explicite précisant le territoire, le secteur ou segment de clientèle, les modules ou fonctions couverts, la durée, la contrepartie financière, les exclusions et les conditions de résiliation; elle ne crée aucun droit commercial ou technique avant les actes distincts requis.',
    textEN:
      'Any material change to scope, volumes, deliverables or assumptions must be agreed in writing. Where applicable, CORO presents the effect on fees and timelines before performing the change. No exclusivity is included in the standard subscription or granted automatically. Any exceptional exclusivity requires a separate express agreement specifying territory, sector or customer segment, covered modules or functions, duration, financial consideration, exclusions and termination conditions; it creates no commercial or technical right before the required separate actions occur.',
  },
  ADDITIONAL_FEES: {
    legalReviewNotes:
      'Valider les quotas courriel, les modalités d’usage SMS et leur présentation contractuelle avant approbation.',
    textFR:
      'Aucun frais additionnel n’est exigible sans fondement dans l’offre acceptée ou une modification convenue. Pour Sentinelle Population, l’abonnement SaaS est distinct de la consommation de communications. Les SMS sont facturés selon l’usage aux tarifs gouvernés par le PriceBook applicable, lesquels doivent être divulgués et acceptés avant activation; aucun tarif SMS n’est fixé par la présente clause. Les quotas et limites de courriels doivent être définis dans l’entente applicable. L’acceptation par le fournisseur, l’envoi et la livraison confirmée sont des événements distincts, et aucune livraison universelle n’est garantie.',
    textEN:
      'No additional fee is payable unless supported by the accepted offer or an agreed change. For Sentinelle Population, the SaaS subscription is separate from communication consumption. SMS is charged based on usage at rates governed by the applicable PriceBook, which must be disclosed and accepted before activation; this clause sets no SMS rate. Email quotas and limits must be defined in the applicable agreement. Provider acceptance, dispatch and confirmed delivery are distinct events, and universal delivery is not guaranteed.',
  },
  CONFIDENTIALITY: {
    legalReviewNotes:
      'Valider exclusions, durée de survie et traitement spécialisé futur de la responsabilité liée à la confidentialité.',
    textFR:
      'Chaque partie protège les renseignements confidentiels de l’autre avec des mesures au moins raisonnables et les utilise uniquement pour exécuter l’entente. Cette obligation ne vise pas les renseignements devenus publics sans faute, reçus licitement d’un tiers ou dont la divulgation est exigée par la loi. Les recours et limites de responsabilité propres à la confidentialité doivent être traités dans une annexe spécialisée soumise à une revue juridique et commerciale ultérieure; aucun plafond distinct n’est créé par le présent brouillon.',
    textEN:
      'Each party protects the other’s confidential information using at least reasonable safeguards and uses it only to perform the agreement. This obligation does not cover information made public without fault, lawfully received from a third party or required to be disclosed by law. Remedies and liability limits specific to confidentiality must be addressed in a specialized schedule subject to future legal and commercial review; this draft creates no separate cap.',
  },
  DATA_PROTECTION: {
    legalReviewNotes:
      'Aligner avec les rôles, politiques et futures annexes spécialisées de confidentialité, cybersécurité et Sentinelle/Population.',
    textFR:
      'Chaque partie respecte les lois applicables en matière de protection des renseignements personnels. CORO applique des mesures de sécurité raisonnables à l’information sous son contrôle, et le Client demeure responsable de l’autorité, des avis et des consentements nécessaires pour les renseignements qu’il fournit. Les obligations et limites de responsabilité propres aux renseignements personnels, à la cybersécurité, à CORO Sentinelle et à Sentinelle Population exigent des annexes spécialisées soumises à une revue juridique et commerciale ultérieure; aucun plafond distinct n’est créé par le présent brouillon.',
    textEN:
      'Each party complies with applicable privacy laws. CORO applies reasonable security safeguards to information under its control, and the Customer remains responsible for the authority, notices and consents required for information it provides. Obligations and liability limits specific to personal information, cybersecurity, CORO Sentinelle and Sentinelle Population require specialized schedules subject to future legal and commercial review; this draft creates no separate cap.',
  },
  DATA_RETENTION_AND_RETURN: {
    legalReviewNotes:
      'Validation technique requise pour les mécanismes d’exportation et la politique distincte de conservation des sauvegardes.',
    textFR:
      'Pendant les trente (30) jours civils suivant la fin du contrat, le Client peut demander le retour de ses données au moyen des mécanismes d’exportation techniquement pris en charge et sous réserve du droit applicable. Les données admissibles peuvent ensuite faire l’objet d’une suppression contrôlée ou d’une anonymisation, sous réserve des obligations de conservation légale, de preuve, de sécurité et de traçabilité. La suppression des sauvegardes suit une politique technique de conservation distincte qui doit être validée avant approbation juridique. Aucune date ferme d’achèvement de suppression ni aucun format d’exportation particulier n’est promis par le présent brouillon.',
    textEN:
      'For thirty (30) calendar days after contract termination, the Customer may request return of its data using technically supported export mechanisms and subject to applicable law. Eligible data may then be subject to controlled deletion or anonymization, subject to legal retention, evidence, security and traceability obligations. Backup deletion follows a separate technical retention policy that must be validated before legal approval. This draft promises neither a fixed deletion-completion deadline nor a particular export format.',
  },
  LIABILITY: {
    legalReviewNotes:
      'Plafond général commercial proposé; exclusions impératives et annexes spécialisées à valider juridiquement avant toute approbation.',
    textFR:
      'Sous réserve des responsabilités qui ne peuvent être exclues ou limitées par la loi applicable, la responsabilité totale de chaque partie découlant d’un événement est proposée comme étant limitée aux frais payés ou payables pour les services touchés au cours des douze (12) mois précédant l’événement à l’origine de la réclamation. Si l’événement survient pendant la première année d’abonnement, la référence proposée est l’engagement annuel initial prévu au contrat pour les services touchés. Aucune limitation ne s’applique lorsqu’elle est interdite, notamment en cas de faute intentionnelle ou lourde ou de préjudice corporel ou moral. La confidentialité, les renseignements personnels, la cybersécurité, CORO Sentinelle et Sentinelle Population nécessitent des annexes spécialisées soumises à une revue juridique et commerciale ultérieure; aucun plafond distinct n’est créé par le présent brouillon.',
    textEN:
      'Subject to liabilities that cannot be excluded or limited under applicable law, each party’s aggregate liability arising from an event is proposed to be limited to fees paid or payable for the affected services during the twelve (12) months preceding the event giving rise to the claim. If the event occurs during the first subscription year, the proposed reference is the contractual first annual commitment for the affected services. No limitation applies where prohibited, including in cases of intentional or gross fault or bodily or moral injury. Confidentiality, personal information, cybersecurity, CORO Sentinelle and Sentinelle Population require specialized schedules subject to future legal and commercial review; this draft creates no separate cap.',
  },
};

export const B01_STANDARD_CLAUSE_DRAFTS: StandardClauseDraft[] =
  B01_PREVIOUS_STANDARD_CLAUSE_DRAFTS.map((draft) => ({
    ...draft,
    ...founderPolicyAlignment[draft.category],
  }));

if (B01_STANDARD_CLAUSE_DRAFTS.length !== 25) {
  throw new Error(
    'B01 standard clause registry must contain exactly 25 categories.',
  );
}
