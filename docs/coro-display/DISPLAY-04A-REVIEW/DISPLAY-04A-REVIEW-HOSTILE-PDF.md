# DISPLAY-04A-REVIEW — Corpus PDF hostile

## Observations et preuves

| Cas synthétique | Résultat |
|---|---|
| Plan valide, rotation 90°, transparence | ACCEPTED, 1275×1650 |
| PDF tronqué | REJECTED `PDF_INVALID` |
| Mauvaise signature | REJECTED `PDF_MAGIC` |
| Structure corrompue | REJECTED `PDF_INVALID` |
| JavaScript | REJECTED `PDF_ACTIVE_CONTENT` |
| Fichier incorporé | REJECTED `PDF_ACTIVE_CONTENT` |
| Référence externe URI/GoToR | REJECTED `PDF_ACTIVE_CONTENT` |
| 101 pages | REJECTED `PDF_PAGE_COUNT` |
| Timeout contrôlé | TIMEOUT `PDF_TIMEOUT` |
| Polyglotte PDF+ZIP synthétique | ACCEPTED puis rasterisé; contenu suffixe ignoré |

## Tests

Le harnais `qa/display-04a-review/hostile-corpus.cjs` fonctionne dans le conteneur réel, sans réseau, sous les limites de production. Le timeout remplace `pdftocairo` par un processus synthétique lent et confirme le nettoyage des temporaires.

## Corrections

Ajout des refus `/OpenAction`, `/AA`, `/URI`, `/GoToR`, `/SubmitForm` et `/ImportData`. Les timeouts sont distingués des erreurs de syntaxe/rendu.

## Risques résiduels

NOT_VERIFIED expérimentalement : PDF réellement chiffré/mot de passe, objets profondément imbriqués, bombe d'image décompressée, OOM réel et transparences pathologiques de fournisseurs multiples. Ils restent un gate avant production. Le polyglotte est acceptable dans le bac à sable car seule la page rasterisée sort; une politique plus stricte peut refuser les octets après le dernier EOF, mais risquerait de rejeter des mises à jour incrémentales PDF légitimes.
