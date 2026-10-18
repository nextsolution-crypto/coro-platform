# Plan de préproduction privée — revue du Founder de Liquid Glass V2

Mandat 52. **Ce document est un plan à approuver. Rien n'est déployé, aucun service public n'est exposé, aucun secret n'est créé, la chaîne CI/CD n'est pas modifiée.**
Les fichiers d'exemple (`preprod-drafts/`) sont des **brouillons non exécutables par la CI**. Le site vitrine n'en fait pas partie.

## 1. Objectif et contraintes

Offrir au Founder, et à lui seul, une instance **complète et isolée** de l'application CORO et du portail client portant le jeton `NEXT_PUBLIC_GLASS_BETA=production-preview`, branchée sur une base **non productive** à données **synthétiques**, pour la revue page par page (`FOUNDER-ACCEPTANCE-MATRIX.md`).

| Contrainte du mandat | Réponse |
|---|---|
| Hôte séparé ou déploiement isolé | Un VPS **dédié** (recommandé) : aucun conteneur, port, volume ni réseau en commun avec la production. |
| Base non productive, données synthétiques | PostgreSQL local au VPS, migrations rejouées, jeu de données synthétique (§6). Aucune copie de la production. |
| Aucun secret ni identifiant de production | Tous les secrets sont **nouveaux et propres à la préproduction** ; aucun accès Brevo, Spaces/S3, Anthropic ni Mapbox de production (§5). |
| Contrôle d'accès explicite | Cloudflare Access (courriel du Founder) ou Tailscale ; aucun accès public (§4). |
| Jeton exact, absent de la production | Images **distinctes** construites avec le jeton ; la chaîne de production actuelle ne le transmet pas et ne doit jamais le recevoir (§3). |
| Application **et** portail | Deux images Next.js + backend + base (§2). |
| Pas de site vitrine | Aucun conteneur `website`. |
| Construction et retour arrière indépendants | Projet Docker Compose distinct (`coro-preprod`), étiquettes d'image distinctes, workflow manuel séparé (§7). |

## 2. Architecture

```
Founder ──HTTPS──> Cloudflare Access (courriel + OTP) ──> VPS « coro-preprod » (région Toronto)
                                                          │
   Caddy (443) ── preprod-app.<domaine>    → coro-frontend-preview  (Next.js, 3000 interne)
               ── preprod-client.<domaine> → coro-portal-preview    (Next.js, 3003 interne)
               ── preprod-api.<domaine>    → coro-backend-preprod   (NestJS, 3002 interne) + en-têtes CORS posés par Caddy
                                                          │
                                         coro-postgres-preprod (volume nommé propre, aucun port publié)
```

* **Aucun port hôte n'est publié** hormis 80/443 de Caddy (et SSH restreint). Les ports 3000/3001/3002/3003 de la production ne sont jamais utilisés sur cet hôte, qui est de toute façon un autre serveur.
* Projet Compose `coro-preprod`, réseau `coro_preprod_net`, volumes `coro_preprod_pg`, noms de conteneurs préfixés `coro_preprod_` : collision impossible, même si l'hôte était un jour partagé.
* Le backend est **le même code** que la production (`ghcr.io/…/coro-backend`), étiqueté `preprod-<sha>`.

### 2.1 Deux points techniques à connaître (vérifiés dans le code)

1. **CORS.** Le backend n'autorise que des origines codées en dur (domaines de production, `localhost`) plus **une seule** valeur `FRONTEND_URL`. Application et portail ont deux origines distinctes : **sans changer le backend**, Caddy répond lui-même aux requêtes préliminaires et pose `Access-Control-Allow-Origin` pour les deux origines de préproduction, en supprimant l'en-tête du backend (`header_down -Access-Control-Allow-Origin`). Alternative (une décision de code, hors de ce mandat) : variable `CORS_EXTRA_ORIGINS` côté backend.
2. **Double authentification (MFA).** Le backend impose la MFA par courriel. La capture de code « QA » (sans courriel) est **interdite quand `NODE_ENV=production`** et **interdit tout identifiant Brevo ou Spaces** (`mfa-delivery.service.ts`). Pour ne dépendre d'aucun service externe, le backend de préproduction tourne donc avec `NODE_ENV=staging`, `MFA_QA_CAPTURE_ENABLED=true`, `MFA_QA_NETWORK_ISOLATED=true`, destinataires en `.test`, répertoire de capture dans le répertoire temporaire du conteneur, **sortie réseau coupée** pour ce conteneur. Le Founder lit son code via un **petit visualiseur en lecture seule** derrière le même contrôle d'accès (§4). Cette configuration est celle qui a servi à toutes les validations locales de ce mandat.
   * Variante B (si le Founder refuse le visualiseur) : clé Brevo **dédiée au bac à sable**, limitée à l'expéditeur de préproduction et à l'adresse du Founder. Elle exige un secret externe et est incompatible avec la capture QA.

