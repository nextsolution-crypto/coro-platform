# Préparation à la préproduction — Liquid Glass (Lot 1)

Document opérationnel (mis à jour en phase 11D après intégration du `main` de Codex). Il décrit comment valider, **sur un environnement de
préproduction réel et jamais sur la production**, les écrans concernés par la migration Liquid Glass. Rien ici ne déploie, ne modifie le métier,
le backend ou les permissions.

**Périmètre actuel :**

| Route | Statut au registre | Moteur de rendu |
|---|---|---|
| `/settings` | `beta` | Glass avec le jeton de bêta, sinon Legacy |
| `/activities/portfolio` | `beta` | Glass avec le jeton de bêta, sinon Legacy |
| `/profile/rendement` | `legacy-only` | **toujours Legacy** (page de `main`, rendement opérationnel) |
| `/dashboard/rendement` | `legacy-only`, sensibilité `financial-legal` + `permissions` | **toujours Legacy** (page de `main`, rendement financier gouverné) |

Depuis la refonte de `main` (commit « govern advisor costs and financial profitability »), les deux pages de rendement lisent
`/rendement/operational` et `/rendement/financial`. Les anciennes vues Glass, bâties sur l'ancien modèle, ne font plus partie de l'intégration (elles
restent dans la branche `feature/liquid-glass-design-system`). Le registre interdit à une route de sensibilité `financial-legal` d'être `beta` ou
`ga` : une future re-migration du rendement financier exigerait une décision explicite sur cette règle.

> **Statut des preuves** — Les scripts de ce dépôt prouvent le comportement du **frontend** contre un **faux API** qui reproduit la *forme* des
> contrats. Ils ne prouvent rien sur le vrai backend, la vraie base de données, les vrais rôles ni l'exactitude des calculs financiers. Les tests de
> permissions n'ont de valeur que lancés contre une préproduction. Tant qu'ils ne l'ont pas été, les permissions serveur sont **non validées**.

## 1. Inventaire des scripts et reproductibilité

| Outil | Rôle | Reproductible depuis le dépôt |
|---|---|---|
| `npm run test:design-system` | Tests unitaires et de contrat du Design System, des pages bêta, du registre et des outils de préproduction | oui |
| `npm run glass:verify-production` | Build de production réel + serveur : `/glass-kit` en 404, aucun outil de test dans le build | oui |
| `npm run glass:bench -- <commande>` | Pilote Chrome : `snapshot`, `compare`, `contrast`, `contrast-compare`, `shots`, `scenarios` (option `--eval`) | oui |
| `npm run glass:campaign -- <commande>` | Campagne Legacy / île / Glass Light / Glass Dark ; le faux API est géré automatiquement, état par état | oui |
| `npm run glass:preprod-build` | Builds de test (sans jeton, `=1`, `=production-preview`) et contrôle du moteur de rendu | oui |
| `npm run glass:preprod-permissions` | Permissions par rôle contre une préproduction (ou auto-test local) | oui |
| `node design-system/bench/validation-matrix.cjs --markdown` | Génère la matrice de la section 6 | oui |

Les anciens scripts jetables des phases 07 à 09 (`run-*.sh`, permutation manuelle de `page.tsx`) ne sont plus nécessaires : `glass:campaign` obtient
la référence « avant » en lançant `capture` sur un autre worktree ou commit, sans toucher aux fichiers.
Limites connues du banc (voir `design-system/bench/README.md`) : Chrome headless uniquement, session simulée, instantané par état, contraste approximatif
sur dégradé. **Le rôle d'une session du banc** est porté par son jeton (`bench-token:role:<RÔLE>`) : le faux API le renvoie dans `/users/me`, comme le
backend de `main` dont `initAuth` remplace l'utilisateur stocké par la réponse du serveur.

## 2. Environnement de préproduction (exigences)

Aucune préproduction du frontend n'est définie dans le dépôt : `docker-compose.yml` décrit des services à noms de conteneurs fixes (`main` y ajoute
seulement un profil `qa-storage` pour le stockage privé). Elle doit être créée **hors de ce dépôt** par l'équipe qui exploite l'infrastructure :

