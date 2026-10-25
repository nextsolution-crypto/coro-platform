# CORO Client — décision commerciale V1

Date : 2026-10-25  
Branche candidate : `master/client-portal-v1-final`  
Commit produit fusionné : `ca3cbc814309b0661cec1370e90903332557b8b8`

## Verdict

`PILOTE ENCADRÉ`

La V1 techniquement démontrée est exploitable avec des organisations, comptes et bâtiments explicitement provisionnés par CORO, MFA actif et accompagnement. L'ouverture autonome n'est pas encore déclarée commercialement prête parce que la réception réelle des trois courriels d'accès n'est pas démontrée et que la règle définitive de réouverture d'un projet archivé reste à approuver.

## Matrice V1

| Fonction | Usage promis | Rôles | Contrôle effectif | Preuve | Décision V1 |
| --- | --- | --- | --- | --- | --- |
| Tableau de bord, bâtiments et projets | Consulter le périmètre affecté | Manager, Corporate | Organisation, client, bâtiments affectés, permissions | CP-002/003 et campagnes CORE-01 | Incluse |
| Documents, versions, téléchargements | Consulter et télécharger les documents autorisés | Manager, Corporate | Autorité ProjectFile, tenant/bâtiment, stockage privé | DOC-01, SIGN-01 stockage, remédiation historique | Incluse hors signature |
| Knowledge | Interroger les sources admissibles avec citations | Manager, Corporate | Autorisation avant retrieval et citation, cycle de vie ProjectFile | MASTER D et limites DOC-01 | Incluse pour les formats pris en charge |
| Intelligence | Voir les agrégats du périmètre | Manager, Corporate | Filtrage avant agrégation | CP-004 API 8/8, navigateur 16/16 | Incluse |
| Réservations | Créer et annuler lorsque le conseiller est admissible | Manager, Corporate | Projet, conseiller admissible, disponibilité, tenant | Campagne QA complète | Incluse sous configuration CORO |
| Profil, sessions, mot de passe | Gérer l'accès personnel | Manager, Corporate | Secret courant, politique, révocation des sessions | Lot accès autonome | Incluse |
| Sentinelle locale | Employés, présences, rapports et recensement | Comptes explicitement habilités | Tenant/bâtiment et permissions Sentinelle | PR #72/#73 et rapport peuplé PR #76 | Incluse de façon encadrée |
| Carte des bâtiments | Navigation géographique facultative | Manager, Corporate | Même liste bâtiment que le portail; liste toujours disponible | Recette réseau réelle du présent lot | Optionnelle, incluse sans SLA |
| Coffre hors ligne | Documents non sensibles admissibles | Comptes autorisés | WebAuthn PRF, lease, révocation et purge | P-2.2 | Incluse selon classification |
| Signature/PDF officiel | Signature engageante | Aucun participant V1 | Restriction serveur des organisations pilote | Lot accès autonome et SIGN-01 synthétique | Exclue |
| Alertes et communications externes | Alerter des populations | Aucun participant V1 | Permissions exactes, modes fournisseur et gates globaux | Registres P-5 différés | Exclues |
| Projet archivé | Consultation historique | Comptes autorisés | Mutations/régénérations bloquées dans le périmètre pilote | DOC-01 et restriction pilote | Lecture seule seulement; réouverture absente |

## Intégrations réelles et simulées

- Carte : Leaflet 1.9.4 est désormais intégré au bundle. Une recette navigateur réelle a chargé 24 tuiles depuis `https://tile.openstreetmap.org`, toutes HTTP 200, avec attribution visible, aucun appel UNPKG, aucune erreur console et aucun débordement global. Preuve : `D:\CORO-QA\runs\client-portal-v1-final\map-real-network`.
- Courriel simulé : invitation et atomicité fournisseur sont démontrées avec l'adaptateur local deny-by-default. Cela ne prouve pas la livraison.
- Courriel réel : SPF, DKIM Brevo (`brevo1` et `brevo2`) et DMARC sont publiés. Les parcours invitation, récupération et magic link n'ont pas encore une preuve complète fournisseur → livraison → boîte → ouverture. Ils restent `NOT_VERIFIED_REAL_DELIVERY`.
- Signature : stockage privé, téléchargement autorisé et PDF synthétique sont démontrés. Aucun fournisseur réel, effet engageant ou valeur juridique n'est revendiqué.

## Appareils partagés

