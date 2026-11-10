# DISPLAY-04A — GO / NO-GO

## Verdict

**GO CONDITIONNEL pour commencer DISPLAY-04B en local; NO-GO fusion et production.**

Conditions de levée :

1. avis licence Poppler ou remplacement démontré par PDFium;
2. migration zéro + upgrade et concurrence sur PostgreSQL réel;
3. image worker construite, non-root, read-only, limites et nettoyage démontrés;
4. politique réseau sans accès Internet général;
5. corpus valide/hostile et benchmark visuel exécutés;
6. build, suite complète, audit de dépendances et scan de secrets réussis en CI.

Le candidat local matérialise l'architecture et les garde-fous sans modifier la production. DISPLAY-04B ne doit pas élargir ce verdict à un remplacement réglementaire d'un plan mural.
