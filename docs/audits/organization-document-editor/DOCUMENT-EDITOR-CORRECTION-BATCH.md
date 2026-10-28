# Lot de correction — sécurité et intégrité

## Candidat

- Assainissement serveur commun des contenus JSON/HTML, historique compris à la lecture.
- Autorité projet et contrôles d’état communs aux mutations, modules spécialisés, procédures et versions.
- Concurrence atomique par `Document.lockVersion` et `FOR UPDATE`.
- Liste des versions minimisée et snapshot lu par endpoint explicite.
- Audit des réussites sans contenu complet.
- Protection frontend des saisies non sauvegardées et affichage des conflits.

## Migration

`20261112010000_document_editor_integrity` ajoute `Document.lockVersion INTEGER NOT NULL DEFAULT 0`. Après intégration ordonnée de la gouvernance de génération, la chaîne finale de 159 migrations passe depuis zéro sur PostgreSQL 16 jetable. Aucune migration de production n’a été exécutée pendant cette QA.

## Contrat de concurrence

Toute mutation exige `expectedLockVersion`. Le serveur verrouille, recharge autorité/états/version et écrit dans une transaction. Une version obsolète retourne HTTP 409 `DOCUMENT_VERSION_CONFLICT`. Aucun retry ou fusion implicite; un refus ne produit ni écriture partielle ni audit métier de réussite.

## Politique de contenu

Paragraphes, titres, listes, tableaux, citations, code, liens et images limités sont permis. Protocoles : `http`, `https`, `mailto`, `tel`. Scripts, `on*`, style arbitraire, SVG/MathML et protocoles exécutables sont interdits. L’historique n’est pas réécrit.

## QA

- Jest ciblé : 4 suites, 27 tests, PASS.
- Builds backend et frontend/TypeScript : PASS (72 routes).
- E2E API/PostgreSQL/Chrome : 14/14; navigateur 12/12.
- Lint des services centraux : PASS; aucun assouplissement ESLint.
- `git diff --check` : PASS.

La suite backend globale conserve des échecs hors périmètre dans les tests d’extraction Office dépendant de délais et du binaire local `pdftoppm`. Les tests de sécurité affectés et les builds passent.

Restent : automatiser 503, réponse perdue, annulation de navigation, zoom 200 % et lecteur d’écran; décider ultérieurement d’une permission documentaire interne plus fine; ne pas annoncer PGC/PRA/PUE comme validés.
