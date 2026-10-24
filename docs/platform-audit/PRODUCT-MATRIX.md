# CORO — synthèse produit et aptitude commerciale

Base initiale : release privée 722, commit e4b62d0. Complétée par l’inventaire
et les tests du lot manuel/audit. Cette synthèse ne remplace pas les décisions
contractuelles et ne suppose aucune clôture E2E sans preuve.

| Domaine | Fonctions utilisateur | Preuve actuelle | Décision actuelle | Prochaine preuve à obtenir | Priorité |
|---|---|---|---|---|---|
| Identité et droits | connexion, MFA, sessions, rôles, permissions | code et tests isolés ; garde HTTP du manuel testée | À valider transversalement | AUTH-01 et CORE-01 multi-acteurs | P0 |
| Portefeuille | organisations, clients, bâtiments, cartes, projets | écrans/API inventoriés | À valider | création, rattachement, consultation et refus inter-tenant | P0 |
| Production documentaire | configuration, génération, édition, procédures, export | code/tests présents ; pas de recette globale exécutée dans ce lot | À valider | DOC-01 et DOC-03 avec PDF final vérifié | P0 |
| Gouvernance documentaire | dépôt, révision, approbation, dates, remplacement, révocation | recette synthétique réelle du chantier Knowledge en release722 | Fonctionnement démontré sur ce périmètre ; aptitude globale à valider | étendre DOC-02 aux rôles et types de documents requis | P0 |
| Portail client | accès documents, bâtiments, activités, notifications | écrans inventoriés ; liens et navigation testés localement | À valider de bout en bout | CORE-01, DOC-01, OFF-01 sur compte client et manager | P0 |
| Knowledge | ingestion, recherche, autorisation, citations, OCR | 17 cas + 2 contrôles réels de release722 ; tests isolés | Technique validée sur corpus fictif ; vente à conditionner | recette sur documents approuvés représentatifs et packaging KNOWLEDGE_AI | P0 |
| CORO AI | réponse fondée, abstention, contradictions, mode dégradé | Bedrock réel Canada et persistance après release prouvés | Technique validée sur périmètre documentaire ; vente à conditionner | mêmes exigences Knowledge ; qualité et limites métier acceptées | P0 |
| Manuel et aide | trouver une fonction, étapes, conditions et références | 22 articles V1, tests service/HTTP/navigation, build portail | Développé et testé localement ; recette navigateur à obtenir | HELP-01 sur release déployée ; enrichissement selon campagne | P1 |
| Activités et mandats | tâches, suivi de réalisation, calendrier | code et suites de tests présents | À valider | PERF-01 jusqu’aux états finaux et agrégats | P1 |
| Booking / Planner | réservation, éligibilité, affectation, planification | harness métier et tests existants inventoriés | À valider dans campagne actuelle | PLAN-01 avec fournisseurs simulés | P1 |
| Temps et rendement | saisies, affectations, indicateurs financiers | code et tests présents | À valider | PERF-01, cohérence des périodes et totaux | P1 |
| Sentinelle | employés, présence, occupation, évacuation, historique | code et tests présents ; packaging SENTINELLE incomplet | À valider techniquement et commercialement | SENT-01/02 ; politique vendable approuvée | P0 |
| Incident / Ops | événements, suivi, journal, observation opérationnelle | code et tests présents ; packaging INCIDENT_OPS incomplet | À valider ; ne pas assimiler AI documentaire à un pilotage autonome | INC-01 et orchestration réellement couverte | P0 |
| Exercices / REX | rapports, publication, retour d’expérience | code et tests présents | À valider | REX-01 du projet au portail et à l’action corrective | P0 |
| Résilience / correctives | état, indicateurs, actions, responsabilité, suivi | code et tests présents | À valider | RES-01 et REX-01 avec confidentialité et calcul explicable | P1 |
| Population | programme, citoyen, consentement, zone, préparation/diffusion/preuves | code, tests et procédures présents ; packaging POPULATION_PUE incomplet | À valider par canal et programme | POP-01/02 ; POP-03 LIVE distinct avec autorisation appropriée | P0 |
| Intégrations bâtiment | alarmes, ponts externes et contexte de site selon code disponible | packaging BUILDING_BRIDGE incomplet ; intégrations réelles non prouvées ici | À qualifier puis valider/développer selon connecteur | inventaire des équipements et recette isolée du connecteur réel | P1 |
| Commercial | catalogue, prix, offres, clauses, contrats, droits | registres et tests présents ; PROFESSIONAL/COMPLIANCE/SERVICES packaging READY | READY du registre ne vaut pas autorisation globale de vendre | COM-01/02, clauses et conditions réelles approuvées | P0 |
| Network | vues et services présents | registre NETWORK FUTURE / NOT_AVAILABLE et packaging NOT_SELLABLE | Futur non vendable dans l’autorité actuelle | décision produit et critères avant changement de registre | P2 |
| Campus | capacité de roadmap | registre CAMPUS FUTURE / NOT_AVAILABLE | Futur non vendable | spécification et périmètre avant développement | P2 |
| Exploitation | releases, sauvegardes, restauration, santé, supervision | release722 et santé Knowledge prouvées ; rétention distante automatisée différée | À valider sur objectifs de service globaux | OPS-01, capacité, reprise et politique de conservation | P0 |
| Site public | pages, contenu, formulaires et promesses | routes inventoriées ; pas de validation commerciale globale ici | À rapprocher de ce qui est effectivement vendable | WEB-01 et revue des promesses par module/canal | P1 |

P0 = condition de confiance/lancement du périmètre concerné, P1 = fermeture du
parcours et qualité d’exploitation, P2 = extension future. Ces priorités sont
un ordre de recette proposé, pas un engagement de date.

Les preuves complètes et leurs limites sont dans AUDIT-PLAN.md, JOURNEYS.md,
inventory.json et evidence.json. Les statuts commerciaux extraits proviennent
des registres `organization-360/capability-registry.ts` et
`commercial-simulator/commercial-packaging.registry.ts` ; ils ne sont pas modifiés.
