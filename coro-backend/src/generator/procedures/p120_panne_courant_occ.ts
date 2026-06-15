import { ProcedureTemplate, COLORS, sid } from './types';
const CODE = 'P120';
export const P120_PANNE_COURANT_OCC: ProcedureTemplate = {
  id: 'p120_panne_courant_occ', code: CODE,
  titleFR: 'PANNE DE COURANT — OCCUPANTS',
  titleEN: 'POWER OUTAGE — OCCUPANTS',
  icon: '⚡', headerColor: COLORS.amber,
  activationRule: 'is_industrial', documentTypes: ['PMU', 'PSI'],
  roleSections: [{
    roleCode: 'ROLE-OCC', roleLabelFR: 'Occupants / Travailleurs', roleLabelEN: 'Occupants / Workers',
    headerColor: COLORS.amber,
    steps: [
      { id: sid(CODE,1), textFR: 'Rester calme et garder son sang-froid — éviter toute panique pour permettre une gestion ordonnée de la situation', textEN: 'Stay calm and keep composure — avoid panic to allow orderly management of the situation', isBold: false },
      { id: sid(CODE,2), textFR: 'Interrompre immédiatement toute activité dépendant de l\'électricité qui pourrait présenter un danger : notamment l\'utilisation d\'équipements roulants, d\'outils électriques ou d\'appareils électroniques', textEN: 'Immediately stop any electricity-dependent activity that could be dangerous: notably use of rolling equipment, power tools, or electronic devices', isBold: false, isRed: true },
      { id: sid(CODE,3), textFR: 'S\'éloigner des zones potentiellement dangereuses, comme les escaliers non éclairés et les espaces confinés', textEN: 'Move away from potentially dangerous areas, such as unlit staircases and confined spaces', isBold: false },
      { id: sid(CODE,4), textFR: 'Se diriger vers une zone sécuritaire et éclairée — utiliser les éclairages d\'urgence ou toute source de lumière naturelle disponible', textEN: 'Proceed to a safe and lit area — use emergency lighting or any available natural light source', isBold: false },
      { id: sid(CODE,5), textFR: 'Repérer les indications lumineuses des issues de secours pour faciliter l\'orientation en cas d\'évacuation', textEN: 'Locate the illuminated emergency exit signs to facilitate orientation if evacuation is needed', isBold: false },
      { id: sid(CODE,6), textFR: 'Si la panne se prolonge, suivre les consignes émises pour rejoindre un endroit sécuritaire ou le point de rassemblement désigné', textEN: 'If the outage continues, follow instructions issued to proceed to a safe location or the designated assembly point', isBold: false },
      { id: sid(CODE,7), textFR: 'Informer immédiatement le personnel responsable : contacter le chef de bâtiment ou le technicien du bâtiment pour signaler la panne', textEN: 'Immediately inform responsible personnel: contact the building supervisor or building technician to report the outage', isBold: false },
      { id: sid(CODE,8), textFR: 'Si responsable d\'un groupe, assurer la sécurité des occupants sous sa supervision', textEN: 'If responsible for a group, ensure the safety of occupants under your supervision', isBold: false },
      { id: sid(CODE,9), textFR: 'Rester attentif aux messages et consignes de sécurité diffusés par le système d\'annonce publique ou par les responsables d\'urgence', textEN: 'Stay attentive to safety messages and instructions broadcast by the public announcement system or emergency supervisors', isBold: false },
      { id: sid(CODE,10), textFR: 'Utiliser les équipements d\'urgence disponibles : si des lampes de poche ou des dispositifs d\'éclairage portatifs sont accessibles, les utiliser pour éclairer le chemin et rassurer les occupants — s\'assurer que ces équipements sont rangés à des emplacements connus et facilement accessibles', textEN: 'Use available emergency equipment: if flashlights or portable lighting devices are accessible, use them to light the way and reassure occupants — ensure these devices are stored in known and easily accessible locations', isBold: false },
      { id: sid(CODE,11), textFR: '⚠️ Installer des lampes de poche ou des dispositifs d\'éclairage d\'urgence à des points stratégiques du bâtiment et vérifier régulièrement leur bon fonctionnement — en cas de pannes fréquentes, envisager l\'installation de systèmes d\'éclairage de secours et de génératrices afin de réduire les perturbations et de maintenir la sécurité des opérations', textEN: '⚠️ Install flashlights or emergency lighting devices at strategic points in the building and regularly verify their proper operation — in case of frequent outages, consider installing emergency lighting systems and generators to reduce disruptions and maintain operational safety', isBold: false, isRed: true },
    ],
  }],
};