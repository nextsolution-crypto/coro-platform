# INC-RP-01 — Lots 3 et 4 — Préparation GPT Work

## Verdict

**NOT READY POUR RECETTE GPT WORK** au 17 novembre 2026.

Le candidat fonctionnel est validé sur une stack locale isolée, mais les deux
preuves obligatoires d'accès navigateur ne sont pas encore réunies : l'URL
locale est HTTP et le connecteur Chrome Work échoue avant la création de
l'onglet. Aucun accès public n'a été ouvert pour contourner ces contrôles.

## Candidat et isolation

- SHA testé : `524223486a03f3aec018ec4919377e9a7620315d`.
- Branche : `feature/inc-rp-01-forms-approval` (PR #326, non fusionnée).
- Frontend local : `http://127.0.0.1:3300`.
- Backend local : `http://127.0.0.1:3302/api`.
- PostgreSQL 16 local : `127.0.0.1:55433`, base synthétique dédiée.
- Stockage privé : Garage 2.4.1 local, compartiment privé synthétique.
- Antivirus : ClamAV 1.4 local, contrôle INSTREAM opérationnel.
- Feature flag : `INCIDENT_REPORTS_ENABLED=true` uniquement dans ce runtime.
- Brevo, SMS, Sentinelle, Ops et Building Bridge : non configurés/non appelés.

## Identités et données synthétiques

Organisation : **Immeubles Boréal — QA synthétique**.

Bâtiment : **Édifice Horizon QA**.

Identités réservées au domaine `.test` :

- `agent@report-qa.test` — création et modification;
- `supervisor@report-qa.test` — révision et approbation;
- `admin@report-qa.test` — administration QA;
- `sans-acces@report-qa.test` — témoin négatif sans autorité Report.

Le mot de passe synthétique n'est pas inscrit dans Git. Le MFA normal reste
obligatoire; les codes sont capturés uniquement dans le répertoire temporaire
local isolé, sans fournisseur externe.

Huit modèles publiés sont présents : incident général, activité quotidienne,
anomalie technique, intervention de sécurité, plainte, accident, dommages
matériels et situation inhabituelle. Les formulaires couvrent champs
conditionnels, personnes et véhicules répétables.

## Vérifications exécutées

| Contrôle | Résultat | Preuve |
|---|---|---|
| Création depuis zéro | PASS | 190 migrations appliquées sur PostgreSQL vierge |
| Feature flag local | PASS | routes Report disponibles uniquement avec flag local actif |
| Authentification + MFA | PASS | connexion agent avec MFA exigé puis jeton émis |
| Catalogue de formulaires | PASS | 8 modèles retournés pour le bâtiment QA |
| Brouillon → soumission | PASS | transitions `DRAFT` → `SUBMITTED` |
| Affectation du réviseur | PASS | transition `SUBMITTED` → `IN_REVIEW` |
| Approbation indépendante | PASS | statut final `APPROVED` sous le superviseur |
| Pièce jointe privée | PASS | PDF synthétique stocké et `scanStatus=CLEAN` |
| Build backend | PASS | Nest build |
| Tests backend ciblés | PASS | 36 réussis, 2 ignorés, 7 suites réussies |
| Contrats frontend | PASS | 3/3 |
| Build frontend | PASS | Next.js 16.4.6, 76 pages générées |
| Accès utilisateur non autorisé | PASS | réponse non divulgatrice `404`, aucune donnée retournée |
| Accès navigateur Work | FAIL | `Cannot read properties of undefined (reading 'timeoutMs')` |
| HTTPS navigateur | NOT_VERIFIED | aucune terminaison TLS locale approuvée/configurée |

## Correctifs de préparation ajoutés à la PR

- reprise réelle d'un brouillon;
- mise à jour avec verrou optimiste;
- soumission gouvernée;
- téléversement PDF/JPEG/PNG après sauvegarde explicite;
- sélection du réviseur connecté avant décision;
- approbation ou demande de correction;
- actualisation des listes et erreurs lisibles;
- stack locale reproductible PostgreSQL/Garage/ClamAV;
- fixtures synthétiques idempotentes.
- garde du seed imposant `NODE_ENV!=production`, une confirmation explicite
  et la cible locale exacte `coro_report_qa@127.0.0.1:55433`.

## Parcours navigateur à exécuter dès rétablissement

1. Ouvrir l'URL HTTPS isolée et se connecter comme agent avec MFA.
2. Créer chacun des principaux types de rapport; vérifier conditions et
   sections répétables sur ordinateur, tablette et téléphone.
3. Enregistrer, recharger puis reprendre le brouillon.
4. Ajouter PDF/JPEG/PNG propres; vérifier refus d'un format non admis et d'un
   fichier infecté synthétique EICAR.
5. Soumettre et se déconnecter.
6. Se connecter comme superviseur, prendre en charge, demander correction,
   puis approuver une nouvelle soumission.
7. Vérifier l'immuabilité de la version approuvée et le téléchargement privé.
8. Se connecter comme utilisateur non autorisé et confirmer l'absence de
   données et d'actions.
9. Capturer les états desktop/tablette/mobile, les erreurs et l'audit.

## Risques résiduels

- Une écriture objet réussie suivie d'un échec transactionnel peut laisser un
  objet privé orphelin; une réconciliation/collecte gouvernée reste à ajouter.
- Le type MIME déclaré est borné par le DTO, mais la signature binaire doit
  encore être validée côté serveur avant de qualifier les uploads hostiles.
- La preuve navigateur authentifiée est bloquée par le connecteur Work et non
  par l'API CORO.
- L'environnement local n'offre pas encore un certificat HTTPS approuvé.

## Nettoyage

Arrêter les processus frontend/backend, puis exécuter
`docker compose -f qa/inc-rp-01/compose.qa.yml down -v` depuis ce worktree.
Cette commande ne cible que les volumes nommés `coro-report-qa_*`.

## Conditions de passage à READY

1. Fournir une URL HTTPS isolée et authentifiée pointant sur ce SHA exact.
2. Rétablir un connecteur navigateur Work capable d'ouvrir cette URL.
3. Exécuter au moins une connexion MFA complète et le parcours agent →
   superviseur dans le navigateur.
4. Corriger ou accepter explicitement les deux risques pièces jointes avant
   les essais de fichiers hostiles.

