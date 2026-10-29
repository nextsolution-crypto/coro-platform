# Constats — export PDF documentaire CORO

## Réconciliation finale — 2026-10-29

| Constat | Statut final | Preuve |
|---|---|---|
| PDF-001 | CORRIGÉ / PASS | refus DRAFT, ARCHIVED et désactivé, zéro ligne d’export |
| PDF-002 | CORRIGÉ / PASS | export depuis snapshot approuvé; mutation courante absente du PDF |
| PDF-003 | CORRIGÉ / PASS | focus initial, confinement, Escape et restauration |
| PDF-004 | CORRIGÉ / PASS | états durables, idempotence PostgreSQL, bail et retry |
| PDF-005 | PARTIAL | métadonnées et langue ajoutées; `Tagged: no`, PDF/UA et lecteur d’écran NOT_VERIFIED |
| PDF-006 | NOT_VERIFIED | PGC/PRA/PUE sans support canonique démontré |
| PDF-007 | PASS pour la frontière testée / couverture générale PARTIAL | sonde HTTP contrôlée non chargée; aucun egress ouvert |
| PDF-008 | NOT_APPLICABLE | signature réelle et valeur juridique hors mandat |

La preuve consolidée est dans `INTEGRATED-CORRECTION-AND-ACCEPTANCE.md`. Les sections suivantes conservent le constat initial avant correction.

Audit exécuté le 2026-10-28/29 sur `a99af3ed6e9deef8b96b247c8b4329b002528714` (PR #124, produit identique à `0fdf007087...`; dernier commit uniquement documentaire).

## PDF-001 — L’API d’export final ne fait pas respecter l’état du projet

- **Sévérité : élevée**
- **Statut : REPRODUIT**
- **Attendu :** un export final doit respecter l’état métier et refuser la régénération d’un brouillon, d’un projet archivé ou administrativement désactivé.
- **Observé :** `POST /api/projects/:projectId/export` retourne `201 application/pdf` pour les trois cas synthétiques `DRAFT`, `ARCHIVED` et `isActive=false`.
- **Cause :** le contrôleur emploie `projectAccessWhere` au lieu d’un prédicat incluant les invariants de mutation (`mutableProjectAccessWhere` ou règle d’export dédiée). La restriction de l’interface aux statuts `VALIDATED/EXPORTED` ne protège pas l’appel direct.
- **Impact :** un acteur autrement autorisé au projet peut générer un PDF final à partir d’un état qui ne devrait pas être exportable.
- **Preuve :** `D:\CORO-QA\audits\organization-document-pdf\2026-10-28\pdfs\api-audit.json`.
- **Correction proposée :** formaliser une politique serveur d’export (`preview` distinct de `final`) et tester chaque état sans effets secondaires.

## PDF-002 — L’export ordinaire rend le document courant, pas la version approuvée

- **Sévérité : élevée**
- **Statut : CONFIRMÉ PAR INSPECTION**
- **Attendu :** un PDF présenté comme final doit être rattaché sans ambiguïté à la version soumise/approuvée.
- **Observé :** `ExportService.generatePdf` lit `Document.content`; `ProjectVersion` n’est consulté que pour ajouter une certification lorsqu’une signature existe. Aucun identifiant ni condensat de la version approuvée ne gouverne le contenu rendu.
- **Impact :** une modification ultérieure du document courant peut produire un PDF différent de l’artefact approuvé, sans preuve de version explicite dans le contrat d’export.
- **Correction proposée :** passer un `versionId` canonique ou résoudre le snapshot approuvé côté serveur, vérifier son état, et inclure version/hash dans les métadonnées et l’audit.

## PDF-003 — Le dialogue d’export ne prend pas le focus clavier

- **Sévérité : moyenne**
- **Statut : REPRODUIT**
- **Observé :** après ouverture de la modale et pression sur Tab, le focus passe au bouton sous-jacent « Exporter Guide locataire » (`insideModal=false`).
- **Impact :** navigation clavier ambiguë; le dialogue n’est pas modal du point de vue du focus.
- **Preuve :** `D:\CORO-QA\audits\organization-document-pdf\2026-10-28\browser\browser-audit.json`.
- **Correction proposée :** rôle/dialog accessible, focus initial, piège de focus, restauration au déclencheur et fermeture Escape.

## PDF-004 — Pas de cycle durable de génération/reprise

- **Sévérité : moyenne**
- **Statut : CONFIRMÉ PAR INSPECTION / REPRISE NOT_VERIFIED**
- **Observé :** la génération est synchrone dans la requête HTTP. Il n’existe pas d’identifiant de travail, d’état persistant, de reprise ou de clé d’idempotence. Deux exports simultanés réussissent et créent deux traces `EXPORT`.
- **Impact :** après perte de réponse ou interruption moteur, le client ne peut pas distinguer « non exécuté » de « exécuté mais réponse perdue »; une nouvelle tentative régénère.
- **Correction proposée :** soit documenter explicitement l’export comme opération reproductible sans persistance, soit introduire une demande idempotente avec état et récupération.

## PDF-005 — Accessibilité du fichier PDF limitée

- **Sévérité : moyenne**
- **Statut : REPRODUIT**
- **Observé :** les quatre PDF inspectés déclarent `Tagged: no`. Le texte est extractible et aucun caractère de remplacement n’a été détecté, mais PDF/UA et lecteur d’écran ne sont pas démontrés.
- **Impact :** structure sémantique non garantie pour les technologies d’assistance.
- **Correction proposée :** définir un objectif d’accessibilité PDF, produire des balises structurées ou une alternative HTML accessible, puis tester avec lecteur d’écran.

## PDF-006 — Types PGC, PRA et PUE non couverts

- **Sévérité : information**
- **Statut : NOT_VERIFIED**
- **Observé :** seules les chaînes réellement supportées PMU, PSI et PCA ont été exécutées. Aucun support canonique vérifiable n’a été trouvé pour PGC/PRA/PUE dans ce moteur.

## PDF-007 — Frontière des ressources distantes partiellement vérifiée

- **Sévérité : moyenne**
- **Statut : PARTIAL / NOT_VERIFIED GÉNÉRAL**
- **Observé :** l’injection contrôlée d’une image Markdown pointant vers un service interne QA n’a produit aucune requête. Aucun egress public n’a été ouvert. Cela ne prouve pas tous les chemins HTML/image historiques.
- **Correction proposée :** tests unitaires et intégrés explicites pour `http(s)`, `file:`, adresses loopback/link-local, redirections, taille et délai des ressources.

## PDF-008 — PDF officiel signé hors périmètre de preuve E2E

- **Sévérité : information**
- **Statut : NOT_VERIFIED E2E**
- **Observé :** les 23 tests ciblés de stockage privé et de téléchargement officiel passent; aucune signature réelle ou simulée n’a été déclenchée dans cet audit.