La borne utilise un QR serveur rotatif. La reconnaissance persistante demeure facultative et limitée au téléphone personnel par cookie `HttpOnly`; la borne ne crée pas ce jeton. Le présent lot supprime l'identité du message post-confirmation, remet l'écran à zéro après quatre secondes et réinitialise toute saisie après trente secondes d'inactivité. Les participants peuvent corriger l'identité avant confirmation sans voir celle de la personne précédente après l'opération.

## Nouveau client

Le provisionnement demeure une opération CORO gouvernée : organisation et client, bâtiments, comptes, rôles, affectations, modules, MFA, puis révocation/suspension. Les fixtures QA et campagnes existantes démontrent les articulations hors courriel réel. Un client ne peut ni s'attribuer un bâtiment, ni activer une permission opérationnelle, ni retirer les restrictions du pilote. Aucun système de facturation supplémentaire n'est créé par ce chantier.

## Exploitation

- Responsable d'exploitation : **à désigner par Mathieu**.
- Support : `info@getcoro.io`; horaires et engagement de réponse **à approuver**, sans promesse 24/7.
- Incident : suspendre explicitement le compte ou l'affectation, préserver les preuves, qualifier l'impact et utiliser le processus gouverné de correction/release.
- Sauvegarde/restauration : preuves récentes `REMOTE_VERIFIED` et `RESTORE_VERIFIED`; quatre images de rollback conservées.
- Carte : service public OSM sans SLA; la liste des bâtiments reste le parcours de repli complet.
- Courriel : le fournisseur et le domaine sont configurés, mais la réception réelle des trois modèles doit être constatée avant de promettre un onboarding autonome.

## Traçabilité de release

- PR produit : `#78`, fusionnée dans `ca3cbc814309b0661cec1370e90903332557b8b8`.
- CI principale : run `40234879018`, `SUCCESS`.
- Première release : run `40235215704`, images immuables construites avec succès, puis arrêt fail-closed avant sauvegarde, migration ou remplacement de conteneur avec `RELEASE_CAPACITY_INSUFFICIENT`.
- Inspection après l'arrêt : run `40236035556`, `GO`; production inchangée sur `c5adf5d4586879a7875abc4ea5be93fdda775115`, 155 migrations, services sains, sauvegarde `REMOTE_VERIFIED`, restauration `RESTORE_VERIFIED` et quatre images de rollback disponibles.
- Audit capacité : run `40236091898`; 19 555 102 720 octets libres pour 19 700 723 075 requis, soit un déficit de 145 620 355 octets.
- Maintenance gouvernée : dry-run `40236196093`, puis exécution `40236267787`; 32 images de cache non référencées âgées d'au moins 12 heures supprimées, aucune image active ou de rollback touchée, espace libre porté à 38 285 385 728 octets.
- La release ayant un état terminal `FAILED`, le présent successeur documentaire constitue le nouveau candidat traçable; aucun état de release n'est réinitialisé ni contourné.

## Réserves actionnables

### Courriels réels

**LIMITATION** — Invitation, récupération et magic link ne possèdent pas encore la chaîne complète jusqu'à la réception et l'ouverture.  
**IMPACT** — L'accès autonome d'un nouveau participant ne peut pas être promis.  
**CONDITION DE LEVÉE** — Exécuter les trois parcours dans le stack QA avec le credential Brevo injecté par un canal gouverné, vers `info@getcoro.io`, puis constater dans la boîte la réception et ouvrir chaque lien.  
**RESPONSABLE** — CORO Ops pour le secret QA; Mathieu uniquement pour la constatation de boîte si aucun accès automatisé autorisé n'existe.  
**STATUT** — Bloquant pour l'onboarding autonome; compatible avec une démonstration/pilote accompagné.

### Projets archivés

**LIMITATION** — Aucun workflow définitif de réouverture n'est approuvé.  
**IMPACT** — Un projet archivé demeure consultable mais ne peut pas être repris dans la V1.  
**CONDITION DE LEVÉE** — Approuver ou refuser la règle « lecture seule; réouverture explicite, autorisée et tracée » dans un mandat distinct.  
**RESPONSABLE** — Mathieu, décision produit.  
**STATUT** — Exclusion V1 non bloquante.

## Ce qui peut être présenté

Le portail, les périmètres bâtiment/projet, les documents privés, Knowledge, Intelligence, réservations configurées, gestion de session, Sentinelle locale et rapports d'évacuation peuvent être démontrés avec des données synthétiques. La carte peut être présentée comme une aide facultative dépendant d'OpenStreetMap, sans SLA. La signature réelle, les communications d'urgence et l'onboarding autonome par courriel restent exclus jusqu'à leurs preuves propres.

