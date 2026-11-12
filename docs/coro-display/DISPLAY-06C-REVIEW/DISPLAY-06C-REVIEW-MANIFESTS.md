# Manifestes

## Constat critique

Le Gateway source retournait une structure propriétaire que `validateManifest` rejetait. La correction produit désormais exactement `SignedPlayerDisplayManifest`, avec enveloppe Ed25519, assignment, géométrie, séquence, politique, référence privée et SHA-256.

## Preuve

Un test indépendant signe le manifeste avec une clé éphémère puis le soumet au validateur strict du Player : PASS. La clé privée reste fournie par environnement et n’est pas dans le dépôt.

## Limites

La rotation des clés de signature côté serveur n’est pas orchestrée. La consommation réelle par l’exécutable connecté reste absente.
