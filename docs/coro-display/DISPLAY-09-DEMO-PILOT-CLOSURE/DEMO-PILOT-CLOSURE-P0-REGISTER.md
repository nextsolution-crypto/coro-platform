# Registre P0

| Contrôle | Résultat | Preuve |
|---|---|---|
| Navigation conditionnelle | PASS | test portail + build |
| Autorité ClientUser/professionnel | PASS | revue contrats |
| Multitenant | PASS | E2E à trois organisations |
| PDF V1/V2 synthétiques | PASS | validation + empreintes distinctes |
| PostgreSQL/HTTP/Player | PASS | E2E jetable |
| Session/révocation | PASS | E2E Player |
| CI PR et post-fusion | PASS | runs `43320655161`, `43321546408` |
| Tour Prémont production | NOT_VERIFIED | hors mandat |
| Navigation visuelle portail Chromium | NOT_VERIFIED | non exécutée |
| iPad/Safari physique | NOT_VERIFIED | non exécuté |

Aucun P0 logiciel démontré n'est en échec. Les réserves restantes bloquent le pilote physique, pas la clôture logicielle conditionnelle.
