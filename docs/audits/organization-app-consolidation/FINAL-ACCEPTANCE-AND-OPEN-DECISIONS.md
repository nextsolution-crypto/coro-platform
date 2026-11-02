# Acceptation finale et décisions ouvertes

## Statut courant

`TRAVAUX_INDÉPENDANTS_LIVRÉS — DÉCISIONS_HUMAINES_RESTANTES`

Réconciliation autoritative : le produit actif vérifié est `c91543efdf34c6429d1877a0b92f0a28567b5bb7`, migration 166. La release `41360598223` et l'inspection `41361880281` sont réussies. Bibliothèque → Knowledge/CORO AI authentifié est livré; Bedrock réel reste désactivé. L'inventaire stockage `41361883831` est strictement en lecture seule et n'a supprimé aucun objet.

Le manifeste autoritatif post-release remplace la baseline historique `91c1313c…` / migration 165. La baseline active est désormais `c91543efdf34c6429d1877a0b92f0a28567b5bb7`, migration 166.

## Décisions et validations humaines attendues

| Sujet | Pourquoi une intervention humaine peut rester nécessaire | Préparation technique à terminer avant sollicitation |
| --- | --- | --- |
| Invitations internes | session ADMIN/SUPER_ADMIN puis constat de réception et utilisation du lien reçu à `info@getcoro.io` | ouvrir `https://app.getcoro.io/settings/users`; aucune autre autorisation métier n’est requise, mais l’envoi final exige confirmation immédiate |
| Lecteur d’écran | restitution vocale réelle non déductible du DOM | exécuter `SCREEN-READER-HUMAN-ACCEPTANCE.md` et retourner le formulaire de constat |

## Décisions Mathieu enregistrées le 2026-11-01

- `PDF_UA_EXCLU_V1` : PDF/UA est exclu du périmètre contractuel V1; aucune certification n’est revendiquée.
- `PROGRESSION_DÉCLARÉE` : la progression Projet demeure une valeur manuelle persistée, distincte du score qualité; aucun calcul automatique ni jalon implicite.

## Exclusions maintenues

- PGC, PRA et PUE : aucun parcours documentaire complet validé.
- Signature fournisseur réelle et valeur juridique : non validées.
- Géocodage public : désactivé; aucune activation implicite.
- OSM : dépendance facultative sans SLA.
- Assistant public : aucun accès au catalogue Bibliothèque interne; cette isolation est désormais couverte par non-régression.

## Verdict final

Les décisions produit sont arrêtées. Les preuves humaines restantes sont :

1. connexion ADMIN/SUPER_ADMIN à `https://app.getcoro.io/settings/users`, puis confirmation immédiate de l'envoi unique vers `info@getcoro.io`; constat humain séparé de la réception et du lien; nettoyage de l'identité QA après la recette;
2. exécution de `SCREEN-READER-HUMAN-ACCEPTANCE.md` avec NVDA, JAWS ou VoiceOver;
3. ouverture authentifiée d’une citation Bibliothèque dans Chrome, sans activation de fournisseur IA réel.

Le stockage reste une réserve de qualification : les 116 candidats sont catégorisés, mais aucun n'est démontré supprimable. Le rollback est prêt et répété en environnement isolé, sans prétendre à une exécution réelle de production.

Le MASTER ne recevra aucun statut global « 100 % ». Il peut être clos avec les exclusions et réserves explicites ci-dessus après livraison des libellés approuvés; les preuves humaines non réalisables demeurent `NOT_VERIFIED`.

Le lot des divergences historiques est clos par l’inventaire production `41356195887` : aucune ligne de conflit et aucune organisation affectée. Le stockage reste ouvert : les 116 objets non rapprochés sont des candidats, pas des orphelins démontrés.
