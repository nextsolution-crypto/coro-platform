# SP-OPS-03 — QA sécurité

## Résultats

- TypeScript backend : PASS.
- Build backend : PASS.
- Build Next.js portail : PASS.
- Tests consolidés du garde contrôlé, de la politique Démo, de Population et du transport : 350/350 PASS.
- `git diff --check` : PASS.
- Audit des dépendances de production backend et portail : 0 vulnérabilité rapportée.

## Cas prouvés

- un courriel et un SMS exacts vers un seul abonné;
- refus d'une destination hors allowlist;
- refus d'un roster dupliqué;
- refus lorsque créateur et approbateur sont identiques;
- refus d'un contexte autre que TEST;
- refus lorsque le TFN n'est pas approuvé;
- arrêt d'urgence prioritaire;
- PAUSED/BLOCK prioritaire à l'exception contrôlée;
- aucun secret/destinataire brut persisté par la politique Démo;
- anciennes simulations Population inchangées.

## Limites

Les preuves sont locales et utilisent le fournisseur simulé. Aucun appel Brevo, aucun SMS, aucun courriel réel et aucun test de webhook public n'ont été exécutés. Une recette navigateur complète du futur essai réel reste conditionnée par l'autorisation d'envoi distincte.

## Revalidation SP-OPS-03B

Baseline réconciliée : `c255fd6650ae38465f2f28c1e240035287a9e3c9`.

- tests ciblés : 350/350 PASS;
- TypeScript backend et portail : PASS;
- build backend et build Next.js portail : PASS;
- contrats Population du portail : 9/9 PASS;
- audits de dépendances de production : 0 vulnérabilité rapportée;
- `git diff --check` : PASS;
- recherche de secrets et destinations : seules les valeurs synthétiques `.test` des tests sont présentes.

La suite backend complète locale a produit 2 503 PASS, 5 SKIPPED et 1 échec d'environnement indépendant du lot : `pdftoppm` absent sur le poste Windows pour un test OCR Knowledge. La CI Linux installe ce runtime avant la suite; son résultat terminal sur le HEAD publié constitue le gate de non-régression.
