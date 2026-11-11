# DISPLAY-06B-REVIEW — Durabilité disque

Ordre démontré : écrire les octets, `fsync` du fichier temporaire, fermer, renommer, puis synchroniser le répertoire sur les plateformes non Windows. Le commit conserve `previous` et restaure celle-ci si le renommage final échoue.

Atomicité logique et système de fichiers local : **PASS sous tests synthétiques**. Durabilité Linux après crash : architecture cohérente mais **NOT_VERIFIED matériellement**. Windows : le code ne synchronise pas le handle de répertoire; la résistance à une panne électrique reste **NOT_VERIFIED**.

Stockage saturé, ACL refusée et crash injecté à chaque instruction ne sont pas simulés. Aucune panne électrique réelle n'est déclarée PASS.
