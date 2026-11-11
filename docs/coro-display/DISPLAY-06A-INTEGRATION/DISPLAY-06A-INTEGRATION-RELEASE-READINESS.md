# DISPLAY-06A-INTEGRATION — Préparation PR

La branche consolide les commits produit et revue sans conflit et sans changement de production. Le diff est limité au noyau Player, à ses tests et à la documentation.

Avant fusion future, la PR Draft devra exécuter les workflows Linux, notamment OCR/Poppler, migrations PostgreSQL et backend complet. `build-images` et `production-release` doivent rester ignorés pour une PR.

La branche n'autorise ni diffusion physique, ni enrôlement, ni publication documentaire.
