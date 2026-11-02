# Acceptation finale et décisions ouvertes

## Statut courant

`MASTER_CLOS_AVEC_RÉSERVES_EXPLICITES — INVITATION_ET_LECTEUR_ÉCRAN_EN_ATTENTE_HUMAINE`

Réconciliation autoritative : le produit actif vérifié est `c91543efdf34c6429d1877a0b92f0a28567b5bb7`, migration 166. La release `41360598223` et l'inspection `41361880281` sont réussies. Bibliothèque → Knowledge/CORO AI authentifié est livré; Bedrock réel reste désactivé. L'inventaire stockage `41361883831` est strictement en lecture seule et n'a supprimé aucun objet.

Le manifeste autoritatif post-release remplace les baselines historiques. La baseline active est désormais `b0183e56c0b84a7b8eb3c7f9d55efef7345c83d5`, migration 166, release `41365428137`, inspection `41366771019` `PASS/GO`.

La décision `PROGRESSION_DÉCLARÉE` est livrée et vérifiée en production : listes, fiche Projet, Dashboard et administration emploient le libellé approuvé; la fiche explique qu'il s'agit d'une valeur manuelle persistée et distincte du score qualité. La décision `PDF_UA_EXCLU_V1` est enregistrée sans revendication de certification.

## Décisions et validations humaines attendues

| Sujet | Pourquoi une intervention humaine peut rester nécessaire | Préparation technique à terminer avant sollicitation |
| --- | --- | --- |
| Invitations internes | `info@getcoro.io` correspond déjà à un `User`; la création QA isolée a été refusée atomiquement avant outbox | autoriser un destinataire QA distinct ou un alias explicitement approuvé; ne pas réaffecter, désactiver ni modifier le compte existant |
| Lecteur d’écran | restitution vocale réelle non déductible du DOM | exécuter `SCREEN-READER-HUMAN-ACCEPTANCE.md` et retourner le formulaire de constat |

## Preuve navigateur Knowledge

Le 2026-11-02, la session ClientUser autorisée a obtenu une réponse sur la procédure Bibliothèque PC014, puis ouvert la citation `/knowledge/library-sources/60c2367b-df50-418e-a62e-fdd3ce4db9fb`. La page a confirmé la portée globale, la version `2026-08-23T21:09:43.289Z`, le contenu PC014 et l'empreinte SHA-256 `81fb773211443a2d48e928e31eb51d6bccd5dfd1c60caa385de819ad72e4943d`; F5 a conservé le résultat et les droits.

L'interface indiquait `CORO AI · AWS Canada`, état déjà actif avant cette vérification. Aucun fournisseur, flag ou secret n'a été activé ou modifié. Cette preuve valide le chemin de récupération et d'ouverture de citation; elle ne vaut pas acceptation générale de génération IA, de coût, de qualité ou de disponibilité fournisseur.

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

1. fournir un destinataire QA distinct autorisé pour l'invitation interne : la tentative vers `info@getcoro.io` a été refusée pour collision avant création/outbox; aucune réception n'est attendue et aucune remise en état n'est nécessaire pour cette tentative;
2. exécution de `SCREEN-READER-HUMAN-ACCEPTANCE.md` avec NVDA, JAWS ou VoiceOver;
3. la citation Bibliothèque est désormais vérifiée en Chrome; aucune activation fournisseur n'a été effectuée, mais le fournisseur AWS était déjà signalé actif et reste exclu du verdict global de génération.

Le stockage reste une réserve de qualification : les 116 candidats sont catégorisés, mais aucun n'est démontré supprimable. Le rollback est prêt et répété en environnement isolé, sans prétendre à une exécution réelle de production.

Le MASTER ne recevra aucun statut global « 100 % ». Il peut être clos avec les exclusions et réserves explicites ci-dessus après livraison des libellés approuvés; les preuves humaines non réalisables demeurent `NOT_VERIFIED`.

Le lot des divergences historiques est clos par l’inventaire production `41356195887` : aucune ligne de conflit et aucune organisation affectée. Le stockage reste ouvert : les 116 objets non rapprochés sont des candidats, pas des orphelins démontrés.
