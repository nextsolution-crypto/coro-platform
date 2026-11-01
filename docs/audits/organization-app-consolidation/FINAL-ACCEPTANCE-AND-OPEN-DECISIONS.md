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
| PDF/UA | inclusion contractuelle ou exclusion explicite V1 | choisir `PDF_UA_INCLUS_CONTRACTUELLEMENT` ou `PDF_UA_EXCLU_V1` |
| Progression Projet | aucune règle actuelle ne permet de transformer objectivement l’avancement documentaire en pourcentage | choisir `JALONS_GOUVERNÉS` ou `PROGRESSION_DÉCLARÉE` |

## Exclusions maintenues

- PGC, PRA et PUE : aucun parcours documentaire complet validé.
- Signature fournisseur réelle et valeur juridique : non validées.
- Géocodage public : désactivé; aucune activation implicite.
- OSM : dépendance facultative sans SLA.
- Assistant public : aucun accès au catalogue Bibliothèque interne; cette isolation est désormais couverte par non-régression.

## Verdict final

Les travaux indépendants autorisés sont achevés et livrés. Les réserves restantes dépendent exclusivement d'une preuve ou d'une décision humaine :

1. connexion ADMIN/SUPER_ADMIN à `https://app.getcoro.io/settings/users`, puis confirmation immédiate de l'envoi unique vers `info@getcoro.io`; constat humain séparé de la réception et du lien; nettoyage de l'identité QA après la recette;
2. exécution de `SCREEN-READER-HUMAN-ACCEPTANCE.md` avec NVDA, JAWS ou VoiceOver;
3. décision `PDF_UA_INCLUS_CONTRACTUELLEMENT` ou `PDF_UA_EXCLU_V1`;
4. décision `JALONS_GOUVERNÉS` ou `PROGRESSION_DÉCLARÉE`.

Le stockage reste une réserve de qualification : les 116 candidats sont catégorisés, mais aucun n'est démontré supprimable. Le rollback est prêt et répété en environnement isolé, sans prétendre à une exécution réelle de production.

Le MASTER ne recevra aucun statut global « 100 % ». Sa clôture finale reste suspendue uniquement aux preuves et décisions humaines listées ci-dessus; les travaux techniques indépendants sont terminés.

Le lot des divergences historiques est clos par l’inventaire production `41356195887` : aucune ligne de conflit et aucune organisation affectée. Le stockage reste ouvert : les 116 objets non rapprochés sont des candidats, pas des orphelins démontrés.
