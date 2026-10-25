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
| Objet archivé : liste et lecture directe | PASS — visible pour les acteurs autorisés, refusé hors périmètre |
| Objet archivé : versions et documentation permanente | PASS — versions, ProjectFiles et index Knowledge conservés |
| Objet archivé : actions de mutation | POLICY_REQUIRED — la régénération demeure techniquement possible; aucune règle approuvée n'établit encore si l'archive doit être strictement en lecture seule |

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
| Nouvelle tentative après panne réelle de génération | PASS — PostgreSQL QA arrêté sur le vrai chemin, erreur visible, aucune mutation partielle, reprise puis une seule nouvelle version |
| Knowledge sur un document représentatif | PASS — ingestion, citation canonique, remplacement de version, archive, révocation et refus inter-tenant |
| Formats documentaires non pris en charge | NON PROMIS |

Preuves : `D:\CORO-QA\runs\cp004-core-doc\acceptance\core-doc-api.json`, `...\DOC-01-preview.pdf` et `...\core-doc-browser-final\core-doc-browser-matrix.json`.

## Décision commerciale limitée

`PILOTE ENCADRÉ` pour : Intelligence cloisonnée par organisation/bâtiment, navigation projet pour les rôles testés, génération/édition/validation et export PDF d'aperçu sur PMU synthétique.

Exclusions : signature et PDF officiel, mutations sur projet archivé tant que la politique n'est pas approuvée, et tout format non démontré. La préparation commerciale globale demeure ouverte.

## Limites restantes — campagne du 25 octobre 2026

### Projets archivés

La règle existante confirmée est la conservation : la base documentaire
permanente du bâtiment demeure alimentée par les livrables approuvés et
l'archivage du projet ne supprime ni les versions ni les références Knowledge.
La liste et la lecture directe continuent d'appliquer le périmètre canonique :
un acteur autorisé voit l'objet archivé, un acteur sans bâtiment ou d'une autre
organisation ne reçoit aucune ressource.

Une ambiguïté métier subsiste : le backend et l'interface permettent encore la
régénération documentaire sur un projet `ARCHIVED`. Aucune règle approuvée ne
dit si une archive est en lecture seule ou réouvrable. Aucun changement produit
n'a donc été appliqué. Ce parcours reste exclu du pilote jusqu'à décision.

### Reprise documentaire exercée

Le test a arrêté uniquement PostgreSQL du stack synthétique au moment du clic
sur `Régénérer`. L'interface a affiché `Erreur lors de la génération du
document.`; ni l'identifiant ni la version n'ont changé. Après redémarrage de
PostgreSQL, une nouvelle tentative a affiché le succès et produit exactement une
version supplémentaire, rattachée au même projet. Aucune notification externe
n'a été émise.

Cette preuve couvre une indisponibilité de base de données. Elle ne couvre pas
encore une panne de stockage objet, une corruption PDF ou un manque d'espace.

### Knowledge représentatif

Deux versions canoniques approuvées ont été indexées. La version remplacée
n'est plus retournée comme source courante; la nouvelle version l'est avec son
identifiant et son SHA-256. Une documentation technique distincte et une
procédure projet restent deux sources canoniques distinctes, sans fusion
trompeuse. Après archivage du projet, les deux sources approuvées restent
consultables par l'acteur autorisé; l'autre organisation ne reçoit aucun
résultat. Après révocation, la source projet n'est plus retournée.

Formats exercés : texte synthétique et PDF du parcours DOC-01. Les formats sans
extracteur ne sont pas annoncés comme analysés.

### Signature et PDF officiel

Statut maintenu : `NOT_VERIFIED`. Scénario prêt pour une autorisation ultérieure :

- document : PMU synthétique d'une organisation et d'un bâtiment fictifs;
- signataires : auteur, approbateur et signataire fictifs distincts;
- environnement : stack QA isolé et adaptateur fournisseur local; toute adresse
  externe neutralisée ou destinataire de test explicitement autorisé;
- vérifications : identité/ordre des signataires, refus non autorisé, PDF final
  ouvrable, empreinte SHA-256, version, rattachement projet/bâtiment et audit;
- limite : une signature simulée ne prouve pas le fournisseur réel. Aucun envoi
  ni aucune signature engageante n'a été produit.

## Preuves et versions

- produit exercé dans le stack QA : `0a87978f61ace4f58dd9d7947f41390c76d110fa`;
- version produit active vérifiée en production : `5d6e370c7a52c55fefacc2676c37142fccf4117b`;
- archive et reprise API : `D:\CORO-QA\runs\cp004-core-doc\acceptance\remaining-limits\remaining-limits.json`;
- reprise navigateur : `...\remaining-limits\browser\document-failure-browser.json` et captures associées;
- Knowledge canonique : `...\remaining-limits\knowledge\knowledge-ai-acceptance.json`;
- version/archive/coexistence Knowledge : `...\remaining-limits\knowledge-lifecycle\knowledge-document-lifecycle.json`.

## Conditions d'exploitation du pilote

Verdict maintenu : `PILOTE ENCADRÉ`.

- Utilisateurs admis : conseillers, administrateurs client, `CLIENT_CORPORATE`
  et `CLIENT_MANAGER` formés, avec MFA et affectations explicites.
- Modules démontrables : projets actifs, Intelligence cloisonnée, génération,
  édition, validation indépendante, aperçu/téléchargement PDF et Knowledge sur
  sources approuvées prises en charge.
- Accompagnement : onboarding guidé, jeu de données contrôlé, support pendant
  les heures prévues et revue des droits avant chaque démonstration.
- Incidents : consigner le contexte, le compte, le projet, l'heure et la
  corrélation; suspendre le parcours touché; aucune interprétation d'un écran
  vide comme preuve d'absence.
- Exclusions : signature/PDF officiel, mutation de projet archivé, formats non
  pris en charge et toute fonction non couverte par ce rapport.
- Critères de sortie : politique d'archive approuvée et testée, campagne de
  signature autorisée si elle entre au périmètre vendu, et clôture séparée des
  autres constats fonctionnels du registre.

Mathieu peut démontrer et proposer en pilote uniquement les modules ci-dessus.
Le portail n'est pas déclaré fonctionnel à 100 % et les autres fonctions ne
bénéficient d'aucune validation implicite.
