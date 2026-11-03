# États et permissions — fiche Incident

## États observés

`PRE_ALERT`, `ACTIVE`, `CONTAINED`, `RESOLVED`, `CANCELLED`.

| Opération | Permission | Garde actuelle | Écart |
|---|---|---|---|
| Lire détail/historique | INCIDENT_READ | Portail : permission + accès incident; Organisation : rôle/permission + organisation | Organisation ne démontre pas la portée bâtiment sur le détail. |
| Ajouter journal | INCIDENT_SUPERVISE | Portail : permission + affectation + accès; Organisation : permission seulement | Auteur client accepté; Organisation sans affectation explicite. |
| Contenir | INCIDENT_COMMAND | Affectation active; incident actif dans PRE_ALERT/ACTIVE/CONTAINED | `CONTAINED -> CONTAINED` accepté et doublonné. |
| Résoudre | INCIDENT_COMMAND | Affectation active | Motif facultatif; transitions source non déclarées; pas de verrou reçu. |
| Confirmer/annuler préalerte | INCIDENT_COMMAND | Résolution préalerte transactionnelle | Hors périmètre détaillé; tests existants passent. |
| Modifier REX | INCIDENT_SUPERVISE | Affectation active + accès Portail | Date technique client, pas de version ni audit atomique. |
| Tâche accuser/compléter | INCIDENT_TASK_PARTICIPATE | Autorité parent + verrou dans les services gouvernés | Tests existants PASS; UI de détail principalement en lecture. |
| Réaffecter/escalader | INCIDENT_SUPERVISE | Autorité parent et contrôles dédiés | Tests existants PASS; recette fournisseur limitée au simulé. |

## Machine attendue à décider

Le code ne constitue pas une machine d'états unique. Le lot correctif doit faire approuver précisément :

1. `PRE_ALERT -> ACTIVE` ou `CANCELLED` seulement;
2. `ACTIVE -> CONTAINED` ou `RESOLVED`;
3. `CONTAINED -> RESOLVED`;
4. `RESOLVED` et `CANCELLED` terminaux tant qu'aucune réouverture gouvernée n'existe;
5. motif obligatoire pour résolution/annulation et règle explicite pour containment;
6. comportement des tâches à la clôture et politique de reprise.

Cette proposition n'est pas présentée comme une décision métier approuvée.

## Atomicité requise

La mise à jour d'état, le journal, l'audit, les tâches, la révocation du jeton public et la création outbox doivent partager une transaction et une clé d'idempotence. Le fournisseur doit être appelé par worker après commit; une acceptation fournisseur ne doit jamais précéder l'écriture gouvernée.
