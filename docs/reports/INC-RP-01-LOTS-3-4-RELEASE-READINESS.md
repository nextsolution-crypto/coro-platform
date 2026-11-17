# INC-RP-01 — Lots 3 et 4 — Revue indépendante et préparation de release

Date : 17 novembre 2026

## Candidat revu

- PR : #326
- HEAD demandé et CI terminale : `6af6e262b4f39732ac005b582ffdf019fe82133e`
- Base observée : `37529f2c5a87fbd11117d2d58084869525ed0fff`
- État GitHub : fusionnable
- Fusion/release : non exécutées

## CI du HEAD exact

Tous les contrôles obligatoires ont terminé avec succès : sécurité backend,
frontend, portail client, quatre typechecks, tests backend et build portail.
Les jobs `build-images` et `production-release` ont été ignorés comme attendu
sur une PR.

## Revue indépendante

### PASS

- Migration additive : deux colonnes de réviseur, trois colonnes de révocation
  de pièce jointe et un index; aucune suppression ni réécriture historique.
- Feature flag fermé par défaut : seule la valeur exacte `true` active CORO
  Report.
- Double autorité : permission Report individuelle et affectation Incident
  active au bâtiment sont toutes deux requises.
- Cloisonnement : organisation et bâtiment sont vérifiés avant lecture ou
  mutation; les refus sont non divulgateurs.
- Workflow : verrou optimiste, transactions sérialisables, idempotence,
  séparation soumissionnaire/approbateur et audit transactionnel.
- Pièces jointes : 10 Mo maximum, types DTO bornés, ClamAV fail-closed,
  stockage privé immuable, téléchargement autorisé seulement après scan CLEAN.
- UX ajoutée : reprise, sauvegarde, téléversement explicite, soumission, prise
  en charge, approbation et demande de correction utilisent les routes
  gouvernées existantes.
- MFA QA : interdit en production, domaines réservés `.test`, capture limitée
  au répertoire temporaire et absence de Brevo/Spaces exigée.
- Stack QA : tous les ports sont liés à `127.0.0.1`; aucune donnée réelle.

### Correction issue de la revue

Le seed QA pouvait initialement viser toute `DATABASE_URL`. Il est désormais
refusé en production et exige simultanément :

- `INC_RP_QA_CONFIRM=SYNTHETIC_LOCAL_ONLY`;
- PostgreSQL sur loopback, port `55433`;
- utilisateur et base `coro_report_qa`.

Les tests négatifs couvrent production, confirmation absente, hôte distant et
base/port incorrects.

## Preuves locales

- 190 migrations appliquées depuis zéro sur PostgreSQL 16 isolé.
- 8 modèles synthétiques et 4 identités distinctes.
- MFA exigé et authentification réussie.
- Rapport : DRAFT → SUBMITTED → IN_REVIEW → APPROVED.
- Pièce jointe PDF synthétique : ClamAV CLEAN et stockage Garage privé.
- Tests backend ciblés : 36 PASS, 2 SKIPPED.
- Tests contrats/gardes : 5 PASS.
- Build frontend : PASS avec Next.js 16.4.6.

## Risques résiduels

1. La signature binaire du fichier n'est pas comparée au MIME déclaré. À
   corriger avant activation commerciale ou test de fichiers hostiles.
2. Une panne entre l'écriture objet et la transaction PostgreSQL peut laisser
   un objet privé orphelin. Prévoir une réconciliation gouvernée avant
   activation.
3. La recette navigateur Work n'est pas démontrée : le connecteur retourne
   `Cannot read properties of undefined (reading 'timeoutMs')`.
4. L'environnement local est HTTP; il ne satisfait pas la preuve HTTPS.

Ces réserves ne rendent pas les routes accessibles en production tant que
`INCIDENT_REPORTS_ENABLED=false`.

## Préparation de release

La release peut suivre le workflow CORO existant après autorisation distincte :

1. revérifier HEAD, base et CI;
2. construire les images immuables du SHA autorisé;
3. capacité, sauvegarde distante, restauration, verrou et rollback;
4. appliquer l'unique migration additive;
5. déployer avec `INCIDENT_REPORTS_ENABLED=false` explicitement attesté;
6. inspecter les services et PostgreSQL;
7. réconcilier SHA et digests;
8. vérifier que toutes les routes Report répondent 404 lorsque le flag est
   fermé.

## Préproduction HTTPS proposée

Réutiliser l'architecture déjà décrite dans
`docs/design/liquid-glass/v2/PREPROD-PLAN.md` :

- VPS préproduction distinct à Toronto, aucun volume ni réseau de production;
- projet Compose `coro-report-preprod` avec PostgreSQL, Garage et ClamAV
  dédiés, sans ports publics;
- Caddy seul exposé en 443 avec certificats ACME et `noindex`;
- trois hôtes séparés pour app, API et visualiseur MFA;
- Cloudflare Access limité aux testeurs autorisés, ou Tailscale si l'accès
  fournisseur n'est pas disponible;
- images `preprod-<sha>` construites par workflow manuel sans environnement ni
  secrets de production;
- `NODE_ENV=staging`, flag Report actif, MFA QA `.test`, capture locale et
  sortie réseau du backend bloquée;
- aucune clé Brevo, aucun stockage production, aucune intégration Sentinelle,
  Ops ou Building Bridge;
- destruction complète par `docker compose -p coro-report-preprod down -v`.

Le serveur local ne doit pas être publié par tunnel ad hoc.

## Verdicts

- Fusion PR #326 : **GO WITH RESTRICTIONS** — flag fermé, correction du garde
  QA et nouvelle CI terminale requises avant autorisation de fusion.
- Recette GPT Work : **NO-GO** tant qu'une URL HTTPS privée et la connexion
  navigateur authentifiée ne sont pas démontrées.

