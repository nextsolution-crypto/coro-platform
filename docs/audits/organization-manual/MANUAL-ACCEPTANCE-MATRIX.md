# Matrice d’acceptation — Manuel CORO

| Domaine | Statut | Preuve / limite |
|---|---|---|
| Route Organisation `/manual` | PASS | production authentifiée |
| Route Portail `/manual` | PASS | code, inventaire et tests de garde |
| Version et empreinte des articles | PASS | version `2026-10-24.1`, SHA-256 stable |
| Sources internes non exposées | PASS | 18 tests ciblés |
| Accès anonyme | PASS | 401 sur les deux surfaces |
| Session révoquée / identité inactive | PASS | tests HTTP réels de guards |
| Séparation User / ClientUser | PASS | jetons croisés refusés |
| Isolation des articles internes | PASS | liste, lecture directe et aide filtrées |
| Filtrage par rôle/module | PARTIAL | audience seulement; politique non validée |
| Exactitude des articles présents | PASS_WITH_LIMITS | formulations prudentes; omissions majeures |
| Couverture des fonctions consolidées | FAIL | MAN-001, MAN-002 |
| Liens vers des routes existantes | PASS | sources et destinations testées |
| Lien profond initial | PASS | ancre reconnue lorsque contenu rendu |
| Lien profond après F5 | FAIL | MAN-003 |
| Recherche sans accent / casse | PASS | `bâtiment` = `BATIMENT` = 5 |
| Recherche partielle | PASS | `tim` = 6 |
| Résultats multiples | PASS | `document` = 7 |
| Aucun résultat | PASS | message explicite |
| Aide extractive pertinente | PASS | Timelog retourné |
| Abstention / injection | PASS | `INSUFFICIENT_EVIDENCE` |
| Erreur de chargement | PASS_BY_CODE | alerte explicite; panne injectée non exécutée |
| Erreur de l’aide | PASS_BY_CODE | alerte et consultation locale préservée |
| Fuite de données métier/secrets | PASS | aucun contenu dynamique, URL signée ou secret |
| Promesse juridique/réglementaire | PASS | aucune attestation; couverture Conformité absente |
| Claims OCR | PASS | limites et confiance explicites |
| Bibliothèque vs Knowledge/AI | FAIL_BY_OMISSION | statut NON_CONNECTÉ absent du Manuel |
| Carte / géocodage | FAIL_BY_OMISSION | géocodage public désactivé non documenté |
| Archives en lecture seule | FAIL_BY_OMISSION | règle absente |
| Classic 4 viewports | PASS | 4/4, aucun débordement |
| Glass Light 4 viewports | PASS | 4/4, aucun débordement |
| Glass Dark 4 viewports | PASS | 4/4, aucun débordement |
| Console navigateur | PASS | aucune erreur critique capturée |
| Clavier et focus | PASS_WITH_LIMITS | contrôles natifs et focus visible |
| Zoom 200 % | NOT_VERIFIED | non exécuté séparément |
| Lecteur d’écran réel | NOT_VERIFIED | MAN-006 |
| Production lecture seule | PASS | aucune action métier ni mutation |

## Verdict

`PARTIAL — le Manuel est sûr et utilisable comme aide partielle, mais non exhaustif et non réconcilié avec la release courante.`
