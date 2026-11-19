# CORO Report 2.0 — Catalogue de 12 modèles

## Noyau commun

Référence, type, date/heure et fuseau, organisation, bâtiment, étage/zone/local,
auteur, résumé, récit chronologique, priorité, personnes/témoins, interventions,
communications, pièces jointes, suivis, clôture, révision et approbation.

Les coordonnées personnelles sont facultatives, masquées à l’affichage selon
permission et assorties d’une finalité. Aucun identifiant gouvernemental n’est
collecté par défaut.

| Modèle | Sections spécialisées | Conditions principales | Répétables |
|---|---|---|---|
| Incident général | classification, faits, impacts | blessures/dommages déclenchent détails | personnes, témoins, actions |
| Sécurité / intrusion | accès, point d’entrée, menace, police | effraction/arme/appel police | suspects, témoins, véhicules, preuves |
| Incendie / alarme | déclencheur, zone, panneau, évacuation | feu confirmé, gicleurs, service incendie | zones, équipements, répondants |
| Dégât d’eau | origine, étendue, coupure, assèchement | eau active, contamination, relogement | locaux, équipements, fournisseurs |
| Accident / assistance | mécanisme, soins, transport | blessure/ambulance/consentement | personnes, soins, témoins |
| Dommage matériel | bien, propriétaire, estimation | véhicule/équipement/assurance | biens, véhicules, photos |
| Défaillance technique | système, alarme, disponibilité | panne critique/escalade/fournisseur | équipements, diagnostics, travaux |
| Événement opérationnel | activité, écart, continuité | interruption/impact/SLA | actions, communications |
| Rapport de quart | relève, rondes, anomalies, clés | anomalie ou suivi ouvert | rondes, événements, actifs transférés |
| Évacuation | motif, zones, comptage, réintégration | personne manquante/refus/urgence | zones, points de rassemblement, personnes |
| Matières dangereuses | produit, FDS, quantité, confinement | exposition/déversement/appel externe | substances, mesures, intervenants |
| Observation / non-conformité | exigence, constat, gravité, correction | récurrence/échéance/fermeture | constats, preuves, actions |

## Listes normalisées initiales

Priorité (`LOW`, `NORMAL`, `HIGH`, `CRITICAL`), résultat (`OBSERVED`,
`CONFIRMED`, `UNKNOWN`), intervention (`INTERNAL`, `POLICE`, `FIRE`, `EMS`,
`CONTRACTOR`), état de suivi (`OPEN`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`)
et niveau de confidentialité (`STANDARD`, `RESTRICTED`). Les organisations
peuvent versionner leurs valeurs; les anciennes versions restent lisibles.

## Publication

Chaque modèle est une fixture idempotente en `DRAFT`, validée par le moteur,
puis publiée explicitement. Une personnalisation crée une nouvelle version;
elle ne modifie jamais les rapports historiques.
