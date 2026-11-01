# Définitions des indicateurs observés

## Formule actuelle

Population : bâtiments actifs de l'organisation de l'acteur.

Pour chaque bâtiment :

1. prendre le projet actif non archivé dont `updatedAt` est le plus récent;
2. prendre dans ce projet le document dont `updatedAt` est le plus récent;
3. calculer `floor((maintenant - updatedAt) / (30.44 jours))`;
4. sans document : `AUCUN_DOCUMENT`;
5. moins de 10 mois : `CONFORME`;
6. de 10 à moins de 12 mois : `AVERTISSEMENT`;
7. 12 mois ou plus : `EXPIRE`.

Les compteurs sont le nombre de lignes dans chacune de ces quatre catégories.
Les filtres et la recherche sont appliqués au navigateur après réception de la
liste complète autorisée par l'API.

## Ce que la formule démontre réellement

| Libellé UI | Démonstration réelle |
|---|---|
| Conforme | un document quelconque du projet sélectionné a un `updatedAt` technique inférieur à 10 mois |
| Bientôt dû | ce `updatedAt` a de 10 à moins de 12 mois |
| Expiré | ce `updatedAt` a au moins 12 mois |
| Aucun document | le projet sélectionné n'a pas de document, ou aucun projet actif non archivé n'est sélectionné |

Elle ne démontre pas : approbation, statut valide, applicabilité, date d'effet,
expiration métier, obligation légale, vérification indépendante ou conformité
réglementaire.

## Décisions métier requises

1. L'écran doit-il devenir « Fraîcheur documentaire » ou utiliser les autorités
   `ComplianceRequirement/ComplianceEvidence`?
2. Quelles exigences s'appliquent à quels bâtiments, juridictions et usages?
3. Quel événement fait courir une échéance : approbation, entrée en vigueur,
   inspection, activité ou date configurée?
4. Une preuve archivée reste-t-elle consultable comme historique sans compter
   dans l'état courant?
5. Quels statuts documentaires sont admissibles?
6. Quelle règle gouverne remplacement, révocation et non-applicabilité?

