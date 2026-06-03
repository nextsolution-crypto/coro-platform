// ============================================================
// CORO — P013 : Accident / Urgence médicale
// Toujours présent dans PMU et PSI
// ============================================================

import { ProcedureTemplate, COLORS, sid } from './types';

const CODE = 'P013';

export const P013_URGENCE_MEDICALE: ProcedureTemplate = {
  id: 'p013_urgence_medicale',
  code: CODE,
  titleFR: 'ACCIDENT / INCIDENT — URGENCE MÉDICALE',
  titleEN: 'ACCIDENT / INCIDENT — MEDICAL EMERGENCY',
  icon: '🚑',
  headerColor: COLORS.blue,
  activationRule: 'always',
  documentTypes: ['PMU', 'PSI'],
  roleSections: [
    // ── Coordonnateur d'urgence ────────────────────────────
    {
      roleCode: 'ROLE-CU',
      roleLabelFR: 'Coordonnateur d\'urgence',
      roleLabelEN: 'Emergency Coordinator',
      headerColor: COLORS.blue,
      steps: [
        // ── Réception de l'appel d'urgence ──────────────────
        {
          id: sid(CODE, 1),
          textFR: '**Réception de l\'appel d\'urgence**',
          textEN: '**Receiving the emergency call**',
          isBold: true,
          isRed: true,
        },
        {
          id: sid(CODE, 2),
          textFR: 'Être avisé par cellulaire d\'une situation médicale (occupant, gestionnaire ou témoin)',
          textEN: 'Be notified by cell phone of a medical situation (occupant, manager, or witness)',
          isBold: false,
        },
        {
          id: sid(CODE, 3),
          textFR: 'Recueillir :',
          textEN: 'Gather:',
          isBold: false,
          subSteps: [
            {
              id: sid(CODE, 4),
              textFR: 'Localisation exacte (étage, bureau, studio, etc.)',
              textEN: 'Exact location (floor, office, studio, etc.)',
              isList: true,
            },
            {
              id: sid(CODE, 5),
              textFR: 'Type de situation (inconscience, chute, douleur thoracique, réaction allergique, etc.)',
              textEN: 'Type of situation (unconsciousness, fall, chest pain, allergic reaction, etc.)',
              isList: true,
            },
            {
              id: sid(CODE, 6),
              textFR: 'État de conscience et de respiration de la personne',
              textEN: 'Level of consciousness and breathing of the person',
              isList: true,
            },
            {
              id: sid(CODE, 7),
              textFR: 'Nombre de personnes présentes',
              textEN: 'Number of persons present',
              isList: true,
            },
          ],
        },
        // ── Alerte des services d'urgence ───────────────────
        {
          id: sid(CODE, 8),
          textFR: '**Alerte des services d\'urgence**',
          textEN: '**Alerting emergency services**',
          isBold: true,
          isRed: true,
        },
        {
          id: sid(CODE, 9),
          textFR: 'Appeler immédiatement le 9-1-1 (sauf confirmation qu\'un autre l\'a déjà fait)',
          textEN: 'Immediately call 9-1-1 (unless confirmed that someone else already has)',
          isBold: false,
        },
        {
          id: sid(CODE, 10),
          textFR: 'Indiquer :',
          textEN: 'Indicate:',
          isBold: false,
        },
        {
          id: sid(CODE, 11),
          textFR: '« Urgence médicale au [ADRESSE COMPLÈTE DU SITE]. [Description sommaire de la situation]. Intervenant en route. »',
          textEN: '"Medical emergency at [COMPLETE SITE ADDRESS]. [Brief description of the situation]. Responder en route."',
          isBold: false,
          isRed: true,
        },
        // ── Envoi d'un agent sur les lieux avec matériel ────
        {
          id: sid(CODE, 12),
          textFR: '**Envoi d\'un agent sur les lieux avec matériel**',
          textEN: '**Sending an agent on site with equipment**',
          isBold: true,
          isRed: true,
        },
        {
          id: sid(CODE, 13),
          textFR: 'Désigner un agent de sécurité pour intervenir immédiatement',
          textEN: 'Designate a security agent to intervene immediately',
          isBold: false,
        },
        {
          id: sid(CODE, 14),
          textFR: 'Lui donner les consignes :',
          textEN: 'Give the following instructions:',
          isBold: false,
          subSteps: [
            {
              id: sid(CODE, 15),
              textFR: 'Apporter la trousse de premiers soins disponible à la console de sécurité',
              textEN: 'Bring the first aid kit available at the security console',
              isList: true,
            },
            {
              id: sid(CODE, 16),
              textFR: 'Apporter le DEA si : personne inconsciente, signes d\'arrêt cardiaque ou de respiration anormale — aucune formation préalable requise, suivre les instructions vocales de l\'appareil',
              textEN: 'Bring the AED if: person is unconscious, signs of cardiac arrest or abnormal breathing — no prior training required, follow the device\'s voice instructions',
              isList: true,
            },
            {
              id: sid(CODE, 17),
              textFR: 'Se rendre sans délai à l\'endroit indiqué',
              textEN: 'Proceed immediately to the indicated location',
              isList: true,
            },
          ],
        },
        // ── Consignes à l'agent sur place ───────────────────
        {
          id: sid(CODE, 18),
          textFR: '**Consignes à l\'agent sur place**',
          textEN: '**Instructions for the agent on site**',
          isBold: true,
          isRed: true,
        },
        {
          id: sid(CODE, 19),
          textFR: 'Évaluer la scène et assurer la sécurité immédiate',
          textEN: 'Assess the scene and ensure immediate safety',
          isBold: false,
        },
        {
          id: sid(CODE, 20),
          textFR: 'Donner les premiers soins si formé',
          textEN: 'Provide first aid if trained',
          isBold: false,
        },
        {
          id: sid(CODE, 21),
          textFR: 'Utiliser le DEA si requis (appareil guidé par instructions vocales)',
          textEN: 'Use the AED if required (device guided by voice instructions)',
          isBold: false,
        },
        {
          id: sid(CODE, 22),
          textFR: '**Ne pas déplacer la personne** à moins qu\'il n\'y ait un danger immédiat — laisser le DEA et les électrodes connectés jusqu\'à l\'arrivée des secouristes',
          textEN: '**Do not move the person** unless there is immediate danger — leave the AED and electrodes connected until paramedics arrive',
          isBold: true,
          isRed: true,
        },
        {
          id: sid(CODE, 23),
          textFR: 'Prévenir tout attroupement inutile autour de la victime',
          textEN: 'Prevent any unnecessary gathering around the victim',
          isBold: false,
        },
        // ── Coordination sur place ──────────────────────────
        {
          id: sid(CODE, 24),
          textFR: '**Coordination sur place**',
          textEN: '**On-site coordination**',
          isBold: true,
          isRed: true,
        },
        {
          id: sid(CODE, 25),
          textFR: 'Orienter les services d\'urgence à leur arrivée',
          textEN: 'Direct emergency services upon their arrival',
          isBold: false,
        },
        {
          id: sid(CODE, 26),
          textFR: 'Déléguer un agent à l\'entrée principale pour accueillir les ambulanciers',
          textEN: 'Delegate an agent to the main entrance to welcome paramedics',
          isBold: false,
        },
        {
          id: sid(CODE, 27),
          textFR: 'Fournir l\'emplacement exact et un accès rapide à la victime',
          textEN: 'Provide the exact location and quick access to the victim',
          isBold: false,
        },
        {
          id: sid(CODE, 28),
          textFR: 'Assurer que l\'espace autour de la victime soit libre et dégagé',
          textEN: 'Ensure the space around the victim is clear and unobstructed',
          isBold: false,
        },
        // ── Après la prise en charge ────────────────────────
        {
          id: sid(CODE, 29),
          textFR: '**Après la prise en charge**',
          textEN: '**After handover to emergency services**',
          isBold: true,
          isRed: true,
        },
        {
          id: sid(CODE, 30),
          textFR: 'Aviser le gestionnaire de secteur si l\'événement concerne un membre de son équipe ou s\'est déroulé dans sa zone',
          textEN: 'Notify the sector manager if the event involves a member of their team or occurred in their area',
          isBold: false,
        },
        {
          id: sid(CODE, 31),
          textFR: 'Maintenir la confidentialité (ne pas divulguer l\'identité ou la condition médicale aux personnes non autorisées)',
          textEN: 'Maintain confidentiality (do not disclose the identity or medical condition to unauthorized persons)',
          isBold: false,
        },
        {
          id: sid(CODE, 32),
          textFR: 'Rédiger un rapport incluant :',
          textEN: 'Write a report including:',
          isBold: false,
          subSteps: [
            {
              id: sid(CODE, 33),
              textFR: 'Heure de l\'appel',
              textEN: 'Time of the call',
              isList: true,
            },
            {
              id: sid(CODE, 34),
              textFR: 'Informations reçues',
              textEN: 'Information received',
              isList: true,
            },
            {
              id: sid(CODE, 35),
              textFR: 'Mesures prises',
              textEN: 'Measures taken',
              isList: true,
            },
            {
              id: sid(CODE, 36),
              textFR: 'Temps d\'intervention',
              textEN: 'Response time',
              isList: true,
            },
            {
              id: sid(CODE, 37),
              textFR: 'Résultat (prise en charge par les services médicaux)',
              textEN: 'Outcome (handover to medical services)',
              isList: true,
            },
            {
              id: sid(CODE, 38),
              textFR: 'Utilisation ou non du DEA',
              textEN: 'Whether the AED was used or not',
              isList: true,
            },
          ],
        },
      ],
    },
    // ── Responsable de secteur ─────────────────────────────
    {
      roleCode: 'ROLE-RS',
      roleLabelFR: 'Responsable de secteur',
      roleLabelEN: 'Sector Supervisor',
      headerColor: COLORS.blue,
      steps: [
        // ── Si vous êtes témoin ─────────────────────────────
        {
          id: sid(CODE, 39),
          textFR: '**Si vous êtes témoin d\'une urgence médicale dans votre secteur**',
          textEN: '**If you witness a medical emergency in your sector**',
          isBold: true,
          isRed: true,
        },
        {
          id: sid(CODE, 40),
          textFR: 'Alerter immédiatement la sécurité :',
          textEN: 'Immediately alert security:',
          isBold: false,
          subSteps: [
            {
              id: sid(CODE, 41),
              textFR: 'Composer le numéro de cellulaire de l\'agent de sécurité',
              textEN: 'Dial the security agent\'s cell phone number',
              isList: true,
            },
            {
              id: sid(CODE, 42),
              textFR: 'Fournir : emplacement exact, description de la situation, état apparent de la personne, nombre de personnes présentes',
              textEN: 'Provide: exact location, description of the situation, apparent state of the person, number of persons present',
              isList: true,
            },
          ],
        },
        {
          id: sid(CODE, 43),
          textFR: 'Rester sur place si la scène est sécuritaire, ou désigner un employé pour rester auprès de la victime jusqu\'à l\'arrivée des secours',
          textEN: 'Stay on site if the scene is safe, or designate an employee to stay with the victim until help arrives',
          isBold: false,
        },
        // ── Collaborer avec l'équipe de sécurité ────────────
        {
          id: sid(CODE, 44),
          textFR: '**Collaborer avec l\'équipe de sécurité**',
          textEN: '**Collaborate with the security team**',
          isBold: true,
          isRed: true,
        },
        {
          id: sid(CODE, 45),
          textFR: 'Faciliter l\'accès :',
          textEN: 'Facilitate access:',
          isBold: false,
          subSteps: [
            {
              id: sid(CODE, 46),
              textFR: 'Assurer que les corridors et accès soient libres',
              textEN: 'Ensure corridors and access points are clear',
              isList: true,
            },
            {
              id: sid(CODE, 47),
              textFR: 'Éviter les attroupements autour de la victime',
              textEN: 'Avoid gatherings around the victim',
              isList: true,
            },
          ],
        },
        {
          id: sid(CODE, 48),
          textFR: 'Encadrer les autres occupants :',
          textEN: 'Manage other occupants:',
          isBold: false,
          subSteps: [
            {
              id: sid(CODE, 49),
              textFR: 'Rassurer les personnes présentes',
              textEN: 'Reassure persons present',
              isList: true,
            },
            {
              id: sid(CODE, 50),
              textFR: 'Éloigner discrètement les curieux si nécessaire',
              textEN: 'Discreetly move bystanders away if necessary',
              isList: true,
            },
          ],
        },
        // ── Prise en charge ─────────────────────────────────
        {
          id: sid(CODE, 51),
          textFR: '**Prise en charge**',
          textEN: '**Handover**',
          isBold: true,
          isRed: true,
        },
        {
          id: sid(CODE, 52),
          textFR: 'Maintenir la confidentialité (ne pas divulguer d\'informations médicales ou personnelles à des tiers non impliqués)',
          textEN: 'Maintain confidentiality (do not disclose medical or personal information to uninvolved third parties)',
          isBold: false,
        },
        {
          id: sid(CODE, 53),
          textFR: 'Fournir un rapport au coordonnateur (si demandé) incluant :',
          textEN: 'Provide a report to the coordinator (if requested) including:',
          isBold: false,
          subSteps: [
            {
              id: sid(CODE, 54),
              textFR: 'Heure approximative de l\'incident',
              textEN: 'Approximate time of the incident',
              isList: true,
            },
            {
              id: sid(CODE, 55),
              textFR: 'Rôle du gestionnaire ou des employés présents',
              textEN: 'Role of the manager or employees present',
              isList: true,
            },
            {
              id: sid(CODE, 56),
              textFR: 'Interactions avec la sécurité ou les secours',
              textEN: 'Interactions with security or emergency services',
              isList: true,
            },
          ],
        },
        {
          id: sid(CODE, 57),
          textFR: 'Soutenir les membres de l\'équipe :',
          textEN: 'Support team members:',
          isBold: false,
          subSteps: [
            {
              id: sid(CODE, 58),
              textFR: 'Offrir un soutien aux témoins bouleversés',
              textEN: 'Offer support to distressed witnesses',
              isList: true,
            },
            {
              id: sid(CODE, 59),
              textFR: 'Rediriger vers les ressources internes si nécessaire',
              textEN: 'Refer to internal resources if necessary',
              isList: true,
            },
          ],
        },
        // ── Si une ressource est formée comme secouriste ────
        {
          id: sid(CODE, 60),
          textFR: '**Si une ressource est formée comme secouriste**',
          textEN: '**If a resource is trained as a first aider**',
          isBold: true,
          isRed: true,
        },
        {
          id: sid(CODE, 61),
          textFR: 'Se munir du matériel nécessaire (trousse de premiers soins, DEA, etc.)',
          textEN: 'Gather necessary equipment (first aid kit, AED, etc.)',
          isBold: false,
        },
        {
          id: sid(CODE, 62),
          textFR: 'Se rendre rapidement sur les lieux et rester auprès de la victime jusqu\'à la prise en charge par les services d\'urgence',
          textEN: 'Proceed quickly to the scene and stay with the victim until taken over by emergency services',
          isBold: false,
        },
        {
          id: sid(CODE, 63),
          textFR: 'Donner les premiers secours selon la formation reçue',
          textEN: 'Provide first aid according to training received',
          isBold: false,
        },
        {
          id: sid(CODE, 64),
          textFR: 'Documenter l\'intervention dans le rapport d\'incident, incluant tout refus d\'assistance de la victime',
          textEN: 'Document the intervention in the incident report, including any refusal of assistance by the victim',
          isBold: false,
        },
      ],
    },
  ],
};