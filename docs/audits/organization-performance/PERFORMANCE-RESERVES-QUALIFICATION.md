# Qualification des réserves — CORO Rendement

## Référence

- Branche : `audit/organization-performance`
- Base de campagne : `afdad27e7092013cdf06a7a96de846d270f443db`
- Stack : PostgreSQL 16, backend et frontend réels, identités et MFA locaux synthétiques
- Données : deux organisations isolées; aucune donnée de production

## Verdict

`CORRECTION_REQUISE`

L'historique d'un projet archivé reste lisible et contribue aux agrégations, conformément à la conservation attendue. En revanche, les API canoniques ont accepté la création d'une nouvelle tâche et d'une nouvelle saisie de temps après archivage (`HTTP 201`). Ce défaut produit est reproduit; aucune correction produit n'est incluse dans cet audit.

## Réserves qualifiées

| Réserve | Statut | Résultat démontré |
|---|---|---|
| Projet archivé — lecture directe, liste et historique | PASS | Le projet archivé reste consultable et listé; les 100,1 h historiques restent dans les vues opérationnelle et financière. |
| Projet archivé — nouvelles écritures | FAIL | Une tâche puis une saisie de temps ont été créées après archivage (`201`, `201`). |
| `asOf` | DÉCISION_MÉTIER_REQUISE | `asOf` est une borne supérieure sur la date de travail, pas une photographie financière historique. Pour le même `asOf=2026-10-30`, une saisie créée ultérieurement mais datée du 20 octobre a fait passer le résultat de 5 entrées / 940 CAD à 6 entrées / 1 040 CAD. Les montants vendus et versions de taux gouvernées sont lus dans leur état courant. Décision : renommer/documenter ce filtre comme date de travail limite, ou financer une projection temporelle historisée. |
| Filtre conseiller | DÉCISION_MÉTIER_REQUISE | Le filtre sélectionne les mandats auxquels le conseiller a participé, puis inclut tout le travail du mandat. Résultat filtré et résultat global : 6 entrées / 1 040 CAD. Décision : le libeller « mandats avec participation du conseiller » ou définir une vue économique individuelle distincte. |
| Volumétrie au-delà de 1 000 lignes | PASS_DANS_LE_VOLUME_TESTÉ | 1 001 saisies canoniques : 1 001 lignes retournées, 100,09999999999859 h pour 100,1 h attendues, sans manque ni double comptage. Lecture timesheet : 29,2 ms / 517 563 octets; agrégat : 30,7 ms / 420 octets. La création a été étalée en fenêtres gouvernées pour respecter le throttling. Aucune extrapolation au-delà de 1 001 lignes. |
| Réponses reçues dans l'ordre inverse | PASS | Deux périodes successives ont répondu dans l'ordre inverse; l'écran final a conservé avril et 40 h, sans afficher les 30 h périmées de mars. |
| Erreur après une valeur valide | PASS | Une réponse `503` ultérieure a affiché une alerte et masqué les anciennes données. |
| Production authentifiée en lecture seule | NOT_VERIFIED | Aucun onglet CORO authentifié et autorisé n'était disponible. Intervention minimale : ouvrir un onglet Rendement avec une session légitime; aucune donnée de production n'a été consultée ou exportée. |
| Lecteur d'écran réel | NOT_VERIFIED | Aucun lecteur d'écran réel fiable n'était disponible. Les contrôles distincts clavier, focus et zoom 200 % restent PASS de la campagne précédente. |

## Cohérence API / interface

- L'API financière accepte `asOf` et `userId` avec les sémantiques ci-dessus.
- L'interface financière appelle actuellement la vue cumulative sans exposer `asOf` ni le filtre conseiller.
- Une actualisation F5 ne constitue donc pas une preuve de persistance de ces filtres API; ils ne sont pas proposés dans l'écran actuel.

## Lot correctif ciblé proposé

1. Centraliser un garde serveur « projet actif et non archivé » sur toutes les écritures équivalentes du périmètre : création/mutation de tâche, saisie de temps et mutations de mandat.
2. Refuser avant toute écriture, notification ou événement; conserver les lectures, versions et agrégations historiques.
3. Tester les appels directs, la concurrence, deux organisations et l'absence d'effet secondaire lors du refus.
4. Faire trancher séparément les libellés et contrats de `asOf` et du filtre conseiller; ne pas les présenter comme photographie historique ou rendement individuel avant décision.

## Preuves

- `D:\CORO-QA\tracking\organization-performance\api\performance-reserves-acceptance.json`
- `D:\CORO-QA\tracking\organization-performance\browser\performance-browser-ordering.json`

Les valeurs financières des preuves sont exclusivement synthétiques. Aucun export de données financières réelles n'a été produit.
