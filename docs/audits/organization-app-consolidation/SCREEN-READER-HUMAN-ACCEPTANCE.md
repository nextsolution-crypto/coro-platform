# Recette humaine courte — lecteur d’écran réel

## Préconditions

- Utiliser une identité QA synthétique, un navigateur pris en charge et NVDA, JAWS ou VoiceOver dans sa version courante.
- Conserver les données et documents synthétiques. N’activer aucune communication externe.
- Noter lecteur, version, navigateur, système, taille de fenêtre, zoom et SHA testé.

## Parcours représentatif (20 à 30 minutes)

1. Se connecter et atteindre le tableau de bord uniquement au clavier.
2. Ouvrir un projet, son espace Documents puis une version approuvée.
3. Parcourir les titres, régions, tableaux, messages d’état et contrôles de génération/révision sans déclencher d’effet externe.
4. Ouvrir Bibliothèque, rechercher une procédure et lire un contenu long.
5. Ouvrir CORO AI authentifié, poser une question synthétique, lire la réponse et ouvrir sa citation.
6. Provoquer un refus autorisé et une erreur récupérable; vérifier l’annonce puis la reprise.
7. Ouvrir un PDF synthétique PMU, PSI ou PCA et vérifier l’ordre de lecture exposé par le lecteur.

## Résultats attendus

- Chaque page possède un titre annoncé, un repère principal et une hiérarchie compréhensible.
- Le focus suit l’ordre visuel; aucun piège clavier; le contrôle actif et les erreurs sont annoncés.
- Les boutons et liens ont un nom, un rôle et un état non ambigus.
- Les citations annoncent la source, la portée et la version; un refus n’expose aucun contenu.
- Le PDF demeure compréhensible sans vue visuelle. Ce point ne prouve pas PDF/UA.

## Formulaire de constat

| Champ | Valeur |
| --- | --- |
| Date / testeur | À compléter |
| Lecteur / version | À compléter |
| Navigateur / OS | À compléter |
| SHA / environnement | À compléter |
| Parcours 1 à 7 | PASS / FAIL / BLOQUÉ, avec étape |
| Annonce exacte observée | À compléter sans donnée personnelle |
| Défaut, sévérité et reproduction | À compléter |
| Capture audio autorisée | Oui / non; emplacement protégé |
| Verdict | PASS / PARTIAL / FAIL |

Une inspection DOM ou de l’arbre d’accessibilité ne remplace pas ce constat humain.
