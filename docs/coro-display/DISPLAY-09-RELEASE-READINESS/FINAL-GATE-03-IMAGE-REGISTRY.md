# Gate 3 — registre d'images immuables

Vérification du 2026-11-12. Registre gouverné : GHCR, organisation `nextsolution-crypto`, dépôts `coro-backend`, `coro-frontend`, `coro-client-portal`, `coro-website`.

## Préconditions

- Candidat : `5ae7cd213346169465ee739d09df6d39b26ac6c3`.
- Les quatre builds `linux/amd64`, audits npm production et preuves locales précédentes sont PASS; leurs digests locaux demeurent consignés dans `RELEASE-IMAGE-BUILD-DIGESTS.md`.
- Aucun workflow n'écoute `registry_package`. Les builds et la release de `deploy.yml` exigent `workflow_dispatch`; une publication manuelle de package ne déclenche donc ni déploiement, ni migration.
- Tag prévu, nouveau et non consommé : `display09-candidate-5ae7cd213346169465ee739d09df6d39b26ac6c3` pour chacun des quatre dépôts. Aucun tag `latest`, `production`, `stable` ou SHA de release n'est remplacé.

## Blocage d'autorité

Le compte GitHub local ne dispose pas de la portée `read:packages` (API : HTTP 403) et `docker manifest inspect` retourne `unauthorized`. Il n'existe donc aucune preuve de permission de lecture ou de push. Les images locales avaient été retirées après la recette gouvernée; les reconstruire sans pouvoir publier n'aurait pas levé le gate.

Aucune publication n'a été tentée et aucun jeton n'a été affiché. La publication doit être effectuée avec un jeton d'organisation limité à ces quatre packages (`read:packages`, `write:packages`), puis vérifiée par manifeste distant : digest complet, `linux/amd64`, taille, tag SHA, provenance du contexte exact et absence de workflow/release après l'heure du push.

**Verdict : BLOCKED_BY_REGISTRY_AUTHORITY.** Digests distants : `UNRESOLVED`; aucune image candidate publiée; aucun déploiement déclenché.
