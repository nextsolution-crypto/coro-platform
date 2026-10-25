# CP-004 / CORE-01 / DOC-01 — recette synthétique

Date : 2026-10-25  
Stack : `cp004-core-doc`, PostgreSQL 16, 153 migrations, stockage privé et fournisseurs simulés, réseau sortant refusé par défaut.  
Source fonctionnelle testée : `0a87978f61ace4f58dd9d7947f41390c76d110fa`.  
Correctif Intelligence : `9f49b7285ad31b36fdc09568ef4a814b5f4c910d`, fusionné par la PR #53 au SHA `5d6e370c7a52c55fefacc2676c37142fccf4117b`.

## CP-004

- API : 8/8 PASS (manager bâtiment A, corporate bâtiments A+B, manager sans affectation, organisation B, parité liste/lecture directe).
- Navigateur : 16/16 PASS, incluant 12/12 combinaisons 1440×900, 1920×1080, 390×844 et 430×932 en Classic, Glass Light et Glass Dark.
- F5/session, chargement, périmètre vide et erreur 503 explicite : PASS.
- Défaut reproduit : l'échec de l'API Intelligence rendait un écran vide.
- Correction : état d'erreur accessible et action Réessayer, sans modification des règles d'autorisation.
- Preuves : `D:\CORO-QA\runs\cp004-core-doc\acceptance\api-scope-probe.json` et `...\browser-final\browser-matrix.json`.

## CORE-01

| Contrôle | Résultat |
|---|---|
| Conseiller : liste et lecture directe du projet affecté | PASS |
| Administrateur organisation A : liste et lecture directe | PASS |
| Administrateur organisation B : absence de liste et lecture directe 404 | PASS |
| CLIENT_MANAGER : projet/bâtiment affecté | PASS |
| CLIENT_CORPORATE : portée organisationnelle autorisée | PASS |
| Client sans bâtiment : absence de liste et lecture directe vide | PASS |
| Client autre organisation : absence de liste et lecture directe vide | PASS |
| Identité interne révoquée | PASS (401) |
| Objet archivé | NOT_VERIFIED — aucun objet supplémentaire n'a été archivé pour cette campagne |

Preuve : `D:\CORO-QA\runs\cp004-core-doc\acceptance\core-doc-api.json`.

## DOC-01

| Opération | Résultat |
|---|---|
| Configuration canonique | PASS |
| Génération | PASS |
| Édition et persistance | PASS |
| Validation serveur | PASS |
| Export/téléchargement PDF réel | PASS — 4 003 607 octets, 98 pages, SHA-256 `d4bbf91f89dd38c8badb1c65cd252bfc27331110153d917b93e42280d445dbec` |
| Soumission en révision | PASS |
| Auto-approbation de l'auteur | PASS (refus 403) |
| Approbation indépendante | PASS — version 1, état VALIDATED |
| Rattachement projet/bâtiment | PASS |
| Lecture et export inter-tenant | PASS (404, aucun PDF) |
| Affichage interne responsive | PASS 12/12 ; F5/session PASS ; aucune erreur console critique |
| PDF officiel signé | EXCLU DE LA RECETTE — aucune signature n'était autorisée |
| Nouvelle tentative après panne réelle de génération | NOT_VERIFIED |
| Knowledge sur ce document représentatif | NOT_VERIFIED — les preuves historiques Knowledge restent distinctes |
| Formats documentaires non pris en charge | NON PROMIS |

Preuves : `D:\CORO-QA\runs\cp004-core-doc\acceptance\core-doc-api.json`, `...\DOC-01-preview.pdf` et `...\core-doc-browser-final\core-doc-browser-matrix.json`.

## Décision commerciale limitée

`PILOTE ENCADRÉ` pour : Intelligence cloisonnée par organisation/bâtiment, navigation projet pour les rôles testés, génération/édition/validation et export PDF d'aperçu sur PMU synthétique.

Exclusions : signature et PDF officiel, reprise après panne réelle de génération, objet archivé, parcours Knowledge représentatif et tout format non démontré. La préparation commerciale globale demeure ouverte.
