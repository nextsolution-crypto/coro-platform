# DISPLAY-04A-REVIEW — Frontières de confiance

## Observations

Architecture initiale : `ProjectFile -> PostgreSQL/Storage/Poppler` dans un seul processus. Une exploitation du parseur PDF aurait hérité des secrets et réseaux de l'orchestrateur.

Architecture corrigée :

```text
API CORO
  | permission DISPLAY_PLAN_CREATE
  v
PostgreSQL (job, autorité, bail) <--> Orchestrateur (DB + stockage privé)
                                         |
                                         | PDF + page + DPI seulement
                                         v
                               volume d'échange 0700
                                         |
                                         v
 Rasteriseur éphémère (UID 1000, no network, no secrets, read-only, caps=0)
                                         |
                                         | PNG + métadonnées + SHA-256
                                         v
                              Orchestrateur -> stockage privé
                                         |
                                         v
                     transaction d'autorité -> DISPLAY-03 DRAFT
```

## Preuves

- Le service `display-pdf-rasterizer` n'a que `DISPLAY_PDF_RASTERIZER_ENABLED`, `DISPLAY_PDF_SPOOL_DIR` et `NODE_ENV`.
- `NetworkMode=none`, `CapDrop=[ALL]`, `ReadonlyRootfs=true`, `Privileged=false`, aucun montage du socket Docker.
- L'orchestrateur n'injecte plus `DisplayPdfEngineService`; il utilise `DisplayPdfRasterizerBridgeService`.
- Un rendu réel via le volume partagé a produit un PNG Poppler 1650×1275.

## Tests

- Inspection `docker inspect` des contrôles réels.
- Recherche de variables sensibles dans le processus rasteriseur : liste vide.
- DNS `example.invalid` : `EAI_AGAIN`; TCP local 5432 : non accessible.
- Le rasteriseur quitte après un travail; Docker crée un processus propre pour le suivant.

## Corrections

- Ajout d'un service d'initialisation minimal sans réseau, limité à `CHOWN/FOWNER` du répertoire d'échange.
- Réponses lues avec `lstat`, `O_NOFOLLOW`, borne de taille et validation SHA-256.
- Répertoire par UUID et nettoyage systématique côté orchestrateur.

## Risques résiduels

Le volume d'échange reste une frontière partagée. Une compromission du rasteriseur peut altérer les fichiers de ce volume pendant sa courte vie, mais ne peut ni atteindre un secret/réseau ni rendre un résultat autoritaire sans les vérifications de l'orchestrateur. Une isolation par microVM serait plus forte mais disproportionnée pour V1.
