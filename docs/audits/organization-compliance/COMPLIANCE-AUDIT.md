# Audit intégré — écran Conformité CORO

Date : 2026-11-01  
Branche locale : `audit/organization-compliance`  
SHA audité : `109e3b823e93d6c32b4fa6592956ac9ecbc0e1be`  
SHA produit actif observé : `2be74443e9431220c735c9819bb76630d2dd50d2`  
PostgreSQL QA : 16, 164 migrations, tête `20261117010000_building_governance`

## Verdict

`CORRECTION_REQUIRED_BEFORE_COMPLIANCE_ACCEPTANCE`

L'écran est une vue documentaire simple et lisible, mais son intitulé et ses
badges donnent une assurance supérieure à la preuve réellement calculée. Un
document `DRAFT` récent est classé « Conforme ». La formule utilise uniquement
`Document.updatedAt`, sans exigence applicable, approbation, date d'effet,
date d'expiration ni preuve réglementaire. L'endpoint ignore en outre le
périmètre projet canonique des opérateurs et retourne tous les bâtiments actifs
de leur organisation.

Cette conclusion est limitée à `/buildings/compliance`. Elle ne certifie ni les
documents, ni les bâtiments, ni CORO sur le plan juridique ou réglementaire.

## Périmètre réel

- Interface Organisation : `/buildings/compliance`.
- API : `GET /api/projects/buildings-compliance`.
- Source actuelle : `Building -> Project -> Document`.
- Modèles `ComplianceRequirement`, `BuildingRequirement` et
  `ComplianceEvidence` : présents au schéma, mais non utilisés par cet écran.
- Portail Client : aucun écran ou endpoint Conformité équivalent identifié.

Fonctions présentes : synthèse par quatre compteurs, filtre de statut, filtre
client, recherche texte, liste/cartes responsive et navigation vers un projet.

Fonctions absentes et donc `NON_APPLICABLE` dans cet audit : détail de règle,
preuve téléchargeable, responsable, action corrective, export, modification
manuelle, tri explicite, pondération, déclaration ou vérification de conformité.

## Méthode

- Lecture du code, du schéma Prisma et des gardes serveur.
- PostgreSQL isolé avec deux organisations et acteurs synthétiques.
- Backend et frontend réels; stockage privé et fournisseurs QA isolés.
- 12 configurations Chrome headless réelles : 4 dimensions x 3 thèmes.
- Inspection visuelle manuelle des captures mobile, desktop et panne 503.
- Observation de production authentifiée et strictement en lecture seule.
- Quatre tests de caractérisation; ils prouvent l'état du code, pas sa conformité.

Preuves volumineuses :
`D:\CORO-QA\audits\organization-compliance\`.

## Résultats principaux

### Exactitude

- `DRAFT` récent -> `CONFORME` : `FAIL`.
- `VALIDATED` récent -> `CONFORME` selon la formule actuelle, mais sans preuve
  réglementaire : `PARTIAL`.
- seuils techniques de 10 et 12 mois : reproductibles, mais sans autorité métier.
- projet actif le plus récent sans document : masque la preuve d'un projet actif
  plus ancien du même bâtiment : `FAIL`.
- projet archivé seul : bâtiment rendu « Aucun document »; la conservation
  historique n'est pas expliquée : `PARTIAL`.
- bâtiment inactif : exclu : `PASS`.
- absence de document : affichée explicitement et non transformée en 100 % :
  `PASS`.

### Autorisations

- authentification interne et organisation active : `PASS`.
- isolation interorganisation : `PASS`.
- opérateur limité à ses projets/bâtiments : `FAIL`; l'endpoint prend seulement
  `organizationId` et retourne aussi un bâtiment porté par un autre acteur.
- Client désactivé, `CLIENT_MANAGER` et `CLIENT_CORPORATE` :
  `NON_APPLICABLE` à cet endpoint interne; aucun équivalent portail n'existe.
- mutations : `NON_APPLICABLE`; l'écran et son endpoint sont en lecture seule.

### Résilience

Une panne contrôlée `503` est journalisée dans la console puis affichée comme
une liste vide avec quatre compteurs à zéro et « Aucun bâtiment trouvé ». Aucun
message, `role="alert"` ou bouton de reprise n'est offert : `FAIL`.

### UX et accessibilité

- 12/12 configurations sans débordement horizontal critique ni erreur console.
- cartes mobiles lisibles; tableau desktop horizontal à partir de 768 px.
- statut communiqué par texte, symbole et couleur : `PASS`.
- contrôles principaux nommés dans l'arbre d'accessibilité : `PASS`.
- arbre d'accessibilité inspecté; lecteur d'écran réel : `NOT_VERIFIED`.
- zoom 200 %, clavier complet et persistance F5 : `PARTIAL`; structure
  compatible observée, mais aucune campagne de lecteur d'écran réelle.

## Production

La session autorisée a affiché la page en lecture seule avec trois bâtiments,
un compteur « Conforme » et deux « Sans document ». Les noms et adresses réels
ne sont pas recopiés dans les preuves Git. Aucune action, navigation de détail,
mutation ou export n'a été exécuté.

Cette observation confirme que l'écran est disponible; elle ne valide pas ses
calculs. Les scénarios de défaut proviennent exclusivement des fixtures QA.

## Références réglementaires

L'écran ne cite aucune loi, norme, juridiction ou édition précise. La
vérification de sources officielles est donc `NON_APPLICABLE`. Les mots
« Conforme », « Expiré » et « Tableau de conformité » restent néanmoins
trompeurs puisqu'ils ne sont reliés à aucune source applicable.

## Limites

- aucune règle métier approuvée sur la périodicité documentaire;
- aucune applicabilité par type de bâtiment;
- aucune preuve de lecteur d'écran réel;
- aucun écran portail correspondant;
- aucune preuve, export ou mutation exposés par cet écran;
- l'heure système backend n'est pas injectable; les dates de seuil ont été
  stabilisées par fixtures avec marge.

## Confirmations

- `PRODUCT_CODE_CHANGE: NO`
- `PRODUCTION_MUTATION: NO`
- `PUSH_PR_MERGE: NO`
- `APPLICATION_DEPLOYMENT: NO`
- `REAL_NOTIFICATION: NO`
- `WEB_AI_ACTIVATION: NO`

