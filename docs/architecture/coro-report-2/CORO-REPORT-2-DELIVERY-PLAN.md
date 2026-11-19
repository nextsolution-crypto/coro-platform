# CORO Report 2.0 — Plan de développement, tests et recette

## Lots

1. **R2-01 — Contrats et modèles** : schéma 1.1, conditions composées,
   contraintes typées, 12 fixtures DRAFT, tests purs. Réversible par flag.
2. **R2-02 — UX progressive** : sections, résumé d’erreurs, autosauvegarde,
   reprise, répétables typés, aperçu, mobile. Aucun changement de données.
3. **R2-03 — Recherche et suivis** : filtres canoniques, historique et liens
   Followups/Ops par référence.
4. **R2-04 — Import staging** : modèles additifs, upload privé et analyse
   isolée; aucune écriture de rapport.
5. **R2-05 — Mapping/preview** : catalogue, règles, conflits et validation.
6. **R2-06 — Exécution/reprise** : batches idempotents, réconciliation et
   rollback borné.
7. **R2-07 — Archives** : consultation read-only, recherche et limites de preuve.
8. **R2-08 — Pilote** : archives synthétiques pluriannuelles, puis échantillon
   client anonymisé sous autorisation distincte.

Chaque lot a sa PR, CI, revue sécurité et flag désactivé par défaut. Aucune
production ni activation n’est incluse dans ce plan.

## Tests obligatoires

- schémas invalides, conditions, listes et répétables bornés;
- autosauvegarde, conflit 409, interruption/reprise et idempotence;
- validation client/serveur cohérente et contenu masqué rejeté;
- fichiers déguisés, malware, ZIP bomb, XXE, macros et dépassements de quotas;
- encodages, dates ambiguës, valeurs inconnues et mapping manuel;
- doublons, conflits, reprise après crash et rollback limité;
- PostgreSQL réel, contraintes composites et concurrence;
- refus intertenant/interbâtiment et permissions sensibles;
- PDF multipages, pièces jointes, provenance et immuabilité;
- bureau, tablette, téléphone, clavier et lecteurs d’écran (humain).

## Critères de recette commerciale

- les 12 modèles passent création → brouillon → soumission → correction →
  approbation → PDF avec deux identités;
- aucune donnée masquée ou non autorisée n’est acceptée par l’API;
- un job synthétique pluriannuel reprend après interruption sans doublon;
- total source = importé + conflit + rejeté + non mappé;
- chaque valeur originale et chaque pièce jointe sont retrouvables;
- un rollback de job non clôturé ne touche aucun rapport natif;
- un rapport historique approuvé reste non éditable;
- la parité exacte demeure NOT_VERIFIED jusqu’au pilote client.

## Procédure de migration pilote

1. Accord client, minimisation et export anonymisé représentatif.
2. Copie en stockage privé de test et empreinte.
3. Analyse sans mutation, inventaire et rapport de qualité.
4. Mapping revu conjointement, avec statut par champ.
5. Preview et rapprochement des cardinalités.
6. Import d’un petit lot dans un tenant isolé.
7. Contrôle visuel, recherche, pièces jointes et limites de preuve.
8. Reprise/rollback démontrés.
9. Acceptation écrite des écarts.
10. Planification gouvernée; aucun import production implicite.

## Risques résiduels

- formats d’export et champs exacts Reportperfect inconnus;
- qualité et encodage des archives clients;
- identités historiques impossibles à résoudre;
- pièces jointes manquantes ou corrompues;
- données personnelles dépassant la finalité actuelle;
- coûts de stockage, indexation et rétention;
- aucune équivalence de signature/approbation historique vers CORO.
