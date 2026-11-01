# Réserve accessibilité et PDF

## Ce qui est démontré

- Les campagnes antérieures couvrent clavier, focus visible, zoom 200 %, états d’erreur et géométrie responsive sur les parcours ciblés.
- Le moteur documentaire principal utilise Chromium/Puppeteer puis `pdf-lib`; les PDF produits sont ouvrables et leur texte est extractible dans les scénarios QA documentés.
- Le moteur ajoute un titre, un auteur, un sujet, un créateur et la langue `fr-CA` ou `en-CA` au catalogue PDF.
- Le code déclare explicitement que le pipeline actuel ne produit pas de PDF structurellement balisé PDF/UA.

## Ce qui n’est pas démontré

- Restitution vocale réelle NVDA, JAWS ou VoiceOver : `NOT_VERIFIED`. L’environnement Windows exposé à cette campagne ne fournit aucun lecteur d’écran natif pilotable. Une arborescence DOM accessible ne remplace pas une restitution vocale.
- Conformité PDF/UA : `NOT_VERIFIED` et techniquement non produite par le pipeline actuel.
- Ordre de lecture, structure de titres, tableaux, textes alternatifs et navigation de signets validés par un outil PDF/UA : `NOT_VERIFIED`.

## Options

1. **Périmètre actuel, sans revendication PDF/UA** : conserver les métadonnées, le texte extractible et une version HTML accessible; publier clairement la limite. Aucun coût moteur supplémentaire.
2. **Remédiation ciblée** : ajouter une étape de balisage et de validation PDF/UA après génération. Cette option nécessite une étude d’outil, des licences éventuelles et une non-régression visuelle.
3. **Moteur spécialisé** : remplacer ou compléter Chromium/pdf-lib par un moteur capable de produire des structures PDF/UA. Impact plus élevé sur les modèles PMU/PSI/PCA et les preuves d’intégrité.

## Intervention humaine minimale

- Exécuter un parcours représentatif avec un lecteur d’écran réel sur l’application.
- Choisir si PDF/UA est une exigence commerciale ou réglementaire du périmètre vendu.
- Si oui, approuver l’étude d’outil/licence et le niveau de conformité visé avant de modifier le moteur.

Le script et le formulaire de constat sont prêts dans `SCREEN-READER-HUMAN-ACCEPTANCE.md`.

## Décision à Mathieu

- `PDF_UA_EXCLU_V1` : maintenir la V1 avec HTML accessible, PDF ouvrable/texte extractible et une exclusion contractuelle explicite de PDF/UA;
- `PDF_UA_INCLUS_CONTRACTUELLEMENT` : lancer un chantier séparé de moteur/balisage, validation, licences et non-régression avant toute promesse.

Aucune option n’est réputée approuvée dans ce document.

La réserve ne doit pas être classée close sur la seule base des contrôles DOM, clavier ou extraction de texte.
