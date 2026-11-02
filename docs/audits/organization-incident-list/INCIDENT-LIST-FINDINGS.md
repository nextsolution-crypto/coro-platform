# Constats — liste des incidents

Baseline auditée : `4871f31823682a73bbd3e5af9e1c12ac3bbc52d2`.
SHA applicatif observé en production au démarrage du mandat : `205eb1283b7de71a338e36647ecb5c91b6ed0784`.

## INC-LIST-001 — liste silencieusement tronquée à 50 incidents

- Gravité : **ÉLEVÉE**
- Nature : défaut reproduit avec PostgreSQL et backend réels.
- Scénario : 62 incidents synthétiques sont créés dans un bâtiment, puis l’historique est demandé.
- Attendu : 62 éléments accessibles, ou pagination et total explicites.
- Observé : HTTP 200, 50 éléments; aucun total, curseur, page suivante ou avertissement.
- Cause : `getIncidentHistory()` applique `take: 50`; l’interface affiche `filtered.length` comme compteur complet.
- Impact : les 12 incidents les plus anciens sont invisibles; le compteur est faux par omission.
- Preuve : `D:\CORO-QA\tracking\organization-incident-list\incident-list-api-acceptance.json`.
- Correction proposée : pagination serveur stable avec total autorisé, curseur déterministe et compteur distinct « affichés / total ».

## INC-LIST-002 — contrat de liste surdimensionné et données sensibles inutiles

- Gravité : **ÉLEVÉE**
- Nature : risque statique démontré par le contrat Prisma actuel.
- Scénario : lecture de l’historique autorisé.
- Attendu : projection minimale nécessaire aux lignes.
- Observé : `findMany` ne définit aucun `select`; tous les champs scalaires de `IncidentEvent` sont renvoyés, notamment les instantanés d’occupants et d’équipe, la fiche d’intervention et les champs de jeton d’accès public, même si la page ne les affiche pas.
- Impact : exposition inutile dans le navigateur et surface accrue en cas de fuite ou d’extension de l’interface.
- Preuve reproductible : `IncidentService.getIncidentHistory`, absence de `select`.
- Correction proposée : DTO de liste explicite et projection en liste blanche; réserver les données détaillées à la route de détail gouvernée.

## INC-LIST-003 — PRE_ALERT et CANCELLED présentés comme « Résolu »

- Gravité : **ÉLEVÉE**
- Nature : défaut statique certain; la table des statuts ne couvre que `ACTIVE`, `CONTAINED` et `RESOLVED`.
- Scénario : une ligne porte `PRE_ALERT` ou `CANCELLED`.
- Attendu : libellé et style propres au statut réel.
- Observé : le repli `STATUS_CONFIG.RESOLVED` applique « Résolu » en vert.
- Impact : mauvaise interprétation opérationnelle d’une préalerte ou d’une annulation.
- Correction proposée : exhaustivité typée des cinq statuts et test de non-régression sans repli sémantique trompeur.

## INC-LIST-004 — exercice non distingué d’un incident réel

- Gravité : **ÉLEVÉE**
- Nature : défaut reproduit au niveau du contrat et confirmé statiquement dans l’interface.
- Scénario : des événements avec `isExercise=true` et `false` sont mélangés.
- Attendu : marqueur textuel explicite et filtrable.
- Observé : `isExercise` est présent dans la réponse mais jamais rendu ni filtré.
- Impact : un exercice peut être interprété comme une urgence réelle ou influencer une lecture historique sans distinction.
- Correction proposée : badge « Exercice »/« Incident réel », filtre dédié et libellés accessibles.

## INC-LIST-005 — contexte et dates insuffisants

- Gravité : **MOYENNE**
- Nature : défaut d’utilité observé.
- Observé : une ligne affiche type, statut, heure de survenue, durée, procédure et avancement des étapes. Elle n’affiche ni bâtiment, ni organisation, ni responsable, ni sévérité d’événement, ni date de création/modification. Le schéma d’événement ne possède pas d’autorité canonique de responsable ou de sévérité globale.
- Impact : dans la route aujourd’hui limitée à un bâtiment, le contexte est partiellement implicite; les autres notions demandées ne peuvent pas être présentées fidèlement.
- Décision métier : définir si une sévérité et un responsable d’événement sont des autorités canoniques ou si seules les sévérités/responsables des tâches doivent être présentés.
- Correction proposée : afficher le bâtiment dans l’en-tête, libeller « Survenu le », puis n’ajouter que des champs canoniques approuvés.

## INC-LIST-006 — fonctions de consultation absentes

- Gravité : **MOYENNE**
- Nature : capacité absente.
- Observé : aucune recherche, aucun tri, aucune pagination; deux filtres de statut seulement.
- Impact : la liste devient difficile à exploiter avant même le plafond de 50.
- Correction proposée : après INC-LIST-001, recherche serveur, tri stable et filtres dont les paramètres sont conservés après F5.

## INC-LIST-007 — filtre « En cours » plus étroit que son libellé

- Gravité : **MOYENNE**
- Nature : défaut sémantique statique.
- Observé : le filtre `ACTIVE` ne conserve que le statut exact `ACTIVE`; `PRE_ALERT` et `CONTAINED` sont exclus bien qu’ils ne soient pas clos.
- Impact : événements encore ouverts masqués sous un libellé qui suggère tous les événements en cours.
- Décision métier : soit renommer « Actifs », soit définir « En cours » comme ensemble des états non terminaux.

## INC-LIST-008 — autorité interne et autorité Client distinctes

- Gravité : **INFORMATION / DÉCISION DE PORTÉE**
- Nature : comportement statique vérifié.
- Observé : l’écran existe uniquement dans le portail Client. Sa lecture exige `IncidentPermission.INCIDENT_READ`, l’organisation et l’accès canonique au bâtiment. Les endpoints internes séparés exigent `PlatformPermission.INCIDENT_READ` et l’organisation, mais pas une `IncidentAuthorityAssignment` de bâtiment; les affectations typées sont requises pour les mutations de commandement.
- Impact : ne pas transposer la matrice des rôles Organisation à l’écran Client; clarifier séparément si la lecture interne doit rester organisationnelle ou devenir affectée par bâtiment.
- Statut : aucune modification dans cet audit.

## INC-LIST-009 — cible interactive trop petite au format mobile

- Gravité : **MOYENNE**
- Nature : défaut de géométrie reproduit dans Chrome réel.
- Scénario : affichage 390×844 sous Classic, Glass Light et Glass Dark, puis mesure des éléments `button` et `[role=link]`.
- Attendu : chaque cible interactive pertinente mesure au moins 40 px dans les deux axes et demeure utilisable au clavier et au tactile.
- Observé : au moins une cible interactive du shell/de la liste demeure sous 40 px dans les trois thèmes. Aucun débordement horizontal critique n’est observé.
- Impact : manipulation tactile plus difficile et conformité d’accessibilité mobile incomplète.
- Preuve : `D:\CORO-QA\tracking\organization-incident-list\incident-list-browser-acceptance.json` et captures associées.
- Correction proposée : identifier les contrôles mesurés, porter leur cible effective à au moins 44×44 px sans agrandir inutilement leur rendu visuel, puis rejouer les trois configurations mobiles.
