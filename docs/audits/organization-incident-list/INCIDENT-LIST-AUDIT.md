# Audit ciblé CORO Incident — lot 1 : liste

## Verdict

**CORRECTION_REQUISE — LISTE INCIDENT NON ACCEPTÉE DANS LE PÉRIMÈTRE AUDITÉ.**

Les refus Client sont correctement composés avec la permission Incident, l’organisation et le bâtiment. Les états de chargement/erreur et la protection contre les réponses tardives sont présents. La liste n’est toutefois pas acceptable à volume réel : elle masque silencieusement les éléments au-delà de 50, renvoie un contrat beaucoup trop large, confond deux statuts avec « Résolu » et ne distingue pas les exercices des incidents réels.

## Baselines

- Branche isolée : `audit/organization-incident-list`
- Code audité : `4871f31823682a73bbd3e5af9e1c12ac3bbc52d2`
- Référence applicative production communiquée et vérifiée au démarrage : `205eb1283b7de71a338e36647ecb5c91b6ed0784`
- Les deux références ne sont pas assimilées.
- Images QA construites localement depuis le candidat exact; aucune publication d’image.

## Méthode

1. Cartographie du portail Client, du contrôleur Client, du contrôleur interne et du service Incident.
2. PostgreSQL 16 isolé et chaîne complète de 167 migrations.
3. Deux organisations, deux bâtiments, ClientUsers aux portées distinctes et 65 incidents synthétiques, dont 62 dans le bâtiment mesuré.
4. Authentification MFA locale; egress externe bloqué; aucun fournisseur réel.
5. API réelle, tests d’état ciblés et Chrome sur 12 configurations.
6. Aucune mutation ou donnée de production.

## Fonctionnement réel

La page est un historique **par bâtiment**, pas une liste multi-bâtiments de l’application Organisation. Elle affiche le type, le statut, la date/heure de survenue, une durée si résolu, la procédure, la progression des étapes de coordination et la présence d’un REX. Elle propose « Tous », « Résolus », « En cours », « Actualiser » et l’ouverture du détail.

Elle ne propose pas de recherche, tri, pagination, création rapide ou action métier de ligne. Ces fonctions sont donc `NOT_APPLICABLE` plutôt que déclarées réussies.

## Résultats clés

- Autorité Client : PASS pour corporate; PASS pour manager affecté après permission synthétique; refus sans contenu pour sans-bâtiment, autre organisation et anonyme.
- Volume : FAIL, 50 reçus sur 62.
- Contrat : FAIL, projection non minimisée.
- Statuts : FAIL pour `PRE_ALERT` et `CANCELLED`.
- Exercice/réel : FAIL, absence de distinction visuelle.
- États erreur/reprise : PASS dans les tests d’état ciblés; scénario 503 en navigateur `NOT_VERIFIED` car l’interception CDP n’a capturé aucune requête.
- Réponse tardive : PASS par identifiant de requête et non-régression existante.
- Chrome : 9/12 PASS; les trois formats 390×844 échouent le seuil mesuré de 40 px pour au moins une cible interactive. Aucun débordement horizontal critique.
- Lecteur d’écran réel : NOT_VERIFIED.

## Tests exécutés

- `npm run test:incident-history` : 11/11 PASS.
- Build backend exact : PASS.
- Build portail exact avec le jeton Glass du pipeline gouverné : PASS.
- Build frontend requis par le stack permanent : PASS.
- Migration depuis zéro : 167/167 PASS.
- Acceptation API réelle : exécutée; défaut de volume reproduit.
- Acceptation Chrome : exécutée sur les 12 configurations; 9 PASS et 3 FAIL à 390 px.

## Preuves assainies

- `D:\CORO-QA\tracking\organization-incident-list\incident-list-api-acceptance.json`
- `D:\CORO-QA\tracking\organization-incident-list\incident-list-browser-acceptance.json`
- `D:\CORO-QA\tracking\organization-incident-list\browser\*.png`
- `D:\CORO-QA\runs\incident-list\stack-manifest.json`

## Limites

- La fiche détaillée n’a été ouverte que pour vérifier destination et autorité.
- Aucun incident réel n’a été créé, modifié ou fermé.
- Aucun envoi externe, alarme, évacuation ou mobilisation n’a été déclenché.
- La restitution vocale par lecteur d’écran réel reste `NOT_VERIFIED`.
- Le scénario navigateur 503/reprise reste `NOT_VERIFIED`; la logique équivalente est couverte par les tests ciblés.
- La vérification authentifiée de production reste `NOT_VERIFIED`, faute de session CORO légitime disponible.

## Suite

Le lot proposé dans `INCIDENT-LIST-CORRECTION-BATCH.md` doit être autorisé séparément. Cet audit ne contient aucune correction produit, aucun push, aucune PR, fusion ou livraison.
