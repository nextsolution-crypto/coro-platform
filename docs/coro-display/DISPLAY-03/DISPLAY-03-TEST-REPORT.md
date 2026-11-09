# DISPLAY-03 — Rapport de tests

Environnement : PostgreSQL 16 jetable `coro-display03-postgres`, sans donnée réelle.

Résultats :

- chaîne complète de 178 migrations depuis zéro : PASS;
- Prisma validate/generate : PASS;
- TypeScript, ESLint ciblé, build Nest : PASS;
- rendu déterministe/proportions/repère et refus PDF explicite : 2/2 PASS;
- parcours PostgreSQL création, rendu, revue indépendante, approbation, publication, contrat Player, historique, révocation : PASS;
- refus auto-revue et inter-bâtiment : PASS;
- suite applicative : 2 691 PASS, 6 SKIPPED; les 7 échecs initiaux étaient liés aux processus bloqués. Réexécution : AWS PASS; 1 test OCR historique demeure NOT_VERIFIED car `pdftoppm` est absent.

Aucun test n’a utilisé de production ou de plan sensible.
