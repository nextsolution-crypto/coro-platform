# CORO WEB-AI-03C — Sécurité et QA

## Verdict

`PASS_LOCAL_WITH_RESERVATIONS`

## Frontières démontrées

- Corpus public WEB-AI-02 uniquement; aucun accès `ProjectFile`, tenant, bâtiment, organisation ou diagnostic.
- DTO avec liste blanche; les champs de sélection de corpus ou de fournisseur sont refusés.
- Citations résolues et validées côté serveur contre les sources récupérées.
- Liens limités aux routes publiques CORO approuvées.
- Injection directe ou issue d'un faux résultat : abstention, jamais exécution d'instruction.
- Citation inventée, source absente, sortie mal formée, conflit et information insuffisante : fail-closed.
- Fournisseur réel interdit par configuration; aucune clé, réponse ou appel externe.
- Mémoire bornée, expiration, quota de tours, limite de taille, throttling HTTP et mode dégradé.

## Matrice de régression

- Backend ciblé : 38/38 PASS.
- Website ciblé sécurité : 7/7 PASS.
- Suite website complète : 716/716 PASS.
- TypeScript website : PASS.
- Build website : PASS; sitemap statique servi lorsque l'API blogue est inaccessible.
- ESLint ciblé : PASS.
- Chrome FR/EN desktop/mobile : 4/4 PASS, aucun stockage, aucune erreur console.
- `git diff --check` : PASS lors de la clôture.

La suite backend globale a obtenu 2 235 tests réussis, 2 ignorés et un échec environnemental sans lien avec ce lot : l'exécutable externe `pdftoppm` manque pour `knowledge/office-extractor.spec.ts`. Aucun contournement n'a été ajouté.

## Données et réseau

Les 38 sources publiques gouvernées ont été synchronisées dans PostgreSQL 16 jetable. Le fournisseur de réponse est déterministe et local. Aucun appel Bedrock, Anthropic ou autre fournisseur IA n'a été effectué. Les captures ne contiennent ni secret ni donnée client.

## Risques restant avant activation

Valider une identité SQL publique réellement limitée, la configuration de production, le comportement sous charge, un lecteur d'écran réel, la correction du `lang` racine et une campagne avec fournisseur réel séparément autorisée. Les deux feature flags permettent un arrêt immédiat.
