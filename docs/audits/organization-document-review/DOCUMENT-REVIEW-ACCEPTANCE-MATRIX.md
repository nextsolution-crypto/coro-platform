# Matrice d'acceptation — révision documentaire

| Domaine | Scénario | Statut | Preuve / limite |
|---|---|---|---|
| Baseline | SHA candidat exact | PASS | `fbccdd1c...` |
| Base | PostgreSQL 16, 159 migrations | PASS | base jetable, tête 20261112010000 |
| Soumission | projet affecté actif | PASS | chemin serveur existant |
| Soumission | répétition même auteur | PASS | idempotence légère en `REVIEW` |
| Soumission | document complet/incomplet | NOT_VERIFIED | aucune règle serveur de complétude identifiée |
| Soumission | projet archivé | FAIL | `ARCHIVED → REVIEW` démontré |
| Soumission | projet désactivé | FAIL | prédicat mutable/actif absent; parcours HTTP non exécuté |
| Réviseur | choix/affectation | NON_APPLICABLE | fonction absente |
| Réviseur | administrateur indépendant | PASS | rôle + séparation du soumetteur |
| Réviseur | opérateur | FAIL | capacité UI vraie, mutation serveur refusée |
| Révision | observations auteur affecté | PASS | CRUD disponible |
| Révision | opérateur non affecté | FAIL | création PostgreSQL démontrée |
| Révision | autre organisation | PASS | filtre `organizationId`; HTTP complet non rejoué |
| Décision | auto-approbation | PASS | refus explicite |
| Décision | approbation liée au contenu | FAIL | aucune identité/empreinte documentaire |
| Décision | rejet distinct | NON_APPLICABLE | même endpoint que retour |
| Décision | motif obligatoire | FAIL | UI partielle; API facultative |
| Décision | retour après validation/export | PASS | transition réelle vers `IN_PROGRESS` |
| Versions | création à l'approbation | PASS | `ProjectVersion` créée |
| Versions | snapshot immuable du contenu | FAIL | métadonnées de décision uniquement |
| Versions | nouvelle version après correction | PARTIAL | numérotation existe; invalidation/binding absent |
| Concurrence | deux approbations | FAIL | absence de transaction et calcul read-then-create |
| Concurrence | approbation/refus | FAIL | aucune transition conditionnelle atomique |
| Concurrence | panne entre version et statut | FAIL | version partielle démontrée |
| Reprise | réponse perdue côté UI | PARTIAL | relecture d'état présente |
| Reprise | notification fournisseur en panne | PARTIAL | décision conservée, livraison perdue possible |
| Audit | approbation | PARTIAL | événement après mutation, non atomique |
| Audit | soumission/retour/observations | FAIL | événement canonique absent |
| Notifications | fournisseurs simulés | PARTIAL | appels secondaires inspectés, destinataires non E2E |
| Notifications | livraison réelle | NON_APPLICABLE | hors périmètre |
| PMU | scénario synthétique PostgreSQL | FAIL | défauts REVIEW-001/003/004 |
| PSI | chemin partagé | PARTIAL | caractérisation unitaire |
| PCA | parcours complet | NOT_VERIFIED | aucune preuve navigateur/API complète |
| Responsive | 390 × 844 | NOT_VERIFIED | campagne non exécutée |
| Responsive | 768 × 1024 | NOT_VERIFIED | campagne non exécutée |
| Responsive | 1440 × 900 | NOT_VERIFIED | campagne non exécutée |
| Responsive | 2560 × 1440 | NOT_VERIFIED | campagne non exécutée |
| Accessibilité | clavier/focus/zoom 200 % | NOT_VERIFIED | campagne non exécutée |
| Accessibilité | lecteur d'écran réel | NOT_VERIFIED | outil non exécuté |

## Règles établies

- Seuls `ADMIN` et `SUPER_ADMIN` peuvent approuver ou retourner en correction.
- Le soumetteur ne peut pas approuver sa propre soumission.
- La soumission répétée par le même utilisateur en `REVIEW` est idempotente.
- L'éditeur sécurisé refuse la mutation de contenu lorsque le projet n'est pas
  `DRAFT` ou `IN_PROGRESS`; cette règle n'est cependant pas reliée à une
  identité de révision soumise.

## Règles absentes ou implicites

- définition de la complétude avant soumission;
- identité/version exacte soumise;
- affectation d'un réviseur et réviseur inactif;
- décision de rejet distincte;
- motif obligatoire par transition;
- multi-réviseur/quorum;
- invalidation après changement canonique;
- idempotency key de décision;
- contrat durable de notification;
- politique d'accès en lecture seule.