- un hôte et un domaine **distincts** de `getcoro.io` et de ses sous-domaines (les outils refusent ces domaines) ;
- une base de données **séparée**, alimentée de données **anonymisées ou fictives** — jamais une copie de production non anonymisée ;
- un backend de la même version que celle visée (avec la migration des taux de coût `AdvisorInternalCostRate`), les mêmes gardes et rôles ;
- un build du frontend avec `NEXT_PUBLIC_API_URL` pointant vers ce backend et, **pour cette préproduction seulement**,
  `NEXT_PUBLIC_GLASS_BETA=production-preview` (valeur lue au **build**, pas à l'exécution) ;
- des **comptes de test dédiés**, un par rôle (CONSEILLER, ADMIN, SUPER_ADMIN), **MFA désactivé** pour ces comptes (sinon fournir un jeton de
  session), et idéalement une **seconde organisation** avec un utilisateur pour le test de cloisonnement ;
- un jeu de données couvrant le rendement : plusieurs conseillers ; mandats avec vente validée, **sans** vente validée, **sans** taux de coût approuvé
  (mandat incomplet), à marge négative ; plusieurs devises ; noms très longs et accentués ; au moins 100 activités ; une période vide ;
- **jamais** de compte réel de client, de donnée de production ni de secret dans le dépôt, les journaux ou les rapports.

## 3. Tests de permissions

`design-system/bench/preprod-permissions.cjs` (lecture seule : connexion, `GET /auth/me`, `GET /rendement/operational`, `GET /rendement/financial` et
l'ancien `GET /rendement`). Le `PUT /rendement/financial/mandates/:id/sale` n'est **jamais** appelé.

Variables d'environnement (à définir dans la session du terminal, jamais dans un fichier du dépôt) :

| Variable | Rôle |
|---|---|
| `PREPROD_API_URL` | URL de l'API de préproduction, p. ex. `https://api.<preprod>/api` |
| `PREPROD_APP_URL` | URL du frontend de préproduction (couche navigateur) |
| `PREPROD_ALLOWED_HOSTS` | Liste d'hôtes autorisés, séparés par des virgules (hôtes locaux autorisés d'office) |
| `PREPROD_CONSEILLER_EMAIL` / `PREPROD_CONSEILLER_PASSWORD` | Compte de test CONSEILLER (ou `PREPROD_CONSEILLER_TOKEN`) |
| `PREPROD_ADMIN_EMAIL` / `PREPROD_ADMIN_PASSWORD` | Compte de test ADMIN (ou `PREPROD_ADMIN_TOKEN`) |
| `PREPROD_SUPER_ADMIN_EMAIL` / `PREPROD_SUPER_ADMIN_PASSWORD` | Compte de test SUPER_ADMIN (ou `PREPROD_SUPER_ADMIN_TOKEN`) |
| `PREPROD_OTHER_USER_ID` | (facultatif) identifiant d'un autre utilisateur de la même organisation |
| `PREPROD_OTHER_ORG_USER_ID` | (facultatif) identifiant d'un utilisateur d'une AUTRE organisation de test |

PowerShell :

```powershell
$env:PREPROD_ALLOWED_HOSTS = '<hôte-api-preprod>,<hôte-app-preprod>'
# Pour chaque rôle : définir PREPROD_<RÔLE>_EMAIL et PREPROD_<RÔLE>_PASSWORD dans CETTE session uniquement (ne rien écrire dans un fichier).
$env:PREPROD_CONSEILLER_EMAIL = '<courriel-du-compte-de-test>'
$env:PREPROD_CONSEILLER_PASSWORD = '<mot-de-passe-du-compte-de-test>'
npm run glass:preprod-permissions -- --api https://<hôte-api-preprod>/api --app https://<hôte-app-preprod> `
  --from 2026-10-01 --to 2026-10-31 --browser --expect-renderer glass --require-all --out preprod-permissions.json
```

Garde-fous : hôtes de production refusés (code de sortie 2) ; secrets lus à l'exécution, jamais écrits ; le rapport JSON ne contient ni
courriel, ni mot de passe, ni jeton ; un rôle sans identifiants est **non exécuté** (et fait échouer `--require-all`), jamais « ok ».

Contrôles de l'API (`PERM-API-01` à `19`) : refus sans jeton ou avec un jeton invalide ; un CONSEILLER ne reçoit que ses propres données
**opérationnelles**, **sans aucun champ financier**, et le **financier lui est refusé (403)** ; l'ancien chemin `/rendement` renvoie la forme
opérationnelle, jamais l'ancien modèle ; un SUPER_ADMIN autorisé (Founder ou permission FINANCIAL_RENDEMENT_READ) obtient des réponses conformes (montants en chaînes décimales, complétude, totaux
cohérents avec le nombre de mandats) et un ADMIN client est **refusé (403)** sur le financier, sur `/admin/v1/platform-authority/me` et sur `/grants`
(`PERM-API-12`, `16` à `19`) ; cloisonnement entre organisations ; `PERM-API-15` est une **information** (champs non prévus par le contrat).
Contrôles navigateur (`PERM-BRW-01` à `07`) : accès direct aux quatre routes (un CONSEILLER qui ouvre `/dashboard/rendement` est **redirigé vers
`/profile/rendement`** par la page), moteur de rendu (le rendement est toujours Legacy), absence de vocabulaire financier pour un non-administrateur,
sections de `/settings`, lien « Rendement équipe » du menu, exceptions JavaScript, débordement horizontal aux 4 largeurs.

**Auto-test du harnais** (aucun backend, comptes fictifs locaux, ne valide **pas** le vrai serveur) :
`npm run glass:preprod-permissions -- --self-test` ; avec `--leak`, le faux API ignore les restrictions par rôle (opérationnel non filtré,
financier ouvert) et le harnais **doit échouer**. Ces deux cas sont couverts par `bench/preprod.test.cjs`.

**Risque à consigner — accès direct par un non-administrateur.** La page `/dashboard/rendement` de `main` vérifie le rôle côté client
(`router.replace("/profile/rendement")` pour tout utilisateur qui n'est pas ADMIN ou SUPER_ADMIN) et le backend refuse `/rendement/financial` à un
utilisateur qui n'a pas la permission de plateforme `FINANCIAL_RENDEMENT_READ` (Founder ou délégation ; un ADMIN client est refusé, 403). C'est la lecture du code ; **ce n'est pas validé à l'exécution** : `PERM-API-07` et `PERM-BRW-01` /
`03` le testent. Reste à confirmer en préproduction qu'aucun indicateur financier n'apparaît, même brièvement, avant la redirection (M-07).
Le rôle utilisé par l'interface vient désormais de `/users/me` (et non du seul stockage du navigateur), ce qui réduit le risque d'un rôle falsifié
côté client ; la sécurité réelle reste celle du backend (M-10).

## 4. Campagne reproductible

Pré-requis : un serveur du frontend sur `BENCH_BASE_URL` (défaut `http://localhost:3010`), construit ou lancé avec
`NEXT_PUBLIC_API_URL=http://localhost:3012/api` (port du faux API : `BENCH_API_PORT`, défaut 3012 ; **jamais le port 3002**, réservé au runner QA de
Codex). Chrome installé (`CHROME_PATH`).

```bash
npm run glass:campaign -- plan                       # plan, sans exécution
npm run glass:campaign -- scenarios                  # scénarios de /settings, /activities/portfolio et des deux routes de rendement (4 modes × états)
npm run glass:campaign -- capture --out ../.bench-out/avant      # référence (autre worktree ou commit)
npm run glass:campaign -- capture --out ../.bench-out/apres      # candidat
npm run glass:campaign -- compare --a ../.bench-out/avant --b ../.bench-out/apres   # attendu : 0 écart
npm run glass:campaign -- contrast --out ../.bench-out/contraste   # contraste Glass : /settings et /activities/portfolio seulement
npm run glass:campaign -- all --out ../.bench-out/campagne --baseline ../.bench-out/avant
```

Pages suivies : `settings`, `portfolio` (bêta) ; `rendement-op` (`/profile/rendement`) et `rendement-fin` (`/dashboard/rendement`), **legacy-only** :
leurs scénarios vérifient qu'elles restent Legacy dans les quatre modes (bêta activée ou non), qu'elles lisent les nouveaux contrats, qu'aucun vestige de
l'ancien modèle ne réapparaît et qu'un CONSEILLER est redirigé de la page financière. La campagne ne produit ni contraste ni capture Glass pour elles.
Le serveur de développement (`next dev`) réécrit `coro-frontend/AGENTS.md` : préférer un build de test (section 5) quand c'est possible, ou ne jamais
committer ce fichier. Les dossiers de sortie ne doivent pas être suivis par Git ; les captures peuvent contenir des données : ne jamais les produire
contre une préproduction contenant des données réelles.

## 5. Build de test : bêta avec et sans jeton, outils de développement

```bash
npm run glass:preprod-build                         # trois variantes, local, sans déploiement
npm run glass:preprod-build -- --variants off,on    # sous-ensemble
```

| Variante | `NEXT_PUBLIC_GLASS_BETA` | Résultat attendu |
|---|---|---|
| `off` | absent | `/settings` et `/activities/portfolio` restent en îlot Legacy, même avec préférence Glass et clé locale de bêta |
| `accidental` | `1` | idem : `1` n'active rien en production |
| `on` | `production-preview` | les deux routes bêta sont Glass pour une préférence Glass, Legacy pour une préférence Legacy ; les routes de rendement et les routes de contrôle restent Legacy |

Chaque variante exécute aussi `glass:verify-production --skip-build` : `/glass-kit` en 404, aucun banc, faux API, test ni terrain d'essai dans le
build ni dans l'image standalone. La dernière variante construite reste dans `.next/` (ignoré par Git).

## 6. Matrice de validation

Rôles : C = CONSEILLER, A = ADMIN, S = SUPER_ADMIN. Routes : P = `/settings`, T = `/activities/portfolio`, R = `/profile/rendement`,
E = `/dashboard/rendement`. Mode : `auto` (script), `manuel` (personne), `mixte`. Source : `design-system/bench/validation-matrix.cjs`.

| ID | Domaine | Vérification | Rôles | Routes | Mode | Outil | Critère |
|---|---|---|---|---|---|---|---|
| M-01 | Permissions | GET /rendement/operational et /rendement/financial sans jeton ou avec un jeton invalide sont refusés (401/403) | — | E R | auto | preprod-permissions : PERM-API-01, 02, 03 | Aucune donnée renvoyée |
| M-02 | Permissions | Un CONSEILLER ne reçoit que ses propres données opérationnelles, avec ou sans userId, y compris le userId d’un autre utilisateur | C | R | auto | preprod-permissions : PERM-API-04, 05, 06 | 0 conseiller étranger dans la réponse |
| M-03 | Permissions | Le rendement financier est réservé à la permission de plateforme FINANCIAL_RENDEMENT_READ (Founder ou délégation CORO) : refusé (403) à un CONSEILLER et à un ADMIN client ; 200 conforme (montants décimaux, complétude, totaux cohérents) pour un SUPER_ADMIN autorisé ; le filtre userId opérationnel se limite à l’utilisateur demandé | C A S | R E | auto | preprod-permissions : PERM-API-07, 10, 11, 12, 13 | 403 pour C et A ; réponses conformes pour S |
| M-04 | Permissions | Cloisonnement : un ADMIN ne voit aucune donnée d’une autre organisation (userId d’un utilisateur d’une autre organisation de test), ni en opérationnel ni en financier | A | R E | auto | preprod-permissions : PERM-API-14 (PREPROD_OTHER_ORG_USER_ID) | 0 donnée ou 403, sur les deux chemins |
| M-05 | Permissions | La réponse opérationnelle d’un CONSEILLER ne contient aucun champ financier ; l’ancien chemin GET /rendement renvoie la forme opérationnelle et non l’ancien modèle ; inventaire des champs non prévus par le contrat | C | R E | auto | preprod-permissions : PERM-API-08, 09, 15 (information) | Aucun champ financier ; liste des champs supplémentaires transmise |
| M-06 | Accès direct | Accès direct (URL saisie) aux quatre routes pour chaque rôle : /dashboard/rendement redirige un CONSEILLER vers /profile/rendement ; les autres routes sont atteintes | C A S | P T R E | auto | preprod-permissions --browser : PERM-BRW-01 | Redirection attendue uniquement pour C sur E |
| M-07 | Accès direct | Garde de /dashboard/rendement : la page redirige les non-administrateurs et le backend refuse le financier (403). Confirmer qu’aucun indicateur financier n’est visible avant la redirection (chargement à froid, connexion lente, session expirée) | C | E | mixte | PERM-BRW-01, PERM-BRW-03 + parcours guidé | Aucune donnée financière affichée, même une fraction de seconde |
| M-08 | Navigation | Le lien « Rendement équipe » du menu n’apparaît que pour ADMIN et SUPER_ADMIN | C A S | P | auto | preprod-permissions --browser : PERM-BRW-05 | Présent pour A et S, absent pour C |
| M-09 | Accès direct | /settings : les sections d’administration (Organisation, Membres…) n’apparaissent que pour ADMIN et SUPER_ADMIN | C A S | P | auto | preprod-permissions --browser : PERM-BRW-04 | Sections conformes au rôle |
| M-10 | Permissions | Rôle falsifié côté navigateur (valeur de coro_user modifiée dans le stockage) : le backend refuse toute action ou donnée réservée | C | P E | manuel | DevTools + journal serveur | Aucune donnée ni action administrateur obtenue |
| M-11 | Permissions | Session expirée, déconnexion et jeton révoqué pendant la navigation : retour à la connexion, aucune donnée financière résiduelle à l’écran | C A S | P T R E | manuel | Parcours guidé | Redirection propre, écran vidé |
| M-12 | Données financières | Rendement (pages Legacy de main) : valeurs cohérentes avec les sources de préproduction (ventes validées, taux de coût approuvés, heures saisies) ; mandats incomplets et raisons conformes aux données | A S | R E | manuel | Contrôle par échantillon avec le propriétaire du backend | Chaque valeur de l’échantillon est expliquée |
| M-13 | Données financières | États financiers : « Non disponible », mandats incomplets (raisons), marge négative, montant nul, plusieurs devises (CAD, USD, devise absente « Devise inconnue », code non pris en charge), montant vendu non validé ; aucune erreur JavaScript, aucune conversion implicite | A S | E | mixte | campaign scenarios rendement-fin (jeu fictif) + contrôle sur données de préproduction | Affichage conforme au contrat, aucune valeur inventée |
| M-14 | Données financières | Aucune donnée financière dans le stockage du navigateur, l’URL ou des requêtes supplémentaires lors de la consultation du rendement | A | R E | manuel | Onglets Réseau et Application des DevTools | Seules les requêtes /rendement/* attendues, aucun stockage |
| M-15 | Données financières | Noms très longs, accents, caractères spéciaux (conseillers, clients, mandats) : aucun débordement ni troncature trompeuse | A | T R E | mixte | Scénarios (jeu fictif) + données de préproduction | Lisible aux 4 largeurs |
| M-16 | Navigation | Ouverture d’un mandat ou d’un projet par clic, Entrée et Espace ; retour arrière du navigateur | C A S | T R E | mixte | campaign scenarios (kbopen-*) + parcours réel | 1 clic = 1 navigation, bonne destination |
| M-17 | Navigation | Téléchargement .ics avec un vrai jeton (fichier valide, nom, contenu) | C A | T | manuel | Parcours réel | Fichier calendrier valide |
| M-18 | Navigation | Navigation entre les pages du Lot 1 et le reste de l’application, en Legacy comme en Glass, sans erreur ni boucle de redirection | C A S | P T R E | manuel | Parcours guidé | Aucune erreur visible ni exception |
| M-19 | Périodes | Période de /profile/rendement (champs Du / Au) avec données réelles ; période vide ; plage inversée (Du > Au) ; vue cumulative de /dashboard/rendement | A S | R E | mixte | campaign scenarios rendement-op (jeu fictif) + comparaison avec la préproduction | Comportement conforme à main |
| M-20 | Périodes | Bornes de période : le calendrier civil (America/Toronto, borne supérieure exclusive) inclut-il les entrées du dernier jour, de minuit et des changements d’heure ? Vérification en préproduction, constat transmis au propriétaire du backend | A | R E | manuel | Saisies de test aux bornes | Constat consigné |
| M-21 | Tableaux | Volume réaliste (≥ 100 activités, ≥ 10 conseillers) : ordre, lisibilité, temps de rendu comparable au Legacy | A | T E | manuel | Données de préproduction volumineuses | Pas de ralentissement visible |
| M-22 | Tableaux | Bascule cartes mobiles / tableau à 768 px ; défilement horizontal interne du tableau | A | T R E | mixte | campaign scenarios (tablet768, mobile*) + appareil réel | Aucun défilement de la page |
| M-23 | Responsive | Aucun débordement horizontal de la page à 320, 390, 768 et 1600 px, pour chaque rôle | C A S | P T R E | auto | preprod-permissions --browser : PERM-BRW-07 | 0 débordement |
| M-24 | Responsive | Appareils réels : iOS Safari et Android Chrome (barre d’URL dynamique, clavier virtuel, zones sûres, tactile) | A | P T R E | manuel | Appareils réels | Utilisable sans zoom, cibles ≥ 44 px |
| M-25 | Clavier | Parcours clavier complet : ordre de Tab, focus visible, Entrée et Espace, Maj+Tab, aucune double action | A | P T R E | auto | campaign scenarios (keyboard, kbopen-*, kbperiod) | Tous les scénarios clavier verts |
| M-26 | Clavier | Défilement horizontal au clavier des tableaux de rendement à 768 px : flèches, Tab, Fin ; Firefox et Safari en plus de Chrome | A | R E | mixte | Mesure Chrome (10A) + Firefox/Safari manuels | Dernière colonne atteignable au clavier sur les 3 moteurs, ou correctif décidé |
| M-27 | Lecteur d’écran | NVDA (Windows) avec Firefox et Chrome : parcours des 4 pages (titres, régions, boutons, états, périodes, tableaux) | C A | P T R E | manuel | Script de parcours de PREPROD.md | Chaque action annoncée et réalisable |
| M-28 | Lecteur d’écran | VoiceOver (macOS Safari et iOS Safari) : mêmes parcours | C A | P T R E | manuel | Script de parcours de PREPROD.md | Chaque action annoncée et réalisable |
| M-29 | Lecteur d’écran | Zoom 200 % et 400 %, taille de texte agrandie, contraste élevé (forced-colors), mouvement réduit, transparence réduite | A | P T R E | manuel | Réglages système et navigateur | Aucune perte d’information ni d’action |
| M-30 | Bêta | Build SANS jeton (et avec NEXT_PUBLIC_GLASS_BETA=1) : les deux routes bêta restent en îlot Legacy, même avec la préférence Glass et la clé locale de bêta ; les routes de rendement restent Legacy | — | P T R E | auto | preprod-build-check (variantes off, accidental) | 2 routes bêta et 2 routes de rendement en Legacy |
| M-31 | Bêta | Build avec NEXT_PUBLIC_GLASS_BETA=production-preview : /settings et /activities/portfolio en Glass pour la préférence Glass, en Legacy pour la préférence Legacy ; les routes de rendement et les autres routes restent Legacy | — | P T R E | auto | preprod-build-check (variante on) | Moteur conforme ; rendement jamais Glass |
| M-32 | Production | Aucun outil de développement exposé : /glass-kit en 404, aucun banc, faux API, test ou terrain d’essai dans le build | — | — | auto | glass:verify-production et preprod-build-check | 32/32 contrôles par build |
| M-33 | Production | Revue de la configuration de déploiement : le jeton de bêta n’est défini que dans l’environnement de préproduction prévu | — | — | manuel | Revue CI/CD et variables d’environnement (sans les afficher) | Jeton absent de la production |
| M-34 | Retour arrière | Retirer le jeton et reconstruire : les deux routes bêta repassent en Legacy sans perte de données ; la préférence d’interface n’est qu’un réglage local ; retour à une version antérieure par un nouveau déploiement d’un commit déjà présent sur main (workflow manuel avec approbations) | A | P T | mixte | preprod-build-check (off) + répétition en préproduction | Legacy rétabli, données intactes |
| M-35 | États | Chargement, vide et erreur avec le vrai backend : erreur 500, délai, 401 expiré, réponse vide | A | T R E | mixte | campaign scenarios (jeu fictif) + simulation d’incident en préproduction | Comportement identique au Legacy |
| M-36 | Observabilité | Journaux serveur et navigateur pendant les parcours : aucune erreur 4xx/5xx nouvelle, aucune exception JavaScript | C A S | P T R E | mixte | PERM-BRW-06 + journaux serveur | 0 nouvelle erreur |
| M-37 | Autorité de plateforme | GET /admin/v1/platform-authority/me et /grants : refusés (403) à un CONSEILLER et à un ADMIN client ; un SUPER_ADMIN reçoit une vue conforme (authorityStatus, founder, grants). La sécurité réelle reste celle du backend | C A S | — | auto | preprod-permissions : PERM-API-16, PERM-API-17, PERM-API-18, PERM-API-19 | 403 pour C et A ; vue conforme pour S |
| M-38 | Autorité de plateforme | Navigation et accès selon l’autorité effective : Founder (menu Plateforme complet et « Permissions plateforme »), employé CORO délégué (menu limité, pas de page Permissions), employé sans permission et ADMIN client (aucun menu plateforme, redirection vers /dashboard) ; aucun indicateur financier pour ADMIN client ; mêmes résultats en Classic, Glass clair et Glass sombre | C A S | — | auto | campaign scenarios --pages founder-rbac | Menus et redirections conformes dans les 4 modes |
| M-39 | Autorité de plateforme | Onze écrans Founder (permissions plateforme, tableau commercial, catalogue, price-books, configurateur, propositions, contrats, entitlements, organisation 360, émetteur légal, rendement financier) à 1440, 1920, 390 et 430 px en Classic, Glass clair et Glass sombre : écran atteint, aucune exception, aucun débordement horizontal, thème conservé après F5 | S | E | auto | campaign scenarios --pages founder | 0 exception, 0 débordement, thème persistant |

**Parcours lecteur d'écran (M-27, M-28)** — pour chaque page, avec NVDA (Firefox puis Chrome) et VoiceOver (Safari) : (1) la page est annoncée avec son
titre ; (2) naviguer aux titres et aux régions ; (3) atteindre chaque bouton par Tab et vérifier son nom ; (4) activer par Entrée puis Espace ;
(5) parcourir un tableau cellule par cellule (en-têtes lus, « Non disponible » compris) ; (6) provoquer chargement, vide et erreur et noter ce qui est
annoncé (les pages de rendement de `main` utilisent `role="status"` et `role="alert"`). Consigner pour chaque écart : page, lecteur, navigateur, étape,
annonce obtenue.

## 7. Plan de retour arrière

**Principe : désactiver Liquid Glass ne touche à aucune donnée.** Les vues Glass n'ont aucun appel réseau, aucun stockage et aucune écriture
(vérifié par contrats statiques) ; l'intégration n'ajoute aucune migration, aucun changement d'API ni de permission. Le retour arrière est donc un
changement de **code ou de configuration du frontend** uniquement. La préférence d'interface (`coro-ui-generation`) n'existe que dans le navigateur de
chaque utilisateur.

| Niveau | Action | Portée | Délai | Perte de données |
|---|---|---|---|---|
| 0 | L'utilisateur repasse en « Classique » dans `/profile` (réglage d'interface) | un navigateur | immédiat | aucune |
| 1 | Reconstruire **sans** `NEXT_PUBLIC_GLASS_BETA` (valeur lue au build) et redéployer | tout l'environnement | durée du pipeline | aucune ; les deux routes bêta repassent en îlot Legacy même pour les utilisateurs en Glass |
| 2 | Remettre `/settings` et `/activities/portfolio` à `legacy-only` dans `design-system/routes/route-registry.ts` (+ tests de registre) | tout environnement | un commit | aucune |
| 3 | `git revert` des commits Liquid Glass sur la branche d'intégration, ou redéploiement d'un `release_commit` antérieur déjà présent sur `main` | tout environnement | un déploiement | aucune |

Les images sont publiées **par commit et par digest `sha256`** (workflow de `main`) : revenir à une version antérieure passe par un nouveau
`workflow_dispatch` avec un `release_commit` plus ancien, après les approbations demandées (voir section 9). Vérification après retour arrière (M-34) :
les routes bêta rendent le Legacy ; `npm run glass:preprod-build -- --variants off` passe ; les valeurs affichées sont inchangées. **À répéter une fois en
préproduction** (critère Go n° 11).

## 8. Critères Go / No-Go pour une bêta limitée

**Définition.** Une bêta limitée = les utilisateurs de **test** ou **internes**, dans la **préproduction**, avec le build `production-preview`.
Une bêta limitée **en production** n'est pas possible aujourd'hui sans décision supplémentaire : le jeton est global au build et il n'existe aucun
ciblage par utilisateur ou par organisation (tous les utilisateurs dont la préférence est Glass verraient les deux routes bêta en Glass). Les
routes de rendement ne font pas partie de la bêta.

**Go — tous les critères doivent être remplis :**

1. M-01 à M-06, M-08, M-09 : exécutés en préproduction avec les trois rôles, **0 KO** ; rapport archivé (hors dépôt).
2. M-04 : cloisonnement inter-organisations vérifié, ou exclusion écrite et acceptée de l'équipe de sécurité.
3. M-07 : confirmation en préproduction qu'aucun indicateur financier n'est visible pour un non-administrateur (redirection de `/dashboard/rendement`).
4. M-12 : valeurs financières du rendement expliquées par le propriétaire du backend sur un échantillon de mandats.
5. M-30, M-31, M-32 : `glass:preprod-build` vert pour les trois variantes ; `glass:verify-production` vert.
6. M-27 et M-28 : parcours lecteur d'écran réalisés (NVDA et VoiceOver) ; aucun blocage pour exécuter une action ; écarts consignés et acceptés.
7. M-26 : défilement horizontal au clavier confirmé sur Firefox et Safari, ou correctif décidé.
8. M-24 : vérification sur au moins un iPhone et un Android réels.
9. `npm run test:design-system`, `npx tsc --noEmit` : verts ; ESLint : aucun problème nouveau par rapport à la référence de `main`.
10. M-33 : le jeton de bêta est absent de l'environnement de production (revue de configuration).
11. Le plan de retour arrière (section 7) a été **répété** une fois en préproduction.
12. Les points de la section 10 marqués « bloquant » sont tranchés.

**No-Go — un seul suffit :**

- un CONSEILLER obtient des données d'un autre utilisateur (M-02) ou un indicateur financier (M-03), ou un ADMIN des données d'une autre organisation (M-04) ;
- une valeur financière non expliquée (M-12) ;
- un outil de développement est exposé, ou le jeton de bêta est présent dans la production (M-32, M-33) ;
- une action n'est pas réalisable au clavier ou au lecteur d'écran (M-25, M-27, M-28) ;
- une exception JavaScript non gérée ou une nouvelle erreur serveur pendant un parcours (M-36) ;
- le retour arrière n'a pas été répété avec succès (critère 11).

## 9. Pull Request et intégration contrôlée avec `main`

État (phase 11D) : la branche locale `integration/liquid-glass-v1` contient `main` (à `8e065e38`) et `feature/liquid-glass-design-system` ; elle n'est
**pas poussée**. Les deux pages de rendement y sont celles de `main`, sans bloc Glass.

**Déploiement (workflow de `main`, `.github/workflows/deploy.yml`) :**

- un **push sur `main`** ne lance que la **validation** : vérification des types des quatre applications, tests du backend, build du portail client ;
- la **publication des images** (étiquetées par commit, référencées par digest `sha256`) et la **mise en production** ne se font que par un
  `workflow_dispatch` **manuel** qui exige : un `release_commit` de 40 caractères déjà présent sur `main`, la saisie `DEPLOY_PRODUCTION`, la saisie
  `CONFIRMED_BACKWARD_COMPATIBLE` pour les migrations, un environnement protégé `production`, et, côté serveur, que `origin/main` soit exactement ce
  commit, avec une sauvegarde vérifiée (échec fermé) ;
- il n'existe **aucun workflow sur Pull Request** pour le frontend (seul `website-docker-check.yml` existe, pour le site vitrine, sans publication) ;
- le `Dockerfile` du frontend ne reçoit que `NEXT_PUBLIC_API_URL` : le jeton de bêta est absent, donc **la bêta reste désactivée en production** ;
- non vérifiable depuis le dépôt : les règles de protection de l'environnement `production` et les secrets (à confirmer côté GitHub).

Un push de la branche d'intégration, une Pull Request ou un push sur `main` **ne mettent donc rien en production** ; seule l'exécution manuelle du
workflow avec ses approbations le fait. Un push sur `main` fait cependant tourner `tsc` sur le frontend : le code fusionné doit rester sans erreur de types.

Étapes recommandées (aucune n'est exécutée par cette phase) :

1. **Préproduction d'abord** : exécuter les sections 3 à 5 et la matrice ; archiver les rapports.
2. **Revalider l'intégration** si `main` a avancé depuis `8e065e38` : fusionner `main` dans la branche d'intégration, puis rejouer `tsc`, les tests de `main`,
   `npm run test:design-system`, ESLint contre une référence de `main` seul, `glass:verify-production`, `glass:preprod-build` et `glass:campaign`.
3. **Ouvrir la Pull Request** depuis la branche d'intégration vers `main` : périmètre (deux routes bêta ; rendement inchangé), aucun changement backend ni
   permission, résultats des tests, risques connus (section 10), plan de retour arrière.
4. **Revue** par Codex (permissions, rendement) et par le propriétaire produit, plus relecture accessibilité.
5. **Garde avant fusion** : confirmer que `NEXT_PUBLIC_GLASS_BETA` n'est défini ni dans le `Dockerfile`, ni dans le workflow, ni dans la configuration du serveur.
6. **Stratégie de fusion** : conserver les commits distincts (pas de squash) pour garder des `git revert` fins.
7. **Après fusion** : surveiller la validation du workflow ; aucun déploiement n'a lieu sans exécution manuelle du workflow.
8. **Recommandé** : un workflow sur Pull Request qui exécute `npm run test:design-system`, `npx tsc --noEmit` et `npm run glass:verify-production`
   pour `coro-frontend/**`, car la validation actuelle du frontend se limite aux types (proposition à valider par Codex ; non ajouté ici).

## 10. Points à transmettre à Codex

| # | Sujet | Constat | Bloquant avant GA |
|---|---|---|---|
| 1 | Refonte du rendement | Les anciens points faibles (libellé « Revenus », marge sur le montant total du mandat, double comptage) concernaient l'ancien modèle ; la refonte les remplace (vente validée, taux de coût approuvés, complétude). **À valider métier** ; les scripts ne valident aucun calcul | oui (validation métier) |
| 2 | Garde de `/dashboard/rendement` | Redirection côté client + 403 côté backend (lecture du code). À confirmer à l'exécution, sans affichage transitoire d'indicateurs (M-07) | oui |
| 3 | Champs de la réponse opérationnelle | Contrôle `PERM-API-08` (aucun champ financier) et `PERM-API-15` (champs non prévus) à exécuter en préproduction | à vérifier |
| 4 | Bornes de période | Calendrier civil `America/Toronto`, borne supérieure exclusive : à vérifier aux limites (M-20) | à vérifier |
| 5 | Rôle côté client | `initAuth` remplace l'utilisateur stocké par `/users/me` : réduit le risque d'un rôle falsifié ; la sécurité réelle reste celle du backend | à confirmer |
| 6 | Tests de `main` hors CI | `rendement.contract.test.cjs` et 13 autres tests (14 au total) ne sont câblés dans aucun script npm ; la validation du frontend en CI se limite à `tsc` ; 2 tests non câblés échouent déjà sur `main` (`journey.contract.test.cjs`, `commercial-navigation.contract.test.cjs`) | recommandé |
| 7 | Workflow sur Pull Request | Aucun contrôle frontend avant fusion | recommandé |
| 8 | Préproduction | À créer (hôte, base anonymisée, comptes de test sans MFA, seconde organisation, taux de coût approuvés) | oui |
| 9 | Ciblage de la bêta | Jeton global au build, aucun ciblage par utilisateur ou organisation : pas de bêta limitée en production | décision |
| 10 | Environnement `production` | Règles de protection et secrets non vérifiables depuis le dépôt | à confirmer |
| 11 | Routes financières et Glass | Une route `financial-legal` ne peut pas être `beta` ou `ga` (règle du registre) : toute future vue Glass du rendement financier demande une décision | décision |
| 12 | Flash blanc en Dark | Le bloc de chargement d'`AuthProvider` (`bg-white`) apparaissait en blanc en thème sombre (≈ 1 à 3 ms en conditions normales, ≈ 325 ms avec CPU ×4 et réseau lent) entre l'hydratation et la réponse de `/users/me`. **Corrigé côté Liquid Glass** par une règle CSS étroite dans `tokens.css` (`:root[data-ui="glass"] body > div[aria-busy="true"]:empty`, sans `!important`), sans toucher `AuthProvider.tsx` : mesuré après correctif, 0 échantillon blanc visible (Dark `#070c14`, Light `#e1ecf9`). Le défaut subsiste dans `main` pour les pages Legacy | non |
| 13 | Devises du rendement financier (corrigé dans `main`) | Le défaut « UNKNOWN » (`RangeError: Invalid currency code`, écran financier planté) est corrigé par `5783e7b4` (helper `financial-money.ts` : CAD/USD/EUR formatés, devise absente ou « UNKNOWN » = « Devise inconnue », code invalide = « Devise non prise en charge (XXX) », montant nul = « Non disponible », jamais de repli `?? "CAD"`) et `a855b8cb` (nouvelles écritures financières : CAD seulement). Couvert par le scénario `rendement-fin-unknown-currency-*` (campagne, 4 modes). Les données historiques sans devise restent signalées comme incomplètes. À valider sur des données de préproduction réelles | à vérifier |
