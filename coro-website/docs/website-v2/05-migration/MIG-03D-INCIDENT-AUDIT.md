# MIG-03D — Audit `/coro-incident` (stade A : vérité produit, assets, architecture de contenu)

Création d'une page neuve (aucune page V1). Aucun code de page, CSS, registre ni sitemap modifié dans ce stade.

## 0. Statut de création
CURRENT : pas de `app/coro-incident`, HTTP introuvable, `routes.ts` cible PUBLISH-NOW avec `implemented: false`, référencée dans `HomePageClient.tsx`. TARGET : page V2 FR seulement ; `implemented: true` après QA ; entrée sitemap ; entrée `migratedV2Routes` après QA hors registre. Pas de baseline fictive : `tests/fixtures/coro-incident-product-truth.json` porte les faits vérifiés.

## 1. Vérité produit (sources : `coro-backend/prisma/schema.prisma`, `src/occupancy/incident.service.ts`, `incident.controller.ts`, pages du portail client)

| # | Question | Constat | Statut |
|---|---|---|---|
| 1 | Ce qui crée un incident | `POST /occupancy/incidents/trigger` (utilisateur authentifié du portail) ; `POST /occupancy/alarm-trigger/:token` (jeton de bâtiment, sans compte) ; bouton panique (`/panic`, notifie des contacts et journalise sur l'incident actif) | LIVE (manuel) ; PARTIAL (PAI) |
| 2 | Types | Énumération de 15 valeurs : fumée, alerte incendie, alarme incendie, fuite de gaz, menace active, urgence médicale, gaz toxique, colis suspect, coupure de courant, matières dangereuses, alerte à la bombe, batterie au lithium, inondation, vents violents, autre. Le « 15 types » de la V1 est donc exact dans le code actuel (compte de l'énumération) | LIVE |
| 3 | Procédures | Chaque type est relié à un code de procédure (`INCIDENT_PROCEDURE_MAP`, défaut P001) ; les étapes du rôle coordonnateur de cette procédure sont capturées au déclenchement | LIVE |
| 4 | Journal | `IncidentLog` : horodatage, action, acteur, détail, drapeau automatique / manuel ; entrées automatiques au déclenchement, à la pré-alerte, au signal répété, à « contenu » et « résolu » ; notes manuelles via `POST /:id/logs` | LIVE |
| 5 | Qui active | Utilisateur authentifié du portail client (jeton JWT) ; PAI par jeton de bâtiment | LIVE |
| 6 | Notifications | Coordonnateur : courriel (+ SMS si numéro et consentement) ; autres membres d'urgence mobilisables : courriel + tâche avec lien de confirmation (+ SMS avec consentement) ; occupants employés : courriel, jamais en mode exercice | LIVE |
| 7 | Canaux réels | Courriel et SMS (Brevo). Aucun canal voix ni notification d'application | LIVE (courriel, SMS) ; NOT IMPLEMENTED (voix, application) |
| 8 | Présence / mobilisation de l'équipe | `teamSnapshot` : membres d'urgence actifs du bâtiment, avec rôles ; capturé au déclenchement, avec la présence du jour d'après le registre | LIVE |
| 9 | Lien avec Sentinelle | `occupantsSnapshot` : enregistrements du registre (statut IN, jour courant) capturés à l'instant du déclenchement | LIVE |
| 10 | Incidents simultanés | Le déclenchement manuel ne bloque pas un incident existant ; `GET …/active-all` liste tous les actifs ; chaque incident a son journal, ses tâches et son rapport. Le PAI, lui, dédoublonne | LIVE |
| 11-12 | Mode exercice | `isExercise` : préfixe « [EXERCICE] » dans les messages et le journal, mention « MODE EXERCICE » dans les courriels ; les occupants ne sont pas notifiés ; l'équipe l'est | LIVE |
| 13 | Rapport PDF | Généré côté navigateur depuis le détail de l'incident : 1 Identification, 2 Chronologie, 3 Occupants au déclenchement, (4 équipe mobilisée), 5 Déroulement de la procédure, 6 REX, (7 signatures, d'après l'ancien texte) ; bouton « Exporter le rapport PDF » | LIVE (sections 4 et 7 non relues) |
| 14 | REX | Quatre champs texte : ce qui a bien fonctionné, points à améliorer, recommandations, actions correctives proposées ; date de finalisation | LIVE |
| 15 | Actions correctives | Module distinct `CorrectiveAction` rattaché optionnellement à l'incident : référence, priorité, statut (PLANNED / IN_PROGRESS / COMPLETED / CANCELLED), assigné, échéance, complétion, vérification, fermeture, preuves. Champ REX « actions correctives » = texte libre séparé | LIVE (module) ; lien REX → actions non vérifié |
| 16 | QR / lien d'intervention | Jeton `randomUUID` généré à chaque déclenchement, stocké dans `publicAccessToken` (unique) ; `GET /occupancy/intervention-access/:token` sans compte ; page publique `/intervention/[token]` du portail ; envoi par courriel (`POST /:id/send-access`) à des adresses choisies | LIVE (lien, courriel) |
| 17 | Contenu exposé | Type et heure, point de rassemblement, équipe mobilisée (instantané), nom / adresse / ville du bâtiment, responsable (nom, téléphone, courriel), accès pompiers (poste de commandement, boîte à clés, raccord, bornes, vannes, ascenseur), protection incendie, matières dangereuses, utilités, personnes nécessitant une assistance | LIVE |
| 18 | Validité / révocation | Valide tant que l'incident est actif ; fermeture ou annulation → « lien invalide ou expiré » ; chaque accès est compté (compteur et dernière date) ; **aucune durée maximale et aucune révocation manuelle trouvées** | LIVE (à durée non bornée) |
| 19 | PAI | Voir Pre-Incident Gate : logiciel présent, dispositif externe absent ; pré-alerte de 45 s, escalade automatique, signal répété journalisé, n'ouvre pas d'événement d'évacuation | PARTIAL |
| 20 | Synthèse | ci-dessus | — |

Non établi ici : la présence effective du QR d'intervention sur la borne (un point d'accès « incident actif » existe pour la borne ; le QR généré par la page borne code l'URL de présence, pas celle de l'intervention).

## 2. Matrice de capacités

| Capacité | Statut | Public maintenant ? | Décision |
|---|---|---|---|
| Déclenchement manuel, 15 types | LIVE | Oui (sans codes de procédure) | Publier |
| Procédure liée, étapes du coordonnateur cochables, mobilisation par tâche et confirmation | LIVE | Oui, sans « automatique » | Publier |
| Journal horodaté, notes manuelles | LIVE | Oui | Publier (signature) |
| Notifications courriel et SMS (avec consentement) | LIVE | Oui | Publier |
| Occupants et équipe capturés au déclenchement | LIVE | Oui | Publier |
| Incidents simultanés | LIVE | Oui, limité | Publier, une phrase |
| Mode exercice | LIVE | Oui, limité | Publier ; sans lien vers `/coro-exercices` |
| Lien d'intervention pour les intervenants | LIVE | Oui, limité | Signature possible ; durée non bornée : décrire « tant que l'incident est actif » |
| Rapport PDF, REX (4 champs) | LIVE | Oui, sans « conforme » | Publier |
| Actions correctives (module) | LIVE | Limité | Mentionner sans détailler |
| Panneau d'alarme (PAI) | PARTIAL | Non | Ne pas promouvoir |
| Voix, notification d'application | NOT IMPLEMENTED | Non | Ne rien dire |
| Intégration 911, répartition, service d'incendie | NOT IMPLEMENTED | Non | Ne rien dire |
| Références ISO 22301 / CNPI / CNESST / NFPA / CCOHS, durées de conservation | Non étayées | Non | Ne rien dire |

## 3. Canaux

| Canal | Implémenté | Conditions | Formulation publique |
|---|---|---|---|
| Courriel | Oui | Coordonnateur, membres d'urgence (avec lien de confirmation), occupants employés (hors exercice), destinataires du lien d'intervention | « courriel aux personnes désignées » |
| SMS | Oui | Numéro présent et consentement explicite | « SMS avec consentement » |
| Voix | Non | — | Aucune |
| Application | Non | — | Aucune |

## 4. Assets (ouverts et regardés)

| Asset | Dimensions | Ce qu'il montre | Nature | Données visibles | Vérité produit | Décision | Statut | Rôle possible |
|---|---|---|---|---|---|---|---|---|
| `website-v2/sentinel/first-responders-arrival.webp` | 1536×1024 | Pompiers et camion « INCENDIE » entrant dans un bâtiment (1250) ; panneau « INFORMATION PREMIERS RÉPONDANTS » avec un QR et quatre rubriques ; agent de sécurité avec tablette | Illustration marketing générée | Texte incrusté, QR illustratif | Le panneau correspond au concept de la fiche d'intervention ; aucun détail d'interface ; l'image n'implique pas de répartition automatique | KEEP (hero candidat) | REVIEW léger : QR illustratif, à ne pas présenter comme fonctionnel | Hero (passation aux intervenants) |
| `alert/fiche_intervention.webp` | 1254×1254 | Fiche d'intervention « accès temporaire » : point de rassemblement, accès, protection incendie, matières dangereuses (batteries lithium, diesel UN1202), utilités, assistance | Capture d'interface (rendu de démonstration) | « Tour Prémont, 1200 boul. Robert-Bourassa, Montréal H3B 4W8 », adresses de rues, matières | Correspond aux rubriques de la fiche du code actuel | KEEP WITH PUBLICATION REVIEW | **PUBLICATION-BLOCKER** : adresse d'apparence réelle et détails de site à confirmer | Preuve du lien d'intervention |
| `resilience/coro-module-incident.webp` | 1511×1003 | Formulaire de déclenchement d'incident | Capture d'interface | Non rouvert dans ce lot | Non revérifié | DEFER | REVIEW | Activation |
| `resilience/coro-rapport-incident.webp` | 1436×1096 | Rapport d'incident avec « Obligatoire — ISO 22301 » et bouton de partage | Capture d'interface | Textes incrustés | Écart (mention ISO, bouton absent du code) | REPLACE / RECAPTURE | Ne pas publier en l'état | Rapport |
| `alert/coro-alerte-envoyee.webp` | 1186×1327 | Confirmation d'alerte avec canaux voix / application | Capture d'interface | — | Canaux absents du produit actuel | REPLACE / REJECT | Ne pas publier | — |
| `alert/coro-alerte-panique-courriel.webp` | 784×734 | Courriel d'alerte panique | Rendu du gabarit | « Martin Gagnon », adresse Tour Prémont | Conforme au gabarit | KEEP WITH PUBLICATION REVIEW | Provenance non confirmée (déjà bloqueur Résilience) | Notification (relève de la fonction panique, pas du cycle d'incident) |
| `homepage/incident-response.webp` | 1484×1060 | Table de gestion d'incident ; écran « INCIDENT EN COURS… SIM en route » | Illustration marketing | Texte incrusté, « Tour Prémont » | L'écran suggère une coordination avec les services (« SIM en route ») | KEEP WITH REVIEW ; non retenue pour le hero | REVIEW | Contexte humain secondaire |
| `homepage/drill-exercise.webp` | 1484×1060 | Exercice d'évacuation, « Coordonnateur d'exercice » | Illustration marketing | « Tour Prémont 1200 » | Concerne l'exercice | KEEP WITH REVIEW | REVIEW | Exercice (une phrase, sans lien) |
| `homepage/platform-incident.webp` = `alert/coro-module-incident-types.webp` | 1185×1327 | Registre d'occupation | Capture d'interface | Jeton de borne visible | Relève de Sentinelle | REJECT pour Incident | Ne pas publier | — |

