# DISPLAY-06A-REVIEW — Tests adversariaux

Une suite indépendante utilise ses propres clés et fixtures. Elle couvre : signature tronquée, clé inconnue/révoquée/expirée, bâtiment/emplacement/profil incorrects, affectation substituée, champ supplémentaire/manquant, nombre ambigu, URL publique, replay, plan tronqué/vide, concurrence de cache, contenu secondaire falsifié et downgrade d'urgence.

Résultat ciblé après corrections : **29/29 PASS** pour les suites fondation et adversariale. Régressions Display : **12 suites et 79 tests PASS**, avec un test préexistant ignoré par sa configuration.

Suite backend complète : **297 suites et 2 769 tests PASS**. Sept échecs initiaux étaient dus au blocage des sous-processus par le bac à sable; six passent hors bac à sable. Le seul contrôle restant `NOT_VERIFIED` nécessite `pdftoppm`, absent de la machine, pour un test OCR préexistant sans lien avec le Player. TypeScript 8 Go, ESLint ciblé et build Nest : **PASS**.
