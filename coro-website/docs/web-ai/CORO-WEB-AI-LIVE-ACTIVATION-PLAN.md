# CORO Web AI — plan d'activation et retour arrière

Ce document ne confère aucune autorisation d'activation.

## Séquence gouvernée

1. Fusionner et déployer séparément l'adaptateur public, avec fournisseur simulé conservé.
2. Vérifier corpus, identité SQL et mode simulé en production.
3. Faire approuver budget, volume, durée et responsable de campagne.
4. Vérifier AWS par API de contrôle, IAM, helper, montages et tarifs.
5. Créer une politique runtime privée `bedrockEnabled=true` avec image immuable.
6. Activer le verrou Bedrock uniquement sur une route non publique et un opérateur autorisé.
7. Exécuter la campagne bornée et surveillée.
8. Revenir à `false` à la fin, même en cas de succès.
9. Examiner les preuves avant toute décision d'ouverture publique.

## Activation publique ultérieure

Elle exige une décision distincte. Le déploiement doit conserver un déploiement progressif, limites globales et par session, coupe-circuit automatique, observabilité expurgée et repli simulé/dégradé.

## Retour arrière

1. basculer le verrou d'invocation publique à `false`;
2. réconcilier le backend via le workflow gouverné et l'image immuable;
3. confirmer qu'aucun appel fournisseur n'est possible;
4. vérifier site, Public Knowledge et mode dégradé;
5. préserver journaux et preuves;
6. si nécessaire, révoquer le profil/certificat via une opération AWS séparée;
7. ne pas supprimer le corpus ni modifier les données client.

Objectif de désactivation proposé : moins de 15 minutes après décision, à démontrer en exercice.

## Rôles

- Founder : budget et autorisation explicite de campagne/ouverture.
- Responsable sécurité : IAM, données, destinations et secrets.
- Opérateur release : politique runtime, image et réconciliation.
- Responsable produit : corpus, réponses attendues et critères qualité.
- Observateur : coûts, quotas, latence et alertes.

## Gates

| Gate         | Exigence                                            |
| ------------ | --------------------------------------------------- |
| Code         | tests, sécurité, citations, mode dégradé            |
| Données      | corpus public uniquement, version et provenance     |
| SQL          | rôle effectif lecture seule                         |
| AWS          | profil actif, destinations CA, quotas, rôle minimal |
| Runtime      | glibc/helper/montages/900 s prouvés                 |
| Coût         | tarifs et budget approuvés, plafond dur             |
| Exploitation | surveillance et kill switch exercés                 |
| Publication  | autorisation Founder distincte                      |
