# Intégrité du runtime

## Constat

Le manifeste n'était ni authentifié ni obligatoire avant démarrage.

## Correction

`verifyAuthenticatedRuntimeManifest` vérifie autorité, version, fenêtre de validité et signature Ed25519 canonique avant les fichiers confinés. Tout échec bloque cache, Chromium et Gateway.

## Preuve et tests

Cas valide, absence, mauvaise signature/autorité/version/temps, fichier modifié/absent, symlink et traversée.

## Résultat et risque résiduel

PASS logiciel; distribution et rotation de la racine de confiance restent à valider sur l'image cible.
