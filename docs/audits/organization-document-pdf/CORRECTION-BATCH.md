# Lot de correction proposé — exécuté le 2026-10-29

## État d’exécution

- Lot 1 : **TERMINÉ** — autorité finale et snapshot approuvé.
- Lot 2 : **TERMINÉ** — demande durable, verrou PostgreSQL, idempotence, bail et reprise.
- Lot 3 : **PARTIAL** — UX clavier corrigée; métadonnées/langue PDF ajoutées; PDF/UA demeure hors de ce lot.
- Lot 4 : **PASS pour la fixture contrôlée / couverture générale PARTIAL** — aucune ressource HTTP arbitraire chargée, mais tous les formats historiques ne sont pas certifiés.

Les critères de clôture PMU/PSI/PCA sont démontrés dans `INTEGRATED-CORRECTION-AND-ACCEPTANCE.md`.

## Lot 1 — Autorité d’export et intégrité de version (bloquant)

1. Introduire une politique serveur explicite pour `preview` et `final`.
2. Refuser l’export final pour brouillon, archive et projet désactivé.
3. Résoudre le contenu final depuis la version approuvée canonique, pas depuis le document mutable.
4. Exiger et tracer `versionId`, statut, SHA-256, langue, modules et acteur.
5. Garantir qu’un refus ne crée ni audit `EXPORT`, ni objet, ni notification.

Tests : états projet/document, version obsolète, mutation après approbation, accès direct, multi-tenant, acteur non affecté, session révoquée.

## Lot 2 — Reprise et concurrence

Décider et documenter l’un des contrats suivants :

- export synchrone reproductible, sans promesse de reprise, avec erreur explicite; ou
- travail durable idempotent avec identifiant, état, expiration, reprise et récupération du résultat.

Tester perte de réponse, arrêt du moteur, délai, double clic, demandes simultanées et nouvelle tentative.

## Lot 3 — Accessibilité et UX

- Corriger focus initial/piège/restauration/Escape et sémantique du dialogue.
- Définir l’objectif d’accessibilité du PDF; balises PDF ou alternative HTML.
- Tester clavier, lecteur d’écran, zoom, texte long et messages d’erreur.

## Lot 4 — Ressources de rendu

- Interdire par défaut les ressources réseau non approuvées.
- Autoriser seulement les références privées canoniques nécessaires.
- Bloquer `file:`, loopback, link-local, métadonnées cloud, redirections et hôtes non autorisés.
- Borner taille, durée, nombre et format; tester les échecs sans faux succès.

## Critère de clôture

Rejouer PMU/PSI/PCA sur le HEAD corrigé, vérifier les PDF rendus et leurs hashes, la matrice 12/12, les refus sans effet secondaire, la reprise retenue et l’intégrité versionnelle. PGC/PRA/PUE restent séparément `NOT_VERIFIED` tant qu’ils ne disposent pas d’un support canonique.
