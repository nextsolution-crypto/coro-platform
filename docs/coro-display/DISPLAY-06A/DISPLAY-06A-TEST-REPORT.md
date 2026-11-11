# DISPLAY-06A — Rapport de tests

Tests ciblés Jest : **14/14 PASS**. Couverture fonctionnelle : signature, substitution, empreinte, portée, clé, rejeu/rollback, révocation, horloge, cache atomique, hors-ligne frais/périmé, absence de plan, cycle 40/10/10, fallback secondaire, trois modes prioritaires, sortie gouvernée d'urgence et journal borné.

TypeScript backend `--noEmit` : **PASS** avec la limite de référence de 8 Go (la limite Node par défaut de 4 Go atteint un OOM). Build Nest : **PASS**. ESLint ciblé : **PASS**.

Régressions Display : 11 suites réussies, 64 tests réussis, 1 test préexistant ignoré. Suite backend complète : 296 suites et 2 754 tests réussis; 7 échecs initiaux provenaient de l'interdiction de sous-processus du bac à sable. Réexécutés hors bac à sable, 6/7 passent; le dernier reste `NOT_VERIFIED` car `pdftoppm` n'est pas installé localement. Ce test OCR/PDF est sans lien avec le nouveau noyau.

Audit npm runtime : **0 vulnérabilité**. Audit complet : 30 alertes de développement préexistantes (4 faibles, 23 modérées, 3 élevées), principalement Jest/Nest CLI/Prisma; aucune mise à niveau majeure forcée. Scan de secrets ciblé et `git diff --check` : **PASS**. Aucun test ne commande un écran réel.
