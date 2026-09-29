# MIG-03 — Pre-Incident Gate

Gate documentaire avant MIG-03D (`/coro-incident`). Aucune modification de code, de texte public, de métadonnées ni d'image. HEAD `1ceeb308`, arbre propre au départ ; `migratedV2Routes` contient `/resilience-operationnelle`, `/sentinelle`, `/sentinelle-population` et **pas** `/coro-incident`.

## 1. Frontières produit figées

| Page | Possède | Ne possède pas |
|---|---|---|
| `/resilience-operationnelle` | Préparation organisationnelle ; avant / pendant / après ; indice CORO ; organisation d'urgence ; lien préparation, action, apprentissage ; système de résilience de haut niveau | Le détail des flux des produits enfants |
| `/sentinelle` | Personnes dans le bâtiment ; entrée / sortie ; présence employés, visiteurs, contracteurs ; registre d'occupation ; évacuation ; rassemblement ; statut confirmé / non confirmé | L'alerte à la population externe |
| `/sentinelle-population` | Population externe ; scénario industriel / environnemental V1 ; territoire potentiellement concerné ; établissements sensibles ; alerte et consignes au public ; canaux directs CORO vs canaux externes ; traçabilité | L'occupation d'un bâtiment |
| Incident (MIG-03D, réservé) | Sous réserve de vérification : événement, type, activation, journal, mobilisation, information propre à l'incident, information pour les premiers répondants, QR intervention, rapport, REX et suivi correctif, incidents simultanés | — |

## 2. Recoupements dans le texte public
Recherche par mots-clés dans les trois pages (comptes approximatifs) : Résilience mentionne « incident » 59 fois (module Incident, alerte, rapport, FAQ), « rapport PDF » une fois ; Sentinelle mentionne l'incident 2 fois ; Population 2 fois.
- Résilience : ACCEPTABLE CONTEXT pour la boucle et la FAQ ; **REVIEW LATER** pour la section « Alerte » (capture du courriel) et la carte « Historique et rapport », qui décrivent des éléments d'Incident. Ils ont déjà été condensés en MIG-03A-B.
- Sentinelle : ACCEPTABLE CONTEXT (déclencher un incident depuis le registre, une phrase).
- Population : ACCEPTABLE CONTEXT.
- **BOUNDARY CONFLICT : aucun constaté.**
Limite : contrôle par mots-clés, pas relecture de chaque phrase.

## 3. Transmission vers Incident — établi
- **QR intervention :** point d'accès `GET /occupancy/intervention-access/:token` ; jeton public par incident ; aucun compte ; valide seulement tant que l'incident est actif (sinon « lien invalide ou expiré ») ; compteur d'accès incrémenté ; expose type et heure de l'incident, point de rassemblement, fiche d'intervention, instantané de l'équipe, nom et adresse du bâtiment ; envoi possible par courriel. **Non résolu :** génération du jeton, durée maximale, création automatique, parcours réel des intervenants. Propriété : INCIDENT.
- **Panneau d'alarme (PAI) :** `POST /occupancy/alarm-trigger/:token`, jeton d'URL par bâtiment ; crée un incident `FIRE_ALARM` en pré-alerte, notifications différées ; un signal répété est journalisé sur l'incident ouvert ; escalade automatique après une fenêtre ; ne crée pas d'événement d'évacuation ; dispositif externe absent du dépôt. PARTIAL, INCIDENT / FUTURE. Aucune allégation publique d'automatisation sans déploiement établi.
- **Rapport / REX :** PDF d'incident, chronologie, équipe mobilisée, REX, actions correctives existent (MIG-03A). Retirés de Résilience : l'inventaire des 7 sections, « prêt à archiver », le détail de l'export. Ré-audit requis.
- **Types d'incidents :** « 15 types » et codes P001-P026 de la V1 **ne sont pas repris** ; MIG-03D dérive le modèle public du code actuel.
- **Incidents simultanés :** publié auparavant, non revérifié. MIG-03D vérifie.
- **Premiers répondants :** les assets ci-dessous ne sont pas présumés publiables.

