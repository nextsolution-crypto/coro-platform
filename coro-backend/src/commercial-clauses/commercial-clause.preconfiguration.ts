import {
  CommercialClauseApplicabilityScope,
  CommercialClauseCategory,
} from '@prisma/client';
import type { ClauseParameterDefinition } from './commercial-clause.registry';

export const B01_PRECONFIGURATION_CONFIRMATION = 'APPLY_B01_STANDARD_DRAFTS';
export const B01_DRAFT_PROVENANCE =
  'CORO_B01_STANDARD_DRAFT_2026-10-13_LEGAL_REVIEW_REQUIRED';

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

const b01StandardClauseDrafts: Array<
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

export const B01_STANDARD_CLAUSE_DRAFTS: StandardClauseDraft[] =
  b01StandardClauseDrafts.map((draft) => ({
    ...draft,
    legalReferences: B01_OFFICIAL_LEGAL_REFERENCES,
  }));

if (B01_STANDARD_CLAUSE_DRAFTS.length !== 25) {
  throw new Error(
    'B01 standard clause registry must contain exactly 25 categories.',
  );
}
