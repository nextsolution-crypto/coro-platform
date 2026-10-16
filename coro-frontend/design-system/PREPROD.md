# Préparation à la préproduction — Lot 1 Liquid Glass

Document opérationnel de la phase 10B. Il décrit comment valider, **sur un environnement de préproduction réel et jamais sur la production**,
les quatre routes bêta du Lot 1 : `/settings`, `/activities/portfolio`, `/profile/rendement`, `/dashboard/rendement`.
Aucune de ces routes n'est en `ga`. Rien ici ne déploie, ne modifie le métier, le backend ou les permissions.

> **Statut des preuves** — Les scripts de ce dépôt prouvent le comportement du **frontend** contre un **faux API**. Ils ne prouvent rien sur
> le vrai backend, la vraie base de données ni les vrais rôles. Les tests de permissions n'ont de valeur que lancés contre une préproduction.
> Tant qu'ils n'ont pas été exécutés ainsi, les permissions serveur doivent être tenues pour **non validées**.

## 1. Inventaire des scripts et reproductibilité

| Outil | Rôle | Reproductible depuis le dépôt |
|---|---|---|
| `npm run test:design-system` | Tests unitaires et de contrat du Design System, des quatre pages et des outils de préproduction | oui |
| `npm run glass:verify-production` | Build de production réel + serveur : `/glass-kit` en 404, aucun outil de test dans le build | oui |
| `npm run glass:bench -- <commande>` | Pilote Chrome : `snapshot`, `compare`, `contrast`, `contrast-compare`, `shots`, `scenarios` (option `--eval` ajoutée en 09A) | oui |
| `npm run glass:campaign -- <commande>` | **Nouveau (10B).** Campagne complète Legacy / île / Glass Light / Glass Dark, faux API géré automatiquement | oui |
| `npm run glass:preprod-build` | **Nouveau (10B).** Trois builds de test (sans jeton, `=1`, `=production-preview`) et contrôle du moteur de rendu des quatre routes | oui |
| `npm run glass:preprod-permissions` | **Nouveau (10B).** Permissions par rôle contre une préproduction (ou auto-test local) | oui |
| `node design-system/bench/validation-matrix.cjs --markdown` | Génère la matrice de la section 6 | oui |

**Campagnes qui n'étaient pas reproductibles avant 10B** : les phases 07 à 09 reposaient sur des scripts `run-07a.sh`, `run-08a.sh`, `run-09a.sh`,
`run-scen-*.sh` écrits dans un dossier temporaire hors dépôt (purgé à plusieurs reprises), avec permutation manuelle de fichiers pour capturer la
référence « avant ». `glass:campaign` les remplace : tout est en Node, versionné, et la référence « avant » s'obtient en lançant `capture`
sur un autre worktree ou commit, sans toucher aux fichiers.

Limites connues du banc (voir `design-system/bench/README.md`) : Chrome headless uniquement, session simulée, instantané par état, contraste
approximatif sur dégradé.

## 2. Environnement de préproduction (exigences)

Aucune préproduction du frontend n'est définie dans le dépôt : `docker-compose.yml` décrit des services à noms de conteneurs fixes et à images `:latest`
(`main` y ajoute seulement un profil `qa-storage` pour le stockage privé). Elle doit être créée **hors de ce dépôt** par l'équipe qui exploite
l'infrastructure :

