# DISPLAY-04A-INTEGRATION — Corpus PDF hostile

Exécuté dans Linux sans réseau, UID 1000, FS racine en lecture seule, 384 MiB et 16 PID.

| Cas | Résultat |
|---|---|
| Rotation/transparence valide | ACCEPTED 1275×1650 |
| Tronqué/corrompu/signature invalide | REJECTED |
| JavaScript, fichier incorporé, URI/GoToR | REJECTED |
| 101 pages | REJECTED `PDF_PAGE_COUNT` |
| Dimensions 20 000×20 000 pt | REJECTED `OUTPUT_PIXEL_LIMIT` avant rendu |
| AES-256 sans mot de passe | REJECTED `PDF_ENCRYPTED` |
| AES-256 avec mot de passe | REJECTED `PDF_INVALID` sans mot de passe fourni |
| Polyglotte PDF+ZIP | REJECTED `PDF_TRAILING_DATA` |
| Structure réellement imbriquée, 750 niveaux | ACCEPTED, raster 209×209 sous les limites |
| Image incorporée 4096×4096, flux brut 16 MiB | ACCEPTED, raster 209×209 sous 384 MiB |
| Timeout contrôlé | TIMEOUT `PDF_TIMEOUT` (preuve REVIEW conservée) |

L’OOM volontaire reste **BLOCKED** : ne pas risquer la mémoire hôte. L’image volumineuse réelle est traitée sous le cgroup sans épuisement. Les bornes pré-raster, le cgroup et le timeout limitent l’impact; un corpus externe spécialisé reste recommandé en CI dédiée.
