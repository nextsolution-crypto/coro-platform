# Bâtiments — passation de livraison

Date : 2026-10-30

## Références

- PR : #137.
- Candidat QA : `01cf448ab1c2742430ef2258a0edf5ea738d523f`.
- SHA fusionné et actif : `2e6c06ef2ca2a2606e779c0480f64e6cea3d6a0c`.
- Migration active : `20261117010000_building_governance` (164).
- CI main : 41133503417 `SUCCESS`.
- Pré-release : inspection 41134056034 `GO`; capacité 41134059259 `SUCCESS`.
- Release : 41134179928 `SUCCESS`.
- Post-release : inspection 41135782370 `GO`; capacité 41135785608 `SUCCESS`.

## État

`VALIDATED_INTEGRATED_MERGED_DEPLOYED_RECONCILED`

Les preuves API, PostgreSQL et Chrome synthétiques demeurent sous `D:\CORO-QA\tracking\organization-buildings`. La production n'a reçu aucune donnée métier de recette, notification, SMS, signature ou opération d'urgence.

## Limites et exploitation

- Lecteur d'écran réel : `NOT_VERIFIED`.
- Rollback : quatre images saines opérationnellement sont disponibles, mais la version précédente réintroduit les défauts Bâtiments corrigés. Suspendre les routes Bâtiments/Documents concernées si ce rollback devient nécessaire, puis rétablir le backend corrigé.
- Les formats seulement stockables ne deviennent pas automatiquement indexables par Knowledge; aucune promesse OCR universelle.
- WEB-AI et fournisseurs réels sont inchangés et désactivés selon leur gouvernance.

## Suite

Le lot Bâtiments est clos. Aucun chantier Carte ou Conformité n'est démarré par cette livraison.