- un hôte et un domaine **distincts** de `getcoro.io` et de ses sous-domaines (les outils refusent ces domaines) ;
- une base de données **séparée**, alimentée de données **anonymisées ou fictives** — jamais une copie de production non anonymisée ;
- un backend de la même version que celle visée, avec la même configuration de rôles et de gardes ;
- un build du frontend avec `NEXT_PUBLIC_API_URL` pointant vers ce backend et, **pour cette préproduction seulement**,
  `NEXT_PUBLIC_GLASS_BETA=production-preview` (valeur lue au **build**, pas à l'exécution) ;
- des **comptes de test dédiés**, un par rôle (CONSEILLER, ADMIN, SUPER_ADMIN), **MFA désactivé** pour ces comptes (sinon fournir un jeton de
  session), et idéalement une **seconde organisation** avec un utilisateur pour le test de cloisonnement ;
- un jeu de données couvrant : plusieurs conseillers, un mandat sans montant vendu, un mandat déficitaire, un budget absent, des noms très
  longs et accentués, au moins 100 activités, une période vide ;
- **jamais** de compte réel de client, de donnée de production ni de secret dans le dépôt, les journaux ou les rapports.

## 3. Tests de permissions

`design-system/bench/preprod-permissions.cjs` (lecture seule : connexion, `GET /auth/me`, `GET /rendement`).

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
`PERM-API-11` est une **information** : il liste les champs renvoyés par `/rendement` mais jamais affichés par l'interface.

**Auto-test du harnais** (aucun backend, comptes fictifs locaux, ne valide **pas** le vrai serveur) :
`npm run glass:preprod-permissions -- --self-test` ; avec `--leak`, le faux API ignore la restriction par rôle et le harnais **doit échouer**.
Ces deux cas sont couverts par `bench/preprod.test.cjs`.

Contrôles automatiques : `PERM-API-01` à `11` (API) et `PERM-BRW-01` à `07` (navigateur : accès direct, moteur de rendu, périmètre de
`/dashboard/rendement`, sections de `/settings`, menu, exceptions JavaScript, débordement horizontal aux 4 largeurs).

**Risque à consigner — accès direct par un non-administrateur.** La page `/dashboard/rendement` n'a aucun garde de rôle côté frontend :
le lien du menu est réservé à ADMIN et SUPER_ADMIN, mais une URL saisie par un CONSEILLER charge la page. D'après le code lu du backend,
la réponse est alors limitée à ses propres données. **Ce n'est pas validé à l'exécution** : `PERM-API-03` à `05` et `PERM-BRW-03` le testent.
Par ailleurs le filtrage des sections de `/settings` repose sur `user.role` lu dans le stockage du navigateur : la sécurité réelle est celle du
backend (matrice M-10).

## 4. Campagne reproductible

Pré-requis : un serveur du frontend sur `BENCH_BASE_URL` (défaut `http://localhost:3010`), construit ou lancé avec
`NEXT_PUBLIC_API_URL=http://localhost:3012/api` (le port du faux API est `BENCH_API_PORT`, défaut 3012). Chrome installé (`CHROME_PATH`).

```bash
npm run glass:campaign -- plan                       # plan, sans exécution
npm run glass:campaign -- scenarios                  # tous les scénarios du Lot 1 (4 modes × états)
npm run glass:campaign -- capture --out ../.bench-out/avant      # référence (version de référence, autre worktree)
npm run glass:campaign -- capture --out ../.bench-out/apres      # candidat
npm run glass:campaign -- compare --a ../.bench-out/avant --b ../.bench-out/apres   # attendu : 0 écart
npm run glass:campaign -- contrast --out ../.bench-out/contraste
npm run glass:campaign -- all --out ../.bench-out/campagne --baseline ../.bench-out/avant
```

Le serveur de développement (`next dev`) réécrit `coro-frontend/AGENTS.md` : préférer un build de test (section 5) quand c'est possible,
ou ne jamais committer ce fichier. Les dossiers de sortie ne doivent pas être suivis par Git ; les captures peuvent contenir des données :
ne jamais les produire contre une préproduction contenant des données réelles.

## 5. Build de test : bêta avec et sans jeton, outils de développement

```bash
npm run glass:preprod-build                         # trois variantes, ~4 min de build chacune, local, sans déploiement
npm run glass:preprod-build -- --variants off,on    # sous-ensemble
```

| Variante | `NEXT_PUBLIC_GLASS_BETA` | Résultat attendu |
|---|---|---|
| `off` | absent | les quatre routes restent en îlot Legacy, même avec préférence Glass et clé locale de bêta |
| `accidental` | `1` | idem : `1` n'active rien en production |
| `on` | `production-preview` | les quatre routes sont Glass pour une préférence Glass, Legacy pour une préférence Legacy ; routes de contrôle inchangées |

Chaque variante exécute aussi `glass:verify-production --skip-build` : `/glass-kit` en 404, aucun banc, faux API, test ni terrain d'essai dans le
build ni dans l'image standalone. La dernière variante construite reste dans `.next/` (ignoré par Git).

## 6. Matrice de validation

Rôles : C = CONSEILLER, A = ADMIN, S = SUPER_ADMIN. Routes : P = `/settings`, T = `/activities/portfolio`, R = `/profile/rendement`,
E = `/dashboard/rendement`. Mode : `auto` (script), `manuel` (personne), `mixte`. Source : `design-system/bench/validation-matrix.cjs`.

| ID | Domaine | Vérification | Rôles | Routes | Mode | Outil | Critère |
|---|---|---|---|---|---|---|---|
| M-01 | Permissions | GET /rendement sans jeton ou avec un jeton invalide est refusé (401/403) | — | E R | auto | preprod-permissions : PERM-API-01, 02 | Aucune donnée renvoyée |
| M-02 | Permissions | Un CONSEILLER ne reçoit que ses propres données, avec ou sans userId, y compris le userId d’un autre utilisateur | C | E R | auto | preprod-permissions : PERM-API-03, 04, 05 | 0 conseiller étranger dans la réponse |
| M-03 | Permissions | ADMIN et SUPER_ADMIN obtiennent l’équipe ; le filtre userId se limite à l’utilisateur demandé ; teamStats = somme des conseillers | A S | E | auto | preprod-permissions : PERM-API-06 à 09 | Réponse cohérente, filtre respecté |
| M-04 | Permissions | Cloisonnement : un ADMIN ne voit aucune donnée d’une autre organisation (userId d’un utilisateur d’une autre organisation de test) | A | E | auto | preprod-permissions : PERM-API-10 (PREPROD_OTHER_ORG_USER_ID) | 0 conseiller ou 403 |
| M-05 | Permissions | Inventaire des champs renvoyés à un CONSEILLER mais jamais affichés (p. ex. taux horaire) | C | E R | auto | preprod-permissions : PERM-API-11 (information) | Liste transmise au propriétaire du backend |
| M-06 | Accès direct | Accès direct (URL saisie) aux quatre routes pour chaque rôle : page atteinte ou redirection attendue | C A S | P T R E | auto | preprod-permissions --browser : PERM-BRW-01 | Aucune route inattendue ; cas CONSEILLER sur E décidé (M-07) |
| M-07 | Accès direct | Décision : /dashboard/rendement pour un non-administrateur — autorisé avec ses seules données (comportement actuel) ou bloqué ? Si autorisé, le périmètre visible doit être ≤ 1 conseiller | C | E | mixte | PERM-BRW-03 + décision du propriétaire produit | Décision écrite avant GA |
| M-08 | Navigation | Le lien « Rendement équipe » du menu n’apparaît que pour ADMIN et SUPER_ADMIN | C A S | P | auto | preprod-permissions --browser : PERM-BRW-05 | Présent pour A et S, absent pour C |
| M-09 | Accès direct | /settings : les sections d’administration (Organisation, Membres…) n’apparaissent que pour ADMIN et SUPER_ADMIN | C A S | P | auto | preprod-permissions --browser : PERM-BRW-04 | Sections conformes au rôle |
| M-10 | Permissions | Rôle falsifié côté navigateur (valeur de coro_user modifiée dans le stockage) : le backend refuse toute action ou donnée réservée | C | P E | manuel | DevTools + journal serveur | Aucune donnée ni action administrateur obtenue |
| M-11 | Permissions | Session expirée, déconnexion et jeton révoqué pendant la navigation : retour à la connexion, aucune donnée financière résiduelle à l’écran | C A S | P T R E | manuel | Parcours guidé | Redirection propre, écran vidé |
| M-12 | Données financières | Mêmes valeurs en Legacy et en Glass sur des données de préproduction (heures, revenus, budget, montant vendu, coût réel, marge, nombre de déficits) | A S | R E | manuel | Comparaison côte à côte (préférence Legacy puis Glass) | Valeurs identiques, toutes périodes |
| M-13 | Données financières | Valeurs indisponibles « — » neutres en Glass ; marges positive/négative ; montant vendu = 0 ; budget absent | A S | R E | mixte | campaign scenarios (jeu fictif) + contrôle sur données de préproduction | Teintes conformes, formats inchangés |
| M-14 | Données financières | Aucune donnée financière dans le stockage du navigateur, l’URL ou les requêtes supplémentaires introduites par la vue Glass | A | R E | mixte | Contrats statiques (auto) + onglet Réseau et Application des DevTools (manuel) | Mêmes requêtes qu’en Legacy, aucun stockage |
| M-15 | Données financières | Noms très longs, accents, caractères spéciaux (conseillers, clients, mandats) : aucun débordement ni troncature trompeuse | A | T R E | mixte | Scénarios (jeu fictif) + données de préproduction | Lisible aux 4 largeurs |
| M-16 | Navigation | Ouverture d’un mandat ou d’un projet par clic, Entrée et Espace ; retour arrière du navigateur | C A S | T R E | mixte | campaign scenarios (kbopen-*) + parcours réel | 1 clic = 1 navigation, bonne destination |
| M-17 | Navigation | Téléchargement .ics avec un vrai jeton (fichier valide, nom, contenu) | C A | T | manuel | Parcours réel | Fichier calendrier valide |
| M-18 | Navigation | Navigation entre les pages du Lot 1 et le reste de l’application, en Legacy comme en Glass, sans erreur ni boucle de redirection | C A S | P T R E | manuel | Parcours guidé | Aucune erreur visible ni exception |
| M-19 | Périodes | Ce mois / Cette année / Personnalisé avec données réelles ; période vide ; plage inversée (Du > Au) ; mêmes résultats que le Legacy | A S | R E | mixte | campaign scenarios (jeu fictif) + comparaison sur données de préproduction | Résultats identiques au Legacy |
| M-20 | Périodes | Bornes de période : entrées du dernier jour du mois, minuit, changement de fuseau — observation et transmission au propriétaire du backend (non corrigé ici) | A | R E | manuel | Saisies de test aux bornes | Constat consigné |
| M-21 | Tableaux | Volume réaliste (≥ 100 activités, ≥ 10 conseillers) : ordre, lisibilité, temps de rendu comparable au Legacy | A | T E | manuel | Données de préproduction volumineuses | Pas de ralentissement visible |
| M-22 | Tableaux | Bascule cartes mobiles / tableau à 768 px ; défilement horizontal interne du tableau | A | T R E | mixte | campaign scenarios (tablet768, mobile*) + appareil réel | Aucun défilement de la page |
| M-23 | Responsive | Aucun débordement horizontal de la page à 320, 390, 768 et 1600 px, pour chaque rôle | C A S | P T R E | auto | preprod-permissions --browser : PERM-BRW-07 | 0 débordement |
| M-24 | Responsive | Appareils réels : iOS Safari et Android Chrome (barre d’URL dynamique, clavier virtuel, zones sûres, tactile) | A | P T R E | manuel | Appareils réels | Utilisable sans zoom, cibles ≥ 44 px |
| M-25 | Clavier | Parcours clavier complet : ordre de Tab, focus visible, Entrée et Espace, Maj+Tab, aucune double action | A | P T R E | auto | campaign scenarios (keyboard, kbopen-*, kbperiod) | Tous les scénarios clavier verts |
| M-26 | Clavier | Défilement horizontal au clavier des tableaux de rendement à 768 px : flèches, Tab, Fin ; Firefox et Safari en plus de Chrome | A | R E | mixte | Mesure Chrome (10A) + Firefox/Safari manuels | Dernière colonne atteignable au clavier sur les 3 moteurs, ou correctif décidé |
| M-27 | Lecteur d’écran | NVDA (Windows) avec Firefox et Chrome : parcours des 4 pages (titres, régions, boutons, états, périodes, tableaux) | C A | P T R E | manuel | Script de parcours de PREPROD.md | Chaque action annoncée et réalisable |
| M-28 | Lecteur d’écran | VoiceOver (macOS Safari et iOS Safari) : mêmes parcours | C A | P T R E | manuel | Script de parcours de PREPROD.md | Chaque action annoncée et réalisable |
| M-29 | Lecteur d’écran | Zoom 200 % et 400 %, taille de texte agrandie, contraste élevé (forced-colors), mouvement réduit, transparence réduite | A | P T R E | manuel | Réglages système et navigateur | Aucune perte d’information ni d’action |
| M-30 | Bêta | Build SANS jeton (et avec NEXT_PUBLIC_GLASS_BETA=1) : les quatre routes restent en îlot Legacy, même avec la préférence Glass et la clé locale de bêta | — | P T R E | auto | preprod-build-check (variantes off, accidental) | 4 routes en Legacy |
| M-31 | Bêta | Build avec NEXT_PUBLIC_GLASS_BETA=production-preview : les quatre routes en Glass pour la préférence Glass, en Legacy pour la préférence Legacy ; les autres routes inchangées | — | P T R E | auto | preprod-build-check (variante on) | Moteur conforme à la préférence |
| M-32 | Production | Aucun outil de développement exposé : /glass-kit en 404, aucun banc, faux API, test ou terrain d’essai dans le build | — | — | auto | glass:verify-production et preprod-build-check | 32/32 contrôles par build |
| M-33 | Production | Revue de la configuration de déploiement : le jeton de bêta n’est défini que dans l’environnement de préproduction prévu | — | — | manuel | Revue CI/CD et variables d’environnement (sans les afficher) | Jeton absent de la production |
| M-34 | Retour arrière | Retirer le jeton et reconstruire : les quatre routes repassent en Legacy sans perte de données ; la préférence d’interface de l’utilisateur n’est qu’un réglage local | A | P T R E | mixte | preprod-build-check (off) + répétition en préproduction | Legacy rétabli, données intactes |
| M-35 | États | Chargement, vide et erreur avec le vrai backend : erreur 500, délai, 401 expiré, réponse vide | A | T R E | mixte | campaign scenarios (jeu fictif) + simulation d’incident en préproduction | Comportement identique au Legacy |
| M-36 | Observabilité | Journaux serveur et navigateur pendant les parcours : aucune erreur 4xx/5xx nouvelle, aucune exception JavaScript | C A S | P T R E | mixte | PERM-BRW-06 + journaux serveur | 0 nouvelle erreur |

**Parcours lecteur d'écran (M-27, M-28)** — pour chaque page, avec NVDA (Firefox puis Chrome) et VoiceOver (Safari) : (1) la page est annoncée avec son
titre ; (2) naviguer aux titres et aux régions ; (3) atteindre chaque bouton par Tab et vérifier son nom (« Ouvrir le projet… », « Ouvrir le mandat… »,
« Télécharger … au format calendrier », période pressée ou non, conseiller déplié ou replié) ; (4) activer par Entrée puis Espace ; (5) parcourir un tableau
cellule par cellule (en-têtes de colonnes lus, valeur « — » comprise) ; (6) changer de période et vérifier que le résultat est perceptible ;
(7) provoquer chargement, vide et erreur et noter ce qui est annoncé. Consigner pour chaque écart : page, lecteur, navigateur, étape, annonce obtenue.

## 7. Plan de retour arrière

**Principe : désactiver Liquid Glass ne touche à aucune donnée.** Les vues Glass n'ont aucun appel réseau, aucun stockage et aucune écriture
(vérifié par contrats statiques) ; le Lot 1 n'ajoute aucune migration, aucun changement d'API ni de permission. Le retour arrière est donc un changement
de **code ou de configuration du frontend** uniquement. La préférence d'interface (`coro-ui-generation`) n'existe que dans le navigateur de chaque utilisateur.

| Niveau | Action | Portée | Délai | Perte de données |
|---|---|---|---|---|
| 0 | L'utilisateur repasse en « Legacy » dans `/profile` (réglage d'interface) | un navigateur | immédiat | aucune |
| 1 | Reconstruire **sans** `NEXT_PUBLIC_GLASS_BETA` (valeur lue au build) et redéployer | toute la préproduction | durée du pipeline | aucune ; les quatre routes repassent en îlot Legacy même pour les utilisateurs en Glass |
| 2 | Remettre les quatre routes à `legacy-only` dans `design-system/routes/route-registry.ts` (+ tests de registre) | tout environnement | un commit | aucune |
| 3 | `git revert` des commits du Lot 1 (du plus récent au plus ancien : `b51b6238`, `bad470c1`, `20d9f09d`, `738bba8a`, puis, si nécessaire, `a7d46913` et `e930f0db`) | tout environnement | un commit par revert | aucune |

