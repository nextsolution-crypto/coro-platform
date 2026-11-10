# DISPLAY-04A-REVIEW — Isolation du conteneur

## Observations

Le `tmpfs` initial était monté `0700` mais appartenait à root; UID 1000 ne pouvait pas y écrire. Cette configuration empêchait le moteur de fonctionner au lieu de démontrer une isolation utile.

## Preuves expérimentales

| Contrôle | Résultat |
|---|---|
| UID/GID | `1000/1000` |
| Racine en lecture seule | écriture `/probe` → `EROFS` |
| `/tmp` | écriture PASS après `uid=1000,gid=1000` |
| Socket Docker | absent |
| Réseau | `none` |
| PID | cgroup `16`; 9 enfants créés, 21 refusés |
| Mémoire | cgroup `402653184` octets |
| Swap | borné à la même valeur que la RAM |
| CPU | cgroup `100000 100000` (1 CPU) |
| Capacités | `cap_drop: ALL` |
| Élévation | `no-new-privileges` |
| Processus zombies | `init: true` |

## Tests

- Construction locale de l'image : PASS.
- Rendu réel avec rasteriseur et volume jetables : PASS.
- Dépassement de délai forcé : `PDF_TIMEOUT`; aucun temporaire restant.
- Limite PID exercée réellement : PASS.

## Corrections

Ajout des propriétaires du tmpfs, `memswap_limit`, `init`, rasteriseur séparé et service d'initialisation du spool sans réseau.

## Risques résiduels

La pression mémoire extrême n'a pas été poussée jusqu'à un OOM kill afin de ne pas déstabiliser Docker Desktop. La limite cgroup est toutefois démontrée. Une recette Linux CI dédiée doit confirmer OOM/restart et métriques avant production.
