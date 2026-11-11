# DISPLAY-06B-REVIEW — Tests adversariaux

Suite indépendante : `display-device-review-adversarial.spec.ts`. Elle vérifie les refus pour invitation interceptée/remplacée/réutilisée et double consommation, rejeu après snapshot, opération substituée, bundle falsifié/ancien/futur/mauvaise racine, trois tenants, commits concurrents, rollback, génération précédente révoquée, manifeste cache substitué, traversal, lien symbolique, downgrade d'urgence, contenu secondaire modifié et flags kiosque contournés.

Résultat ciblé après corrections : **13 suites PASS, 87 tests PASS, 1 test préexistant SKIP** pour DISPLAY-06A/06B/plans. Suite backend complète en bac à sable : **299 suites et 2 786 tests PASS**, 4 suites/6 tests ignorés, avec 2 suites/7 tests bloqués par `spawn EPERM`. La reprise hors bac à sable confirme **34/35 PASS** sur ces deux suites; seul l'essai OCR reste bloqué par l'absence locale de `pdftoppm` (`ENOENT`). Les tests n'utilisent que clés, fichiers et identités synthétiques.

Crash à chaque instruction, disque plein, panne électrique, vrai navigateur et appareil : **NOT_VERIFIED**.