Vérification après retour arrière (M-34) : les quatre routes rendent le Legacy ; `npm run glass:preprod-build -- --variants off` passe ; les valeurs affichées sont inchangées.
**Prérequis à confirmer avec Codex** : le workflow de déploiement ne pousse que l'étiquette `:latest` de l'image du frontend ; sans étiquette par commit, on ne peut
pas redéployer « l'image précédente » : le retour arrière passe alors par un nouveau build (niveaux 1 à 3).

## 8. Critères Go / No-Go pour une bêta limitée

**Définition.** Une bêta limitée = les utilisateurs de **test** ou **internes**, dans la **préproduction**, avec le build `production-preview`.
Une bêta limitée **en production** n'est pas possible aujourd'hui sans décision supplémentaire : le jeton est global au build et il n'existe aucun
ciblage par utilisateur ou par organisation (tous les utilisateurs dont la préférence est Glass verraient les quatre routes en Glass).

**Go — tous les critères doivent être remplis :**

1. M-01 à M-06, M-08, M-09 : exécutés en préproduction avec les trois rôles, **0 KO** ; rapport archivé (hors dépôt).
2. M-04 : cloisonnement inter-organisations vérifié, ou exclusion écrite et acceptée de l'équipe de sécurité.
3. M-07 : décision écrite du propriétaire produit sur l'accès d'un non-administrateur à `/dashboard/rendement` (autorisé avec ses seules données, ou bloqué).
4. M-12 : valeurs financières identiques entre Legacy et Glass sur données de préproduction, validées par une personne côté métier.
5. M-30, M-31, M-32 : `glass:preprod-build` vert pour les trois variantes ; `glass:verify-production` 32/32.
6. M-27 et M-28 : parcours lecteur d'écran réalisés (NVDA et VoiceOver) ; aucun blocage pour exécuter une action ; écarts consignés et acceptés.
7. M-26 : défilement horizontal au clavier confirmé sur Firefox et Safari, ou correctif décidé.
8. M-24 : vérification sur au moins un iPhone et un Android réels.
9. `npm run test:design-system`, `npx tsc --noEmit` : verts ; ESLint : aucun problème nouveau par rapport à la référence.
10. M-33 : le jeton de bêta est absent de l'environnement de production (revue de configuration).
11. Le plan de retour arrière (section 7) a été **répété** une fois en préproduction.
12. Les points de la section 10 marqués « bloquant » sont tranchés.

