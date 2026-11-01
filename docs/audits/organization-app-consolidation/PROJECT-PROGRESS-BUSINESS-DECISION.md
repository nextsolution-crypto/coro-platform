# Décision métier requise — progression Projet

## État démontré

`Project.progress` est aujourd’hui une valeur persistée de `0` à `100`, modifiable par le parcours Projet. Elle pilote des libellés, une barre et certains appels à l’action. Elle n’est pas calculée depuis les documents, les modules ou le workflow d’approbation.

Le score de qualité est une autorité distincte. Il est calculé côté serveur depuis des critères techniques propres au PCA ou au PMU/PSI. Il ne doit pas être présenté comme la progression du projet.

La présente PR conserve cette sémantique. Aucun recalcul, backfill ou changement de libellé n’est appliqué sans décision métier.

## Proposition concrète

### Option recommandée — jalons gouvernés

Remplacer à terme la saisie libre par quatre jalons de 25 points :

1. configuration minimale validée;
2. première version documentaire générée;
3. version soumise à une révision indépendante;
4. décision d’approbation obtenue.

Exemples :

| Situation | Progression | Conséquence |
| --- | ---: | --- |
| projet créé, configuration incomplète | 0 % | configuration proposée comme prochaine action |
| configuration minimale validée | 25 % | génération disponible |
| document généré mais jamais soumis | 50 % | édition et soumission proposées |
| document soumis, décision en attente | 75 % | lecture seule pour l’auteur et révision pour l’approbateur |
| version approuvée | 100 % | version approuvée clairement identifiée |
| version approuvée puis nouvelle édition brouillon | 75 % pour la nouvelle version; historique approuvé conservé | aucune fausse représentation de la nouvelle version comme approuvée |

### Conséquences à approuver

- La progression devient dérivée et n’est plus librement modifiable.
- Les projets historiques nécessitent un calcul initial audité, sans réécriture de leur historique documentaire.
- Une approbation ne signifie ni signature juridique, ni export PDF officiel, ni achèvement commercial.
- Les projets archivés gardent leur dernière progression en lecture seule.
- PCA, PMU et PSI utilisent les mêmes jalons uniquement lorsque leurs parcours réels supportent chaque étape.

## Alternative

Conserver la valeur manuelle, mais renommer partout l’indicateur « progression déclarée » et afficher sa provenance ainsi que sa date de mise à jour. Cette option évite une migration, mais conserve une mesure subjective.

## Décision demandée

Choisir entre :

- `JALONS_GOUVERNÉS` (recommandé);
- `PROGRESSION_DÉCLARÉE`;
- maintien temporaire de la sémantique actuelle.

Cette décision peut être regroupée avec les arbitrages sur les divergences historiques. Elle ne bloque pas les inventaires, le raccordement Knowledge ni les autres preuves indépendantes.
