# Persistance et priorité d'urgence

## Constats

L'état est HMACé, versionné, priorisé et refuse replay/downgrade sans `governedClear`. La hiérarchie est `REAL > EXERCISE > PERMANENT > NORMAL`. Aucun timer de sortie automatique n'a été trouvé.

## Tests

Écriture concurrente, priorité, redémarrage d'un processus distinct et clear gouverné: PASS. L'E2E restaure `EMERGENCY_REAL` et produit `emergency.png`/`restart.png`.

## Limites

La source d'autorité réelle demeure `FUTURE_GOVERNED_GATEWAY`; le chemin Incident/Ops n'est pas livré. Corruption avec indisponibilité du cache et panne électrique: NOT_VERIFIED. Verdict logiciel: PASS; intégration opérationnelle: non prête.