Aucune capture actuelle du journal d'incident ni de la page de détail : RECAPTURE REQUIRED BEFORE GO-LIVE si l'on veut une preuve d'interface.

## 5. Décision hero
`first-responders-arrival.webp` communique la passation de l'information aux intervenants ; elle n'affiche ni répartition automatique, ni intégration au 911, ni interface CORO. Recommandation : hero, MARKETING ILLUSTRATION, `alt=""`. Réserve : elle illustre l'arrivée des pompiers plutôt qu'un incident en cours ; le texte du hero doit porter la coordination et le journal. Le QR du panneau reste illustratif.

## 6. Langue et réglementaire
FR seulement : `englishAvailable={false}`, `hasEnglish: false`. Réglementaire : aucun énoncé public ne dépend d'une norme ; ne pas citer ISO 22301, CNPI, CNESST, NFPA, CCOHS, ni conservation, ni preuve légale. Non fait dans ce stade : recherche SEO web ; à faire avant le titre définitif.

## 7. Proposition de contenu (à approuver)
1. **Rôle :** ce qui se passe quand un événement devient un incident actif dans CORO.
2. **H1 :** « Quand l’incident commence, tout le monde sait quoi faire. » (à valider).
3. **Intro :** CORO Incident relie le déclenchement, la mobilisation de l'équipe, le journal, l'information pour les intervenants et le rapport.
4. **Architecture :** hero → un incident commence (15 types, procédure liée) → activer → qui est concerné (équipe et occupants capturés au déclenchement) → mobiliser (tâches, courriel, SMS avec consentement) → chronologie (signature, chronologie structurelle sans heures) → information pour les intervenants (lien tant que l'incident est actif ; preuve : fiche d'intervention après remplacement des données) → fermer → rapport → REX et suivi correctif → cadre (exercice, incidents simultanés en une phrase) → FAQ → CTA.
5. **Chronologie :** liste ordonnée sémantique : Activation, Mobilisation, Action, Mise à jour, Clôture, Rapport, Retour d'expérience ; sans heures inventées.
6. **Preuves :** aucune capture actuelle acceptable sauf la fiche (avec blocker) ; sinon structure HTML.
7. **Hero :** `first-responders-arrival.webp`.
8. **CTA :** démonstration `/#demo` ; accès CORO Client seulement si utile.
9. **Titre / description (provisoires, sans marque) :** « Gestion d’incident : activation, chronologie et rapport » ; « CORO Incident relie le déclenchement, la mobilisation de l’équipe, le journal horodaté, l’information pour les intervenants et le rapport d’incident. »
10. **Exclus :** PAI et automatisation, voix et application, 911 et répartition, normes et conformité, durée de conservation, actions correctives détaillées, codes de procédure, « rapport prêt pour inspection ».
