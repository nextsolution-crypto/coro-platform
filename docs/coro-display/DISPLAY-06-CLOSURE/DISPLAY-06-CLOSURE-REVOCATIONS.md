# Révocations et anti-rollback

## Constat

Un ancien fichier local pouvait réintroduire une séquence antérieure.

## Correction

Le Gateway sert un registre signé et scopé par l'identité M2M. Le Player vérifie signature, fraîcheur et scope puis persiste une séquence dans une ancre séparée.

## Preuve et tests

Registre valide, rollback, signature/scope invalides, persistance et redémarrage.

## Résultat et risque résiduel

PASS logiciel; une ancre fichier n'est pas revendiquée comme matériellement inviolable.
