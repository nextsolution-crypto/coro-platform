# Matrice de compatibilité

| Combinaison | Verdict | Justification |
|---|---|---|
| Ancien backend + nouveau schéma | PASS conditionnel | Migrations additives/assouplissement; ancien code ignore Display |
| Nouveau backend + ancien schéma | FAIL | Les services Display référencent les 11 migrations |
| Ancien portail + nouveau backend | PASS | Routes existantes préservées; Display absent côté ancien portail |
| Nouveau portail + ancien backend | FAIL fonctionnel | `/display` et `/d` ne peuvent pas obtenir leurs contrats |
| Ancien Player + nouveau backend | PASS conditionnel | Protocoles versionnés; ne pas enrôler avant smoke |
| Nouveau Player + ancien backend | FAIL | Gateway/manifest absents |

Ordre préparé : backup/restore/capacité → migrations → backend → frontend/portail/site du même SHA → smoke → DNS/TLS → fixture Démo. Une brève indisponibilité fonctionnelle Display est acceptable avant provisionnement; zéro interruption globale n'est pas revendiqué.