## 3. Construction des images (indépendante de la production)

État actuel vérifié : `coro-frontend/Dockerfile` et `coro-client-portal/Dockerfile` n'ont **que** `NEXT_PUBLIC_API_URL` (et l'URL du portail) comme arguments ; `deploy.yml` ne transmet jamais `NEXT_PUBLIC_GLASS_BETA`. La production ne peut donc pas recevoir le jeton.

Changements nécessaires (**à autoriser séparément ; non réalisés**) :

1. Ajouter aux deux Dockerfile `ARG NEXT_PUBLIC_GLASS_BETA=""` / `ENV NEXT_PUBLIC_GLASS_BETA=$NEXT_PUBLIC_GLASS_BETA` (valeur vide par défaut : les builds de production restent identiques).
2. Nouveau workflow **manuel** `preview-build.yml` (`workflow_dispatch`, sans environnement `production`, sans accès au VPS de production, permissions `contents: read`, `packages: write`) construisant `coro-frontend-preview`, `coro-client-portal-preview` et `coro-backend-preprod` avec le jeton et `NEXT_PUBLIC_API_URL=https://preprod-api.<domaine>/api`, étiquetés `preprod-<sha>`.
3. Un test de garde dans le dépôt : le jeton `production-preview` n'apparaît dans aucun workflow de production ni dans `deploy.yml`, et les images de production n'utilisent jamais l'étiquette `preprod-*`.

Variante sans changement de pipeline : construire sur le VPS de préproduction avec `docker build --build-arg NEXT_PUBLIC_GLASS_BETA=production-preview` (4 Go de RAM recommandés).

## 4. Contrôle d'accès et frontières de sécurité

