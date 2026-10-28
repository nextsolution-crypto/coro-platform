# CORO WEB-AI-FINAL — Acceptation documentaire

## Verdict local

`PASS_LOCAL_WITH_PRODUCTION_ACTIVATION_CONDITION`.

Le parcours réel local utilise l'API NestJS, PostgreSQL 16, l'identité SQL publique minimale, le corpus version `2026-10-27` et le widget Next.js. Les réponses FR-CA et EN-CA affichent uniquement un message déterministe, les sources classées, leurs extraits, versions et URL canoniques. Les suggestions proviennent du registre de navigation.

Sans résultat, le système s'abstient. Si la recherche ou l'API est indisponible, le widget conserve un message explicite, les liens Accueil/Contact et les questions approuvées. Aucun appel génératif n'est effectué dans ces chemins.

L'activation en production reste interdite tant que l'identité SQL publique, le corpus et les flags documentaires n'ont pas été vérifiés par inspection gouvernée.
