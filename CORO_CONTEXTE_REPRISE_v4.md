# CORO — Contexte de reprise v4 (septembre 2026)

## Qui je suis et comment travailler avec moi

Je suis Mathieu, fondateur et product owner de CORO. Je ne connais pas le développement — tu (Claude) fais tout le travail technique. Je copie-colle le code, exécute les commandes terminal, utilise VS Code et GitHub. Travaille toujours en français, une étape à la fois, en expliquant brièvement chaque modification. Préfère les fichiers complets aux diffs partiels quand la modification est complexe — on a eu plusieurs bugs causés par des remplacements partiels mal alignés.

**Règle permanente :** avant toute modification, lire le fichier concerné pour valider que le problème existe encore et que la correction n'est pas déjà en place. Ne jamais modifier un fichier sans l'avoir lu en premier.

---

## Stack et environnement LOCAL (développement)

- **Frontend app** : Next.js 15 + React + TypeScript + Tailwind CSS + Zustand — `F:\coro-platform\coro-frontend`, port 3000
- **Backend** : NestJS + TypeScript + Prisma ORM 6.19.3 — `F:\coro-platform\coro-backend`, port 3002
- **Portail client** : Next.js 15 (PWA) — `F:\coro-platform\coro-client-portal`, port 3001 (dev) / 3003 (docker-compose)
- **Site vitrine** : Next.js 15 — `F:\coro-platform\coro-website`, port 3003 (dev) / 3001 (docker-compose)
- **DB** : PostgreSQL (`coro_db`) — doit tourner comme service Windows (`Get-Service -Name "*postgresql*"`, `Start-Service postgresql-x64-18` si arrêté)
- **Correcteur orthographique** : LanguageTool 6.6 auto-hébergé, port 8081, nécessite Java 17 (`C:\Program Files\Java\jdk-17\bin\java.exe`), à lancer manuellement chaque session :
  ```
  cd F:\LanguageTool-6.6
  & "C:\Program Files\Java\jdk-17\bin\java.exe" -cp languagetool-server.jar org.languagetool.server.HTTPServer --port 8081 --allow-origin "*"
  ```
- **4 projets dans le monorepo** — commits depuis la racine `F:\coro-platform` avec `git add -A`
- **Admin local** : `admin@coro.app` / `Admin2026!`
- **Vérification compilation** : `npx tsc --noEmit` (à lancer dans le bon sous-dossier après toute modification)
- **Design system** : Background `#F8F9FA`, cards `#FFFFFF`, primary red `#C0392B`/hover `#A93226`, text `#2C3E50`/`#6C757D`/`#ADB5BD` ; inline CSS préféré au Tailwind pour précision des couleurs ; `rounded-md` (6px) pour cards/modals, `rounded` (4px) pour boutons/inputs
- **PowerShell + crochets** : utiliser `-LiteralPath` pour les dossiers `[id]`, `[projectId]`, etc.
- **Rate limiting** : `@nestjs/throttler` actif globalement (`APP_GUARD`) — 120 req/min et 2000 req/h par IP (voir `app.module.ts`)

⚠️ Note technique : `coro-frontend/AGENTS.md` avertit que la version de Next.js utilisée diffère des conventions habituelles d'entraînement — vérifier `node_modules/next/dist/docs/` avant du code Next.js non trivial.

---

## Infrastructure PRODUCTION

- **App plateforme** : https://app.getcoro.io
- **API** : https://api.getcoro.io
- **Portail client** : https://client.getcoro.io
- **Site vitrine** : https://getcoro.io
- **Serveur** : DigitalOcean VPS Ubuntu 24.04 — IP `146.190.254.241` — Toronto
- **Connexion SSH** : `ssh root@146.190.254.241`
- **Code sur serveur** : `/opt/coro-platform`
- **Containers** : `docker compose ps` — containers (coro_frontend, coro_backend, coro_postgres, coro_client_portal, coro_website)
- **Logs** : `docker compose logs backend --tail=50`
- **Déploiement** : CI/CD GitHub Actions automatique sur push `main`
- **Repo GitHub** : https://github.com/nextsolution-crypto/coro-platform
- **Domaine** : `getcoro.io` acheté sur Namecheap (compte `coro_ad`)
- **SSL** : Let's Encrypt via Certbot — renouvellement automatique
- **Sauvegardes** : cron toutes les 6h → `/opt/backups/postgresql/` — 30 derniers backups conservés
- **Monitoring** : UptimeRobot sur app.getcoro.io + api.getcoro.io
- **Admin production** : `admin@coro.app` / `Admin2026!`
- **Compte démo** : `admin@demo.getcoro.io` / `Demo2026!`
- **Prisma en prod** : toujours utiliser `npx prisma@6.19.3` (pas la dernière version — la v7 a cassé le schema)

### Commandes serveur utiles

```bash
cd /opt/coro-platform
git pull && docker compose up -d --build          # Déploiement manuel
docker compose exec backend npx prisma@6.19.3 migrate deploy --schema=/app/prisma/schema.prisma
docker compose exec backend node dist/src/seed-demo.js
docker compose exec backend node dist/src/seed-dangerous-substances.js
docker compose exec backend node dist/src/seed-task-lists.js
/opt/backups/backup-db.sh                         # Backup manuel
```

---

## État d'avancement global — MVP COMPLET ✅ (+ Sentinelle avancé)

### Modules documentaires (tous 100% complets)

