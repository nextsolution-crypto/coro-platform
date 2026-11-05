import { COLORS, ProcedureTemplate, sid } from './types';

const CODE = 'P032';

export const P032_INDISPONIBILITE_PROTECTION_INCENDIE: ProcedureTemplate = {
  id: 'p032_indisponibilite_protection_incendie',
  code: CODE,
  titleFR: 'PROTECTION INCENDIE COMPROMISE',
  titleEN: 'FIRE PROTECTION IMPAIRMENT',
  icon: '🧯',
  headerColor: COLORS.red,
  activationRule: 'manual',
  documentTypes: ['PMU', 'PSI'],
  roleSections: [{
    roleCode: 'ROLE-CU',
    roleLabelFR: "Coordonnateur d'urgence",
    roleLabelEN: 'Emergency Coordinator',
    headerColor: COLORS.red,
    steps: [
      { id: sid(CODE, 1), textFR: '**Confirmer une indisponibilité opérationnelle** : le système ou une partie du système pourrait ne pas fonctionner lors d’un incendie. Distinguer cette situation d’une déficience sans effet matériel immédiat.', textEN: '**Confirm an operational impairment**: the system or part of it might not function during a fire. Distinguish this from a deficiency with no immediate material effect.', isBold: true, isRed: true },
      { id: sid(CODE, 2), textFR: 'Identifier les systèmes, zones et bâtiments touchés ainsi que la durée connue ou estimée.', textEN: 'Identify affected systems, areas, and buildings, and the known or estimated duration.' },
      { id: sid(CODE, 3), textFR: 'Désigner le responsable de l’indisponibilité et aviser la direction, le propriétaire ou son représentant.', textEN: 'Designate the impairment coordinator and notify management, the owner, or the owner representative.' },
      { id: sid(CODE, 4), textFR: 'Aviser le service incendie, l’autorité compétente, l’assureur et le service d’alarme lorsque le plan approuvé ou la juridiction l’exige.', textEN: 'Notify the fire department, authority having jurisdiction, insurer, and alarm service when required by the approved plan or jurisdiction.' },
      { id: sid(CODE, 5), textFR: 'Évaluer le risque accru et appliquer les mesures compensatoires approuvées : surveillance incendie, restriction d’activités ou de sources d’allumage, alimentation temporaire ou évacuation de la zone touchée.', textEN: 'Assess increased risk and implement approved compensating measures: fire watch, restriction of activities or ignition sources, temporary supply, or evacuation of the affected area.' },
      { id: sid(CODE, 6), textFR: 'Informer les superviseurs et occupants concernés sans présenter une mesure compensatoire comme un remplacement permanent de la protection.', textEN: 'Inform affected supervisors and occupants without presenting a compensating measure as a permanent replacement for protection.' },
      { id: sid(CODE, 7), textFR: 'Ne pas réparer, contourner ou remettre en service le système; confier ces travaux au personnel qualifié.', textEN: 'Do not repair, bypass, or return the system to service; qualified personnel must perform that work.', isBold: true },
      { id: sid(CODE, 8), textFR: 'Avant de lever les mesures, obtenir la confirmation des inspections et essais requis, puis aviser les parties précédemment informées.', textEN: 'Before lifting measures, obtain confirmation of required inspections and tests, then notify previously informed parties.' },
      { id: sid(CODE, 9), textFR: 'Consigner l’étendue, les avis, les mesures compensatoires, la remise en service et les preuves dans la chronologie Incident.', textEN: 'Record scope, notifications, compensating measures, restoration, and evidence in the Incident timeline.' },
    ],
  }],
};
