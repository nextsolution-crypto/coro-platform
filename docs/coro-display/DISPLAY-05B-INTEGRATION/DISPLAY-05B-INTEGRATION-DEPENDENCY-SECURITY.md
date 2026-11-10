# Dépendances et sécurité

Les installations ont utilisé les lockfiles inchangés dans le worktree.

| Arbre | Runtime | Arbre complet |
| --- | ---: | ---: |
| Backend | 0 | 30 : 4 low, 23 moderate, 3 high |
| Portail | 0 | 8 moderate |

Les avis restants sont dans l'outillage de développement (`glob`, `minimatch`, chaînes ESLint/Jest/Prisma). `npm audit` propose des changements potentiellement cassants; aucun `audit fix --force` n'a été exécuté. L'exposition runtime vérifiée est nulle.

Le scan à motifs de clés privées, jetons AWS/GitHub/OpenAI n'a détecté aucun secret crédible dans le périmètre. Un faux positif lexical `sk-` apparaît dans un identifiant de code. Aucun fichier privé ou rendu client n'est ajouté.
