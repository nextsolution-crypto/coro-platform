# Intégrité du runtime

## Correction

La vérification refuse maintenant manifeste vide, chemins absolus, doublons, traversée, symlink sortant et objets non réguliers. Les empreintes SHA-256 incorrectes restent refusées.

## Tests

Fichier intact/modifié, manifeste vide, doublon, traversal et symlink externe: PASS (`operational-resilience.spec.ts`).

## Blocage

`verifyRuntimeIntegrity()` n'est jamais appelée par le point d'entrée et le manifeste n'est ni signé ni lié à une racine de confiance. Une empreinte locale ne démontre pas la provenance. Verdict: **FAIL P0 malgré le durcissement local**.
