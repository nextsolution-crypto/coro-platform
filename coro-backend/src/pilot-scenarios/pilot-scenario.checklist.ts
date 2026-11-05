import { PilotPhase } from '@prisma/client';

export type PilotChecklistDefinition = {
  phase: PilotPhase;
  checkKey: string;
  label: string;
};

const phase = (
  phaseName: PilotPhase,
  definitions: Array<[string, string]>,
): PilotChecklistDefinition[] =>
  definitions.map(([checkKey, label]) => ({
    phase: phaseName,
    checkKey,
    label,
  }));

export const TOUR_PREMONT_E2E_CHECKLIST: PilotChecklistDefinition[] = [
  ...phase(PilotPhase.FOUNDATION, [
    ['foundation.client', 'Client créé et rattaché au bon tenant'],
    ['foundation.building', 'Bâtiment créé et rattaché au bon client'],
    ['foundation.project', 'Projet PMU créé sans modifier le PMU historique'],
    ['foundation.identities', 'Identités multirôles actives avec MFA normal'],
    [
      'foundation.isolation',
      'Refus inter-tenant et hors affectation démontrés',
    ],
  ]),
  ...phase(PilotPhase.CONFIGURATION, [
    ['configuration.identity', 'Identification et responsables du bâtiment'],
    [
      'configuration.occupancy',
      'Occupation, horaires et personnes à mobilité réduite',
    ],
    ['configuration.fire', 'Protection incendie et déficiences documentées'],
    [
      'configuration.utilities',
      'Utilités, alimentation d’urgence et ventilation de sécurité',
    ],
    ['configuration.hazards', 'Matières dangereuses et équipements critiques'],
    [
      'configuration.preview',
      'Aperçu du configurateur cohérent et persistant après F5',
    ],
  ]),
  ...phase(PilotPhase.DOCUMENT_GENERATION, [
    ['document.generate', 'Génération PMU déterministe et idempotente'],
    ['document.edit', 'Édition et sauvegarde sans perte ni conflit silencieux'],
    ['document.version', 'Version et contenu soumis clairement identifiables'],
    ['document.private-file', 'Document privé ouvrable et téléchargeable'],
    [
      'document.pdf',
      'Export applicable ouvrable, complet et rattaché au projet',
    ],
  ]),
  ...phase(PilotPhase.INTERNAL_REVIEW, [
    ['review.submit', 'Soumission au réviseur indépendant'],
    ['review.correction-request', 'Demande de correction sans faux succès'],
    [
      'review.advisor-return',
      'Retour au conseiller et conservation des commentaires',
    ],
    ['review.resubmit', 'Correction, nouvelle version et nouvelle soumission'],
    [
      'review.independent-decision',
      'Auto-approbation refusée et décision indépendante auditée',
    ],
  ]),
  ...phase(PilotPhase.CLIENT_APPROVAL, [
    ['client.publish', 'Version approuvable publiée au bon ClientUser'],
    [
      'client.scope',
      'Corporate et gestionnaire voient uniquement leur périmètre',
    ],
    ['client.comment', 'Commentaire client attribué au véritable auteur'],
    [
      'client.correction-loop',
      'Correction client retournée au conseiller puis republiée',
    ],
    ['client.approval', 'Approbation client et version finale immuable'],
  ]),
  ...phase(PilotPhase.KNOWLEDGE_AI, [
    [
      'knowledge.eligibility',
      'Seule la version canonique admissible est indexée',
    ],
    ['knowledge.retrieval', 'Information propre au PMU récupérée fidèlement'],
    [
      'knowledge.citation',
      'Citation ouvrable vers la source et la version exactes',
    ],
    [
      'knowledge.refresh',
      'Nouvelle version et retrait invalident les résultats obsolètes',
    ],
    ['knowledge.authorization', 'Aucun contenu ni citation hors périmètre'],
    [
      'ai.grounding',
      'Réponse simulée fondée sur les sources avec incertitude explicite',
    ],
  ]),
  ...phase(PilotPhase.INCIDENT_SENTINELLE, [
    [
      'incident.exercise',
      'Exercice synthétique clairement distingué d’un incident réel',
    ],
    [
      'incident.procedure',
      'Procédure, provenance et fiche d’intervention cohérentes',
    ],
    [
      'incident.timeline',
      'Chronologie et transitions atomiques sans usurpation d’auteur',
    ],
    [
      'sentinelle.presence',
      'Employés, visiteurs et contracteurs synthétiques recensés',
    ],
    ['sentinelle.report', 'Rapport peuplé ouvrable et export exploitable'],
    [
      'incident.no-external-effects',
      'Aucune alarme ni communication externe réelle',
    ],
  ]),
  ...phase(PilotPhase.EXERCISE_REX, [
    ['rex.create', 'REX créé depuis l’exercice terminé'],
    ['rex.finding', 'Constat et recommandation traçables'],
    ['rex.action', 'Action corrective avec responsable et échéance'],
    ['rex.evidence', 'Preuve ajoutée et vérifiée indépendamment'],
    ['rex.close', 'Fermeture conforme et répétition idempotente'],
  ]),
  ...phase(PilotPhase.RESILIENCE, [
    [
      'resilience.snapshot',
      'Indicateurs recalculés depuis les données autorisées',
    ],
    [
      'resilience.exercise',
      'Exercice et action corrective reflétés sans double comptage',
    ],
    ['resilience.scope', 'Aucune déduction sur un bâtiment hors périmètre'],
  ]),
  ...phase(PilotPhase.NETWORK, [
    ['network.assignment', 'Affectations réseau cohérentes et limitées'],
    [
      'network.shared-content',
      'Contenu partagé selon sa portée globale, organisation ou projet',
    ],
    [
      'network.revocation',
      'Retrait d’affectation effectif dès la requête suivante',
    ],
  ]),
  ...phase(PilotPhase.FINANCIAL, [
    [
      'financial.assumptions',
      'Hypothèses de démonstration clairement identifiées',
    ],
    [
      'financial.timelogs',
      'Activités et temps synthétiques alimentent les calculs',
    ],
    [
      'financial.aggregates',
      'Agrégats exhaustifs et limités au périmètre autorisé',
    ],
    ['financial.no-global-rate-change', 'Aucun tarif réel ou global modifié'],
  ]),
  ...phase(PilotPhase.SECURITY_RECOVERY, [
    [
      'security.session-switch',
      'Aucune donnée résiduelle après changement de compte',
    ],
    [
      'security.failure-recovery',
      'Panne contrôlée, erreur visible et reprise sans doublon',
    ],
    [
      'security.audit',
      'Actions et décisions importantes présentes dans l’audit',
    ],
    ['security.reset', 'Reset limité aux fixtures du scénario'],
    [
      'security.communications',
      'Communications métier toujours simulées ou bloquées',
    ],
    [
      'security.residual-access',
      'Aucun accès temporaire résiduel après clôture',
    ],
  ]),
];
