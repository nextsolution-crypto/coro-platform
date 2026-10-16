# CORO Liquid Glass — maquettes de référence

> **Ces images sont des références de conception (maquettes générées), PAS des captures de fonctionnalités réelles.**
> Ce qu'elles montrent — blocs, indicateurs, textes, données — peut ne pas exister dans l'application, ni refléter son comportement.
> Elles ne documentent aucune fonctionnalité, aucun contenu métier ni aucun état de l'interface livrée.

Cibles visuelles **approuvées** (direction artistique validée en Phase 04C) pour le design Liquid Glass du tableau de bord conseiller.

| Fichier | Thème | Dimensions | Poids |
|---|---|---|---|
| `coro-liquid-glass-light.png` | Light Glass | 1779 × 884 | 1,5 Mo |
| `coro-liquid-glass-dark.png` | Dark Glass | 1778 × 884 | 1,5 Mo |

Ce dossier ne contient que ces deux images et ce fichier.

## Rôle

- Orienter la migration progressive des écrans (voir `coro-frontend/design-system/MIGRATION.md`).
- Ce ne sont **pas** des actifs de l'application : aucun import, aucun chargement réseau, aucune référence dans le code.
- Écarts connus avec l'implémentation : photo d'immeuble remplacée par une façade abstraite en CSS ; mini-graphiques des cartes KPI
  volontairement absents (données fictives) ; pied de page et indicateur « systèmes opérationnels » non reproduits.

## Provenance et contenu

- Images générées par un modèle d'image ; leurs métadonnées **Content Credentials (C2PA)** sont conservées telles quelles
  (provenance, date du 14 octobre 2026). Elles décrivent l'outil générateur et les autorités publiques de signature et d'horodatage
  (dont le contact d'une autorité de certification) ; elles ne contiennent ni chemin local, ni adresse ou identifiant de l'utilisateur,
  ni secret (vérifié par lecture du bloc `caBX`).
- Le contenu affiché est un exemple de tableau de bord (prénom/nom d'utilisateur, noms d'organisations et de projets).
  À revoir avant toute publication hors du dépôt privé.

## Ce qui n'est PAS versionné

Les captures d'écran produites pendant les phases de développement (04B, 04C, 04D, 05C, bancs de validation) restent locales dans
`design-references/`. Elles sont régénérables avec le banc de validation (`coro-frontend/design-system/bench/README.md`).