| Module | Statut | Notes |
|--------|--------|-------|
| PMU (Plan de mesures d'urgence) | ✅ 100% | Configurateur, 43 procédures, export PDF bilingue |
| PSI (Plan de sécurité incendie) | ✅ 100% | Partagé avec PMU, Guide du locataire bilingue |
| PCA (Plan de continuité des activités) | ✅ 100% | Configurateur 8 sections, BIA, stratégies, export PDF |
| PGC (Plan de gestion de crise) | 🟡 Phase 2 | Page site vitrine avec bandeau "Phase 2" |
| PRA (Plan de reprise des activités) | 🟡 Phase 2 | Page site vitrine avec bandeau "Phase 2" |
| PUE (Plan d'urgence environnementale) | 🟡 Phase 2 | Page site vitrine avec bandeau "Phase 2" |

> Correction v4 : v3 indiquait PGC/PRA/PUE à 100% — le code montre en réalité des pages marketing "Phase 2" (`site vitrine : bandeau Phase 2 sur pages PGC, PRA, PUE`), sans configurateur/génération applicative dédiée comme PMU/PSI/PCA. À valider avec Mathieu si ces 3 documents ont un configurateur caché ailleurs ou si c'est bien roadmap.

### Structure documentaire PMU/PSI (pour référence)

1. Introduction (1.1–1.6)
2. Liste téléphonique (2.1–2.5, incluant section 2.5 Ressources corporatives optionnelle)
3. Rôles et responsabilités (3.1 Organigramme + 3.2 Liste des membres, visible seulement si bâtiment industriel)
4. Procédures (43 procédures : P001–P028 standard, P101–P108 équipe industrielle, P111–P122 occupants industriels)
5. *(pas de module 5 dans la nomenclature)*
6. Plans techniques du bâtiment (upload PDF par section : Implantation/Coupe/Opération/Secteurs/Divers)
7. Description du site et équipements de sécurité (7.1–7.9, incluant section 7.9 industriel)
8. Registres et annexes (8.1–8.10, incluant annexe 8.10 Incendie batteries lithium-ion)

### Structure documentaire PCA (pour référence)

1. Introduction et politique de continuité
2. Contexte organisationnel et gouvernance
3. Appréciation du risque (ARA) — scénarios avec probabilité × impact
4. Bilan d'impact sur les activités (BIA) — RTO/RPO/MAD, mode dégradé, ressources minimales
5. Stratégies de continuité — télétravail, sites alternatifs, TI, fournisseurs, assurances
6. Communication de crise — canaux, contacts, autorités
7. Activation et procédures de reprise — critères, séquence, lien PMU/PSI
8. Exercices, registres et maintien du plan

---

## Modules applicatifs complets (fonctionnalités plateforme)

### M1 — Configurateur PMU/PSI
- Sections regroupées : Général, Sécurité incendie, Équipements, Risques, Industriel
- Pré-remplit automatiquement depuis la fiche bâtiment
- Matières dangereuses REPTOX intégrées (88 substances, placards TMD losange coloré)

### M2 — Configurateur PCA
- 8 sections : Informations générales, Gouvernance, Risques, BIA, Stratégies, Communication, Activation, Exercices
- Systèmes TI critiques (RTO/RPO/mode dégradé/solution relève)
- Fournisseurs critiques (tolérance/mesures préventives/relève/statut PRÊT|PARTIEL|À CONFIRMER)
- Mode dégradé par service critique + durée soutenable + ressources minimales (personnel, TI, équipements, fournisseurs, site, énergie)
- Seuil d'absentéisme configurable
- Calcul automatique niveau de risque (probabilité × impact)
- Lien vers PMU/PSI existant du même bâtiment
- Backend : `pca-configurator` module (seul sous-module `pca/` réellement actif, voir correction plus bas)

### M3 — Profil organisation
- Champs company (nom, téléphone, courriel, adresse, site web, slogan, logo complet base64) sur modèle `User`
- Persisté via localStorage + `initAuth()`
- `refreshUser()` appelé au chargement du dashboard

### M4 — Système d'approbation documentaire
- Soumission → statut REVIEW + notifications in-app à toute l'org
- Panneau d'observations (OUVERTE/TRAITÉE) avec sélection de module
- Prévisualisation PDF avec filigrane APERÇU pour le réviseur
- Approbation → statut VALIDATED + sauvegarde `approvedById` + `approvedAt`
- Retour en révision → statut IN_PROGRESS (autorisé même si VALIDATED)
- Export PDF bloqué pendant statut REVIEW
- Bannière VALIDATED affiche nom approbateur + date

### M5 — Notifications in-app
- Badge rafraîchi toutes les 30 secondes via `/notifications/unread-count`
- Page `/notifications` — liste chronologique, marquer lu, supprimer
- Types : APPROBATION_REQUISE, APPROUVE, RETOUR_REVISION, DELAI_URGENT, DELAI_DEPASSE
- Filtrage par rôle : OPERATOR voit ses mandats, ADMIN voit toute l'org

### M6 — Délais de livraison mandats
- Plan évacuation mural → 15 jours
- PMU/PSI/PCA/etc. ≤ 30h budgétées → 21 jours
- PMU/PSI/PCA/etc. > 30h budgétées → 90 jours
- Mandat ANNUEL → pas de délai
- Alertes progressives : ATTENTION (≤14j) / URGENT (≤7j) / CRITIQUE (≤3j) / DÉPASSÉ
- CRON quotidien 9h (`reminders.service.ts`) pour les alertes de délai

### M7 — Générateur procédures IA
- Texte libre → Claude API → JSON structuré (FR/EN, rôles, actions, boîtes IMPORTANT/NOTE)
- Codes auto CP001, CP002…
- Statuts : DRAFT / ACTIVE / ARCHIVED + `isPublished`
- Toggle actif/inactif géré séparément des procédures standard
- Import direct PDF/Word en plus du texte libre (`sourceType` : MANUAL | AI_TEXT | AI_IMPORT)

### M8 — Matières dangereuses REPTOX
- 88 substances seedées (numéro ONU, nom FR/EN, classe TMD, groupe emballage, SIMDUT)
- Recherche autocomplete avec placard TMD losange coloré

### M9 — Portefeuille mandats admin
- Tableau tous mandats actifs de l'org avec filtres (conseiller, statut, type, délai)
- KPIs : mandats actifs, délais dépassés, alertes critiques, % heures utilisées

### M10 — Capacity Planning
- Taux d'occupation par conseiller sur horizon 12 semaines
- Niveaux : DISPONIBLE / NORMAL / CHARGÉ / SURCHARGÉ

### M11 — Système de toasts global
- `coro-frontend/lib/toast.ts` — dispatcher via CustomEvent
- `coro-frontend/hooks/useToast.ts` — hook avec auto-dismiss 4s
- `coro-frontend/components/ui/ToastContainer.tsx` — rendu visuel
- Intégré dans `AppLayout.tsx` — disponible sur toutes les pages
- Usage : `import { toast } from '@/lib/toast'; toast('Message', 'success'|'error'|'info');`

### M12 — Health score portefeuille (nouveau, backend `admin/health`)
- Page `admin/health` — vue Super Admin sur la santé globale du portefeuille organisations

### M13 — Réservations / Bookings (nouveau)
- Backend `bookings` module : demande de réservation client (exercice, formation, visite, révision) → confirmer/reporter/refuser/réassigner côté conseiller
- Statuts : DEMANDEE, CONFIRMEE, REPORTEE, REASSIGNEE, REFUSEE, COMPLETEE, ANNULEE
- Notifications par type (confirmation, rappel, annulation, réassignation) + fichier `.ics` joint aux courriels
- Frontend conseiller : `app/bookings/page.tsx` ; portail client : `app/bookings/page.tsx`

### M14 — Espace de fichiers projet (nouveau)
- Backend `project-files` module (+ `project-files-client` pour le portail) — upload conseiller ET client, versionnement (`parentId`/`versions`), visibilité shared/internal, statut en_revision/valide
- Frontend : `components/ProjectFiles.tsx` (conseiller), `app/files/[id]` (portail client)

### M15 — Chat IA "Sophie" (nouveau, site vitrine)
- Backend `chat` module — widget IA custom (remplace Crisp), questions suggérées, handoff automatique vers agent humain
- Frontend site vitrine : `app/components/ChatWidget.tsx`

### M16 — Engagement documentaire client (nouveau)
- Modèle `DocumentEngagement` (opened/viewed/downloaded, device, durée) — tracking d'ouverture des documents par le client
- Tableau de bord conseiller montrant l'engagement + `EngagementPanel.tsx`

### M17 — MFA & sécurité renforcée (nouveau, complète l'ancien roadmap)
- MFA par courriel (OTP 6 chiffres, 10 min) pour les conseillers ET pour le portail client
- Refresh tokens JWT avec rotation (`RefreshToken`)
- Appareils de confiance 90 jours : `TrustedDevice` (conseiller) et `ClientTrustedDevice` (client) pour sauter le MFA
- Magic links (connexion sans mot de passe) pour le portail client (`MagicLink`)

---

## CORO Sentinelle — Registre d'occupation, Résilience & Intelligence organisationnelle

### Vue d'ensemble
Registre d'occupation intelligent pour les bâtiments, lié au portail client. Conçu pour la conformité en cas d'évacuation (CNPI, ISO 22301, Loi 25) — pas un système de pointage RH. Depuis v3, Sentinelle s'est étendu avec 4 nouveaux volets majeurs : **Module Incident**, **Résilience opérationnelle (indice CORO)**, **Intelligence organisationnelle** et **Actions correctives**.

### Architecture de base (inchangée depuis v3)
- **Borne kiosque** : tablette/ordinateur fixe à l'entrée, QR code dynamique régénéré toutes les 60s
- **Pointage employé** : scan QR borne → téléphone → PIN 4 chiffres → IN/OUT auto-détecté
- **Entrée manuelle** : via la borne pour visiteurs/contracteurs sans téléphone
- **Mode évacuation** : snapshot figé des occupants au déclenchement → warden coche les présences

### Modèles DB Prisma (registre de base)
- `OccupancyRecord`, `EvacuationEvent`, `EvacuationCheckIn`, `BuildingKioskToken`, `BuildingEmployee`, `VisitorInvitation`

### 🆕 Module Incident (déclenchement d'urgence complet)
- Déclenchement d'un incident réel (15 types mappés : alarme incendie, fuite de gaz, menace active, urgence médicale, matières dangereuses, batterie lithium, inondation, etc.)
- Import direct de la procédure CORO liée (`procedureCode`, `procedureSnapshot` — étapes ROLE-CU figées au déclenchement)
- Checklist coordonnateur cochable, incidents multiples simultanés, point de rassemblement récupéré du configData PMU
- Tâches assignées par rôle d'urgence avec accusé de réception (`ackToken`, notifiée/acquittée/complétée)
- Courriels équipe + occupants automatiques (Brevo)
- Mode exercice (`isExercise`) distinct des incidents réels
- Journal temps réel (`IncidentLog`) — actions automatiques et manuelles horodatées
- REX (retour d'expérience) ISO 22301 : ce qui a bien fonctionné / points à améliorer / recommandations / actions correctives
- Export rapport PDF conforme CNPI/CNESST
- Modèles : `IncidentEvent`, `IncidentTask`, `IncidentLog` (enums `IncidentType`, `IncidentStatus`, `IncidentTaskStatus`)
- Backend : `occupancy/incident.controller.ts` + `incident.service.ts` (13 endpoints), exposé aussi côté portail client via `client-portal.controller.ts`
- Frontend portail client : `sentinelle/[buildingId]/incident/page.tsx` (déclenchement), `incidents/page.tsx` (historique), `incidents/[incidentId]/page.tsx` (détail + REX)

### 🆕 Résilience opérationnelle — Indice CORO
- Indice composite pondéré sur 4 composantes : rôles d'urgence pourvus, qualifications à jour, plans/procédures à jour, exercices réalisés
- Statuts : READY / REDUCED / CRITICAL
- `ResilienceSnapshot` — photo quotidienne (score global + 4 sous-scores + membres présents/total), CRON quotidien à 23h50
- Endpoint historique 90 jours + graphique de tendance + tableau historique des composantes + snapshot forcé manuel
- Backend : endpoints `resilience-history`, `readiness`, `readiness-enriched` dans `occupancy.controller.ts`, plus `resilience-history`/`resilience-snapshot` côté `client-portal.controller.ts`
- Frontend portail client : `sentinelle/[buildingId]/resilience/page.tsx` (onglet Tendance inclus), + widget dashboard

### 🆕 Intelligence organisationnelle
- Vue agrégée multi-bâtiments (au-delà du bâtiment unique) pour les organisations avec plusieurs sites
- Recommandations proactives basées sur les lacunes détectées (CNPI, ISO 22301, CNESST)
- Filtres criticité/bâtiment
- Backend : `GET /client-portal/intelligence/overview`
- Frontend portail client : `app/intelligence/page.tsx` + lien navigation

### 🆕 Actions correctives
- CRUD complet, statuts Planifiée / En cours / Complétée / Annulée, priorité CRITICAL/WARNING/INFO
- Catégories : ROLES, QUALIFICATIONS, PLANS, EXERCISES, INCIDENTS, GENERAL
- Onglet dédié, filtres priorité/bâtiment
- Modèle `CorrectiveAction` ; service `occupancy/corrective-actions.service.ts` ; endpoints exposés via `client-portal.controller.ts` (`/client-portal/corrective-actions`)

### Alertes lacunes (CRON 15 min)
- Détection des rôles critiques sans membre présent, notification in-app + courriel, anti-spam 1h

### Substitution automatique des rôles
- Titulaire absent → substitut actif affiché en temps réel

### Import CSV employés
- Mapping flexible des colonnes, déduplication, PINs auto, envoi email en lot, modal de prévisualisation

### Consentement SMS (LPCAP)
- `smsConsent` sur `BuildingEmployee`, case à cocher formulaire, SMS filtré si pas de consentement, SMS via Brevo, accusés de réception

### Conservation des données (conforme réglementation)
- `OccupancyRecord` / `VisitorInvitation` : purge automatique après **12 mois** (CNPI + Loi 25)
- `EvacuationEvent` : conservé **36 mois** (ISO 22301 — preuves d'exercice)
- Job CRON nuit à 2h00 dans `reminders.service.ts`

### Portail client — Pages Sentinelle (`client.getcoro.io`)
```
sentinelle/
├── [buildingId]/
│   ├── page.tsx              ← Dashboard registre temps réel
│   ├── employes/page.tsx     ← Gestion employés + import CSV + envoi PIN par courriel
│   ├── invitations/page.tsx  ← Invitations visiteurs
│   ├── historique/page.tsx   ← Historique filtrable + export CSV
│   ├── rapports/page.tsx     ← Rapports évacuation + export PDF
│   ├── evacuation/page.tsx   ← 🆕 Suivi mode évacuation
│   ├── incident/page.tsx     ← 🆕 Déclenchement incident
│   ├── incidents/page.tsx    ← 🆕 Historique incidents
│   ├── incidents/[incidentId]/page.tsx ← 🆕 Détail incident + REX
│   └── resilience/page.tsx   ← 🆕 Indice CORO + tendance 90 jours
kiosk/[token]/page.tsx         ← Borne kiosque
kiosk/qr/[token]/page.tsx      ← 🆕 QR dédié borne
presence/[kioskToken]/page.tsx ← Page téléphone employé
intelligence/page.tsx          ← 🆕 Intelligence organisationnelle multi-bâtiments
```

### Site vitrine
- Section "CORO Sentinelle" + 5e pilier "Résilience & Intervention" ajoutés dans `HomePageClient.tsx`
- Page dédiée `app/sentinelle/page.tsx` et `app/resilience-operationnelle/page.tsx`
- Visuels Résilience, indice CORO, Intelligence organisationnelle, rapports d'incident

### Bugs résolus Sentinelle (historique, toujours valides)
- **localStorage cross-domain** : QR borne encode le `kioskToken` dans l'URL → `/presence/[kioskToken]` sans dépendance au localStorage partagé
- **Conflit routes NestJS** : routes spécifiques (`/history`) avant routes génériques (`:id`) dans le contrôleur

---

## Architecture backend — Modules NestJS actifs (validé dans `app.module.ts`)

```
src/
├── approval/            ← Approbation documentaire
├── audit/                ← Journal d'audit
├── auth/                 ← JWT + MFA (code 6 chiffres par courriel via Brevo) + refresh tokens + trusted devices
├── blog/                 ← Blog (éditeur SEO, planification, anti-datation)
├── bookings/             ← 🆕 Réservations activités (exercice/formation/visite/révision)
├── buildings/            ← Gestion bâtiments (+ carte interactive, geocoding)
├── building-plans/       ← Plans techniques bâtiment (upload PDF)
├── changelog/            ← Changelog plateforme
├── chat/                 ← 🆕 Widget IA "Sophie" (site vitrine)
├── client-portal/        ← Auth + API portail client (client-auth, client-jwt.guard, email.service, ~39 endpoints incl. Sentinelle/Résilience/Intelligence/Actions correctives)
├── clients/               ← Gestion clients
├── configurator/          ← Configurateur bâtiment (PMU/PSI)
├── custom-procedures/     ← Générateur procédures IA
├── dangerous-substances/  ← REPTOX matières dangereuses
├── export/                ← Moteur export PDF (Puppeteer + pdf-lib)
│   ├── builders/
│   │   ├── pca.builder.ts     ← Builder PDF PCA
│   │   └── base.builder.ts
│   └── templates/
│       ├── modules/    ← Un fichier par module documentaire
│       ├── separator.template.ts
│       └── toc.template.ts
├── feedback/              ← Feedback utilisateurs
├── generator/              ← Générateur de documents
│   └── procedures/          ← 43 procédures PMU/PSI + sous-dossier `pca/` (procédures PC001-PC023+)
├── guide/                  ← Guide du locataire bilingue
├── language-check/         ← Proxy LanguageTool
├── library/                ← Bibliothèque procédures/rôles/codes incident (CRUD partiel : GET + POST/PUT procédures)
├── mandate/                ← Mandats + capacity + portfolio + rendement
├── module2/ … module8/     ← Sections documentaires PMU/PSI (contenu, rôles, plans, registres)
├── notifications/          ← Notifications in-app
├── occupancy/              ← CORO Sentinelle : registre présences + employés + 🆕 Module Incident + 🆕 Résilience + 🆕 Actions correctives (service)
├── organizations/          ← Gestion organisations + licences + template Module 1 personnalisé
├── pca/
│   └── pca-configurator/    ← ⚠️ SEUL sous-module PCA actif (voir correction ci-dessous)
├── prisma/                  ← PrismaService
├── project-files/           ← 🆕 Espace de fichiers projet (upload conseiller + client, versions)
├── projects/                 ← Projets
├── reminders/                ← Jobs CRON (purge Sentinelle 2h, alertes délais 9h, snapshot résilience 23h50, alertes lacunes 15min)
├── storage/                  ← Stockage DigitalOcean Spaces
├── task-lists/ / task-templates/ ← Listes de tâches
├── timelog/                  ← Timelog général
├── users/                    ← Gestion utilisateurs
└── versions/                  ← Historique versions projet
```

### ⚠️ Correction importante vs v3 — sous-modules PCA
v3 indiquait 4 sous-modules actifs sous `pca/` : `pca-configurator`, `pca-export`, `pca-generator`, `pca-procedures`. **Scan réel du code : seul `pca-configurator` contient du code** (`.controller.ts`, `.module.ts`, `.service.ts`, importé dans `app.module.ts`). Les dossiers `pca-export/`, `pca-generator/`, `pca-procedures/` existent mais sont **vides** (créés le 23 août, jamais peuplés). L'export et la génération de contenu PCA passent en réalité par l'ancien pipeline générique : `generator/pca.templates.ts`, `generator/procedures/pca/*`, et `export/builders/pca.builder.ts`. À clarifier avec Mathieu si ces 3 dossiers vides doivent être supprimés ou si un refactor était prévu et abandonné.

---

## Architecture frontend — Pages et composants clés

### `coro-frontend` (app conseiller — app.getcoro.io)
```
app/
├── dashboard/page.tsx              ← Dashboard + checklist onboarding + KPIs
├── clients/
│   ├── page.tsx                    ← Liste clients
│   └── [id]/page.tsx, [id]/portfolio/page.tsx  ← 🆕 Portfolio client
├── buildings/
│   ├── page.tsx / [id]/page.tsx
│   ├── compliance/page.tsx
│   └── map/page.tsx                ← 🆕 Carte interactive bâtiments
├── projects/
│   ├── page.tsx / [id]/page.tsx    ← Fiche projet (approbation, observations, prévisualisation)
│   ├── [id]/mandate/page.tsx       ← Fiche mandat + délais livraison
│   ├── [id]/procedures/page.tsx    ← Générateur procédures IA
│   └── [id]/activities/page.tsx    ← 🆕 Activités projet
├── configurator/
│   ├── [projectId]/page.tsx        ← Configurateur PMU/PSI
│   └── pca/[projectId]/page.tsx    ← Configurateur PCA 8 sections
├── editor/[projectId]/
│   ├── page.tsx
│   └── procedures/[procedureId]/page.tsx  ← 🆕 Édition procédure dédiée
├── bookings/page.tsx                ← 🆕 Réservations activités
├── blog/ (page.tsx, new/, [id]/edit/)  ← 🆕 Éditeur blog SEO complet
├── profile/page.tsx + profile/rendement/page.tsx
├── settings/ (page.tsx, organization/, profile/, users/, task-templates/, timelog-categories/, module1-template/, feedback/)
├── notifications/page.tsx
├── timelog/page.tsx
└── admin/
    ├── mandates/page.tsx / capacity/page.tsx
    ├── health/page.tsx              ← 🆕 Health score portefeuille
    ├── map/page.tsx / organizations/page.tsx / projects/page.tsx
    ├── changelog/page.tsx / feedback/page.tsx
    ├── task-templates/page.tsx
    └── procedures/ (page.tsx, [id]/page.tsx, custom/page.tsx)  ← 🆕 Admin procédures IA

components/
├── layout/AppLayout.tsx (toasts intégrés) + AuthProvider.tsx
├── ui/ (DragDropUpload, ToastContainer, Typography)
├── editor/ (Module2…Module8 Section/Table/Card, VersionHistory, SpellCheckedTextarea)
├── configurator/DangerousSubstanceSearch.tsx
├── EngagementPanel.tsx     ← 🆕 Tracking engagement client
├── ExportModal.tsx
├── MapPicker.tsx           ← 🆕
└── ProjectFiles.tsx        ← 🆕 Espace fichiers projet

lib/ (api.ts, formatPhone.ts, module2.roles.ts, toast.ts, utils.ts)
hooks/useToast.ts
stores/auth.store.ts
```

### `coro-client-portal` (portail client — client.getcoro.io, PWA)
Voir la section CORO Sentinelle ci-dessus pour le détail des routes `sentinelle/*`, `intelligence/`, `kiosk/*`, `presence/*`. Autres routes : `dashboard/`, `buildings/`, `documents/` (+ `[id]`), `files/[id]`, `activities/`, `bookings/`, `map/`, `notifications/`, `profile/`, `login/`, `magic/` (connexion sans mot de passe), `offline/` (PWA), `manifest.ts`, `ServiceWorkerRegister.tsx`.

### `coro-website` (site vitrine — getcoro.io)
`page.tsx` (accueil, 5 piliers + 🆕 pilier Résilience & Intervention), `about/`, `blog/` (+ `[slug]`), `documents/plan-{continuite-activites-pca, gestion-crise-pgc, mesures-urgence-pmu, reprise-activites-pra, securite-incendie-psi, urgence-environnementale-pue}/`, `gestion-de-projets/`, `gestion-documentaire/`, `performance-objectifs/`, `portail-client/`, `resilience-operationnelle/` 🆕, `sentinelle/` 🆕, `security/`, `privacy/`, `terms/`, `sitemap.ts`, `robots.ts`, composants `ChatWidget.tsx` 🆕, `CookieBanner.tsx`, `Footer.tsx`, `ScrollToTop.tsx`, `DemoForm.tsx`, `HomePageClient.tsx`.

---

## Moteur export PDF — Architecture

`coro-backend/src/export/export.service.ts` — toujours demander le fichier complet avant modification.

**Pipeline PMU/PSI :**
1. Puppeteer partagé (un seul navigateur)
2. Chaque sous-section = segment HTML séparé avec `subsectionId`
3. Séparateurs de modules (page rouge dégradée)
4. Sommaire en 2 passes (résout dépendance circulaire)
5. Fusion PDF via pdf-lib
6. `drawPageNumbers` — numérotation continue post-fusion
7. `drawWatermarks` — logos CORO + client, opacité 35%
8. `drawProcedureColorBars` — bande 10px colorée procédures
9. `drawPreviewWatermark` — APERÇU diagonal 45°
10. Module 6 : insertion directe PDF via pdf-lib

**Pipeline PCA :** `pca.builder.ts` — 8 modules, procédures PC*, contacts opérationnels, blocs @@ALERT_WARNING/SUCCESS/INFO.

**🆕 Pipeline rapports Incident/Sentinelle :** export rapport PDF conforme CNPI/CNESST (module Incident), export rapport évacuation PDF (Sentinelle), export historique CSV.

**🆕 Signatures et certification :** signatures versionnées liées à `ProjectVersion` (`DocumentSignature.projectVersionId`), certification PDF officiel (`officialPdfFr`/`officialPdfEn` distincts de `exportedPdfFr`/`exportedPdfEn`).

---

## Gestion des rôles et permissions

| Rôle | Accès |
|------|-------|
| SUPER_ADMIN | Tout voir — toutes les orgs |
| ADMIN | Tout voir dans son organisation |
| OPERATOR | Ses projets + projets qu'il a modifiés |

Portail client : `CLIENT_MANAGER` / `CLIENT_CORPORATE` (`ClientUserRole`), accès scopé par `buildingIds[]`.

---

## Modèles DB Prisma — état réel (58 modèles au 13 septembre 2026)

**Cœur plateforme :** Organization, User, Client, Building, Project, RevisionHistory, Document, IncidentCode, Role, Procedure, LibrarySection, BuildingPlan, Module7Data, ChangelogEntry, ProcedureDefault, ProcedureOverride, Feedback, ProjectVersion, ProjectTemplate, AuditLog, ProjectActivity, RefreshToken, TrustedDevice

**Tâches / mandats / temps :** TaskList, TaskTemplate, ProjectTaskList, ProjectTask, ProjectTaskAssignee, TaskTimeEntry, ProjectMandate, ProjectComment, TimelogEntry, TimelogCategory

**Sécurité incendie / matières dangereuses :** DangerousSubstance, CustomProcedure

**Approbation / notifications :** ReviewObservation, Notification

**Portail client :** ClientUser, ClientTrustedDevice, DocumentSignature, MagicLink, DocumentEngagement

**Contenu :** BlogPost

**PCA :** PcaConfig

**Organisation :** OrganizationModule1Template

**Réservations / fichiers :** Booking, BookingNotification, ProjectFile

**🆕 CORO Sentinelle — registre :** OccupancyRecord, EvacuationEvent, EvacuationCheckIn, BuildingKioskToken, BuildingEmployee, EmployeeEmergencyRole, EmployeeQualification, VisitorInvitation

**🆕 CORO Sentinelle — Module Incident :** IncidentEvent, IncidentTask, IncidentLog

**🆕 CORO Sentinelle — Résilience & Intelligence :** ResilienceSnapshot, CorrectiveAction

**Migrations récentes (depuis v3, non exhaustif — voir `prisma/migrations/`) :**
- `20260909214606` — add_building_coordinates
- `20260910002436` / `20260910003049` — TrustedDevice / ClientTrustedDevice
- `20260910003641` — MFA champs ClientUser
- `20260911140755` — EmployeeEmergencyRole + EmployeeQualification
- `20260911192015` / `20260911202704` / `20260911223206` — Module Incident (création, extension, champs REX)
- `20260911233727` — mode exercice + ackToken
- `20260912003619` — smsConsent employé
- `20260912214307` — ResilienceSnapshot
- `20260912222255` — fix champs PcaConfig
- `20260912224709` — CorrectiveAction

---

## Ce qui reste à faire (roadmap priorisée — mise à jour v4)

1. **Plan particulier OPI** (ROPI — deadline municipale mars 2027) — toujours en attente, aucune trace dans le code au 13/09/2026
2. **Versioning documentaire** — duplication projet pour année suivante — toujours à faire (le versioning de signature existe, pas la duplication annuelle)
3. **Interface CRUD bibliothèque** — 🟡 partiellement fait : procédures éditables via `admin/procedures` (GET/POST/PUT), mais pas de CRUD pour rôles ni codes d'incident, pas de DELETE procédures
4. ~~Portail client enrichi~~ — ✅ **FAIT** : dashboard complet restructuré (bâtiments hub central, grille/liste, recherche, pagination), accès documents validés, engagement tracking
5. **Traduction automatique FR/EN** — API DeepL — toujours à faire
6. ~~MFA renforcé~~ — ✅ **FAIT** : MFA email conseiller + client, refresh tokens rotatifs, appareils de confiance 90 jours
7. **Application mobile** — consultation terrain — toujours à faire
8. **Haute disponibilité** — Read Replica DigitalOcean — toujours à faire
9. 🆕 **Nettoyage dossiers PCA vides** — `pca-export/`, `pca-generator/`, `pca-procedures/` sont vides depuis leur création (23 août) ; à supprimer ou implémenter
10. 🆕 **PGC/PRA/PUE — configurateur applicatif** — actuellement seules des pages marketing "Phase 2" existent côté site vitrine ; pas de configurateur/génération comme PMU/PSI/PCA

---

## Fichiers les plus fréquemment modifiés

1. `coro-backend/src/export/export.service.ts` — cœur moteur PDF, toujours demander le fichier complet
2. `coro-backend/src/export/builders/pca.builder.ts`
3. `coro-backend/src/export/templates/modules/module4.template.ts`
4. `coro-backend/src/export/templates/modules/simple-modules.template.ts`
5. `coro-backend/src/generator/procedures/` — un fichier par procédure
6. `coro-backend/src/pca/pca-configurator/pca-configurator.service.ts`
7. `coro-backend/src/occupancy/occupancy.service.ts`
8. `coro-backend/src/occupancy/incident.service.ts` — 🆕 très actif (Module Incident récent)
9. `coro-backend/src/client-portal/client-portal.controller.ts` — 🆕 point d'entrée central du portail (~39 endpoints)
10. `coro-backend/src/main.ts` — CORS + body parser
11. `coro-frontend/lib/api.ts` — URL API
12. `coro-frontend/components/layout/AppLayout.tsx`
13. `coro-frontend/app/projects/[id]/page.tsx`
14. `coro-client-portal/app/sentinelle/[buildingId]/page.tsx`

---

## Bugs résolus à NE PAS refaire

- **EBUSY/TargetCloseError Puppeteer** : photos non compressées. Max 1000px/80% JPEG.
- **Collision classes CSS** : noms distincts obligatoires.
- **`@page { margin }` en conflit** : utiliser options `page.pdf()` de Puppeteer.
- **Dépendance circulaire sommaire** : génération en 2 passes.
- **Blocs orphelins après refactor** : vérifier pas d'ancien `else if (moduleNum === X)`.
- **PostgreSQL qui s'arrête** après redémarrage Windows — vérifier `Get-Service`.
- **403 déverrouillage VALIDATED** : `requestRevision` accepte VALIDATED et REVIEW.
- **404 toggle procédure IA** : `/custom-procedures/${id}` pas `/procedures/${id}/toggle`.
- **Body parser NestJS** : 25MB configuré manuellement.
- **CORS production** : `main.ts` hardcodé localhost — toujours ajouter le domaine prod dans `enableCors()`.
- **API URL frontend** : `lib/api.ts` utilise `process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002/api'`.
- **Prisma en prod** : épingler `prisma@6.19.3` dans les Dockerfiles — la v7 a cassé le schema.
- **dist/main.js** : le build NestJS compile dans `dist/src/main.js` pas `dist/main.js`.
- **Bug changement mot de passe** : la validation frontend n'affichait pas les erreurs backend (catch silencieux). Correction dans `profile/page.tsx` `handleChangePassword`.
- **Sentinelle localStorage cross-device** : impossible de partager localStorage entre la borne et le téléphone. Solution : QR de la borne encode le kioskToken dans l'URL.
- **Conflit routes NestJS Sentinelle** : routes spécifiques (`/history`) avant routes génériques (`:id`) dans le contrôleur.
- **PowerShell + crochets** : utiliser `-LiteralPath` pour les dossiers `[id]`, `[projectId]`, etc.
- 🆕 **Migration prisma en CI/CD** : forcer `prisma@6.19.3` explicitement + exécuter via `node` dans le container plutôt que `npx` côté hôte (deux fix consécutifs nécessaires : `4362fb85`, `1573833f`).
- 🆕 **JwtModule manquant** : `ClientJwtGuard` dans `ProjectFilesModule` nécessitait l'import explicite de `JwtModule` (`d2cf4872`).

---

## Approche et patterns de travail

- **Règle de lecture** : avant toute modification — lire le fichier, valider que le problème existe, confirmer avec Mathieu, ensuite modifier
- **Code delivery** : fichiers complets pour modifications complexes ; CHERCHER/REMPLACER pour changements ciblés
- **TypeScript** : `npx tsc --noEmit` après chaque changement avant commit
- **Git workflow** : code → `npx tsc --noEmit` → `git add -A` (depuis racine `F:\coro-platform`) → `git commit` → `git push` → attendre GitHub Actions → SSH si nécessaire
- **Commits** : à des checkpoints logiques, pas après chaque fichier
- **Langage** : tout en français ; documents bilingues FR/EN en sortie
- **Confirmation de Mathieu** : très concise ("c bon", "c fait", "c deployé et ok", "RAS", "Ca fonctionne")

---

## Nouveautés v4 — ce qui a changé depuis v3

### Nouveaux modules applicatifs (backend + frontend)
- **Module Incident** complet : déclenchement, tâches par rôle avec accusé de réception, journal temps réel, mode exercice, REX ISO 22301, export PDF CNPI/CNESST (`IncidentEvent`/`IncidentTask`/`IncidentLog`, `occupancy/incident.controller.ts`)
- **Résilience opérationnelle / Indice CORO** : score pondéré 4 composantes, snapshot quotidien (`ResilienceSnapshot`, CRON 23h50), historique/tendance 90 jours, snapshot forcé
- **Intelligence organisationnelle** : vue agrégée multi-bâtiments, recommandations proactives CNPI/ISO 22301/CNESST (`GET /client-portal/intelligence/overview`)
- **Actions correctives** : CRUD complet, statuts, priorités, filtres (`CorrectiveAction`, `occupancy/corrective-actions.service.ts`)
- **Bookings / réservations d'activités** : demande client → confirmation/report/refus/réassignation conseiller, fichiers `.ics`
- **Espace de fichiers projet collaboratif** : upload conseiller + client, versions, visibilité, statut de révision
- **Chat IA "Sophie"** sur le site vitrine (remplace Crisp), avec handoff agent humain
- **Health score portefeuille** Super Admin

### Sentinelle — enrichissements
- Import CSV employés (mapping flexible, dédup, PINs auto, envoi email en lot)
- Consentement SMS (LPCAP) + SMS via Brevo + accusés de réception + mode exercice
- Substitution automatique des rôles d'urgence (titulaire absent → substitut)
- Carte interactive bâtiments (Leaflet/OSM, geocoding)
- Édition employé (rôle urgence, titulaire/substitut, zone, qualifications)
- Dashboard portail restructuré : bâtiments en hub central, vue grille/liste, badge résilience temps réel, pagination, recherche

### Sécurité
- MFA email étendu au portail client (en plus des conseillers), `ClientTrustedDevice` (90 jours)
- Magic links (connexion sans mot de passe) pour le portail client
- Refresh tokens JWT avec rotation

### Documentaire / signature
- Signatures versionnées liées à `ProjectVersion` + certification PDF officiel (champs `officialPdfFr/En` distincts des exports de travail)
- Réinitialisation mot de passe autonome (forgot/reset password)
- Éditeur blog refondu (score SEO, aperçu Google, compteurs, planification, anti-datation)
- Template Module 1 personnalisable par organisation
- Wizard de création d'organisation en 4 étapes avec invitations automatiques

### Corrections apportées par rapport au contenu de v3 (erreurs ou approximations corrigées)
- Les sous-modules `pca-export/`, `pca-generator/`, `pca-procedures/` **n'existent pas réellement** — dossiers vides ; seul `pca-configurator` est actif. L'export/génération PCA passe par l'ancien pipeline `generator/` + `export/builders/pca.builder.ts`.
- PGC, PRA, PUE ne sont **pas** à 100% comme documents applicatifs — seules des pages marketing "Phase 2" existent côté site vitrine ; aucun configurateur ni pipeline d'export dédié détecté dans le code.
- La roadmap "Portail client enrichi" et "MFA renforcé" de v3 sont maintenant **complétées** et déplacées vers les sections livrées.
- Nombre de modèles Prisma confirmé à **58** (schéma de 1320 lignes), incluant tous les modèles Sentinelle/Incident/Résilience non documentés dans v3.
- Le module `library` (bibliothèque procédures/rôles) n'a qu'un CRUD **partiel** (procédures seulement, pas de DELETE, rien pour rôles/codes incident) — la roadmap v3 le donnait comme entièrement à faire ; en réalité un début d'interface existe (`admin/procedures/*`).

### Roadmap mise à jour
- 2 nouveaux items ajoutés : nettoyage des dossiers PCA vides, et clarification du statut réel PGC/PRA/PUE (configurateur applicatif manquant malgré le statut "100%" affiché historiquement)

---

*Document généré à partir d'un scan direct du code au 13 septembre 2026 (schéma Prisma complet, 49 fichiers `*.controller.ts`, ~100 routes `page.tsx` sur les 3 apps Next.js, `app.module.ts`, historique Git de 623 commits). Toute divergence future avec le code doit être re-validée par un nouveau scan plutôt que supposée à partir de ce fichier seul.*
