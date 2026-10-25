# Clôture du MASTER portail — périmètre audité

Date : 25 octobre 2026

Verdict : `PILOTE ENCADRÉ`

Version produit active : `7ad50c4b4ca436ee646e550986218a41e8357eab`

Registres réconciliés : `bc2fc4887a0f575b71a7211064fa5d929584ab67`

Release : `40198512542` SUCCESS

Inspection : `40199449644` PASS/GO

Les campagnes closes ne doivent pas être rejouées sans modification pertinente,
changement d'environnement ou indice de régression.

## Matrice finale figée

| Catégorie | Fonctions | Décision pilote |
|---|---|---|
| VALIDÉ et inclus | Tableau de bord; listes et lectures directes bâtiments/projets; documents autorisés, versions, aperçu et téléchargement; Intelligence; Knowledge sur formats pris en charge; coffre hors ligne non sensible; activités et notifications en consultation; profil, session, déconnexion; manuel | Utilisable dans le pilote sous comptes nommés, MFA, organisations et bâtiments explicitement affectés |
| VALIDÉ mais non ouvert par défaut | Consultation Sentinelle, employés locaux sans courriel, rapports existants | Preuve acquise, mais module à ne pas ouvrir aux participants tant que les invitations accessibles avec le même accès bâtiment ne sont pas neutralisées côté serveur |
| NOT_VERIFIED | Réservation réussie/annulation; changement de mot de passe; invitations avec livraison; historique Sentinelle avec acteur autorisé; kiosques/visiteurs; résilience avancée; rendu cartographique avec tuiles externes; signature/PDF officiel | Non vendable et non démontrable comme validé; appliquer les conditions techniques ci-dessous avant accès participant |
| Explicitement exclu | Alertes externes, SMS, courriels, opérations d'urgence, formats sans extracteur | Aucun participant, fournisseur ou destinataire réel; permissions et modes de livraison désactivés |
| Décision métier en attente | Mutation/régénération d'un projet archivé | Proposition à approuver : lecture seule, réouverture explicite et tracée |

## Application effective des restrictions

| Fonction restreinte | Contrôle serveur/configuration observé | Effectivité pour le pilote | Condition avant participants |
|---|---|---|---|
| Opérations Incident/PCA | Permission fonctionnelle exacte, autorité Incident explicite, affectation active, organisation et bâtiment; aucun accès par rôle seul | APPLICABLE | Ne donner aucune permission Incident aux comptes pilote; vérifier la matrice d'affectations avant ouverture |
| Alertes Population | Accès bâtiment + `PopulationPermission` exacte; programme et mode de livraison `SANDBOX`/`LIVE`; cycle approbation/gel/envoi | APPLICABLE | Aucun `POPULATION_SEND`, programme non LIVE et fournisseurs externes neutralisés |
| SMS réel | Gate global de validation production et configuration fournisseur gouvernée | APPLICABLE | Maintenir la validation globale fermée pour le pilote et ne fournir aucun destinataire réel |
| Réservations | Accès projet et admissibilité explicite d'un conseiller; création refusée sans admissibilité | APPLICABLE PAR DONNÉES | Aucun `ProjectAdvisorEligibility` ni réservation préexistante dans le jeu pilote tant que le lot n'est pas validé |
| Carte externe | Dépendances réseau `unpkg.com` et OpenStreetMap | LIMITATION, pas une autorisation | Fournir la navigation par liste; ne pas promettre la carte avant décision réseau/confidentialité |
| Signature/PDF officiel | `assertProjectAccess` seulement; aucune permission de signature ou activation de module distincte observée; bouton disponible sur document admissible | NON APPLICABLE | Bloquant pour un pilote documentaire autonome : ajouter un gate serveur/configuration vérifiable ou valider expressément le parcours avant participants |
| Invitation Sentinelle | Contrôle d'accès bâtiment, mais aucune permission d'invitation distincte observée; l'action déclenche un courriel | NON APPLICABLE si Sentinelle est ouvert | Exclure tout le module Sentinelle des comptes participants ou ajouter un gate serveur distinct avant ouverture |
| Changement de mot de passe | Identité connectée et connaissance du mot de passe courant, sans activation pilote distincte | NON APPLICABLE comme exclusion | Valider le parcours sur compte synthétique avant participants, ou ajouter un gate serveur; une consigne seule ne suffit pas |
| Projet archivé | Accès projet canonique conservé; aucune invariant général de lecture seule approuvé | NON APPLICABLE | Bloquant pour tout projet archivé accessible : ne fournir aucun projet archivé aux comptes pilote jusqu'à décision et contrôle serveur |

## Verdict d'ouverture

Le périmètre validé est prêt pour une **démonstration contrôlée** et pour la
préparation opérationnelle du pilote. L'accueil autonome de participants n'est
pas encore autorisé tant que les restrictions non applicables suivantes ne sont
pas levées ou retirées du jeu de données et des modules accessibles :

1. signature/PDF officiel;
2. invitations Sentinelle si Sentinelle est exposé;
3. changement de mot de passe si ce parcours demeure exclu;
4. tout projet archivé accessible.

Une simple consigne, un bouton masqué ou un accompagnement humain ne constitue
pas la levée de ces conditions.

## Conservation des preuves

- inventaire : `CLIENT-PORTAL-FUNCTIONAL-INVENTORY.md`;
- constats : `CLIENT-PORTAL-FINDINGS.md`;
- passation : `CLIENT-PORTAL-HANDOFF.md`;
- CP-004/CORE-01/DOC-01 : `CP004-CORE01-DOC01-ACCEPTANCE.md`;
- preuves QA : `D:\CORO-QA\runs\cp-portal-inventory` et
  `D:\CORO-QA\runs\cp004-core-doc`.

## Lot distinct — accès autonome au pilote

Le lot `security/client-portal-autonomous-pilot` ajoute des restrictions serveur
opposables, limitées aux organisations explicitement inscrites dans la
configuration du pilote. Les quatre conditions d’ouverture autonome ont été
validées dans le stack synthétique : signature/PDF officiel, invitations
externes, changement de mot de passe et mutations de projets archivés.

La matrice Chrome est `12/12 PASS`; les appels directs et l’absence d’effets
secondaires sont couverts dans
`CLIENT-PORTAL-AUTONOMOUS-PILOT-ACCESS.md`. Le verdict commercial reste
`PILOTE ENCADRÉ`. L’autorisation effective de participants demeure conditionnée
à la release gouvernée, à l’inspection, à la configuration explicite des
organisations et aux champs opérationnels encore « À COMPLÉTER ».
