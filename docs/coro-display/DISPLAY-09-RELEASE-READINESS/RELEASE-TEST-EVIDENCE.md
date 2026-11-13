# Preuves de test

- CI post-merge `43321546408` : typechecks quatre applications, backend/PostgreSQL, portail PASS; images/release SKIPPED.
- PR documentaire #262, HEAD `ffe14df3…` : checks PASS, Draft, non fusionnée.
- Builds locaux : backend/frontend/portail/site PASS, `linux/amd64`.
- Backend : 167/168 tests Display, 167 PASS et 1 explicitement SKIPPED par la sélection non-PostgreSQL.
- PostgreSQL : 18 tests Display ciblés PASS.
- Migrations : 176 baseline + 11 upgrade + seconde passe PASS.
- PDF : dimensions, hash et rendu V1/V2 PASS.
- Chrome local : 5/5 profils, activation et `WEB_VIEW_ONLY` PASS; limite hors ligne confirmée.
- Audit npm production : 0 low/moderate/high/critical sur les quatre packages.
- Inspection prod `43326092966`, capacité `43326095490`, backup `43326095939`, inventaire Démo `43326658664` : PASS dans leurs périmètres.

Non vérifié : digests registre candidat, DNS/TLS Display, bâtiment canonique, portail production, iPad physique.
