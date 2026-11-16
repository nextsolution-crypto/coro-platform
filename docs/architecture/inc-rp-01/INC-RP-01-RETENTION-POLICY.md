# INC-RP-01 — Politique de conservation

La conservation est définie par organisation et type de rapport, en jours.
Elle s'applique au rapport, à ses versions, pièces, exports et enveloppes
historiques. Une suspension légale (`legalHold`) bloque toute purge.

## Règles

- aucune politique implicite globale;
- changement de politique non rétroactif sans opération gouvernée;
- purge en deux étapes : éligibilité puis suppression auditée;
- pièces infectées conservées en quarantaine selon politique de sécurité;
- stockage et base réconciliés; un objet orphelin est une erreur;
- export et citation Knowledge retirés avant purge physique;
- sauvegardes suivent leur cycle propre et ne sont jamais supprimées par ce
  mécanisme.

Le Lot 1 stocke la politique et l'échéance; le worker de purge est hors lot.
