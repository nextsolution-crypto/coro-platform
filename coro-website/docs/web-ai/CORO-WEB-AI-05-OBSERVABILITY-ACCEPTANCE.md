# CORO WEB-AI-05 — Acceptation de l’observabilité locale

## Verdict

`PASS_LOCAL_MINIMIZED_TELEMETRY`

## Données et minimisation

`WebAITelemetryEvent` conserve seulement : catégorie déterministe, langue, résultat, type d’événement, mode fournisseur, durées, nombres de sources/liens, code d’erreur borné, version du classifieur, corrélation et pseudonyme de session HMAC facultatif.

Ne sont pas conservés : question brute, réponse, historique, nom, courriel, téléphone, organisation, adresse IP ou contenu documentaire. Sans clé HMAC configurée, aucun pseudonyme de session n’est créé.

L’écriture de télémétrie est désactivable et non bloquante. Une panne d’observabilité ne bloque pas la réponse publique et ne journalise pas le contenu visiteur.

## Agrégations et amélioration

- Fenêtre du tableau de bord : 30 jours.
- Totaux d’événements exacts; échantillon de sessions/latences borné à 10 000 événements et signalé s’il est limité.
- Répartition par catégorie, résultat et état des demandes commerciales.
- Latences P50/P95 calculées sur les données disponibles.
- Une abstention produit ou incrémente une lacune agrégée `INSUFFICIENT_PUBLIC_SOURCE`, sans question brute.
- Cycle de décision des recommandations : `NEW`, `UNDER_REVIEW`, `APPROVED`, `REJECTED`, `IN_PROGRESS`, `COMPLETED`.

## Autorisation et interface

Le tableau de bord `/admin/web-ai` consomme `/admin/v1/web-ai/dashboard`. L’API exige JWT, `PlatformRolesGuard` et `@SuperAdminOnly()`; aucun fallback de rôle, de tenant ou de Platform Authority n’a été ajouté. L’interface est en lecture seule et ne peut ni activer Bedrock, ni modifier le corpus, ni consulter les conversations.

Les métriques impossibles sans fournisseur réel sont affichées comme indisponibles : qualité générative réelle, jetons réels et coût fournisseur réel.

## Preuves et limites

- Tests de minimisation, pseudonymisation, panne non bloquante, agrégation de lacunes et autorisation Super Admin : PASS.
- Migration PostgreSQL 16 depuis zéro : 157 migrations, état à jour.
- Tables, FK vers `CommercialProspect`, index uniques d’idempotence et index d’agrégation : vérifiés dans PostgreSQL.
- Build frontend : PASS; contrats navigation/route : PASS.
- Recette navigateur authentifiée du tableau Super Admin : `NOT_VERIFIED` dans ce lot faute de session administrative synthétique démarrée. Les contrats serveur, autorisation, TypeScript et build sont vérifiés.
