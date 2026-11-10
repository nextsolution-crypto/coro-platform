# DISPLAY-03-REVIEW — Sommaire exécutif

La revue confirme que `ProjectFile` demeure l’autorité documentaire et que DISPLAY-03 constitue une base saine pour un futur moteur de rendu isolé. Les publications figent version, SHA-256, approbation, autorité spatiale et variante.

Corrections appliquées : séparation réviseur–approbateur, revérification transactionnelle avant publication, autorité exacte revérifiée par le contrat Player, téléchargement Player dédié et réautorisé, limites de rendu graphique, index PostgreSQL garantissant une seule publication active par emplacement.

Le moteur PDF n’est pas implémenté. Recommandation pour DISPLAY-04 : worker Linux isolé, sans réseau, utilisant Poppler/pdftocairo ou pdftoppm sous validation juridique GPL, avec PDFium comme alternative si une dépendance permissive et un effort d’intégration supérieur sont acceptés.

Verdict : **GO CONDITIONNEL pour DISPLAY-04**.