## 4. Questions à trancher par MIG-03D
1. Qu'est-ce qui crée un `IncidentEvent` ? 2. Quels types sont pris en charge ? 3. Des procédures sont-elles associées aux types ? 4. Que contient le journal ? 5. Qui peut activer ? 6. Qui est notifié ? 7. Quels canaux fonctionnent réellement ? 8. Comment la présence et la mobilisation de l'équipe sont-elles déterminées ? 9. Comment l'occupation de Sentinelle alimente-t-elle Incident ? 10. Plusieurs incidents simultanés ? 11. Qu'est-ce que le mode exercice ? 12. Que change-t-il ? 13. Que contient le rapport PDF ? 14. Quels champs REX ? 15. Quel flux d'actions correctives ? 16. Fonctionnement bout en bout du QR intervention ? 17. Quelle information le jeton expose-t-il ? 18. Validité et révocation du jeton ? 19. Statut du pont PAI ? 20. Ce qui est LIVE, PARTIAL, FUTURE. Non répondues ici, sauf ce qui est déjà établi ci-dessus.

## 5. Assets transmis à Incident
| Asset | Classification actuelle | Pourquoi différé | Rôle attendu | Ré-audit requis ? |
|---|---|---|---|---|
| `alert/fiche_intervention.webp` | DEFER (fiche d'intervention, données de bâtiment) | Relève d'Incident / QR intervention | Information pour les premiers répondants | Oui |
| `website-v2/sentinel/first-responders-arrival.webp` | Illustration V2 réservée | Relève d'Incident | Photographie d'arrivée des intervenants | Oui |
| `images/solutions/resilience/coro-module-incident.webp` | DEFER (formulaire de déclenchement) | Non utilisée par la V1, relève d'Incident | Déclenchement | Oui |
| `alert/coro-alerte-envoyee.webp` | REPLACE (canaux voix / application absents de l'UI actuelle) | Écart avec le produit actuel | Notification confirmée | Oui |
| `alert/coro-alerte-panique-courriel.webp` | KEEP WITH PUBLICATION REVIEW (utilisée sur Résilience) | Provenance non confirmée | Courriel d'alerte | Oui (provenance) |
| `images/solutions/resilience/coro-rapport-incident.webp` | REPLACE (« ISO 22301 » incrusté, bouton absent) | Rapport d'incident | Rapport / REX | Oui |
| `images/solutions/resilience/coro-intelligence-organisationnelle.webp` | REJECT | Thème et références non conformes | — | Non |
| `alert/coro-module-incident-types.webp` | REPLACE (registre d'occupation, jeton de borne visible) | Relève de Sentinelle | Non retenue pour Incident | Non |
| `images/homepage/{incident-response,platform-incident,drill-exercise}.webp` | Non audités | Hors périmètre MIG-03 | Possibles illustrations | Oui |

## 6. Territoire visuel d'Incident (direction seulement)
Incident possède : événement, activation, coordination, chronologie, réponse, premiers répondants, rapport, retour d'expérience. Il ne doit pas ressembler à Sentinelle (entrée / rassemblement), à Population (scénario industriel externe) ni à Résilience (système organisationnel). Plus immédiat et opérationnel, sans centre de commande fictif.

## 7. Territoires SEO
Résilience : résilience opérationnelle et organisationnelle. Sentinelle : registre d'occupation et décompte à l'évacuation. Population : alerte à la population, urgence industrielle et environnementale. Incident (réservé) : gestion d'incident et intervention opérationnelle. MIG-03D fait sa propre recherche.

## 8. Langues
`/resilience-operationnelle` : FR / EN. `/sentinelle` : FR seulement. `/sentinelle-population` : FR seulement. Incident : à décider par MIG-03D après audit de sa V1.

## 9. Registre Go-Live MIG-03 consolidé
- **Résilience :** provenance des captures « organisation d'urgence » et « courriel d'alerte » (PUBLICATION-BLOCKER hérité de MIG-03A) ; recaptures V1 (indice, alerte envoyée, rapport, registre).
- **Sentinelle :** RECAPTURE du registre, de l'évacuation et de la vue des non confirmés ; formulation de vie privée à valider (« n'assure pas la géolocalisation continue ») ; purge du registre à 12 mois non publiée.
- **Population :** PUBLICATION-BLOCKER, étape 05 (adresse d'apparence réelle) ; PUBLICATION-REVIEW, données de démonstration non confirmées ; DO NOT PUBLISH, `alerte.webp` (1 800 douteux).
- **Global MIG-03 :** décisions FR seulement ; `<html lang>` global reste une dette MIGRATION-ONLY ; test lecteur d'écran et zoom 200 / 400 % non faits ; références normatives (ISO 22301, CNPI, CNESST, NFPA, CCOHS) retirées de Résilience, à réintroduire seulement après validation.
Les points MIG-02 restent dans `MIG-02-GATE.md`.

## 10. Décision du gate
PASS. Frontières claires, aucun conflit de frontière constaté (contrôle par mots-clés), transmission Incident documentée, assets différés inventoriés, questions explicites, Go-Live consolidé, aucun changement de code.
