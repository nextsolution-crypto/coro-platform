// ============================================================
// CORO — P103 : Fuite de gaz naturel (Industriel)
// Activé si : is_industrial + has_gas
// ============================================================

import { ProcedureTemplate, COLORS, sid } from './types';

const CODE = 'P103';

export const P103_FUITE_GAZ_IND: ProcedureTemplate = {
  id: 'p103_fuite_gaz_ind',
  code: CODE,
  titleFR: 'FUITE DE GAZ NATUREL',
  titleEN: 'NATURAL GAS LEAK',
  icon: '💨',
  headerColor: COLORS.gray,
  activationRule: 'is_industrial',
  documentTypes: ['PMU', 'PSI'],
  roleSections: [
    {
      roleCode: 'ROLE-CU',
      roleLabelFR: 'Coordonnateur d\'urgence',
      roleLabelEN: 'Emergency Coordinator',
      headerColor: COLORS.gray,
      steps: [
        // ── Détection initiale ──────────────────────────────
        {
          id: sid(CODE, 1),
          textFR: '**Détection initiale**',
          textEN: '**Initial detection**',
          isBold: true,
          isRed: true,
        },
        {
          id: sid(CODE, 2),
          textFR: 'Si une alarme de détection de gaz naturel se déclenche ou si une odeur de mercaptan (soufre/œuf pourri) est perçue, présumer immédiatement une fuite de gaz',
          textEN: 'If a natural gas detection alarm activates or a mercaptan odour (sulfur/rotten egg) is detected, immediately assume a gas leak',
          isBold: false,
          isRed: true,
        },
        {
          id: sid(CODE, 3),
          textFR: 'Ne pas tenter d\'en identifier la source — aucune investigation interne ne doit être faite avant l\'arrivée des autorités compétentes',
          textEN: 'Do not attempt to identify the source — no internal investigation should be conducted before competent authorities arrive',
          isBold: false,
          isRed: true,
        },
        // ── Interdiction d'activation électrique ────────────
        {
          id: sid(CODE, 4),
          textFR: '**Interdiction d\'activation électrique**',
          textEN: '**Electrical activation prohibition**',
          isBold: true,
          isRed: true,
        },
        {
          id: sid(CODE, 5),
          textFR: 'Ne pas allumer ni éteindre aucun appareil électrique (lumières, ordinateurs, machines, interrupteurs) — en milieu industriel, une simple étincelle en zone ATEX peut provoquer une explosion',
          textEN: 'Do not turn on or off any electrical device (lights, computers, machines, switches) — in industrial settings, a single spark in an ATEX zone can cause an explosion',
          isBold: false,
          isRed: true,
        },
        {
          id: sid(CODE, 6),
          textFR: 'Interdire l\'usage de tout appareil de communication sans fil (cellulaire, radio, walkie-talkie) à l\'intérieur du bâtiment ou à proximité de la zone soupçonnée de fuite',
          textEN: 'Prohibit the use of any wireless communication device (cell phone, radio, walkie-talkie) inside the building or near the suspected leak area',
          isBold: false,
          isRed: true,
        },
        {
          id: sid(CODE, 7),
          textFR: 'Fermer manuellement, si sécuritaire, les vannes locales de gaz si elles sont facilement accessibles et identifiées',
          textEN: 'Manually close, if safe, local gas valves if they are easily accessible and identified',
          isBold: false,
        },
        // ── Coordination de l'évacuation ────────────────────
        {
          id: sid(CODE, 8),
          textFR: '**Coordination de l\'évacuation**',
          textEN: '**Evacuation coordination**',
          isBold: true,
          isRed: true,
        },
        {
          id: sid(CODE, 9),
          textFR: 'Annoncer l\'évacuation verbalement, sans utiliser d\'intercom ni d\'alarme sonore susceptible de produire une étincelle',
          textEN: 'Announce evacuation verbally, without using intercom or audible alarm that could produce a spark',
          isBold: false,
          isRed: true,
        },
        {
          id: sid(CODE, 10),
          textFR: 'Diriger le personnel vers les sorties extérieures et points de rassemblement les plus éloignés de la source potentielle',
          textEN: 'Direct personnel to exterior exits and assembly points farthest from the potential source',
          isBold: false,
        },
        {
          id: sid(CODE, 11),
          textFR: 'Éviter les zones où des conduites de gaz, chaufferies, génératrices ou équipements sous pression sont présents',
          textEN: 'Avoid areas where gas pipes, boiler rooms, generators, or pressurized equipment are present',
          isBold: false,
        },
        // ── Supervision de la sortie ────────────────────────
        {
          id: sid(CODE, 12),
          textFR: '**Supervision de la sortie**',
          textEN: '**Exit supervision**',
          isBold: true,
          isRed: true,
        },
        {
          id: sid(CODE, 13),
          textFR: 'L\'équipe de première intervention assure la vérification visuelle des zones critiques (local technique, chaufferie, atelier, salle mécanique)',
          textEN: 'The first response team conducts visual verification of critical areas (technical room, boiler room, workshop, mechanical room)',
          isBold: false,
        },
        {
          id: sid(CODE, 14),
          textFR: 'Le coordonnateur d\'urgence veille à ce que tous les employés et visiteurs quittent les lieux sans panique et sans emporter d\'objets',
          textEN: 'The emergency coordinator ensures all employees and visitors leave the premises without panic and without taking objects',
          isBold: false,
        },
        // ── Appels prioritaires ─────────────────────────────
        {
          id: sid(CODE, 15),
          textFR: '**Appels prioritaires**',
          textEN: '**Priority calls**',
          isBold: true,
          isRed: true,
        },
        {
          id: sid(CODE, 16),
          textFR: 'Composer le 9-1-1 dès que l\'évacuation est amorcée et fournir :',
          textEN: 'Dial 9-1-1 as soon as evacuation begins and provide:',
          isBold: false,
          subSteps: [
            {
              id: sid(CODE, 17),
              textFR: 'L\'adresse complète et l\'entreprise concernée : [ADRESSE COMPLÈTE DU SITE]',
              textEN: 'The complete address and company: [COMPLETE SITE ADDRESS]',
              isList: true,
            },
            {
              id: sid(CODE, 18),
              textFR: 'Le secteur impliqué et la cause présumée (alarme ou odeur détectée)',
              textEN: 'The affected sector and presumed cause (alarm or detected odour)',
              isList: true,
            },
            {
              id: sid(CODE, 19),
              textFR: 'Les risques potentiels (produits, équipements, stockage de gaz)',
              textEN: 'Potential risks (products, equipment, gas storage)',
              isList: true,
            },
            {
              id: sid(CODE, 20),
              textFR: 'Les mesures prises (évacuation, périmètre, coupure d\'alimentation)',
              textEN: 'Measures taken (evacuation, perimeter, power cutoff)',
              isList: true,
            },
          ],
        },
        {
          id: sid(CODE, 21),
          textFR: 'Communiquer également avec le fournisseur de gaz naturel (ex. Énergir) pour signaler la fuite et demander l\'intervention de leur équipe technique d\'urgence',
          textEN: 'Also communicate with the natural gas supplier (e.g., Énergir) to report the leak and request their emergency technical team',
          isBold: false,
        },
        // ── Accueil des secours ─────────────────────────────
        {
          id: sid(CODE, 22),
          textFR: '**Accueil des secours**',
          textEN: '**Receiving emergency services**',
          isBold: true,
          isRed: true,
        },
        {
          id: sid(CODE, 23),
          textFR: 'Se positionner à l\'extérieur, au poste de commandement préétabli, avec le plan du bâtiment, les clés d\'accès et la fiche d\'intervention gaz naturel',
          textEN: 'Position yourself outside at the pre-established command post with the building plan, access keys, and natural gas intervention sheet',
          isBold: false,
        },
        {
          id: sid(CODE, 24),
          textFR: 'Assurer la transmission d\'informations aux services d\'urgence :',
          textEN: 'Ensure information transmission to emergency services:',
          isBold: false,
          subSteps: [
            {
              id: sid(CODE, 25),
              textFR: 'Localisation des conduites principales, compteurs, vannes, chaufferies, zones ATEX',
              textEN: 'Location of main pipes, meters, valves, boiler rooms, ATEX zones',
              isList: true,
            },
            {
              id: sid(CODE, 26),
              textFR: 'Accès aux systèmes de ventilation et de coupure d\'alimentation',
              textEN: 'Access to ventilation and power cutoff systems',
              isList: true,
            },
          ],
        },
        // ── Mise en place du périmètre ──────────────────────
        {
          id: sid(CODE, 27),
          textFR: '**Mise en place du périmètre**',
          textEN: '**Establishing the perimeter**',
          isBold: true,
          isRed: true,
        },
        {
          id: sid(CODE, 28),
          textFR: 'Délimiter une zone d\'exclusion d\'au moins 100 mètres autour du bâtiment ou selon les directives des pompiers',
          textEN: 'Establish an exclusion zone of at least 100 metres around the building or per firefighter directives',
          isBold: false,
          isRed: true,
        },
        {
          id: sid(CODE, 29),
          textFR: 'Interdire tout retour vers la structure jusqu\'à confirmation officielle',
          textEN: 'Prohibit any return to the structure until official confirmation',
          isBold: false,
        },
        {
          id: sid(CODE, 30),
          textFR: 'Désigner un membre de l\'équipe pour contrôler l\'accès au périmètre et empêcher toute entrée non autorisée',
          textEN: 'Designate a team member to control perimeter access and prevent any unauthorized entry',
          isBold: false,
        },
        // ── Gestion du point de rassemblement ───────────────
        {
          id: sid(CODE, 31),
          textFR: '**Gestion du point de rassemblement**',
          textEN: '**Assembly point management**',
          isBold: true,
          isRed: true,
        },
        {
          id: sid(CODE, 32),
          textFR: 'S\'assurer que tous les employés ont été évacués et inscrits sur le registre de présence',
          textEN: 'Ensure all employees have been evacuated and recorded on the attendance register',
          isBold: false,
        },
        {
          id: sid(CODE, 33),
          textFR: 'Si une personne est manquante, en aviser immédiatement les services d\'urgence',
          textEN: 'If a person is missing, immediately notify emergency services',
          isBold: false,
          isRed: true,
        },
        {
          id: sid(CODE, 34),
          textFR: 'Maintenir les employés regroupés à distance sécuritaire, à l\'abri du vent dominant',
          textEN: 'Keep employees grouped at a safe distance, sheltered from the prevailing wind',
          isBold: false,
        },
        // ── Collaboration avec les autorités ────────────────
        {
          id: sid(CODE, 35),
          textFR: '**Collaboration avec les autorités**',
          textEN: '**Collaboration with authorities**',
          isBold: true,
          isRed: true,
        },
        {
          id: sid(CODE, 36),
          textFR: 'Fournir aux pompiers et techniciens du gaz toutes les informations utiles :',
          textEN: 'Provide firefighters and gas technicians with all useful information:',
          isBold: false,
          subSteps: [
            {
              id: sid(CODE, 37),
              textFR: 'Schémas de conduites, emplacements des vannes et des accès',
              textEN: 'Pipe diagrams, valve and access locations',
              isList: true,
            },
            {
              id: sid(CODE, 38),
              textFR: 'Conditions observées avant l\'évacuation (bruit, odeur, pression, etc.)',
              textEN: 'Conditions observed before evacuation (noise, odour, pressure, etc.)',
              isList: true,
            },
            {
              id: sid(CODE, 39),
              textFR: 'Statut des systèmes (ventilation, alimentation électrique, chauffage)',
              textEN: 'System status (ventilation, electrical power, heating)',
              isList: true,
            },
          ],
        },
        {
          id: sid(CODE, 40),
          textFR: 'Suivre rigoureusement les directives des équipes d\'intervention sur place',
          textEN: 'Strictly follow the directives of on-site intervention teams',
          isBold: false,
        },
        // ── Communication interne ───────────────────────────
        {
          id: sid(CODE, 41),
          textFR: '**Communication interne**',
          textEN: '**Internal communication**',
          isBold: true,
          isRed: true,
        },
        {
          id: sid(CODE, 42),
          textFR: 'Tenir les responsables de secteur informés de l\'évolution de la situation par canaux sécurisés (radio extérieure ou téléphone à distance du périmètre)',
          textEN: 'Keep sector supervisors informed of the situation\'s evolution through secure channels (exterior radio or telephone at distance from perimeter)',
          isBold: false,
        },
        {
          id: sid(CODE, 43),
          textFR: 'Diffuser des consignes claires : ne pas retourner dans le bâtiment, ne pas fumer, ne pas utiliser de véhicule à proximité',
          textEN: 'Broadcast clear instructions: do not return to the building, do not smoke, do not use vehicles nearby',
          isBold: false,
          isRed: true,
        },
        // ── Autorisation de retour ──────────────────────────
        {
          id: sid(CODE, 44),
          textFR: '**Autorisation de retour**',
          textEN: '**Return authorization**',
          isBold: true,
          isRed: true,
        },
        {
          id: sid(CODE, 45),
          textFR: 'Attendre l\'autorisation écrite ou verbale du chef des pompiers avant toute réintégration',
          textEN: 'Wait for written or verbal authorization from the fire chief before any re-entry',
          isBold: false,
          isRed: true,
        },
        {
          id: sid(CODE, 46),
          textFR: 'Ventiler adéquatement le bâtiment et valider, avec le fournisseur de gaz, que la fuite est colmatée et le réseau purgé',
          textEN: 'Adequately ventilate the building and validate with the gas supplier that the leak is sealed and the network purged',
          isBold: false,
        },
        // ── Vérification technique ──────────────────────────
        {
          id: sid(CODE, 47),
          textFR: '**Vérification technique**',
          textEN: '**Technical verification**',
          isBold: true,
          isRed: true,
        },
        {
          id: sid(CODE, 48),
          textFR: 'Avec le responsable mécanique, confirmer la remise en service sécuritaire des systèmes de ventilation, chauffage et production',
          textEN: 'With the mechanical supervisor, confirm the safe restart of ventilation, heating, and production systems',
          isBold: false,
        },
        {
          id: sid(CODE, 49),
          textFR: 'Effectuer un test fonctionnel des détecteurs de gaz avant la reprise des activités',
          textEN: 'Conduct a functional test of gas detectors before resuming activities',
          isBold: false,
        },
        // ── Rédaction du rapport post-incident ──────────────
        {
          id: sid(CODE, 50),
          textFR: '**Rédaction du rapport post-incident**',
          textEN: '**Post-incident report writing**',
          isBold: true,
          isRed: true,
        },
        {
          id: sid(CODE, 51),
          textFR: 'Documenter l\'événement dans un rapport officiel comprenant :',
          textEN: 'Document the event in an official report including:',
          isBold: false,
          subSteps: [
            {
              id: sid(CODE, 52),
              textFR: 'La chronologie complète des actions',
              textEN: 'Complete timeline of actions',
              isList: true,
            },
            {
              id: sid(CODE, 53),
              textFR: 'Les mesures de prévention prises',
              textEN: 'Prevention measures taken',
              isList: true,
            },
            {
              id: sid(CODE, 54),
              textFR: 'L\'efficacité des procédures d\'évacuation',
              textEN: 'Effectiveness of evacuation procedures',
              isList: true,
            },
            {
              id: sid(CODE, 55),
              textFR: 'Les recommandations pour éviter la répétition du scénario',
              textEN: 'Recommendations to prevent recurrence',
              isList: true,
            },
          ],
        },
        {
          id: sid(CODE, 56),
          textFR: 'Conserver une copie dans la section Registres et annexes du PMU industriel',
          textEN: 'Keep a copy in the Registers and Appendices section of the industrial ERP',
          isBold: false,
        },
      ],
    },
  ],
};