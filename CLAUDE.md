# CORO — Instructions pour Claude

Contexte complet et détaillé : `CORO_CONTEXTE_REPRISE_v4.md` (racine). Ce fichier est le résumé opérationnel à lire en premier.

## 1. Qui est Mathieu et comment travailler avec lui

- Fondateur et product owner de CORO. **Ne code pas** — toi (Claude) fais tout le travail technique.
- Il copie-colle le code, exécute les commandes terminal, utilise VS Code et GitHub.
- Travaille toujours **en français**, une étape à la fois, en expliquant brièvement chaque modification.
- Préfère les **fichiers complets** aux diffs partiels quand la modification est complexe (plusieurs bugs passés causés par des remplacements partiels mal alignés).
- Ses confirmations sont très concises : "c bon", "c fait", "c deployé et ok", "RAS", "Ça fonctionne" — ne pas attendre plus de détails.
- Documents produits par la plateforme : bilingues FR/EN.

## 2. Stack et environnement

| Composant | Techno | Dossier | Port dev |
|---|---|---|---|
| App conseiller | Next.js 15 + TS + Tailwind + Zustand | `coro-frontend` | 3000 |
| Backend | NestJS + TS + Prisma 6.19.3 | `coro-backend` | 3002 |
| Portail client (PWA) | Next.js 15 | `coro-client-portal` | 3001 |
| Site vitrine | Next.js 15 | `coro-website` | 3003 |
| DB | PostgreSQL (`coro_db`, service Windows) | — | 5432 |

- Monorepo : 4 apps, commits depuis la racine `F:\coro-platform` avec `git add -A`.
- Vérif obligatoire après modif : `npx tsc --noEmit` dans le sous-dossier concerné.
- Admin local : `admin@coro.app` / `Admin2026!`.
- LanguageTool 6.6 (correcteur orthographique) : à lancer manuellement chaque session sur le port 8081 (Java 17 requis) — voir v4 pour la commande.
- Design system : fond `#F8F9FA`, cards `#FFFFFF`, rouge primaire `#C0392B`/hover `#A93226`, textes `#2C3E50`/`#6C757D`/`#ADB5BD`. Inline CSS préféré à Tailwind pour la précision des couleurs. `rounded-md` (6px) cards/modals, `rounded` (4px) boutons/inputs.
- PowerShell + dossiers `[id]`/`[projectId]` : toujours utiliser `-LiteralPath`.
- Rate limiting global actif (`@nestjs/throttler` : 120 req/min, 2000 req/h par IP).
- Prod : `app.getcoro.io` / `api.getcoro.io` / `client.getcoro.io` / `getcoro.io` — VPS DigitalOcean Toronto, déploiement auto CI/CD sur push `main`, Prisma épinglé à `6.19.3` (v7 casse le schema).

## 3. État d'avancement réel des modules (scan du code — 13 sept. 2026)

**Documentaires** : PMU/PSI/PCA = 100% fonctionnels (configurateur + export PDF). **PGC/PRA/PUE = pages marketing "Phase 2" seulement**, aucun configurateur applicatif — ne pas supposer qu'ils sont fonctionnels comme PMU/PSI/PCA.

**Modules applicatifs livrés** : approbation documentaire, notifications in-app, délais mandats + alertes, générateur procédures IA, REPTOX (88 substances), portefeuille mandats, capacity planning, toasts globaux, health score portefeuille, bookings/réservations, espace fichiers projet collaboratif, chat IA "Sophie" (site vitrine), tracking engagement client, MFA (conseiller + client) + refresh tokens + trusted devices + magic links.

**CORO Sentinelle (registre d'occupation)** — cœur : borne kiosque QR dynamique, pointage PIN, mode évacuation. Étendu avec plusieurs volets majeurs, **tous complets et déployés en production** :
- **Module Incident ✅** : 15 types d'incident, déclenchement avec tâches par rôle, SMS Brevo, accusés de réception, mode exercice, incidents multiples simultanés.
- **Bouton panique ✅** : déclenchement menace active en 1 geste (`POST /client-portal/buildings/:buildingId/panic`), message bilingue FR/EN + script d'appel 911 intégré, notifie 3 niveaux de contacts (responsable bâtiment → contact corpo de la fiche client → membres d'urgence présents).
- **Boucle REX ✅** : formulaire post-incident (ISO 22301), rapport PDF 7 sections conforme CNPI/CNESST.
- **Résilience opérationnelle / indice CORO ✅** : score pondéré 4 composantes, snapshot quotidien, tendance 90 jours.
- **Intelligence organisationnelle ✅** : page `/intelligence` portail client, recommandations CRITIQUE/ATTENTION/INFO, vue multi-bâtiments, graphique tendance 90j, actions correctives intégrées.
- **Import employés multi-source ✅** : CSV avec mapping étendu Azure AD / Google Workspace / ADP / BambooHR (fallback displayName), déduplication, PINs auto, envoi en lot.
- **Consentement SMS LPCAP ✅** : SMS filtré si pas de consentement (`smsConsent`), envoi via Brevo.
- **CRON fermeture check-ins oubliés ✅** : job horaire, ferme après 16h les check-ins restés ouverts.
- Plus : substitution automatique des rôles, carte interactive bâtiments.

