// ============================================================
// CORO — P108 : Bris de gicleur (Industriel)
// Activé si : is_industrial + has_sprinklers
// ============================================================

import { ProcedureTemplate, COLORS, sid } from './types';

const CODE = 'P108';

export const P108_BRIS_GICLEUR_IND: ProcedureTemplate = {
  id: 'p108_bris_gicleur_ind',
  code: CODE,
  titleFR: 'BRIS DE GICLEUR',
  titleEN: 'SPRINKLER FAILURE',
  icon: '💧',
  headerColor: COLORS.turquoise,
  activationRule: 'is_industrial',
  documentTypes: ['PMU', 'PSI'],
  roleSections: [
    {
      roleCode: 'ROLE-RM',
      roleLabelFR: 'Responsable de la maintenance',
      roleLabelEN: 'Maintenance Supervisor',
      headerColor: COLORS.turquoise,
      steps: [
        // ── Évacuation immédiate ────────────────────────────
        {
          id: sid(CODE, 1),
          textFR: '**Évacuation immédiate**',
          textEN: '**Immediate evacuation**',
          isBold: true,
          isRed: true,
        },
        {
          id: sid(CODE, 2),
          textFR: 'Évacuer la zone touchée par le dégât d\'eau pour éviter les risques de glissades, d\'électrocution ou de blessures',
          textEN: 'Evacuate the area affected by the water damage to avoid risks of slipping, electrocution, or injury',
          isBold: false,
        },
        {
          id: sid(CODE, 3),
          textFR: 'S\'assurer que tout le personnel (maintenance, supervision, production, etc.) est informé et quitte rapidement la zone',
          textEN: 'Ensure all personnel (maintenance, supervision, production, etc.) are informed and quickly leave the area',
          isBold: false,
        },
        // ── Coupure de l'alimentation électrique ────────────
        {
          id: sid(CODE, 4),
          textFR: '**Coupure de l\'alimentation électrique**',
          textEN: '**Electrical power cutoff**',
          isBold: true,
          isRed: true,
        },
        {
          id: sid(CODE, 5),
          textFR: 'Demander au responsable technique ou au service d\'entretien de couper le courant dans le secteur affecté si des équipements électriques ont été exposés à l\'eau',
          textEN: 'Ask the technical supervisor or maintenance service to cut power in the affected sector if electrical equipment has been exposed to water',
          isBold: false,
          isRed: true,
        },
        // ── Coordination avec la sécurité incendie ──────────
        {
          id: sid(CODE, 6),
          textFR: '**Coordination avec la sécurité incendie**',
          textEN: '**Coordination with fire safety**',
          isBold: true,
          isRed: true,
        },
        {
          id: sid(CODE, 7),
          textFR: 'Si le bris de gicleur a entraîné la désactivation du réseau de protection incendie :',
          textEN: 'If the sprinkler failure resulted in deactivation of the fire protection network:',
          isBold: false,
          subSteps: [
            {
              id: sid(CODE, 8),
              textFR: 'Contacter immédiatement le service incendie (9-1-1) et la centrale de surveillance',
              textEN: 'Immediately contact the fire department (9-1-1) and the monitoring centre',
              isList: true,
            },
            {
              id: sid(CODE, 9),
              textFR: 'Mentionner la désactivation temporaire du système de gicleurs et s\'assurer que des mesures compensatoires sont mises en place (surveillance incendie, isolation du secteur)',
              textEN: 'Mention the temporary deactivation of the sprinkler system and ensure compensatory measures are in place (fire monitoring, sector isolation)',
              isList: true,
            },
          ],
        },
        // ── Minimiser les dégâts matériels ──────────────────
        {
          id: sid(CODE, 10),
          textFR: '**Minimiser les dégâts matériels**',
          textEN: '**Minimize material damage**',
          isBold: true,
          isRed: true,
        },
        {
          id: sid(CODE, 11),
          textFR: 'Protection des équipements sensibles :',
          textEN: 'Protection of sensitive equipment:',
          isBold: false,
          subSteps: [
            {
              id: sid(CODE, 12),
              textFR: 'Demander à l\'équipe d\'entretien ou de production de déplacer ou couvrir les équipements critiques : serveurs informatiques, panneaux électriques, machines sensibles, matières premières, archives, etc.',
              textEN: 'Ask the maintenance or production team to move or cover critical equipment: computer servers, electrical panels, sensitive machines, raw materials, archives, etc.',
              isList: true,
            },
          ],
        },
        {
          id: sid(CODE, 13),
          textFR: 'Confinement de l\'eau :',
          textEN: 'Water containment:',
          isBold: false,
          subSteps: [
            {
              id: sid(CODE, 14),
              textFR: 'Utiliser des absorbants, racloirs et seaux pour limiter la propagation de l\'eau',
              textEN: 'Use absorbents, squeegees, and buckets to limit water spread',
              isList: true,
            },
            {
              id: sid(CODE, 15),
              textFR: 'Protéger les drains pour éviter la contamination (huile, glycol, peinture)',
              textEN: 'Protect drains to avoid contamination (oil, glycol, paint)',
              isList: true,
            },
            {
              id: sid(CODE, 16),
              textFR: 'Si nécessaire, isoler les zones adjacentes pour contenir le dégât',
              textEN: 'If necessary, isolate adjacent areas to contain the damage',
              isList: true,
            },
          ],
        },
        // ── Gestion des interventions de réparation ─────────
        {
          id: sid(CODE, 17),
          textFR: '**Gestion des interventions de réparation**',
          textEN: '**Repair intervention management**',
          isBold: true,
          isRed: true,
        },
        {
          id: sid(CODE, 18),
          textFR: 'Appel à des spécialistes : si le dégât est important, contacter une firme spécialisée en réparation de systèmes de gicleurs ou en restauration après sinistre (eau, moisissure, structure)',
          textEN: 'Call specialists: if the damage is significant, contact a firm specialized in sprinkler system repair or post-disaster restoration (water, mold, structure)',
          isBold: false,
        },
        {
          id: sid(CODE, 19),
          textFR: 'Planification de la réparation :',
          textEN: 'Repair planning:',
          isBold: false,
          subSteps: [
            {
              id: sid(CODE, 20),
              textFR: 'Faire évaluer la défectuosité par la compagnie d\'entretien du réseau de gicleurs',
              textEN: 'Have the defect evaluated by the sprinkler network maintenance company',
              isList: true,
            },
            {
              id: sid(CODE, 21),
              textFR: 'Prioriser la réparation rapide afin de restaurer le système de protection incendie dans les plus brefs délais',
              textEN: 'Prioritize rapid repair to restore the fire protection system as quickly as possible',
              isList: true,
            },
          ],
        },
        // ── Remise en état et vérifications ─────────────────
        {
          id: sid(CODE, 22),
          textFR: '**Remise en état et vérifications**',
          textEN: '**Restoration and verifications**',
          isBold: true,
          isRed: true,
        },
        {
          id: sid(CODE, 23),
          textFR: 'Réactivation du système de gicleurs :',
          textEN: 'Sprinkler system reactivation:',
          isBold: false,
          subSteps: [
            {
              id: sid(CODE, 24),
              textFR: 'Une fois les réparations effectuées, superviser la réouverture de la vanne d\'alimentation et s\'assurer que le système fonctionne correctement',
              textEN: 'Once repairs are completed, supervise reopening of the supply valve and ensure the system operates correctly',
              isList: true,
            },
            {
              id: sid(CODE, 25),
              textFR: 'Si nécessaire, faire effectuer un test complet par un technicien certifié (NFPA 25 — norme de référence au Canada pour l\'inspection des systèmes de gicleurs)',
              textEN: 'If necessary, have a complete test performed by a certified technician (NFPA 25 — reference standard in Canada for sprinkler system inspection)',
              isList: true,
            },
            {
              id: sid(CODE, 26),
              textFR: 'Documenter les observations dans le registre d\'entretien',
              textEN: 'Document observations in the maintenance register',
              isList: true,
            },
          ],
        },
        {
          id: sid(CODE, 27),
          textFR: 'Inspection des équipements électriques : avant de réalimenter en électricité, demander une inspection électrique complète pour éviter tout risque de court-circuit ou d\'incendie secondaire',
          textEN: 'Electrical equipment inspection: before restoring power, request a complete electrical inspection to avoid any risk of short-circuit or secondary fire',
          isBold: false,
          isRed: true,
        },
        // ── Documentation et suivi administratif ────────────
        {
          id: sid(CODE, 28),
          textFR: '**Documentation et suivi administratif**',
          textEN: '**Documentation and administrative follow-up**',
          isBold: true,
          isRed: true,
        },
        {
          id: sid(CODE, 29),
          textFR: 'Rédaction du rapport d\'incident :',
          textEN: 'Incident report writing:',
          isBold: false,
          subSteps: [
            {
              id: sid(CODE, 30),
              textFR: 'Décrire la cause probable du bris (gel, choc mécanique, corrosion, surpression, etc.)',
              textEN: 'Describe the probable cause of the failure (freezing, mechanical impact, corrosion, overpressure, etc.)',
              isList: true,
            },
            {
              id: sid(CODE, 31),
              textFR: 'Préciser les actions prises, les zones touchées, les volumes d\'eau estimés et les coûts matériels',
              textEN: 'Specify actions taken, affected areas, estimated water volumes, and material costs',
              isList: true,
            },
            {
              id: sid(CODE, 32),
              textFR: 'Intégrer le rapport au registre d\'entretien incendie',
              textEN: 'Integrate the report into the fire maintenance register',
              isList: true,
            },
          ],
        },
        {
          id: sid(CODE, 33),
          textFR: 'Communication avec les assurances :',
          textEN: 'Communication with insurers:',
          isBold: false,
          subSteps: [
            {
              id: sid(CODE, 34),
              textFR: 'Informer l\'assureur dès la fin de l\'incident et soumettre les preuves photographiques',
              textEN: 'Inform the insurer as soon as the incident ends and submit photographic evidence',
              isList: true,
            },
            {
              id: sid(CODE, 35),
              textFR: 'Collaborer avec les experts pour l\'évaluation des dommages',
              textEN: 'Collaborate with experts for damage assessment',
              isList: true,
            },
          ],
        },
        // ── Analyse post-incident ───────────────────────────
        {
          id: sid(CODE, 36),
          textFR: '**Analyse post-incident et mesures préventives**',
          textEN: '**Post-incident analysis and preventive measures**',
          isBold: true,
          isRed: true,
        },
        {
          id: sid(CODE, 37),
          textFR: 'Analyse des causes : identifier la cause du bris — défaillance technique (joint, corrosion, pièce usée), erreur humaine (impact, manutention, vibration, suspension inappropriée), facteur environnemental (gel, choc thermique)',
          textEN: 'Cause analysis: identify the cause of the failure — technical failure (seal, corrosion, worn part), human error (impact, handling, vibration, improper suspension), environmental factor (freezing, thermal shock)',
          isBold: false,
        },
        {
          id: sid(CODE, 38),
          textFR: 'Mesures correctives :',
          textEN: 'Corrective measures:',
          isBold: false,
          subSteps: [
            {
              id: sid(CODE, 39),
              textFR: 'Réparer ou remplacer les sections vulnérables',
              textEN: 'Repair or replace vulnerable sections',
              isList: true,
            },
            {
              id: sid(CODE, 40),
              textFR: 'Vérifier la température ambiante des zones à risque de gel (<4°C)',
              textEN: 'Check ambient temperature in freeze-risk areas (<4°C)',
              isList: true,
            },
            {
              id: sid(CODE, 41),
              textFR: 'Installer des protections physiques ou cages autour des gicleurs exposés',
              textEN: 'Install physical protections or cages around exposed sprinklers',
              isList: true,
            },
          ],
        },
        {
          id: sid(CODE, 42),
          textFR: 'Renforcement des procédures :',
          textEN: 'Procedure strengthening:',
          isBold: false,
          subSteps: [
            {
              id: sid(CODE, 43),
              textFR: 'Mettre à jour les procédures internes d\'entretien préventif (tests mensuels et inspections annuelles conformément à NFPA 25)',
              textEN: 'Update internal preventive maintenance procedures (monthly tests and annual inspections per NFPA 25)',
              isList: true,
            },
            {
              id: sid(CODE, 44),
              textFR: 'Former le personnel d\'entretien sur les bonnes pratiques de manipulation et sur la réponse rapide en cas de bris',
              textEN: 'Train maintenance personnel on proper handling practices and rapid response in case of failure',
              isList: true,
            },
          ],
        },
        // ── Coordination reprise opérations ─────────────────
        {
          id: sid(CODE, 45),
          textFR: '**Coordination de la reprise des opérations**',
          textEN: '**Operations resumption coordination**',
          isBold: true,
          isRed: true,
        },
        {
          id: sid(CODE, 46),
          textFR: 'Évaluation des impacts sur la production :',
          textEN: 'Production impact assessment:',
          isBold: false,
          subSteps: [
            {
              id: sid(CODE, 47),
              textFR: 'Travailler avec les superviseurs de production pour évaluer les conséquences du dégât d\'eau sur les opérations — prioriser la remise en marche des zones critiques, ajuster la planification pour minimiser les pertes opérationnelles',
              textEN: 'Work with production supervisors to assess water damage consequences on operations — prioritize restart of critical areas, adjust planning to minimize operational losses',
              isList: true,
            },
          ],
        },
        {
          id: sid(CODE, 48),
          textFR: 'Planification de la remise en service :',
          textEN: 'Service resumption planning:',
          isBold: false,
          subSteps: [
            {
              id: sid(CODE, 49),
              textFR: 'Coordonner les tests de fonctionnement du système réparé',
              textEN: 'Coordinate functional tests of the repaired system',
              isList: true,
            },
            {
              id: sid(CODE, 50),
              textFR: 'Valider les autorisations de réintégration auprès du coordonnateur d\'urgence et du service incendie, si applicable',
              textEN: 'Validate re-entry authorizations with the emergency coordinator and fire department, if applicable',
              isList: true,
            },
          ],
        },
        // ── Résumé des actions clés ─────────────────────────
        {
          id: sid(CODE, 51),
          textFR: '**Résumé des actions clés pour le coordonnateur d\'urgence**',
          textEN: '**Key actions summary for the emergency coordinator**',
          isBold: true,
          isRed: true,
        },
        {
          id: sid(CODE, 52),
          textFR: '1. Superviser l\'évacuation et la sécurisation du secteur',
          textEN: '1. Supervise evacuation and sector security',
          isBold: false,
        },
        {
          id: sid(CODE, 53),
          textFR: '2. Couper l\'alimentation en eau et en électricité au besoin',
          textEN: '2. Cut water and electrical supply as needed',
          isBold: false,
        },
        {
          id: sid(CODE, 54),
          textFR: '3. Coordonner la protection des équipements et la gestion du dégât d\'eau',
          textEN: '3. Coordinate equipment protection and water damage management',
          isBold: false,
        },
        {
          id: sid(CODE, 55),
          textFR: '4. Superviser les réparations et la restauration du système de gicleurs',
          textEN: '4. Supervise repairs and sprinkler system restoration',
          isBold: false,
        },
        {
          id: sid(CODE, 56),
          textFR: '5. Documenter l\'incident et informer les assurances',
          textEN: '5. Document the incident and inform insurers',
          isBold: false,
        },
        {
          id: sid(CODE, 57),
          textFR: '6. Identifier la cause du bris et appliquer des mesures préventives',
          textEN: '6. Identify the cause of the failure and apply preventive measures',
          isBold: false,
        },
        {
          id: sid(CODE, 58),
          textFR: '7. Assurer une communication fluide et organiser la reprise normale des activités',
          textEN: '7. Ensure smooth communication and organize normal activity resumption',
          isBold: false,
        },
      ],
    },
  ],
};