| Couche | Mesure |
|---|---|
| Réseau | Pare-feu du VPS : 443 ouvert seulement vers les plages Cloudflare (ou Tailscale uniquement) ; 22 restreint à l'IP du Founder ou fermé (accès via Tailscale). Aucun port de base de données publié. |
| Identité | **Cloudflare Access** (gratuit jusqu'à 50 utilisateurs) : politique « courriel du Founder » + code à usage unique, pour les trois hôtes et le visualiseur MFA. Alternative : Tailscale (hôtes visibles seulement sur le tailnet). Repli minimal : `basic_auth` Caddy + liste d'IP. |
| Indexation | `X-Robots-Tag: noindex`, `robots.txt` interdisant tout ; les applications portent déjà `robots: noindex`. |
| Données | Synthétiques uniquement ; comptes `*.test` ; aucune donnée réelle importée ; SMS, courriels et stockage de fichiers désactivés (pas d'identifiants). |
| Secrets | Générés pour l'occasion (JWT, MFA plateforme, mot de passe PostgreSQL) et stockés dans un fichier `0600` du VPS ; **aucun** secret de production, aucun secret dans le dépôt. |
| Production | Aucun lien réseau, aucune clé SSH ni identité de déploiement partagée, aucun accès au registre en écriture avec les identifiants de production. |
| Journalisation | Journaux Caddy + conteneurs conservés 14 jours ; l'accès du Founder est tracé par Cloudflare Access. |

## 5. Configuration (voir `preprod-drafts/`)

* `compose.preprod.yml` : projet `coro-preprod`, aucun `ports:` sauf Caddy, `NODE_ENV=staging` pour le backend, réseau sans sortie pour lui.
* `Caddyfile.preprod` : trois hôtes, CORS, en-têtes de sécurité, `noindex`.
* `preprod.env.example` : **noms** de variables seulement (aucune valeur).
* `seed-order.md` : ordre d'amorçage (migrations → autorité plateforme → données de démonstration → comptes de test → jetons de borne).

## 6. Données synthétiques

Reprise de la méthode déjà validée en local pour ce mandat : `prisma migrate deploy` (139 migrations) ; amorçage de l'autorité de plateforme via les services du backend (organisation opératrice, Founder, délégués, administrateurs clients de deux organisations, conseiller) ; `seed-demo` (organisation, clients, bâtiments, projets, mandats, activités, temps) ; comptes du portail client (gestionnaire, corporatif) ; jetons de borne. Jeu de rendement avec devises mixtes (CAD, UNKNOWN) pour la revue financière. Les scripts sont des **harnais de test hors dépôt** à industrialiser (≈ 0,5 j).

## 7. Retour arrière, reconstruction, isolation

* **Reconstruire** : relancer le workflow manuel avec un autre SHA, puis `docker compose -p coro-preprod pull && up -d` sur le VPS.
* **Retour arrière** : redéployer l'étiquette précédente (`preprod-<sha-1>`) ; la base peut être réinitialisée depuis le jeu synthétique (aucune donnée à conserver).
* **Arrêt total** : `docker compose -p coro-preprod down -v` (volumes de préproduction seulement) ou suppression du VPS. **Aucun effet** sur la production.
* **Fin de revue** : détruire le VPS, supprimer les enregistrements DNS et les étiquettes `preprod-*`.

## 8. Coûts (estimation, à confirmer au tarif en vigueur)

| Poste | Estimation |
|---|---|
| VPS DigitalOcean Toronto, 2 vCPU / 4 Go / 80 Go (permet aussi les builds) | ≈ 24 USD / mois (≈ 0,036 USD / h : détruit après la revue, quelques dollars) |
| Sauvegarde instantanée (facultative : données jetables) | ≈ 5 USD / mois |
| Cloudflare Access (≤ 50 utilisateurs) | 0 |
| DNS : sous-domaines d'un domaine existant, ou domaine dédié | 0 à ≈ 15 USD / an |
| Stockage de fichiers, SMS, courriel | 0 (désactivés) |
| **Total** | **≈ 25 à 30 USD / mois, ≈ 10 USD pour une revue de deux semaines** |

## 9. Effort estimé

| Lot | Jours |
|---|---:|
| Provisionnement du VPS, pare-feu, Docker, Caddy, Cloudflare Access | 0,5 |
| Dockerfile (ARG), workflow manuel `preview-build`, test de garde | 0,5 |
| Compose, Caddy (CORS), variables, secrets | 0,5 |
| Amorçage des données synthétiques industrialisé + visualiseur MFA | 1 |
| Recette (rejeu des balayages et scénarios sur l'hôte), documentation | 0,5 |
| **Total** | **≈ 3 jours** (1 développeur) + revue de sécurité |

## 10. Risques

* Le backend de préproduction tourne hors `NODE_ENV=production` (nécessaire à la capture MFA) : certains comportements de développement (journaux, limites) peuvent différer ; ils ne concernent pas l'aspect visuel revu.
* Le contournement CORS par le proxy doit être testé (requêtes préliminaires, en-têtes `Authorization`) avant la revue.
* Une base jetable ne reproduit pas les volumes de production : la revue juge l'apparence, pas la performance.
* Toute erreur d'étiquetage (image avec jeton dans la production) serait grave : le test de garde du §3 et des étiquettes distinctes sont obligatoires.

## 11. Décisions requises du Founder

1. Hôte : **VPS dédié** (recommandé) ou déploiement isolé sur l'hôte existant (non recommandé : mêmes ports voisins, même disque).
2. Accès : Cloudflare Access (recommandé), Tailscale ou basic_auth + IP.
3. MFA : visualiseur de code (recommandé, zéro secret externe) ou clé Brevo bac à sable.
4. Domaine : sous-domaines de `getcoro.io` (modification DNS du domaine de production, sans impact sur les enregistrements existants) ou domaine dédié.
5. Autoriser les changements de Dockerfile et le workflow `preview-build.yml` (mandat séparé).
6. Budget (~25–30 USD / mois) et durée de vie (suppression à la fin de la revue).
