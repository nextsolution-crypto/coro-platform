# CP-006 — Inventaire des ressources annexes du portail client

Date : 24 octobre 2026, America/Toronto.

## Politique parent canonique

- `CLIENT_MANAGER` : organisation, client et bâtiments actuellement affectés.
- `CLIENT_CORPORATE` : organisation autorisée, sans restriction artificielle au
  seul client d’origine.
- Toute autre organisation : refus indistinguable d’une ressource inexistante.
- Les identifiants projet, bâtiment et fichier ne constituent jamais une
  autorisation.

## Routes projet du Client Portal

| Route | Ressource | Contrôle avant accès | Résultat CP-006 |
|---|---|---|---|
| `GET /client-portal/projects/:id` | Projet et aperçu | Projet canonique | Déjà protégé par CP-002/CP-003 |
| `GET /client-portal/projects/:id/comments` | Commentaires | Projet canonique | Corrigé |
| `POST /client-portal/projects/:id/comments` | Création commentaire | Projet canonique avant écriture | Corrigé pour l’accès; provenance CP-007 reste ouverte |
| `GET /client-portal/projects/:id/versions` | Métadonnées de versions | Projet canonique | Corrigé |
| `GET /client-portal/projects/:id/engagement` | Engagements et identité des lecteurs | Projet canonique | Corrigé |
| `POST /client-portal/projects/:id/engagement` | Écriture d’engagement | Projet canonique avant écriture | Corrigé |
| `GET /client-portal/projects/:id/sign-status` | Signature et disponibilité PDF | Projet canonique | Corrigé |
| `POST /client-portal/projects/:id/sign` | Signature et effets asynchrones | Projet canonique avant toute écriture | Corrigé pour l’accès; politique métier de signature inchangée |
| `POST /client-portal/projects/:id/sign/retry` | Régénération PDF | Projet canonique avant génération/stockage | Corrigé |
| `GET /client-portal/projects/:id/official/:lang` | PDF officiel | Projet canonique avant récupération distante | Déjà protégé; aucune URL retournée au navigateur |

## Routes ProjectFile du Client Portal

| Route | Contrôle | Stockage transmis |
|---|---|---|
| `GET /project-files/client/:projectId` | Projet serveur + organisation + bâtiments permis + visibilité partagée | `storageKey` supprimé; URL privée opaque |
| `POST /project-files/client/:projectId` | Projet serveur + bâtiment permis avant upload | Clé calculée côté serveur; aucune clé fournie par le navigateur |
| `GET /project-files/client/file/:id/current` | Fichier parent + organisation + bâtiment permis | Métadonnées assainies |
| `GET /project-files/client/file/:id/content` | Fichier parent + organisation + bâtiment permis + visibilité partagée + cycle de vie | Octets servis par le backend; aucun lien signé utilisable exposé |
| `GET /project-files/client/file/:id/history` | Fichier parent + organisation + bâtiment permis | Historique sans `storageKey` |
| `POST /project-files/client/offline/files/:id/lease` | Fichier canonique, classification, cycle de vie, utilisateur, tenant, bâtiment, appareil | Lease signée; aucune clé serveur |

Le calcul de bâtiments ProjectFile a été aligné sur la politique CP-002 : le
responsable reste limité à son client et à ses affectations actuelles; le compte
corporate conserve la portée organisationnelle explicitement autorisée.

## Routes internes connexes

- `POST /projects/:projectId/export` et
  `GET /projects/:projectId/export/official/:lang` utilisent
  `projectAccessWhere(actor)` avant génération ou récupération.
- Les lectures internes des commentaires et engagements valident désormais le
  projet avec la même autorité interne que `GET /projects/:id` avant d’interroger
  la ressource enfant.
- `GET /project-files/:id/download` est une route interne historique qui peut
  retourner l’URL d’un ancien objet public. Elle n’est pas utilisée par le
  Client Portal; sa politique opérateur détaillée reste à vérifier dans l’audit
  fonctionnel interne et ne constitue pas une URL exposée à un `ClientUser`.

## Preuves négatives attendues

Les tests CP-006 vérifient qu’un refus survient avant :

- lecture de commentaire, version, engagement ou signature;
- création de commentaire, engagement ou signature;
- génération ou upload de PDF;
- courriel ou notification.

Le scénario PostgreSQL synthétique vérifie deux clients d’une même organisation,
un autre tenant et une affectation bâtiment inter-client obsolète/forgée. Aucun
enregistrement d’engagement ne doit apparaître après le refus.

