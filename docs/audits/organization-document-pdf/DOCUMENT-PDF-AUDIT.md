# Audit ciblé de l’export PDF documentaire CORO

## Périmètre et version

- Branche : `audit/organization-document-pdf`
- SHA testé : `a99af3ed6e9deef8b96b247c8b4329b002528714`
- Produit de référence PR #124 : `0fdf007087...`; le commit suivant est documentaire seulement.
- Stack : PostgreSQL 16, 160 migrations, backend et frontend réels, données synthétiques, MFA local, stockage privé QA, réseau deny-by-default.
- Production : non consultée et non modifiée.

## Chemin technique observé

Le navigateur ouvre `ExportModal`, choisit modules et langue, puis appelle `POST /api/projects/:projectId/export`. Le contrôleur vérifie l’identité, l’organisation active et `projectAccessWhere`, puis appelle synchronement `ExportService.generatePdf`. Le service lit le `Document` courant, assainit le contenu, produit HTML et PDF Letter avec Puppeteer/PDF-lib, puis renvoie les octets. Une trace `EXPORT` est écrite après génération. L’export ordinaire n’est pas persisté dans le stockage privé.

Le chemin distinct `GET /api/projects/:projectId/export/official/:lang` récupère une référence officielle privée existante. Sa production dépend du parcours de signature, exclu du présent mandat.

## Résultats fonctionnels

- PMU FR, PMU EN, PSI FR, PCA FR et aperçu PMU générés et ouverts.
- Les marqueurs soumis PMU/PSI/PCA figurent dans les textes extraits.
- Format Lettre confirmé; couvertures, sommaires, textes longs, listes, tableaux et infographie contrôlés visuellement.
- Aucun caractère de remplacement Unicode détecté.
- Aperçu distinct avec filigrane visible.
- Les fichiers ne sont pas chiffrés et ne sont pas balisés pour l’accessibilité.

## Sécurité

Les refus anonyme, inter-tenant, opérateur non affecté et utilisateur désactivé sont fermés. En revanche, l’appel direct exporte un PDF final pour un projet brouillon, archivé ou désactivé. Le contrôle d’état présent dans l’interface ne remplace pas une règle serveur.

La fixture d’image réseau contrôlée n’a déclenché aucune requête. L’absence d’egress sur ce cas ne suffit pas à certifier tous les formats historiques; la couverture SSRF générale reste incomplète.

## Intégrité et reprise

Deux exports simultanés ont produit deux réponses valides et deux événements d’audit; la dernière exécution a livré des octets identiques. Il n’existe cependant aucun identifiant durable de génération, état, reprise ou idempotence. L’export final prend le contenu courant plutôt que le snapshot approuvé.

## UX et navigateur

La modale reste utilisable sans débordement sur 390×844, 768×1024, 1440×900 et 2560×1440 dans Classic, Glass Light et Glass Dark : 12/12. Le zoom 200 %, F5 et la console sont acceptables. Le focus clavier demeure derrière la modale et constitue un défaut.

## Tests exécutés

- Runner API PDF synthétique : PASS technique, avec constats métier.
- Parcours documentaire intégré préalable PMU/PSI/PCA : PASS.
- Chrome géométrie : 12/12 PASS; focus modal FAIL.
- Jest ciblé export officiel, couverture, stockage et ProjectFile privé : 23/23 PASS.
- Inspection Poppler : `pdfinfo`, `pdffonts`, `pdftotext`, `pdftoppm`.

## Preuves

- `D:\CORO-QA\audits\organization-document-pdf\2026-10-28\pdfs`
- `D:\CORO-QA\audits\organization-document-pdf\2026-10-28\browser`
- `D:\CORO-QA\audits\organization-document-pdf\2026-10-28\review-prerequisite`

## Verdict

**PARTIAL — l’export PDF produit des documents visuellement exploitables, mais l’export final gouverné n’est pas acceptable avant correction de l’état métier et de l’intégrité de version.**

PGC, PRA, PUE, signature réelle, lecteur d’écran et reprise après panne restent `NOT_VERIFIED` ou hors périmètre explicite.
