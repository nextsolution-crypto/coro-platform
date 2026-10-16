# Plan d'acceptation sur le vrai backend — Platform Authority × Liquid Glass

> **Statut : plan préparé (Phase 13), non exécuté.** À lancer après la confirmation du SHA de gel fonctionnel de `main` et la réconciliation finale.
> Les validations de Liquid Glass s'appuient aujourd'hui sur un **faux API** (`bench/mock-api.cjs`) qui reproduit seulement la *forme* du contrat de `main` : il ne prouve rien sur le vrai backend, ni sur l'isolation entre organisations, ni sur la révocation immédiate. Ce plan comble cet écart.
> **Règle : le code métier et les autorités de `main` font autorité.** Aucun changement de backend, de Prisma, de garde ou de contrat API n'est permis pour faciliter l'intégration du design.

## 1. Environnement requis
- **Backend et base dédiés aux tests** (préproduction ou instance locale isolée), **jamais la production**, jamais le port `3002` partagé avec d'autres équipes. Les hôtes `getcoro.io` et sous-domaines sont refusés par les scripts.
- Migration `138` (Platform Authority) appliquée ; autorité **ACTIVE** (le Founder a activé la configuration) ; le *Founder binding* est celui d'un compte de test.
- Frontend construit avec `NEXT_PUBLIC_API_URL` = ce backend et `NEXT_PUBLIC_GLASS_BETA=production-preview` (build de préproduction uniquement).
- Comptes **dédiés aux tests, sans MFA**, aucune donnée réelle. Identifiants lus dans l'environnement, jamais écrits sur disque ni journalisés.
- Artefacts (journaux, rapports, captures) sur `D:\CORO-QA\artifacts\acceptance-real\<date>\` ; profils Chrome temporaires sous `D:\CORO-QA\temp` (`BENCH_TMPDIR`).

## 2. Comptes et données de test
| Profil | Rôle en base | Autorité attendue | Organisation |
|---|---|---|---|
| **FOUNDER** | SUPER_ADMIN | Founder | CORO (interne) |
| **DELEGATED** | SUPER_ADMIN | Aucun Founder ; grants : `COMMERCIAL_CATALOG_MANAGE` (GLOBAL), `FINANCIAL_RENDEMENT_READ` (ORGANIZATION A) | CORO |
| **NO_PERMISSION** | SUPER_ADMIN | Aucun Founder, aucun grant actif | CORO |
| **ADMIN_A** | ADMIN (client) | Aucune autorité de plateforme | Organisation cliente A |
| **ADMIN_B** | ADMIN (client) | Aucune autorité de plateforme | Organisation cliente B |
| **CONSEILLER_A** | CONSEILLER | Aucune | Organisation cliente A |

Deux organisations clientes (A et B) avec chacune des mandats, des heures saisies et des taux de coût approuvés (au moins un mandat CAD complet, un incomplet, un sans devise de vente historique), pour vérifier l'isolation interorganisation et l'affichage `UNKNOWN`.

## 3. Matrice d'acceptation (API puis navigateur)
Chaque ligne passe ou échoue ; aucun « ok » par défaut. Les identifiants `AC-*` serviront de clés dans le rapport.

### 3.1 API (lecture seule sauf AC-12 à AC-15)
| ID | Contrôle | Attendu |
|---|---|---|
| AC-01 | `GET /admin/v1/platform-authority/me` — FOUNDER | 200, `founder: true`, `authorityStatus: ACTIVE` |
| AC-02 | idem — DELEGATED | 200, `founder: false`, grants = ceux accordés (permission, scope, organisation cible) |
| AC-03 | idem — NO_PERMISSION | 200, `founder: false`, `grants: []` |
| AC-04 | idem — ADMIN_A, ADMIN_B, CONSEILLER_A, anonyme | 403 (client) / 401 (anonyme) |
| AC-05 | `GET /admin/v1/platform-authority/grants` — FOUNDER | 200, liste avec provenance (accordé par, motif, dates) |
| AC-06 | idem — DELEGATED, NO_PERMISSION, ADMIN_A | 403, aucune liste |
| AC-07 | `GET /rendement/financial` — FOUNDER | 200, forme conforme, montants en chaînes décimales |
| AC-08 | idem — DELEGATED (grant sur l'organisation A) avec `organizationId` = A | 200 ; avec `organizationId` = B | 403 (aucun grant sur B) |
| AC-09 | idem — NO_PERMISSION, ADMIN_A, ADMIN_B, CONSEILLER_A | 403, aucune donnée financière |
| AC-10 | `GET /rendement/operational` — CONSEILLER_A | uniquement ses données ; aucun champ financier |
| AC-11 | **Isolation** : ADMIN_A et CONSEILLER_A demandent le `userId` d'un utilisateur de l'organisation B (opérationnel et financier) | aucune donnée ou 403 |
| AC-12 | Octroi : FOUNDER accorde `ORGANIZATION` puis `GLOBAL` (confirmation requise côté interface) à DELEGATED | 201, grant ACTIVE, provenance et audit enregistrés |
| AC-13 | **Révocation immédiate** : FOUNDER révoque ; DELEGATED rappelle `/me` et `/rendement/financial` aussitôt | grant disparu, 403 sans attente ni nouvelle connexion |
| AC-14 | Octroi par un non-Founder (DELEGATED, ADMIN_A) | 403 |
| AC-15 | Organisation cible inexistante ou hors périmètre | refus explicite, aucun grant créé |
| AC-16 | Aucun repli fondé sur le rôle seul : SUPER_ADMIN sans Founder ni grant (NO_PERMISSION) sur les routes commerciales et financières | 403 |

### 3.2 Navigateur (build de préproduction, Chrome piloté)
Pour **chaque profil** et chaque thème (Classic, Glass clair, Glass sombre) :
| ID | Contrôle | Attendu |
|---|---|---|
| AC-20 | Menu | FOUNDER : groupe Plateforme complet et « Permissions plateforme » ; DELEGATED : accès plateforme sans groupe Founder ni « Permissions plateforme » ; NO_PERMISSION et clients : aucun menu plateforme |
| AC-21 | Accès direct à `/admin/platform-permission-grants` | FOUNDER seulement ; tous les autres redirigés vers `/dashboard`, sans flash de contenu |
| AC-22 | Accès direct à `/admin/commercial` et aux écrans commerciaux | FOUNDER et DELEGATED ; les autres redirigés |
| AC-23 | `/dashboard/rendement` | indicateurs pour FOUNDER et DELEGATED (organisation autorisée) ; aucun indicateur ni valeur financière pour les autres (message d'erreur) |
| AC-24 | Les 11 écrans Founder à 1440, 1920, 390, 430 px | écran atteint, aucune exception console critique, aucun débordement horizontal |
| AC-25 | Page Permissions : octroi ORGANIZATION, octroi GLOBAL (case et confirmation), révocation (confirmation), provenance et motifs affichés | comportement identique en Classic, Glass clair et Glass sombre |
| AC-26 | Affichage des devises : CAD, USD historique, code invalide, devise absente (« Devise inconnue »), zéro, marge négative, mandat incomplet | aucun `RangeError`, aucune conversion implicite |
| AC-27 | F5 sur chaque écran | même écran, même thème, même autorité |
| AC-28 | Session : jeton expiré / `/me` en erreur | refus (pas de repli sur le rôle), message d'état clair |

## 4. Exécution
1. **Préparer** l'environnement (section 1) et les comptes (section 2) ; consigner le SHA de `main` intégré et celui de la branche Liquid Glass.
2. **API** : `npm run glass:preprod-permissions -- --api <url>/api --app <url> --browser --expect-renderer glass --require-all --out <rapport.json>` avec les variables `PREPROD_<PROFIL>_EMAIL` / `_PASSWORD` (ou `_TOKEN`). Sans identifiants, un profil est « non exécuté » et fait échouer `--require-all`.
3. **Navigateur** : les scénarios `founder-*` et `rbac-*` du banc (`bench/scenarios-founder.cjs`) sont réutilisables contre le vrai backend une fois le harnais étendu (section 5).
4. **Preuves** : rapport JSON sans identifiants, captures aux quatre largeurs et trois thèmes, journaux serveur et navigateur sur la durée du parcours (aucune erreur 5xx inexpliquée).

## 5. Extensions du harnais nécessaires (à faire après le gel de `main`)
- `preprod-permissions.cjs` : accepter les profils FOUNDER, DELEGATED, NO_PERMISSION, ADMIN_B, CONSEILLER_A (aujourd'hui : CONSEILLER, ADMIN, SUPER_ADMIN) et exécuter AC-01 à AC-16 avec `PREPROD_OTHER_ORG_*` pour l'isolation.
- Mode « vrai backend » des scénarios `founder-*` / `rbac-*` : ouvrir une session par **connexion réelle** (au lieu du jeton factice), sans variable d'autorité simulée.
- Garde-fous conservés : refus de la production, secrets lus à l'exécution, rapport sans identifiant, lecture seule hors AC-12 à AC-15 (qui n'écrivent que dans l'organisation de test).
- Les contrôles AC-12 à AC-15 **modifient l'état** (grants) : à exécuter uniquement sur l'environnement de test et à remettre dans l'état initial (révocation des grants créés).

## 6. Critères Go / No-Go
- **Go** : tous les AC-01 à AC-28 passent, aucune donnée d'une autre organisation visible, aucune donnée financière pour un profil non autorisé, révocation effective immédiatement, aucune erreur console critique.
- **No-Go** : tout refus manquant (un client voit de l'administration plateforme ou du financier), toute fuite entre organisations, toute révocation non immédiate, tout repli sur le rôle SUPER_ADMIN seul.
- Un défaut de `main` constaté pendant l'acceptation est **signalé à l'équipe backend** ; Liquid Glass ne le contourne pas.