**No-Go — un seul suffit :**

- un CONSEILLER obtient des données d'un autre utilisateur (M-02), ou un ADMIN d'une autre organisation (M-04) ;
- une valeur financière diffère entre Legacy et Glass sans explication (M-12) ;
- un outil de développement est exposé, ou le jeton de bêta est présent dans la production (M-32, M-33) ;
- une action n'est pas réalisable au clavier ou au lecteur d'écran (M-25, M-27, M-28) ;
- une exception JavaScript non gérée ou une nouvelle erreur serveur pendant un parcours (M-36) ;
- le retour arrière n'a pas été répété avec succès (critère 11).

## 9. Pull Request et intégration contrôlée avec `main`

État mesuré le 2026-10-15 : la branche `feature/liquid-glass-design-system` a **6 commits** absents de `main` (base commune `051bfa9c`) ;
`main` a **4 commits** absents de la branche. Aucun fichier n'est modifié des deux côtés (pas de conflit textuel attendu). La branche touche
64 fichiers, tous dans `coro-frontend/` sauf `docs/design/liquid-glass/` (3 fichiers).

**Attention — le déploiement est automatique.** `.github/workflows/deploy.yml` se déclenche sur **tout push vers `main`** : vérification des types des
quatre applications, tests du backend, build du portail client, construction et publication des images, puis déploiement par SSH. Il n'existe **aucun
workflow sur Pull Request pour le frontend** (seul `website-docker-check.yml` existe, pour le site vitrine) ; le pipeline ne lance côté frontend que
`tsc --noEmit` puis le build Docker, **pas** les tests du Design System, ni les contrats, ni ESLint. Fusionner dans `main` équivaut donc à déployer.
Le `Dockerfile` du frontend ne reçoit que `NEXT_PUBLIC_API_URL` : le jeton de bêta est absent, donc **la bêta restera désactivée en production** après fusion.

