# Constats — fiche Incident

Candidat produit validé : `9ed296186733934395e757ca90133f4606b28c4e`.

| ID | Constat initial | Correction démontrée | Statut |
|---|---|---|---|
| ID-01 | Le détail exposait jeton public et snapshots excessifs. | Projection explicite; aucun jeton; occupants réduits au comptage et équipe aux champs utiles. | CLOS |
| ID-02 | L’auteur du journal pouvait être fourni par le navigateur. | Acteur et identifiant dérivés de la session serveur; DTO strict. | CLOS |
| ID-03 | Deux appels `contain` produisaient deux journaux. | Transaction, verrou optimiste, rejeu idempotent et verrou client synchrone; un seul effet. | CLOS |
| ID-04 | La résolution sans motif était acceptée. | Motif non vide obligatoire; refus HTTP 400 sans écriture. | CLOS |
| ID-05 | La date REX pouvait être fournie par le navigateur. | Date attribuée par le serveur; champ technique absent du DTO. | CLOS |
| ID-06 | La lecture Organisation ne démontrait pas l’autorité Incident. | Autorité `INCIDENT_READ` vérifiée avant le détail. | CLOS |
| ID-07 | Une 503 était affichée comme incident introuvable. | États 403/404/503 distincts, alerte accessible et reprise. | CLOS |
| ID-08 | Un snapshot mal formé faisait tomber la fiche. | Normalisation défensive et avertissement visible sans masquer les données valides. | CLOS |
| ID-09 | L’impression interpolait du contenu persistant non échappé. | Échappement de tous les champs; aucune charge exécutée; libellé « Imprimer le rapport » et limite légale explicite. | CLOS |
| ID-10 | Exercice, statut, responsable et fraîcheur étaient absents. | Nature, statut canonique, responsable explicite et date de mise à jour affichés. | CLOS |
| ID-11 | Cibles tactiles sous 44 px. | Contrôles mesurés conformes dans les 12 configurations. | CLOS |
| ID-12 | Les thèmes Glass n’étaient pas identifiables. | Classic, Glass Light et Glass Dark appliqués et capturés. | CLOS |
| ID-13 | Chronologie sans départage stable. | Ordre `timestamp`, puis identifiant; égalité testée. | CLOS |
| ID-14 | Statuts d’impression et affirmations de conformité non gouvernées. | Libellés canoniques, statut inconnu explicite et affirmations non démontrées retirées. | CLOS |

## Réconciliation de production

Les constats `ID-01` à `ID-14` sont fusionnés et déployés au SHA `7184456f42d43429d38ccbdaa87f141df774a2c9`. La preuve QA reste l'autorité pour les mutations, la concurrence, la résolution et les refus sans effet secondaire. Aucune mutation de production n'a été effectuée.

## Limites conservées

- Lecteur d’écran réel : `NOT_VERIFIED`.
- Vérification authentifiée de production : `NOT_VERIFIED` et hors du point d’arrêt de cette PR.
- Impression HTML : ce n’est ni un PDF officiel, ni une preuve PDF/UA, ni une validation juridique.
- Aucun fournisseur externe ni notification réelle n’a été exercé.
