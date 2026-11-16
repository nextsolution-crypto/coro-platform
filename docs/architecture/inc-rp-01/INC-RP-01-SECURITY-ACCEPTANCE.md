# INC-RP-01 — Acceptation sécurité Lot 1

## Gates

- [x] permissions dédiées sans attribution implicite;
- [x] feature flag serveur désactivé par défaut;
- [x] organisation présente sur toutes les ressources;
- [x] références bâtiment/incident/rapport/version composites;
- [x] version soumise protégée par trigger d'immuabilité;
- [x] pièces jointes privées et état antivirus explicite;
- [x] provenance et valeurs sources non reconnues conservées;
- [x] idempotence des décisions par organisation;
- [x] rétention et suspension légale modélisées;
- [ ] autorisations runtime : Lot 2;
- [ ] antivirus réel et stockage objet : Lot 3;
- [ ] export PDF serveur : Lot 5;
- [ ] recette navigateur authentifiée : lots UI.

Risques résiduels : le JSON exige une validation serveur stricte au Lot 2;
l'identité polymorphe est stockée comme type/id et doit être résolue contre
l'autorité active à chaque action; la parité RP n'est pas démontrée.
