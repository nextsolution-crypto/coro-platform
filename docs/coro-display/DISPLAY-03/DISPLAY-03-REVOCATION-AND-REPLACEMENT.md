# DISPLAY-03 — Révocation et remplacement

Une révocation change l’autorité immédiatement, conserve la variante et l’historique, et retire la publication du contrat Player. Elle est définitive.

Lors d’une nouvelle publication au même emplacement, le verrou PostgreSQL protège la sélection; l’ancienne publication devient `SUPERSEDED` et un événement corrélé est écrit avant que la nouvelle devienne `PUBLISHED`.

Une suspension retire temporairement la publication. La reprise exige que source, version, hash, emplacement et variante soient encore valides. Une source révoquée, remplacée, future ou expirée rend également le contrat Player indisponible, même si la ligne de publication n’a pas encore été réconciliée par un futur Controller.
