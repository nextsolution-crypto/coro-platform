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

## CI de la PR

PR : #209.

- Backend security checks `42125114269` : PASS;
- Client Portal checks `42125114389` : PASS;
- validation principale `42125114625` : backend-tests, quatre typechecks et client-portal-build PASS;
- build-images et production-release : SKIPPED comme attendu sur une PR;
- aucun appel fournisseur, secret de production ou envoi réel pendant la CI.

## Revue SP-OPS-03C — défense au niveau du transport

L'inventaire exhaustif des appels à `DemoCommunicationPolicyService.evaluate()` couvre l'authentification, les invitations, le portail client, les réservations, les imports, les procédures, les rappels, l'occupation, les organisations et Population. Le transport Brevo Population est partagé : le nom d'opération ne constitue donc plus une autorisation.

La politique reconstruit maintenant la preuve canonique depuis `PopulationAlertDelivery` immédiatement avant l'appel fournisseur. La décision LIVE exige simultanément :

- le tenant et le programme configurés hors Git;
- l'alerte et la livraison exactes fournies par le worker Population;
- un programme ACTIVE en `DUAL_CONTROL`;
- une alerte `TEST`, `SENDING`, figée en LIVE et correctement étiquetée;
- un approbateur distinct du créateur;
- exactement un abonné, un courriel et un SMS;
- la livraison `SENDING`, non supprimée, avec canal, destination et clé d'idempotence identiques à la base;
- PAUSED/BLOCK non actif et le bouton STOP toujours désactivé.

Cas négatifs ajoutés : usurpation du nom d'opération sans contexte, contexte canonique absent, campagne modifiée avant transport, livraison déjà envoyée, destination/idempotence divergentes, tenant/programme non concordants et STOP/PAUSED prioritaires. Un échec retombe en SIMULATED ou BLOCKED et n'atteint jamais `fetch`.

Validation locale du candidat SP-OPS-03C : 354/354 tests ciblés PASS, build backend PASS, audit de production 0 vulnérabilité et `git diff --check` PASS. La suite complète produit 2 499 PASS et 5 SKIPPED; 7 cas indépendants échouent localement parce que le sandbox Windows refuse les sous-processus Office/OCR et `credential_process` (`spawn EPERM`). Le lint ciblé expose uniquement la dette stricte déjà présente dans ces grands fichiers; aucune règle n'a été désactivée. La CI Linux du nouveau HEAD reste le gate terminal pour ces contrôles d'environnement.

CI du HEAD produit `563e2ab963ccdf82d9da1b00347e2615854c2a80` :

- Backend PR Checks `42130789036` : PASS;
- Client Portal PR Checks `42130789061` : PASS;
- Validate and Release Production `42130789007` : backend-tests, quatre typechecks et client-portal-build PASS;
- build-images et production-release : SKIPPED comme attendu sur une PR;
- aucun workflow fournisseur, LIVE ou production exécuté.
