# Matrice d’acceptation — export PDF documentaire

| Domaine | Statut | Preuve / observation |
|---|---|---|
| SHA immuable PR #124 | PASS | `a99af3ed...`; différence avec `0fdf007...` limitée à la synthèse QA |
| Parcours génération → édition → soumission → approbation → réouverture | PASS | preuve préalable réexécutée PMU/PSI/PCA sur le même stack |
| Export PMU FR | PASS | 83 pages, Lettre, 3 802 637 octets |
| Export PMU EN | PASS | 82 pages, Lettre, 3 803 525 octets |
| Export PSI FR | PASS | 56 pages, Lettre, 1 335 711 octets |
| Export PCA FR | PASS | 74 pages, Lettre, 2 185 169 octets |
| Aperçu PMU | PASS | filigrane « APERÇU » visible; fichier distinct |
| Sommaire / pagination | PASS visuel ciblé | sommaire et numéros cohérents sur pages inspectées |
| Texte / accents / extraction | PASS | zéro caractère U+FFFD dans les extractions |
| Images et tableaux | PASS visuel ciblé | infographie PMU et tableaux PCA lisibles, non tronqués sur échantillons |
| PDF balisé / PDF-UA | FAIL / NOT_VERIFIED | `Tagged: no`; lecteur d’écran non exécuté |
| Refus anonyme | PASS | 401, JSON, aucun PDF |
| Refus inter-tenant | PASS | 404, JSON, aucun PDF |
| Opérateur même organisation non affecté | PASS | 404, JSON, aucun PDF |
| Session d’utilisateur désactivé | PASS | 401, JSON, aucun PDF |
| Brouillon export final direct | FAIL | 201 PDF |
| Projet archivé export final direct | FAIL | 201 PDF |
| Projet inactif export final direct | FAIL | 201 PDF |
| Version approuvée canonique | FAIL architecture | contenu rendu depuis `Document.content` courant |
| Concurrence, deux demandes explicites | PASS technique / PARTIAL gouvernance | 2 × 201, PDF identiques lors de la dernière exécution, 2 audits |
| Panne moteur, réponse perdue, reprise durable | NOT_VERIFIED | aucune autorité persistante de travail/reprise |
| Chargement réseau contrôlé | PASS pour fixture testée | aucune requête vers la sonde interne QA |
| SSRF / fichier local / redirection, couverture générale | NOT_VERIFIED | test contrôlé insuffisant pour conclure globalement |
| Stockage privé PDF officiel | PASS tests ciblés | 23/23 tests stockage/export privé |
| Signature / valeur juridique | NOT_APPLICABLE | explicitement hors mandat |
| Chrome 390/768/1440/2560 × 3 thèmes | PASS géométrie | 12/12, aucun débordement, aucune erreur console critique |
| Focus clavier de la modale | FAIL | focus reste sur le contenu sous-jacent |
| Zoom 200 % | PASS géométrie | aucun débordement horizontal |
| F5 | PASS | page projet et session persistantes; modale volontairement refermée |
| PGC / PRA / PUE | NOT_VERIFIED | types non supportés dans le chemin audité |

Verdict : **PARTIAL — CORRECTIONS REQUISES AVANT ACCEPTATION DE L’EXPORT FINAL GOUVERNÉ**.
