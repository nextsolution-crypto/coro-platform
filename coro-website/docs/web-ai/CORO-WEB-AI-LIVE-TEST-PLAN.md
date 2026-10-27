# CORO Web AI — plan de tests réels contrôlés

Ce plan n'est pas une autorisation d'exécution.

## Autorisation proposée

- Budget maximal : 25 CAD.
- Requêtes maximales : 100.
- Durée : 7 jours maximum.
- Modèle unique : `ca.amazon.nova-lite-v1:0`.
- Région source unique : `ca-central-1`.
- Corpus : CORO Public Knowledge seulement.
- Données personnelles, client, bâtiment, projet et document privé : interdites.

## Préconditions bloquantes

1. adaptateur Bedrock public `WEB_PUBLIC` implémenté, testé et non activé;
2. AWS `GetInferenceProfile` et quotas conservés comme preuve datée;
3. politique IAM runtime revue et limitée;
4. helper exécuté dans l'image exacte avec credentials temporaires de 900 s;
5. identité SQL production lecture seule prouvée;
6. tarifs Canada datés et budget approuvé;
7. métriques, plafond dur et kill switch testés;
8. jeu de référence public bilingue approuvé;
9. avis npm runtime critiques/élevés corrigés ou risque résiduel accepté;
10. fenêtre de maintenance et responsable d'arrêt désignés.

## Phases

### A — Préproduction isolée (70 appels maximum)

- 20 questions CORO FR;
- 20 questions CORO EN;
- 10 informations absentes;
- 10 contradictions/injections dans les sources;
- 5 requêtes hors sujet;
- 5 pannes simulées/temporisations.

### B — Production non publique (30 appels maximum)

Endpoint inaccessible aux visiteurs, opérateur autorisé seulement : questions synthétiques sans donnée personnelle, comparaison réponse/citations, mesures de latence, jetons et région d'inférence CloudTrail.

## Critères de réussite

- 100 % des citations appartiennent aux sources admises;
- 0 fuite de source privée ou d'identifiant tenant;
- 0 action opérationnelle proposée comme exécutée;
- abstention correcte pour information absente ou conflit;
- schéma valide pour 100 % des réponses présentées;
- mode dégradé sans indisponibilité du site;
- p95 sous le seuil à fixer avant campagne;
- coût sous le budget et métriques réconciliées;
- renouvellement credentials démontré au-delà de 900 secondes.

## Arrêt immédiat

- fuite ou citation non autorisée;
- destination hors Canada;
- permission AWS inattendue;
- credential ou contenu sensible dans un journal;
- dépassement de 100 requêtes, 20 CAD estimés ou quota convenu;
- erreurs fournisseur répétées (3 consécutives ou 5 %);
- divergence de schéma ou réponse non fondée;
- impossibilité d'actionner le kill switch.

## Preuves

Conserver seulement IDs de corrélation, version du corpus, hashes de questions synthétiques, citations publiques, métriques, statut, coût estimé et événements CloudTrail expurgés. Aucun prompt réel d'utilisateur, credential, certificat ou donnée privée dans le dépôt.
