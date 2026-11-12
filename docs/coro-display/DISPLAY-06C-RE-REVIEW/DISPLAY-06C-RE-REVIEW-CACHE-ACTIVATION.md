# Cache et activation

`PersistentPlanCache` vérifie SHA-256 et manifeste avant écriture, écrit dans `next`, conserve `previous`, puis effectue un renommage atomique. Les identifiants de portée sont validés et les liens symboliques sont refusés.

Le processus enfant relit `current` et affiche les mêmes octets sans téléchargement. Les tests refusent corruption, rollback et génération révoquée. Résultat : PASS.
