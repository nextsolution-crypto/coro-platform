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
