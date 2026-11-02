# Lot correctif livré pour revue — liste des incidents

## Contenu

1. DTO validé et projection minimale.
2. Pagination serveur, total filtré et compteurs complets.
3. Recherche type/procédure, tri stable et filtres serveur.
4. Libellés exhaustifs des statuts et repli non trompeur.
5. Distinction canonique et filtrable des exercices.
6. États UX distincts, reprise après 503 et neutralisation des réponses obsolètes.
7. Cibles tactiles de 44 px et pagination responsive.
8. Harnais API/PostgreSQL et Chrome couvrant volumétrie, sécurité et 12 configurations.

## Contrat

- Page : entier ≥ 1; taille : 1 à 100.
- Recherche : 80 caractères maximum sur code/libellé du type et `procedureCode`.
- Statut : valeur explicite ou `OPEN` (`PRE_ALERT`, `ACTIVE`, `CONTAINED`).
- Nature : tous, incident réel ou exercice.
- Tri : date de survenue, statut ou type; départage systématique par identifiant.

## Résultat

Tous les critères sont démontrés dans le stack QA isolé. **ACCEPTATION_INTÉGRÉE_PASS — PR_READY**.

Hors périmètre : fiche détaillée, transitions métier, communications, Ops, évacuation, fournisseurs externes, autorité globale de responsable/sévérité, lecteur d’écran réel et production.
