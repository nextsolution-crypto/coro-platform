# Constats de la campagne initiale

| ID | Constat et preuve | Conséquence | Suite |
|---|---|---|---|
| AUD-001 | Les registres compilés conservent SENTINELLE, INCIDENT_OPS, POPULATION_PUE, BUILDING_BRIDGE et KNOWLEDGE_AI en POLICY_INCOMPLETE. | Une réussite technique ne suffit pas à approuver leur composition commerciale. | Faire approuver codes vendables, règles de composition et conditions ; COM-01. |
| AUD-002 | NETWORK est FUTURE/NOT_AVAILABLE et NOT_SELLABLE ; CAMPUS est FUTURE/NOT_AVAILABLE. | Ne pas présenter ces capacités comme vendables du seul fait d’écrans ou de services présents. | Conserver les gates jusqu’à décision produit explicite et recette. |
| AUD-003 | Le test frontend `commercial-navigation.contract.test.cjs` attend encore « Configurateur d’offres » et une destination qui ne correspondent plus au menu courant. Le même décalage est présent sur la base e4b62d0. | Contrat automatisé commercial en échec préexistant ; ne prouve pas à lui seul une panne de parcours. | Réconcilier le contrat avec le parcours commercial approuvé ; ne pas supprimer le contrôle pour masquer l’échec. Le workflow le classe dans les échecs connus non bloquants. |
| AUD-004 | Les compteurs de navigation frontend étaient figés à 51 destinations/87 pages ; ajout du manuel = 52/88. | Échec des contrôles de couverture après ajout de la page. | Corrigé dans ce lot ; 39 tests de navigation interne/portail passent, y compris /manual#knowledge. |
| AUD-005 | Le plan de rétention distante reporte explicitement les suppressions automatiques et les contrôles GFS. | Ne pas annoncer une politique automatique GFS déjà exploitée. | Exécuter la phase de conservation séparée avec preuves de restauration et autorisations appropriées. |
| AUD-006 | Aucun parcours navigateur global multi-acteurs n’a été exécuté dans cette campagne initiale. Les 17+2 cas Knowledge de release722 sont historiques et limités à ce chantier. | La décision globale COMMERCIALISABLE reste ouverte. | Exécuter les 24 campagnes de JOURNEYS.md et rattacher leurs preuves aux fonctions couvertes. |
| AUD-007 | Le manuel V1 contient 22 articles reliés au code. Ses recherches ne couvrent pas toutes les formulations ni toutes les fonctions inventoriées. | Une abstention du manuel signifie « instruction non trouvée », pas « fonction inexistante ». | Enrichir les articles et les formulations à partir des recettes métier et des retours utilisateurs. |
| AUD-008 | En production, le 24 octobre 2026 (America/Toronto), l’historique des incidents du compte de démonstration Martin Gagnon masque une requête échouée derrière « Aucun incident enregistré ». Le code appelle `catch(console.error)` avec une liste initiale vide. | Résultat opérationnel trompeur : un refus ou une panne ressemble à une absence d’incident. | Correction isolée sur `fix/client-incident-history-states`; tests comportementaux et recette après déploiement requis. |

Les constats détaillés et leur statut se trouvent dans
`CLIENT-PORTAL-FINDINGS.md`. Le point de reprise sans secret se trouve dans
`CLIENT-PORTAL-HANDOFF.md`.

Les preuves de tests isolés sont consignées sans prompts, réponses clients,
secrets ni données de production. La campagne ne procède à aucun envoi LIVE,
signature de contrat, paiement ou activation commerciale pour produire une preuve.
