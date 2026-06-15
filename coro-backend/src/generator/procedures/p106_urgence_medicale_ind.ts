// ============================================================
// CORO — P106 : Urgence médicale (Industriel)
// Activé si : is_industrial
// ============================================================

import { ProcedureTemplate, COLORS, sid } from './types';

const CODE = 'P106';

export const P106_URGENCE_MEDICALE_IND: ProcedureTemplate = {
  id: 'p106_urgence_medicale_ind',
  code: CODE,
  titleFR: 'URGENCE MÉDICALE',
  titleEN: 'MEDICAL EMERGENCY',
  icon: '🚑',
  headerColor: COLORS.blue,
  activationRule: 'is_industrial',
  documentTypes: ['PMU', 'PSI'],
  roleSections: [
    {
      roleCode: 'ROLE-CU',
      roleLabelFR: 'Coordonnateur d\'urgence',
      roleLabelEN: 'Emergency Coordinator',
      headerColor: COLORS.blue,
      steps: [
        // ── Évaluation initiale ─────────────────────────────
        {
          id: sid(CODE, 1),
          textFR: '**Évaluer la situation à distance**',
          textEN: '**Assess the situation from a distance**',
          isBold: true,
          isRed: true,
        },
        {
          id: sid(CODE, 2),
          textFR: 'S\'assurer d\'abord que vous êtes en sécurité avant d\'approcher la victime ou la zone de l\'incident',
          textEN: 'First ensure you are safe before approaching the victim or incident area',
          isBold: false,
        },
        {
          id: sid(CODE, 3),
          textFR: 'Observer visuellement la scène (fumée, produits chimiques, risque électrique, fluides biologiques, etc.)',
          textEN: 'Visually observe the scene (smoke, chemicals, electrical risk, biological fluids, etc.)',
          isBold: false,
        },
        {
          id: sid(CODE, 4),
          textFR: 'Recueillir les informations préliminaires auprès des témoins ou des personnes sur place :',
          textEN: 'Gather preliminary information from witnesses or persons on site:',
          isBold: false,
          subSteps: [
            {
              id: sid(CODE, 5),
              textFR: 'Nature de l\'urgence (inconscience, chute, brûlure, malaise, etc.)',
              textEN: 'Nature of the emergency (unconsciousness, fall, burn, discomfort, etc.)',
              isList: true,
            },
            {
              id: sid(CODE, 6),
              textFR: 'Nombre de victimes',
              textEN: 'Number of victims',
              isList: true,
            },
            {
              id: sid(CODE, 7),
              textFR: 'État apparent de la ou des victimes (conscience, respiration, saignement, etc.)',
              textEN: 'Apparent condition of victim(s) (consciousness, breathing, bleeding, etc.)',
              isList: true,
            },
          ],
        },
        // ── Alerter les secouristes internes ────────────────
        {
          id: sid(CODE, 8),
          textFR: '**Alerter les secouristes internes**',
          textEN: '**Alert internal first aiders**',
          isBold: true,
          isRed: true,
        },
        {
          id: sid(CODE, 9),
          textFR: 'Communiquer immédiatement avec les secouristes en premiers soins identifiés sur le site — en milieu industriel, la CNESST exige qu\'au moins un secouriste certifié soit disponible par quart de travail',
          textEN: 'Immediately communicate with first aid responders identified on site — in industrial settings, CNESST requires at least one certified first aider available per work shift',
          isBold: false,
        },
        {
          id: sid(CODE, 10),
          textFR: 'Fournir les informations essentielles :',
          textEN: 'Provide essential information:',
          isBold: false,
          subSteps: [
            {
              id: sid(CODE, 11),
              textFR: 'Emplacement exact de la victime (bâtiment, étage, local)',
              textEN: 'Exact location of the victim (building, floor, room)',
              isList: true,
            },
            {
              id: sid(CODE, 12),
              textFR: 'Nature de l\'urgence (inconscience, arrêt cardiaque, chute, brûlure, etc.)',
              textEN: 'Nature of the emergency (unconsciousness, cardiac arrest, fall, burn, etc.)',
              isList: true,
            },
            {
              id: sid(CODE, 13),
              textFR: 'Présence de dangers potentiels (fuite, électricité, gaz, machine en marche)',
              textEN: 'Presence of potential hazards (leak, electricity, gas, running machinery)',
              isList: true,
            },
          ],
        },
        {
          id: sid(CODE, 14),
          textFR: 'Déléguer un employé pour attendre les secouristes à l\'entrée et les guider jusqu\'à la victime',
          textEN: 'Delegate an employee to wait for first aiders at the entrance and guide them to the victim',
          isBold: false,
        },
        // ── Contacter les services d'urgence ────────────────
        {
          id: sid(CODE, 15),
          textFR: '**Contacter les services d\'urgence externes (9-1-1)**',
          textEN: '**Contact external emergency services (9-1-1)**',
          isBold: true,
          isRed: true,
        },
        {
          id: sid(CODE, 16),
          textFR: 'Pendant que les secouristes internes interviennent, composer le 9-1-1 et fournir :',
          textEN: 'While internal first aiders intervene, dial 9-1-1 and provide:',
          isBold: false,
          subSteps: [
            {
              id: sid(CODE, 17),
              textFR: 'L\'adresse complète du bâtiment : [ADRESSE COMPLÈTE DU SITE]',
              textEN: 'The complete building address: [COMPLETE SITE ADDRESS]',
              isList: true,
            },
            {
              id: sid(CODE, 18),
              textFR: 'L\'emplacement exact de la victime à l\'intérieur (secteur, étage, pièce)',
              textEN: 'The exact location of the victim inside (sector, floor, room)',
              isList: true,
            },
            {
              id: sid(CODE, 19),
              textFR: 'La nature de l\'urgence médicale et l\'état actuel de la victime (inconsciente, saignement, détresse respiratoire, etc.)',
              textEN: 'The nature of the medical emergency and current victim condition (unconscious, bleeding, respiratory distress, etc.)',
              isList: true,
            },
            {
              id: sid(CODE, 20),
              textFR: 'Les coordonnées d\'une personne contact sur place pour guider les premiers répondants',
              textEN: 'Contact information for an on-site person to guide first responders',
              isList: true,
            },
          ],
        },
        // ── Coordination avec les secouristes ───────────────
        {
          id: sid(CODE, 21),
          textFR: '**Coordination avec les secouristes internes**',
          textEN: '**Coordination with internal first aiders**',
          isBold: true,
          isRed: true,
        },
        {
          id: sid(CODE, 22),
          textFR: 'Maintenir une communication constante avec les secouristes pour :',
          textEN: 'Maintain constant communication with first aiders to:',
          isBold: false,
          subSteps: [
            {
              id: sid(CODE, 23),
              textFR: 'Obtenir des mises à jour sur l\'état de la victime et l\'efficacité des manœuvres',
              textEN: 'Obtain updates on victim condition and effectiveness of interventions',
              isList: true,
            },
            {
              id: sid(CODE, 24),
              textFR: 'Transmettre toute nouvelle information utile (arrivée des secours, complications)',
              textEN: 'Transmit any new useful information (arrival of help, complications)',
              isList: true,
            },
          ],
        },
        {
          id: sid(CODE, 25),
          textFR: 'S\'assurer que les secouristes ont accès :',
          textEN: 'Ensure first aiders have access to:',
          isBold: false,
          subSteps: [
            {
              id: sid(CODE, 26),
              textFR: 'Aux trousses de premiers soins — en milieu industriel à haut risque, des trousses supplémentaires doivent être disponibles par secteur',
              textEN: 'First aid kits — in high-risk industrial settings, additional kits must be available per sector',
              isList: true,
            },
            {
              id: sid(CODE, 27),
              textFR: 'Au défibrillateur externe automatisé (DEA) si nécessaire',
              textEN: 'The automated external defibrillator (AED) if necessary',
              isList: true,
            },
            {
              id: sid(CODE, 28),
              textFR: 'À un espace dégagé autour de la victime pour intervenir',
              textEN: 'A clear space around the victim to intervene',
              isList: true,
            },
          ],
        },
        // ── Préparation de l'arrivée des secours ────────────
        {
          id: sid(CODE, 29),
          textFR: '**Préparation de l\'arrivée des secours**',
          textEN: '**Preparing for emergency services arrival**',
          isBold: true,
          isRed: true,
        },
        {
          id: sid(CODE, 30),
          textFR: 'Déléguer une personne pour accueillir les premiers répondants (pompiers, ambulanciers, policiers) à l\'entrée principale',
          textEN: 'Delegate a person to welcome first responders (firefighters, paramedics, police) at the main entrance',
          isBold: false,
        },
        {
          id: sid(CODE, 31),
          textFR: 'S\'assurer que les voies d\'accès, ascenseurs et corridors sont libres et déverrouillés',
          textEN: 'Ensure access routes, elevators, and corridors are clear and unlocked',
          isBold: false,
        },
        {
          id: sid(CODE, 32),
          textFR: 'Diriger les intervenants vers la victime dès leur arrivée',
          textEN: 'Direct responders to the victim upon their arrival',
          isBold: false,
        },
        // ── Suivi de l'intervention ─────────────────────────
        {
          id: sid(CODE, 33),
          textFR: '**Suivi de l\'intervention**',
          textEN: '**Intervention monitoring**',
          isBold: true,
          isRed: true,
        },
        {
          id: sid(CODE, 34),
          textFR: 'Rester en contact constant avec les secouristes et le répartiteur du 9-1-1 pour :',
          textEN: 'Stay in constant contact with first aiders and the 9-1-1 dispatcher to:',
          isBold: false,
          subSteps: [
            {
              id: sid(CODE, 35),
              textFR: 'Fournir des informations complémentaires sur l\'état de la victime',
              textEN: 'Provide additional information on the victim\'s condition',
              isList: true,
            },
            {
              id: sid(CODE, 36),
              textFR: 'Signaler toute évolution (arrêt cardiaque, respiration rétablie, perte de conscience)',
              textEN: 'Report any changes (cardiac arrest, breathing restored, loss of consciousness)',
              isList: true,
            },
          ],
        },
        {
          id: sid(CODE, 37),
          textFR: 'Appliquer les consignes du répartiteur jusqu\'à l\'arrivée des secours officiels',
          textEN: 'Apply dispatcher instructions until official emergency services arrive',
          isBold: false,
          isRed: true,
        },
        // ── Assistance aux services d'urgence ───────────────
        {
          id: sid(CODE, 38),
          textFR: '**Assistance aux services d\'urgence**',
          textEN: '**Assistance to emergency services**',
          isBold: true,
          isRed: true,
        },
        {
          id: sid(CODE, 39),
          textFR: 'Accueillir les intervenants à leur arrivée et communiquer un état de situation clair :',
          textEN: 'Welcome responders upon arrival and communicate a clear situation report:',
          isBold: false,
          subSteps: [
            {
              id: sid(CODE, 40),
              textFR: 'Heure de l\'incident',
              textEN: 'Time of the incident',
              isList: true,
            },
            {
              id: sid(CODE, 41),
              textFR: 'Premiers soins administrés',
              textEN: 'First aid administered',
              isList: true,
            },
            {
              id: sid(CODE, 42),
              textFR: 'État de la victime à l\'arrivée des secours',
              textEN: 'Victim\'s condition upon emergency services arrival',
              isList: true,
            },
          ],
        },
        {
          id: sid(CODE, 43),
          textFR: 'Accompagner les intervenants jusqu\'au lieu précis de l\'incident et rester disponible pour tout appui logistique',
          textEN: 'Accompany responders to the precise incident location and remain available for any logistical support',
          isBold: false,
        },
        // ── Bilan post-incident ─────────────────────────────
        {
          id: sid(CODE, 44),
          textFR: '**Bilan post-incident**',
          textEN: '**Post-incident assessment**',
          isBold: true,
          isRed: true,
        },
        {
          id: sid(CODE, 45),
          textFR: 'Une fois la victime prise en charge, organiser une courte réunion de débriefing avec les secouristes pour :',
          textEN: 'Once the victim is taken care of, organize a brief debriefing meeting with first aiders to:',
          isBold: false,
          subSteps: [
            {
              id: sid(CODE, 46),
              textFR: 'Évaluer la réponse apportée',
              textEN: 'Evaluate the response provided',
              isList: true,
            },
            {
              id: sid(CODE, 47),
              textFR: 'Identifier les améliorations possibles (communication, matériel, formation)',
              textEN: 'Identify possible improvements (communication, equipment, training)',
              isList: true,
            },
            {
              id: sid(CODE, 48),
              textFR: 'Documenter les événements dans le rapport d\'incident médical : heure et lieu de l\'incident, nom des intervenants, soins effectués et durée d\'intervention, transfert de la victime (destination, heure, service d\'urgence)',
              textEN: 'Document events in the medical incident report: time and location of incident, names of responders, care provided and intervention duration, victim transfer (destination, time, emergency service)',
              isList: true,
            },
          ],
        },
        // ── Retour à la normale ─────────────────────────────
        {
          id: sid(CODE, 49),
          textFR: '**Retour à la normale**',
          textEN: '**Return to normal**',
          isBold: true,
          isRed: true,
        },
        {
          id: sid(CODE, 50),
          textFR: 'Vérifier que les lieux sont sécurisés, nettoyés et libérés avant la reprise des activités',
          textEN: 'Verify the area is secured, cleaned, and cleared before resuming activities',
          isBold: false,
        },
        {
          id: sid(CODE, 51),
          textFR: 'Informer le personnel qu\'une urgence médicale a été gérée et que la situation est rétablie',
          textEN: 'Inform personnel that a medical emergency has been handled and the situation is restored',
          isBold: false,
        },
        {
          id: sid(CODE, 52),
          textFR: 'Conserver tous les documents relatifs à l\'incident (rapport interne, appel 9-1-1, fiche de premiers soins) pour le suivi administratif et la mise à jour du PMU — déclarer à la CNESST tout accident de travail ayant causé une blessure',
          textEN: 'Keep all incident-related documents (internal report, 9-1-1 call, first aid sheet) for administrative follow-up and ERP update — declare to CNESST any workplace accident that caused injury',
          isBold: false,
        },
      ],
    },
  ],
};