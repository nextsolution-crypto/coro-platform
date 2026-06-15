// ============================================================
// CORO — P107 : Déversement de matières dangereuses (Industriel)
// Activé si : is_industrial + has_hazmat
// ============================================================

import { ProcedureTemplate, COLORS, sid } from './types';

const CODE = 'P107';

export const P107_DEVERSEMENT_MATDANG_IND: ProcedureTemplate = {
  id: 'p107_deversement_matdang_ind',
  code: CODE,
  titleFR: 'DÉVERSEMENT DE MATIÈRES DANGEREUSES',
  titleEN: 'HAZARDOUS MATERIALS SPILL',
  icon: '⚠️',
  headerColor: COLORS.brown,
  activationRule: 'is_industrial',
  documentTypes: ['PMU', 'PSI'],
  roleSections: [
    {
      roleCode: 'ROLE-RM',
      roleLabelFR: 'Responsable de la maintenance',
      roleLabelEN: 'Maintenance Supervisor',
      headerColor: COLORS.brown,
      steps: [
        // ── Restez calme ────────────────────────────────────
        {
          id: sid(CODE, 1),
          textFR: '**Rester calme**',
          textEN: '**Stay calm**',
          isBold: true,
          isRed: true,
        },
        {
          id: sid(CODE, 2),
          textFR: 'Conserver son sang-froid pour assurer une gestion efficace et sécuritaire',
          textEN: 'Keep composure to ensure effective and safe management',
          isBold: false,
        },
        {
          id: sid(CODE, 3),
          textFR: 'Interdire tout accès à la zone à des personnes non autorisées',
          textEN: 'Prohibit access to the area to unauthorized persons',
          isBold: false,
        },
        // ── Identification du produit ────────────────────────
        {
          id: sid(CODE, 4),
          textFR: '**Identification du produit**',
          textEN: '**Product identification**',
          isBold: true,
          isRed: true,
        },
        {
          id: sid(CODE, 5),
          textFR: 'Identifier le produit dangereux à partir de :',
          textEN: 'Identify the hazardous product from:',
          isBold: false,
          subSteps: [
            {
              id: sid(CODE, 6),
              textFR: 'De l\'étiquette sur le contenant',
              textEN: 'The label on the container',
              isList: true,
            },
            {
              id: sid(CODE, 7),
              textFR: 'De la fiche de données de sécurité (FDS) disponible sur le site',
              textEN: 'The safety data sheet (SDS) available on site',
              isList: true,
            },
            {
              id: sid(CODE, 8),
              textFR: 'Des informations internes de stockage (inventaire ou registre des produits)',
              textEN: 'Internal storage information (product inventory or register)',
              isList: true,
            },
          ],
        },
        // ── Évaluation préliminaire ─────────────────────────
        {
          id: sid(CODE, 9),
          textFR: '**Évaluation préliminaire**',
          textEN: '**Preliminary assessment**',
          isBold: true,
          isRed: true,
        },
        {
          id: sid(CODE, 10),
          textFR: 'Déterminer la quantité approximative du produit déversé',
          textEN: 'Determine the approximate quantity of spilled product',
          isBold: false,
        },
        {
          id: sid(CODE, 11),
          textFR: 'Évaluer si le produit présente un danger immédiat pour la santé, la sécurité ou l\'environnement : toxicité aiguë, inflammabilité, corrosivité, risque de vapeur nocive, etc.',
          textEN: 'Assess whether the product presents an immediate danger to health, safety, or the environment: acute toxicity, flammability, corrosivity, harmful vapor risk, etc.',
          isBold: false,
        },
        {
          id: sid(CODE, 12),
          textFR: 'Vérifier la présence de drains, égouts, sources d\'eau ou conduits à proximité',
          textEN: 'Check for drains, sewers, water sources, or conduits nearby',
          isBold: false,
        },
        // ── PETIT DÉVERSEMENT (<10 L) ───────────────────────
        {
          id: sid(CODE, 13),
          textFR: '**PETIT DÉVERSEMENT (MOINS DE 10 LITRES)**',
          textEN: '**SMALL SPILL (LESS THAN 10 LITRES)**',
          isBold: true,
          isRed: true,
        },
        {
          id: sid(CODE, 14),
          textFR: 'Vérification de l\'intervention :',
          textEN: 'Intervention verification:',
          isBold: false,
          subSteps: [
            {
              id: sid(CODE, 15),
              textFR: 'S\'assurer que seules les personnes formées et autorisées interviennent',
              textEN: 'Ensure only trained and authorized persons intervene',
              isList: true,
            },
            {
              id: sid(CODE, 16),
              textFR: 'Éloigner les curieux et sécuriser la zone immédiate',
              textEN: 'Remove bystanders and secure the immediate area',
              isList: true,
            },
          ],
        },
        {
          id: sid(CODE, 17),
          textFR: 'Préparation et protection :',
          textEN: 'Preparation and protection:',
          isBold: false,
          subSteps: [
            {
              id: sid(CODE, 18),
              textFR: 'Porter les équipements de protection individuelle (EPI) recommandés dans la FDS (ex. : gants nitrile, lunettes, masque, bottes)',
              textEN: 'Wear personal protective equipment (PPE) recommended in the SDS (e.g., nitrile gloves, goggles, mask, boots)',
              isList: true,
            },
          ],
        },
        {
          id: sid(CODE, 19),
          textFR: 'Évaluer la ventilation : ouvrir les portes ou fenêtres si possible sans propager les vapeurs',
          textEN: 'Assess ventilation: open doors or windows if possible without spreading vapors',
          isBold: false,
        },
        {
          id: sid(CODE, 20),
          textFR: 'Intervention :',
          textEN: 'Intervention:',
          isBold: false,
          subSteps: [
            {
              id: sid(CODE, 21),
              textFR: 'Arrêter la fuite à la source (fermer les valves ou redresser le contenant s\'il est stable)',
              textEN: 'Stop the leak at the source (close valves or right the container if stable)',
              isList: true,
            },
            {
              id: sid(CODE, 22),
              textFR: 'Utiliser la trousse de déversement appropriée pour contenir le produit : absorbants, coussins chimiques, ou granulés spécifiques selon la nature du produit',
              textEN: 'Use the appropriate spill kit to contain the product: absorbents, chemical pillows, or specific granules according to the product nature',
              isList: true,
            },
          ],
        },
        {
          id: sid(CODE, 23),
          textFR: 'Empêcher la propagation :',
          textEN: 'Prevent spreading:',
          isBold: false,
          subSteps: [
            {
              id: sid(CODE, 24),
              textFR: 'Boucher ou protéger les drains de plancher pour éviter l\'infiltration dans le réseau d\'égout',
              textEN: 'Plug or protect floor drains to prevent infiltration into the sewer system',
              isList: true,
            },
            {
              id: sid(CODE, 25),
              textFR: 'Placer les matériaux contaminés dans des contenants étanches, identifiés et conformes à la réglementation',
              textEN: 'Place contaminated materials in sealed containers, identified and compliant with regulations',
              isList: true,
            },
          ],
        },
        {
          id: sid(CODE, 26),
          textFR: 'Communication :',
          textEN: 'Communication:',
          isBold: false,
          subSteps: [
            {
              id: sid(CODE, 27),
              textFR: 'Informer le coordonnateur d\'urgence ou le gestionnaire de site de la situation et des mesures prises',
              textEN: 'Inform the emergency coordinator or site manager of the situation and measures taken',
              isList: true,
            },
            {
              id: sid(CODE, 28),
              textFR: 'Conserver un registre des produits impliqués et des actions effectuées',
              textEN: 'Keep a register of products involved and actions taken',
              isList: true,
            },
          ],
        },
        // ── GRAND DÉVERSEMENT (>10 L) ───────────────────────
        {
          id: sid(CODE, 29),
          textFR: '**GRAND DÉVERSEMENT (PLUS DE 10 LITRES) — TOUT DÉVERSEMENT PRÉSENTANT UN DANGER IMMÉDIAT POUR LA SANTÉ OU L\'ENVIRONNEMENT — PRODUIT/RÉACTION INCONNU**',
          textEN: '**LARGE SPILL (MORE THAN 10 LITRES) — ANY SPILL PRESENTING IMMEDIATE DANGER TO HEALTH OR ENVIRONMENT — UNKNOWN PRODUCT/REACTION**',
          isBold: true,
          isRed: true,
        },
        {
          id: sid(CODE, 30),
          textFR: 'Évacuation et sécurisation :',
          textEN: 'Evacuation and securing:',
          isBold: false,
          subSteps: [
            {
              id: sid(CODE, 31),
              textFR: 'Éloigner tout le personnel non essentiel du secteur',
              textEN: 'Move all non-essential personnel away from the sector',
              isList: true,
            },
            {
              id: sid(CODE, 32),
              textFR: 'Limiter l\'accès à la zone contaminée',
              textEN: 'Limit access to the contaminated area',
              isList: true,
            },
            {
              id: sid(CODE, 33),
              textFR: 'Si nécessaire, déclencher l\'évacuation partielle ou générale selon les procédures d\'urgence en vigueur',
              textEN: 'If necessary, trigger partial or general evacuation according to current emergency procedures',
              isList: true,
            },
          ],
        },
        {
          id: sid(CODE, 34),
          textFR: 'Alerte :',
          textEN: 'Alert:',
          isBold: false,
          subSteps: [
            {
              id: sid(CODE, 35),
              textFR: 'Contacter immédiatement le 9-1-1 et fournir : nature du produit et quantité estimée, emplacement précis du déversement, risques potentiels (inhalation, feu, explosion, toxicité)',
              textEN: 'Immediately contact 9-1-1 and provide: product nature and estimated quantity, precise spill location, potential risks (inhalation, fire, explosion, toxicity)',
              isList: true,
            },
          ],
        },
        {
          id: sid(CODE, 36),
          textFR: 'Protection environnementale :',
          textEN: 'Environmental protection:',
          isBold: false,
          subSteps: [
            {
              id: sid(CODE, 37),
              textFR: 'Déterminer la direction du vent et déplacer les employés vers un point de rassemblement sécuritaire, en amont du vent',
              textEN: 'Determine wind direction and move employees to a safe assembly point, upwind',
              isList: true,
            },
            {
              id: sid(CODE, 38),
              textFR: 'Si le produit atteint un drain, un cours d\'eau ou le sol, contacter le MELCCFP : 1-866-694-5454 (urgence) / 1-800-561-1616 (non-urgence)',
              textEN: 'If the product reaches a drain, watercourse, or ground, contact MELCCFP: 1-866-694-5454 (emergency) / 1-800-561-1616 (non-emergency)',
              isList: true,
              isRed: true,
            },
            {
              id: sid(CODE, 39),
              textFR: 'Éviter d\'intervenir sans EPI spécialisé — attendre l\'arrivée de personnel formé ou du fournisseur du produit',
              textEN: 'Avoid intervening without specialized PPE — wait for trained personnel or product supplier arrival',
              isList: true,
            },
          ],
        },
        {
          id: sid(CODE, 40),
          textFR: 'Assistance externe :',
          textEN: 'External assistance:',
          isBold: false,
          subSteps: [
            {
              id: sid(CODE, 41),
              textFR: 'Faciliter l\'accès au site pour les services d\'urgence et les équipes environnementales (pompiers, MELCCFP, firme spécialisée)',
              textEN: 'Facilitate site access for emergency services and environmental teams (firefighters, MELCCFP, specialized firm)',
              isList: true,
            },
            {
              id: sid(CODE, 42),
              textFR: 'Fournir la FDS ou des informations sur le(s) produit(s) concerné(s) ainsi que les informations sur l\'entreposage et les équipements impliqués',
              textEN: 'Provide the SDS or information on the involved product(s) as well as storage and equipment information',
              isList: true,
            },
          ],
        },
        // ── Rapport d'incident ──────────────────────────────
        {
          id: sid(CODE, 43),
          textFR: '**Rapport d\'incident**',
          textEN: '**Incident report**',
          isBold: true,
          isRed: true,
        },
        {
          id: sid(CODE, 44),
          textFR: 'Documenter tous les détails dans le registre des incidents environnementaux :',
          textEN: 'Document all details in the environmental incidents register:',
          isBold: false,
          subSteps: [
            {
              id: sid(CODE, 45),
              textFR: 'Date, heure et lieu du déversement',
              textEN: 'Date, time, and location of the spill',
              isList: true,
            },
            {
              id: sid(CODE, 46),
              textFR: 'Produit et quantité estimée',
              textEN: 'Product and estimated quantity',
              isList: true,
            },
            {
              id: sid(CODE, 47),
              textFR: 'Mesures prises (absorption, confinement, évacuation)',
              textEN: 'Measures taken (absorption, containment, evacuation)',
              isList: true,
            },
            {
              id: sid(CODE, 48),
              textFR: 'Intervenants et services contactés',
              textEN: 'Responders and services contacted',
              isList: true,
            },
            {
              id: sid(CODE, 49),
              textFR: 'Impacts environnementaux observés',
              textEN: 'Observed environmental impacts',
              isList: true,
            },
          ],
        },
        // ── Mise à jour des protocoles ──────────────────────
        {
          id: sid(CODE, 50),
          textFR: '**Mise à jour des protocoles**',
          textEN: '**Protocol update**',
          isBold: true,
          isRed: true,
        },
        {
          id: sid(CODE, 51),
          textFR: 'Participer au bilan post-incident avec le coordonnateur d\'urgence pour identifier : les causes de l\'événement, les améliorations possibles des procédures, de la signalisation ou du matériel d\'intervention, les besoins de formation supplémentaires',
          textEN: 'Participate in the post-incident debrief with the emergency coordinator to identify: event causes, possible procedure, signage, or intervention equipment improvements, additional training needs',
          isBold: false,
        },
        // ── Note importante ─────────────────────────────────
        {
          id: sid(CODE, 52),
          textFR: '⚠️ Il est impératif de former le personnel à la gestion sécuritaire des déversements et à l\'utilisation des EPI. En cas de doute sur la sécurité de l\'intervention, évacuer immédiatement la zone et attendre l\'arrivée des intervenants spécialisés. La priorité demeure la sécurité des personnes et la protection de l\'environnement.',
          textEN: '⚠️ It is imperative to train personnel on safe spill management and PPE use. If there is any doubt about intervention safety, immediately evacuate the area and wait for specialized responders. The priority remains people\'s safety and environmental protection.',
          isBold: false,
          isRed: true,
        },
      ],
    },
  ],
};