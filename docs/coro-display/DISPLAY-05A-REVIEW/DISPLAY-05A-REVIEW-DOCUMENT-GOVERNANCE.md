# DISPLAY-05A-REVIEW — Gouvernance documentaire

## Observations

Le cycle existant demeure l'autorité : `DRAFT`, `REVIEW`, `APPROVED`, `PUBLISHED`, `SUSPENDED`, `SUPERSEDED`, `REVOKED`. Les commandes exigent permission, bâtiment, UUID de requête, verrou attendu et motif. L'approbation lie source, variante, profil et empreintes exactes.

## Tests

Le scénario PostgreSQL complet valide brouillon, aperçu, soumission, revue, approbation, publication, suspension, reprise et révocation, ainsi que les refus de preuve périmée, de conflit et de rôle incompatible. Aucun statut n'est fabriqué par l'interface.

## Corrections

Le tiroir UI expose les actions gouvernées manquantes « Approuver la preuve » et « Publier ». Les approbations transmettent versions et SHA-256 exacts. Publication, approbation, suspension, reprise et révocation demandent une confirmation explicite. Un plan `SUSPENDED` est maintenant une anomalie de couverture et non un plan actif.

## Risques résiduels

La confirmation a été vérifiée par contrat statique, pas par clic réel. Aucune approbation réelle ou synthétique hors fixture jetable n'a été créée.
