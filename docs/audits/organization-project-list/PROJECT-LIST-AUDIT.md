# Audit ciblé — liste des projets organisation

## Décision

**CORRECTION REQUISE AVANT UTILISATION AUTONOME par les opérateurs.** La liste est lisible, responsive et correctement cloisonnée en lecture, mais elle contredit la politique des archives en autorisant leur réactivation et ne distingue pas une panne principale d'une liste vide.

## Périmètre et versions

- Route réelle : `/projects`, exposée par la navigation organisation.
- Fiche contrôlée uniquement pour l'ouverture et la lecture directe : `/projects/:id`.
- Code, QA et production observés au SHA `44772a7e8841378e1fd760bef843c7f5a979b33d`.
- QA : PostgreSQL 16, 155 migrations, backend et frontend réels, Identity Lab/MFA locale, réseau deny-by-default.
- Production : observation HTTP sans authentification ni mutation; route publique applicative disponible. Le SHA et les conteneurs actifs avaient été réconciliés par l'inspection `40408643149`.
- Preuves sanitaires : `D:\CORO-QA\audits\organization-project-list\2026-10-26`.

## Architecture observée

- UI : `coro-frontend/app/projects/page.tsx`.
- Liste et lecture directe : `GET /projects`, `GET /projects/:id`.
- Création et mutations immédiates : `POST /projects`, `PUT /projects/:id`, `DELETE /projects/:id`.
- Autorité canonique de lecture : `projectAccessWhere(actor)` dans `coro-backend/src/auth/project-access.ts`.
- ADMIN/SUPER_ADMIN : organisation courante. OPERATOR : organisation courante et projet dont il est responsable ou dernier éditeur.
- La route `GET /users/organization`, utilisée pour les filtres, est accessible à tout acteur authentifié de l'organisation et retourne aussi les utilisateurs inactifs.

## Fonctionnement réellement présent

| Fonction | Résultat |
|---|---|
| Liste actifs/archives | Présente; lecture et périmètre serveur validés |
| Filtre par responsable | Présent, côté navigateur |
| Recherche dans la liste | NON_APPLICABLE — absente |
| Filtre client/bâtiment/statut/date | NON_APPLICABLE — absent |
| Tri configurable | NON_APPLICABLE — absent; ordre serveur `updatedAt desc` |
| Pagination/taille de page | NON_APPLICABLE — absente; toute la liste est chargée |
| Sélection multiple | Présente |
| Suppression multiple | Présente comme N suppressions unitaires; défauts relevés |
| Création | Présente; rattachement client/bâtiment vérifié côté serveur |
| Réactivation d'une archive | Présente mais contraire à la politique approuvée |
| Export depuis la liste | NON_APPLICABLE — absent |
| Navigation vers la fiche | Présente; lecture directe applique la même portée |

## Utilité et clarté

Les cartes identifient le type documentaire, le projet, le client, le bâtiment, l'année, le responsable, le statut et la progression persistée. Les statuts ont un libellé et ne reposent pas uniquement sur la couleur. La progression est le champ `Project.progress`; aucune définition métier n'est expliquée à l'écran. Le sous-titre mélange le nombre actuellement filtré et la limite de licence, ce qui devient ambigu dans l'onglet Archives ou avec un filtre responsable.

Le score qualité est prévu dans l'interface mais n'est pas chargé par `findAll`; il reste donc absent plutôt que fabriqué. L'ordre par défaut correspond à la dernière modification, sans libellé expliquant cet ordre.

## UX, responsive et accessibilité

- Matrice mesurée : 12/12 sans débordement global, débordement composant ni erreur console critique.
- Viewports : 390×844, 768×1024, 1440×900, 2560×1440.
- Thèmes : Classic, Glass Light, Glass Dark.
- Les cartes restent lisibles aux quatre tailles; le grand écran utilise une liste pleine largeur peu dense mais exploitable.
- Défaut d'accessibilité : la carte entière est un `div` cliquable sans sémantique de lien, sans `tabIndex` et sans activation clavier. Le contrôle de sélection repose sur une case sans nom accessible explicite.
- L'onboarding emploie une grille trois colonnes fixe; non visible dans la matrice avec projets, mais confirmé dans la capture d'erreur à 768 px. Une vérification mobile dédiée reste nécessaire après correction des états.

## Autorisations démontrées

- OPERATOR : projet affecté actif et archivé visibles; projet même organisation non affecté et projet autre organisation absents.
- Lecture directe : mêmes résultats, avec 404 sans fuite d'identifiant pour les projets interdits.
- ADMIN : projets de son organisation visibles, aucun projet de l'autre organisation.
- Utilisateur désactivé : authentification refusée.
- Régression ciblée : 24/24 tests Jest `dashboard-scope` et `plan-security` réussis.

## Résilience

- Chargement initial : indicateur présent.
- Liste réellement vide et filtre sans résultat : UI présente, mais leurs messages ne sont pas suffisamment différenciés.
- Erreur principale 503 : **FAIL**, convertie en onboarding/état vide sans message ni Réessayer.
- Polling 30 secondes : une panne est seulement écrite dans la console; l'utilisateur conserve potentiellement des données périmées sans indication.
- Erreur partielle : les appels secondaires sont pris dans un `Promise.all`; leur échec peut masquer la liste principale.
- Protection contre réponses désordonnées : absente dans `fetchProjectsOnly`.
- Session expirée : gestion partagée par le client API; parcours écran spécifique non rejoué.

## Limites de l'audit

- Aucun projet réel n'a été créé ou modifié en production.
- Les mutations ont été exercées uniquement dans la base synthétique.
- La pagination, le tri et la recherche de liste ne peuvent pas être validés puisqu'ils n'existent pas.
- Les onglets internes de la fiche projet sont hors périmètre.
- Aucun fournisseur externe, document, signature, invitation ou notification n'a été déclenché.

