# Revue indépendante

## Candidat examiné

- Candidat de développement : `42e6d485`.
- Branche isolée : `review/coro-display-07-independent`.
- Axes : architecture, autorité, multitenant, priorité, sortie gouvernée, idempotence, outbox, journal, Player et preuves Chromium.

## Défaut P0 découvert et corrigé

La route JWT humaine acceptait une valeur de provenance `CORO_OPS` ou `CORO_INCIDENT` fournie par l'appelant. Les permissions Display limitaient l'action, mais la provenance conservée dans l'audit pouvait être usurpée.

La correction réserve désormais ces deux sources à un futur adaptateur machine authentifié et refuse leur utilisation sur la route humaine avec `MACHINE_EVENT_SOURCE_REQUIRES_TRUSTED_ADAPTER`. `SIMULATOR` est limité aux exercices. Deux tests négatifs couvrent les sources machine et un test couvre le simulateur hors exercice.

## Résultats indépendants

- 22 tests unitaires et de sécurité DISPLAY-07 : PASS.
- Build Nest : PASS.
- ESLint ciblé backend : PASS.
- Signature Ed25519, portée appareil/organisation/bâtiment, anti-rejeu, priorité et sortie liée à l'incident : PASS.
- Contrainte unique de séquence et transaction `SERIALIZABLE` : PASS; une concurrence perdante échoue explicitement et ne produit pas d'état partiel.
- Outbox, événement et livraisons dans la même transaction : PASS.
- Migration additive et contraintes PostgreSQL réelles : PASS sur base jetable.
- 15 captures Chromium réelles : présentes et dimensions vérifiées; elles ne constituent pas une preuve matérielle.

## Réserves non bloquantes pour la revue logicielle

- L'adaptateur machine CORO Ops/Incident entrant n'est pas livré : les provenances machine sont maintenant fermées par défaut.
- L'observation physique, le matériel et Building Bridge restent `NOT_VERIFIED`.
- L'escalade sur accusé `FAILED/REJECTED/STALE` est démontrée; un ordonnanceur proactif de délai hors ligne reste à traiter en DISPLAY-08.
- Le scénario de perte PostgreSQL au milieu d'une commande n'est pas exercé comme panne de processus réelle; l'atomicité et le rollback sont démontrés en PostgreSQL.

## Verdict indépendant

**FAVORABLE AVEC RÉSERVES** pour une PR Draft de revue humaine. Aucun défaut critique connu d'autorisation, de priorité, de sortie, de cloisonnement ou d'intégrité documentaire ne demeure après la correction de provenance.
