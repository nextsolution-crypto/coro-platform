# DISPLAY-06B-REVIEW — Cache persistant

Corrections : identifiants `.`/`..` interdits, portée résolue et contenue, composants symboliques refusés, commits sérialisés entre instances du processus, séquence strictement croissante, manifeste revérifié par une fonction obligatoire et liste externe de versions révoquées appliquée aux générations courante et précédente.

Les tests couvrent concurrence, rollback, cache corrompu, manifeste local substitué, fichier symbolique et fallback précédent révoqué. Un fichier temporaire utilise création exclusive, permissions 0600, `fsync`, puis renommage.

Risques : le verrou n'est pas interprocessus, les ACL réelles et quotas ne sont pas testés, et une liste de révocation incomplète ne peut pas deviner une révocation distante. L'intégration doit fournir `validateManifest` comme vérificateur, jamais un no-op.
