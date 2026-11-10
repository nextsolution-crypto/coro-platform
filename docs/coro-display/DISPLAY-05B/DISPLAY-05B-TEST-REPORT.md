# DISPLAY-05B — Rapport de tests

Résultats exécutés :

- Prisma 6.19.3 : schéma valide.
- PostgreSQL 16 jetable, port 55459 : 180 migrations appliquées; seconde passe sans migration en attente; deux tables et contrainte de coordonnées présentes.
- Régression PostgreSQL DISPLAY-03 : 1/1 PASS.
- Tests client Display : 6/6 PASS.
- Tests auth client : 2/2 PASS.
- Régressions Display/Spatial : 10/10 PASS.
- Contrat portail DISPLAY-05B : PASS.
- Liquid Glass et navigation : 26/26 PASS; restrictions pilote : PASS.
- TypeScript backend : PASS avec heap 8 Go après OOM à la limite par défaut.
- TypeScript portail : PASS.
- Build NestJS : PASS.
- Build Next.js 16.4.2 : PASS; route `/display` générée.
- ESLint ciblé des nouveaux fichiers portail : PASS. Les erreurs historiques de `PortalLayout.tsx` restent hors périmètre.
- Scan de secrets ciblé : aucune nouvelle correspondance; une chaîne de détection PEM déjà existante est un faux positif.
- `git diff --check` : PASS.
- npm audit portail : 0 vulnérabilité. Backend : 30 vulnérabilités (3 hautes) dans la chaîne d’outillage; les correctifs proposés sont des mises à niveau majeures non appliquées.

Les tests de service couvrent la portée vide, le refus inter-bâtiment, la permission de prévisualisation, la visibilité par auteur, le refus de coordonnées incomplètes et la reprise idempotente.
