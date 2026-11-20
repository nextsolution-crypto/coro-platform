# CORO Report 2.0 — découplage antivirus

## Périmètre

Cette livraison sépare les fonctions structurées de CORO Report des fonctions qui ingèrent des fichiers non fiables. Elle ne remplace pas l'antivirus et ne déclare aucun fichier propre sans analyse.

| Fonction | Fichier externe requis | Antivirus nécessaire | Dépendance actuelle | Livraison sans ClamAV permanent |
|---|---:|---:|---|---:|
| Modèles et catalogue | Non | Non | Aucune | Oui |
| Formulaires, conditions et répétables | Non | Non | Aucune | Oui |
| Brouillon, autosauvegarde, soumission, révision et approbation | Non | Non | Aucune | Oui |
| PDF généré depuis les données CORO validées | Non | Non | Rendu serveur interne | Oui |
| Recherche et historique natif | Non | Non | Aucune | Oui |
| Lecture d'une pièce jointe existante marquée `CLEAN` | Non, fichier déjà validé | Contrôle historique déjà acquis | Statut `CLEAN`, RBAC et stockage privé | Oui |
| Nouveau téléversement de pièce jointe | Oui | Oui | `IncidentReportAttachmentScanner` | Non, bloqué par défaut |
| Import staging CSV/JSON | Oui | Oui | Scanner, stockage privé et quarantaine | Non, bloqué |
| Mapping, preview et exécution d'import | Oui, fichier staging validé | Oui en amont | `scanStatus=CLEAN` et flag d'import | Non, import désactivé |
| Lecture d'archives déjà réconciliées | Non | Non | Capacité serveur distincte | Oui sous activation distincte |

## Contrat fail-closed

- `INCIDENT_REPORT_ATTACHMENTS_ENABLED=false` par défaut.
- `INCIDENT_REPORT_IMPORT_ENABLED=false` par défaut et maintenu à `false` par la release proposée.
- `INCIDENT_REPORT_ARCHIVES_ENABLED=false` par défaut; sa lecture ne permet aucun import.
- Le backend refuse un nouveau téléversement avant tout accès base, stockage ou scanner lorsque la protection est indisponible.
- Les téléchargements existants exigent toujours un objet non révoqué, `scanStatus=CLEAN`, le tenant, le bâtiment et `INCIDENT_REPORT_READ`.
- Le scanner, la validation binaire, le stockage privé et les contrôles de quarantaine ne sont pas supprimés.
- Le portail lit les capacités serveur : il désactive l'action de téléversement et explique l'indisponibilité. Le contrôle serveur reste autoritatif.

## Contrat de release

Le workflow exige `incident_report_file_security_mode` :

- `DISABLED` : force pièces jointes et import à `false`; ClamAV n'est ni démarré, ni téléchargé, ni compté dans le gate mémoire. Une preuve runtime vérifie les deux flags avant de déclarer la release réussie.
- `CLAMAV_REQUIRED` : active les pièces jointes, conserve l'import désactivé, applique le gate de 3 Gio, démarre le profil ClamAV isolé, attend son état sain et exécute le smoke CLEAN/EICAR.

Le service ClamAV reste épinglé par digest, non publié, isolé sur son réseau interne et muni de son volume de signatures. Il est placé derrière le profil Compose `incident-report-untrusted-files`.

## Rollback

Le rollback applicatif existant demeure inchangé : images immuables actives/précédentes, manifeste de release, sauvegarde distante et restauration vérifiée. Le mode `DISABLED` ne modifie aucune donnée existante et ne requiert aucune migration. En cas de rollback vers une version couplée à ClamAV, le préflight antivirus de cette version redevient obligatoire.

## Options antivirus futures à budget nul

| Option | RAM/CPU | Latence | Sécurité | Complexité | Décision actuelle |
|---|---|---|---|---|---|
| ClamAV permanent | Élevés et permanents | Faible | Forte si signatures actuelles | Faible | Bloqué par le gate mémoire |
| ClamAV à la demande | Élevés pendant le scan | Démarrage important | Acceptable avec attente saine et fail-closed | Moyenne | À prototyper après la release indépendante |
| Analyse asynchrone avec quarantaine | Variables | Asynchrone | Forte si stockage inaccessible et rétention bornée | Élevée | Non développée dans ce lot |
| Service antivirus distinct | Externalisés | Variable | Dépend du fournisseur | Élevée | Non autorisé : coût supplémentaire |

## Activation Démo

La recette Tour Prémont peut couvrir les douze modèles, la saisie progressive, l'autosauvegarde, la reprise, le workflow, les PDF, la recherche et l'historique natif. Les nouveaux téléversements et l'import historique doivent rester bloqués. La consultation d'archives importées nécessite une activation serveur distincte et des données déjà réconciliées.
