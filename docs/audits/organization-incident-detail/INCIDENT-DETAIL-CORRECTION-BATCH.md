# Lot correctif — fiche Incident

## Implémentation

- DTO stricts pour journal, containment, résolution et REX.
- Projection minimale du détail et normalisation défensive des snapshots.
- Autorité canonique avant lecture ou mutation dans Organisation et Portail Client.
- Transitions transactionnelles, optimistes et idempotentes; provenance serveur.
- UI de containment/résolution avec motif obligatoire, refus visible et verrou anti-double-clic.
- États 403/404/503 distincts, reprise, F5 et conservation d’un rendu honnête.
- Impression HTML échappée, statuts canoniques et retrait des affirmations non démontrées.
- Harnais API/PostgreSQL et Chrome couvrant concurrence, panne SQL, XSS et portée.

## Validation

- SHA produit : `9ed296186733934395e757ca90133f4606b28c4e`.
- API/PostgreSQL : 13/13 PASS.
- Chrome : 12/12 PASS; aucune erreur console critique.
- Backend ciblé : 5 suites, 37 tests PASS.
- Build backend et build Client Portal : PASS.
- `git diff --check` : PASS.
- ESLint ciblé : aucune erreur introduite ou aggravée par le lot. La baseline comptait 24 erreurs et 4 avertissements; le candidat en compte 23 et 3. Cette dette historique reste hors de la correction ciblée.

## Limites

Le lecteur d’écran réel et la production authentifiée restent `NOT_VERIFIED`. L’impression n’est pas un PDF officiel et aucune valeur juridique n’est revendiquée. Aucun fournisseur réel, notification externe, fusion ou déploiement n’appartient à ce lot.

## Verdict

`ACCEPTATION_INTÉGRÉE_PASS — PR_READY` sous réserve de la CI terminale du HEAD publié.
