# INC-RP-01 — Lots 3 et 4 — QA

## Périmètre

- moteur de formulaires versionnés et conditionnels;
- sections répétables;
- huit modèles initiaux CORO (aucune déclaration de parité exacte Reportperfect);
- pièces jointes privées JPEG, PNG et PDF, 10 Mo maximum;
- analyse ClamAV INSTREAM obligatoire avant persistance et distribution;
- affectation, révision, correction, approbation et publication;
- séparation stricte entre soumissionnaire et approbateur;
- interface professionnelle responsive derrière `INCIDENT_REPORTS_ENABLED`.

## Résultats

- backend build: PASS;
- frontend build et typecheck: PASS;
- moteur de formulaire et workflow: 10 tests PASS;
- PostgreSQL jetable: chaîne complète de 190 migrations PASS;
- contraintes/fondations/Lot 2 sur PostgreSQL: 8 tests PASS;
- Incident, Population et autorisations: 51 suites, 863 tests PASS;
- aucun fichier Sentinelle, Population, Occupation ou CORO Ops modifié.

## Limites

- le service antivirus doit être configuré avant activation; en son absence, le téléversement échoue fermé;
- la parité Reportperfect demeure conditionnelle à un formulaire ou export représentatif;
- aucune activation commerciale, aucune donnée réelle et aucun service externe réel pendant la QA;
- l’avis de sécurité Next.js 16.4.2 reste à traiter dans un chantier distinct.
