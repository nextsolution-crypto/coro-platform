# Preuves E2E

Preuves locales sur le candidat d'intégration :

- build Nest : PASS;
- tests de sécurité du service Web : 5/5 PASS;
- ESLint ciblé : PASS;
- build Next et TypeScript : PASS;
- contrats portail : 3/3 PASS;
- PostgreSQL 16 depuis zéro : 187/187 migrations PASS;
- seconde passe migration : aucune migration en attente;
- Chrome réel : cinq profils responsive, activation et profil `WEB_VIEW_ONLY` PASS;
- limite de rechargement hors ligne reproduite et documentée.

Le harnais reproductible se trouve dans `qa/display-09/chromium-player-qa.cjs`; il utilise uniquement un emplacement, une session et un fournisseur de contenu synthétiques.

L'import PDF, l'approbation et la publication réutilisent les contrats DISPLAY-03/04 déjà présents; aucune publication client réelle n'a été créée ou modifiée.