**Backend actif** (`app.module.ts`) : ~35 modules NestJS. Point d'entrée central du portail client = `client-portal.controller.ts` (~39 endpoints, y compris Sentinelle/Résilience/Intelligence/Actions correctives).

**⚠️ Piège connu** : les dossiers `pca-export/`, `pca-generator/`, `pca-procedures/` sous `src/pca/` sont **vides** (jamais peuplés) — seul `pca-configurator` est actif. L'export/génération PCA passe en réalité par `generator/pca.templates.ts` + `export/builders/pca.builder.ts`. Ne pas chercher de logique dans ces dossiers vides.

**Modèles Prisma** : 58 modèles (`coro-backend/prisma/schema.prisma`, ~1320 lignes). Toujours relire le schéma avant toute migration.

## 4. Règles de travail permanentes

1. **Avant toute modification** : lire le fichier concerné, valider que le problème existe encore et que la correction n'est pas déjà en place. Ne jamais modifier un fichier sans l'avoir lu en premier.
2. **Après toute modification** : `npx tsc --noEmit` dans le bon sous-dossier avant de commit.
3. Git workflow : code → `tsc --noEmit` → `git add -A` (racine) → `git commit` → `git push` → attendre GitHub Actions → SSH si besoin.
4. Commits à des checkpoints logiques, pas après chaque fichier.
5. Ne jamais confirmer un statut ("c'est fait", "ça marche") sans l'avoir vérifié dans le code — Mathieu ne peut pas valider techniquement.
6. En cas de doute sur l'état réel d'un module (ex. PGC/PRA/PUE, sous-dossiers PCA vides), le dire explicitement plutôt que de supposer d'après un ancien contexte.

## 5. Bugs résolus à NE JAMAIS refaire

- **Puppeteer EBUSY/TargetCloseError** : photos non compressées → max 1000px / 80% JPEG.
- **Collision classes CSS** dans les templates PDF : toujours des noms distincts.
- **`@page { margin }`** en conflit avec Puppeteer : utiliser les options de `page.pdf()`, pas le CSS.
- **Sommaire PDF** : dépendance circulaire → génération en 2 passes obligatoire.
- **Refactor export PDF** : vérifier qu'il ne reste pas d'ancien `else if (moduleNum === X)` orphelin.
- **PostgreSQL arrêté après reboot Windows** : vérifier `Get-Service -Name "*postgresql*"`.
- **403 déverrouillage VALIDATED** : `requestRevision` doit accepter les statuts VALIDATED et REVIEW.
- **404 toggle procédure IA** : route correcte = `/custom-procedures/${id}`, pas `/procedures/${id}/toggle`.
- **Body parser NestJS** : limite 25MB à configurer manuellement (uploads base64).
- **CORS prod** : `main.ts` a le localhost en dur — toujours ajouter le domaine prod dans `enableCors()`.
- **URL API frontend** : `lib/api.ts` → `process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002/api'`.
- **Prisma prod** : toujours épingler `prisma@6.19.3` dans les Dockerfiles (v7 casse le schema).
- **Build NestJS** : le point d'entrée compilé est `dist/src/main.js`, pas `dist/main.js`.
- **Sentinelle localStorage cross-device** : borne et téléphone ne partagent pas le localStorage → le QR de la borne encode le `kioskToken` dans l'URL.
- **Routes NestJS Sentinelle** : déclarer les routes spécifiques (`/history`) avant les routes génériques (`:id`) dans le contrôleur.
- **Migration Prisma en CI/CD** : forcer `prisma@6.19.3` et exécuter via `node` dans le container, pas `npx` côté hôte.
- **JwtModule manquant** : tout module utilisant `ClientJwtGuard` doit importer explicitement `JwtModule`.
- **PowerShell + crochets** : `-LiteralPath` obligatoire pour les dossiers `[id]`, `[projectId]`.

## 6. Prochaines priorités

1. **Application mobile native** — consultation terrain.
2. **Intégration systèmes d'alarme physiques** — déclenchement d'incident depuis un système d'alarme tiers.
3. **Carte GIS pendant incident** — visualisation géographique temps réel de l'événement.
4. **Plan particulier OPI (ROPI)** — deadline municipale mars 2027, aucune trace au code encore.
5. **Versioning documentaire** — duplication de projet pour l'année suivante (pas encore fait, seul le versioning de signature existe).
6. **CRUD bibliothèque complet** — actuellement partiel (procédures GET/POST/PUT seulement, rien pour rôles/codes incident, pas de DELETE).
7. **Traduction automatique FR/EN** (API DeepL).
8. **Haute disponibilité** — Read Replica DigitalOcean.

> Rappel technique toujours valide (non prioritaire) : PGC/PRA/PUE restent en pages marketing "Phase 2" sans configurateur applicatif ; dossiers `pca-export/`, `pca-generator/`, `pca-procedures/` toujours vides.