Étapes recommandées (aucune n'est exécutée par cette phase) :

1. **Préproduction d'abord** : exécuter les sections 3 à 5 et la matrice ; archiver les rapports.
2. **Intégrer `main` dans la branche** (ou rebaser, à décider par Codex) pour absorber les 4 commits de `main` — notamment `stores/auth.store.ts` et
   `components/layout/AuthProvider.tsx` (hydratation de session) et `eslint.config.mjs`. Puis **rejouer** : `npm run test:design-system`, `npx tsc --noEmit`,
   `npm run glass:verify-production`, `npm run glass:campaign -- scenarios`. Le changement d'hydratation peut modifier le défaut connu de redirection vers `/login`
   et donc l'entrée du banc ; la référence ESLint peut aussi changer.
3. **Ouvrir la Pull Request** vers `main`, contenant : périmètre (quatre routes bêta, jamais `ga`), aucun changement backend ni permission, liens vers ce document
   et les rapports, résultats des tests, risques connus (section 10), plan de retour arrière.
4. **Revue** par Codex (permissions, métriques) et par le propriétaire produit (décisions M-07, M-12), plus relecture accessibilité.
5. **Garde avant fusion** : confirmer que `NEXT_PUBLIC_GLASS_BETA` n'est défini ni dans le Dockerfile, ni dans le workflow, ni dans la configuration du serveur.
6. **Stratégie de fusion** : conserver les commits distincts (pas de squash) pour garder des `git revert` fins (section 7).
7. **Après fusion** : surveiller le pipeline, vérifier le déploiement, puis un contrôle rapide en production **sans connexion de test** : `/glass-kit` en 404 et pages
   historiques en 200 (`glass:verify-production` s'exécute sur un build local, pas sur la production).
8. **Recommandé** : ajouter un workflow sur Pull Request qui exécute `npm run test:design-system`, `npx tsc --noEmit` et `npm run glass:verify-production`
   pour `coro-frontend/**` (proposition à valider par Codex ; non ajouté ici).

## 10. Points à transmettre à Codex

| # | Sujet | Constat | Bloquant avant GA |
|---|---|---|---|
| 1 | « Revenus » | `revenusTotal` est la somme des `coutReel` (`heures × tauxHoraire`) ; l'interface l'affiche comme « Revenus » (équipe, conseiller, `/profile/rendement`) | oui (décision métier) |
| 2 | Marge | `montantVendu` est le montant total du mandat, comparé au coût d'une seule période et d'un seul conseiller | oui |
| 3 | Double comptage | Chaque conseiller d'un même projet voit le montant complet ; un mandat peut être compté plusieurs fois dans « Mandats déficitaires » | oui |
| 4 | Champs non affichés | D'après la lecture du code, `/rendement` renvoie aussi `tauxHoraire` et la table `mandats` ; un CONSEILLER les recevrait pour ses mandats (à confirmer par `PERM-API-11`) | à qualifier |
| 5 | Garde de page | `/dashboard/rendement` n'a pas de garde de rôle ; décision M-07 | oui |
| 6 | Borne de période | `date.lte = new Date('AAAA-MM-JJ')` (minuit UTC) : entrées du dernier jour possiblement exclues, selon l'heure stockée | à vérifier |
| 7 | Rôle côté client | `/settings` filtre ses sections sur `user.role` lu dans le stockage du navigateur ; seule la sécurité du backend compte | à confirmer |
| 8 | Image du frontend | Seule l'étiquette `:latest` est publiée : pas de retour arrière par image | recommandé |
| 9 | Workflow sur PR | Aucun contrôle frontend avant fusion ; le push sur `main` déploie | recommandé |
| 10 | Préproduction | À créer (hôte, base anonymisée, comptes de test sans MFA, seconde organisation) | oui |
| 11 | Ciblage de la bêta | Jeton global au build, aucun ciblage par utilisateur ou organisation : pas de bêta limitée en production | décision |
| 12 | Intégration de `main` | `stores/auth.store.ts`, `AuthProvider.tsx`, `eslint.config.mjs` modifiés des deux côtés du temps ; rejouer les contrôles après intégration | oui |
