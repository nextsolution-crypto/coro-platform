# Backend

Le contrôleur `display-manager` exige JWT, organisation active et validation DTO stricte (`whitelist`, `forbidNonWhitelisted`, `transform`). Le service vérifie l’organisation, la permission explicite et un périmètre bâtiment non vide avant chaque lecture ou mutation, y compris avant un rejeu idempotent.

Les listes, détails, compteurs, qualifications, assignations, messages et transitions utilisent la même autorité. Les champs serveur ne peuvent pas être injectés. Les textes contenant HTML, scripts ou caractères de contrôle interdits sont rejetés.

Correction d’intégration : une résolution exige toujours `correctionEvidence`; un `decidedByUserId` ne peut jamais être identique au `resolutionValidatedById`. Une référence demeure une information déclarée, pas une vérification automatique.

Les acceptations et décisions ne modifient aucun PDF, fichier, publication, affectation d’écran ou approbation.
