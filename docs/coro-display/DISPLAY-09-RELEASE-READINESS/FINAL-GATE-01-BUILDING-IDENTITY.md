# Gate 1A — identité canonique de Tour Prémont

Date de preuve : 2026-11-13. Exécution PostgreSQL gouvernée et strictement `READ ONLY` : workflow `43351101756`.

| Contrôle | Résultat |
|---|---|
| Organisation CORO Démo | PASS — empreinte attendue, environnement `ACTIVE / SIMULATE`, fournisseurs externes désactivés |
| Client Groupe Immobilier Prémont | PASS — cardinalité 1, actif |
| Bâtiment Tour Prémont | PASS — cardinalité 1, actif, Montréal |
| Empreinte canonique | `5ba4072e9e0027d5b74ff469e5424463f671eb76b9c052db8f024b2450b0f3ec` |
| Adresse déclarée | MISMATCH — elle n'est pas utilisée comme autorité d'identité |
| Gate post-migration Display | `REQUIRED` |

L'outillage ne divulgue aucun identifiant brut dans les logs publics. Les tests ciblés du 2026-11-13 passent : 5/5. Aucun autre bâtiment n'a été recherché, créé ou modifié.

**Verdict identité : PASS.** Ce PASS ne certifie pas à lui seul le caractère fictif du bâtiment; voir le gate de provenance.
