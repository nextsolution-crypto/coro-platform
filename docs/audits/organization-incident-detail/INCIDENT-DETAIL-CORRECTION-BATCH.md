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

## État livré

- PR `#172` : fusionnée.
- SHA actif : `7184456f42d43429d38ccbdaa87f141df774a2c9`.
- Release `41570892531`, inspection `41572536046` et réconciliation `41572538222` : `SUCCESS`.
- Images actives : backend `sha256:07aec5b8...a6a5cde`, frontend `sha256:7eef0508...abfdf2f`, Client Portal `sha256:5993a8de...704a638`, site `sha256:ef0b8ff1...9021b61`.
- Recette navigateur production : `PARTIAL`; le refus observé n'est pas compté comme un PASS fonctionnel.

## Verdict

`ACCEPTATION_INTÉGRÉE_PASS — PR_READY` sous réserve de la CI terminale du HEAD publié.
