# Inventaire fonctionnel du portail client

Date : 25 octobre 2026

Verdict conservé : `PILOTE ENCADRÉ`

Base publiée au démarrage : `e1972e888155fcc6d5c4edf1dec8cf211ea07c2b` (PR #56)
Version active de production vérifiée dans les registres : `5d6e370c7a52c55fefacc2676c37142fccf4117b`

Cet inventaire ne transforme pas l'ouverture d'une page en preuve fonctionnelle.
`VALIDÉ` signifie que le parcours indiqué a une preuve API ou navigateur
adaptée. Une mutation ou une intégration non exercée reste `NOT_VERIFIED`, même
si sa page de consultation est validée.

## Fonctions démontrables et utilisables dans le pilote

| Fonction / routes | Usage annoncé | Rôles et permissions | Dernière preuve | Statut | Pilote |
|---|---|---|---|---|---|
| Tableau de bord `/dashboard` | Synthèse des projets, documents et activités autorisés | `CLIENT_MANAGER` limité à son client et ses bâtiments; `CLIENT_CORPORATE` dans son organisation | Matrice navigateur 12/12 du 25 octobre; API synthétique multi-tenant | VALIDÉ | Inclus en consultation |
| Bâtiments `/buildings`, `/buildings/:id` | Liste, accès direct et contexte bâtiment | Même politique canonique organisation/client/bâtiment que CP-002/003 | PR #45, PostgreSQL 16 et recette navigateur actuelle | VALIDÉ | Inclus |
| Documents `/documents`, `/documents/:id`, `/files/:id` | Consultation, version, téléchargement privé et aperçu | Accès parent canonique; permissions documentaires supplémentaires selon l'action | CP-006; DOC-01; PDF réel ouvert, 98 pages et SHA-256 vérifié | VALIDÉ | Inclus pour les opérations prouvées |
| Intelligence `/intelligence` | Compteurs, recommandations et agrégats autorisés | Manager limité aux bâtiments affectés; corporate à l'organisation autorisée | CP-004 API 8/8, navigateur 16/16, inspection de production | VALIDÉ | Inclus |
| Knowledge `/knowledge`, `/knowledge/sources/:id` | Recherche et citation de sources approuvées | Source ProjectFile et autorisation vérifiées avant résultat et citation | Campagne Knowledge représentative, remplacement/archive/révocation et refus inter-tenant | VALIDÉ | Inclus pour formats pris en charge |
| Coffre hors ligne `/offline-documents` | Préparation et lecture hors ligne de documents admissibles | Lease, utilisateur, organisation, bâtiment et version; contenu non sensible uniquement | Contrats P-2.2, tests portail actuels | VALIDÉ | Inclus selon la politique P-2.2 |
| Activités `/activities` | Consultation et filtrage des activités | Session client et portée des projets accessibles | API 200; 12/12; panne 503 explicite et action Réessayer | VALIDÉ | Inclus en consultation |
| Notifications `/notifications` | Consultation des notifications internes | Session client; données de l'organisation autorisée | API 200; 12/12; panne 503 explicite, aucun faux état vide | VALIDÉ | Inclus en consultation |
| Profil `/profile` | Affichage du compte, persistance de session et déconnexion | Identité connectée uniquement | F5 conserve la session; déconnexion purge le stockage local et retourne à `/login` | VALIDÉ | Inclus pour affichage et déconnexion |
| Manuel `/manual` | Aide intégrée et liens de navigation | Toute session client active | 12/12, navigation et géométrie | VALIDÉ | Inclus |
| Sentinelle accueil `/sentinelle/:buildingId` | Vue opérationnelle du bâtiment | Bâtiment explicitement autorisé et permissions Sentinelle | API/écran réel QA, 12/12 | VALIDÉ | Inclus en consultation seulement |
| Employés Sentinelle `/sentinelle/:buildingId/employes` | Liste et gestion locale d'employés | Accès bâtiment et permission applicable | Liste 200; création/mise à jour/suppression sans envoi externe; refus hors bâtiment/tenant | VALIDÉ | Inclus sans courriel externe |
| Rapports Sentinelle `/sentinelle/:buildingId/rapports` | Consultation des rapports existants | Accès bâtiment | API 200 et écran 12/12 | VALIDÉ | Inclus en consultation |

## Fonctions partiellement démontrées ou non vérifiées

| Fonction / routes | Usage annoncé | Preuve disponible / manque | Statut | Pilote |
|---|---|---|---|---|
| Réservations `/bookings` | Planifier ou annuler une activité | Liste, refus inter-tenant, panne 503 et reprise sont prouvés. La fixture ne contient aucun conseiller explicitement admissible; création réussie et annulation restent non démontrées. | NOT_VERIFIED | Exclure les mutations; consultation permise |
| Changement de mot de passe `/profile` | Modifier le mot de passe du compte courant | Validation et build présents; aucune mutation du secret synthétique n'a été exercée dans cette campagne. | NOT_VERIFIED | Exclu du scénario pilote |
| Carte `/map` | Visualiser et ouvrir les bâtiments géolocalisés | Autorisation des bâtiments, 12/12 et erreur API explicite prouvées. Le rendu des tuiles dépend de `unpkg.com` et OpenStreetMap, bloqués dans le réseau QA deny-by-default. | NOT_VERIFIED | Navigation de secours par liste; carte non promise |
| Invitations Sentinelle `/sentinelle/:buildingId/invitations` | Créer une invitation et envoyer un courriel | Lecture/refus et atomicité sur panne fournisseur prouvés. Aucun courriel réel ni succès fournisseur n'a été exécuté. | NOT_VERIFIED | Exclu des mutations du pilote |
| Historique Sentinelle `/sentinelle/:buildingId/historique` | Historique de présence/évacuation | Refus 403 correctement présenté pour l'acteur corporate; aucun acteur doté de la permission de succès n'a été exercé. | NOT_VERIFIED | Exclu |
| Historique incidents `/sentinelle/:buildingId/incidents` | Historique des incidents | États vide/erreur/refus corrigés par CP-001; acteur courant refusé 403. Le succès avec contenu autorisé n'est pas repris ici. | NOT_VERIFIED | Exclu hors démonstration dédiée |
| Présences, visiteurs et kiosques `/presence/:token`, `/kiosk/:token` | Enregistrement local et suivi des occupants | Routes inventoriées, mais cycle complet kiosque/visiteur non exécuté dans cette campagne. | NOT_VERIFIED | Exclu |
| Résilience et rapports avancés `/sentinelle/:buildingId/resilience` | Indicateurs de résilience | Route rendue et autorisation bâtiment inspectée; exactitude des indicateurs non démontrée ici. | NOT_VERIFIED | Exclu |
| Aide secondaire, mot de passe oublié, magic link | Assistance d'accès | Pages présentes; aucun envoi réel ou cycle de récupération complet autorisé. | NOT_VERIFIED | Support administrateur requis |

## Fonctions exclues du pilote

| Fonction | Motif | Condition de levée | Statut |
|---|---|---|---|
| Signature et PDF officiel | Fournisseur réel et chaîne de signature non exercés | Campagne séparée avec document, signataires et destinataires fictifs explicitement autorisés | NOT_VERIFIED |
| Régénération ou mutation d'un projet archivé | Règle métier non approuvée; la capacité technique subsiste | Décision « lecture seule, réouverture explicite et tracée », puis implémentation et test | NOT_VERIFIED |
| Alertes population, SMS, courriels externes et actions d'urgence | Effets externes neutralisés; P-5 demeure différé | Mandat et destinataires de test autorisés, fournisseur disponible et preuve E2E | HORS PÉRIMÈTRE |
| Analyse de formats sans extracteur | Aucun contenu ne doit être inventé | Ajouter et valider un extracteur local gouverné | HORS PÉRIMÈTRE |

## Défauts reproduits et corrigés dans le lot courant

1. Les pages Activités, Notifications, Carte et Réservations pouvaient présenter
   un état vide après un échec de chargement. Elles affichent maintenant une
   erreur accessible et une action `Réessayer`. La carte ne masque plus l'erreur
   une fois son indicateur de chargement terminé.
2. La création d'un employé ou d'une invitation Sentinelle persistait avant
   l'envoi du courriel. Une panne fournisseur retournait donc une erreur avec
   une ressource persistée. La création est maintenant compensée dans le même
   service en cas d'échec, empêchant les doublons lors d'une nouvelle tentative.

Preuves :

- API : `D:\CORO-QA\runs\cp-portal-inventory\acceptance\candidate\portal-functional-inventory.json`;
- navigateur 12/12 : `D:\CORO-QA\runs\cp-portal-inventory\browser-final\portal-browser-inventory.json`;
- états d'erreur : `D:\CORO-QA\runs\cp-portal-inventory\browser-errors-verified\portal-browser-inventory.json`;
- F5, session et déconnexion : `D:\CORO-QA\runs\cp-portal-inventory\browser-session-final2\portal-browser-inventory.json`.

## Restrictions applicables du pilote

- comptes nommés, MFA, organisation et affectations bâtiment revus avant accès;
- projets actifs seulement pour toute mutation documentaire;
- aucune signature, invitation, alerte, courriel ou SMS réel;
- réservations limitées à la consultation tant que le parcours réussi n'est pas
  exercé avec une admissibilité conseiller canonique;
- navigation bâtiment par la liste lorsque les dépendances cartographiques ne
  sont pas disponibles;
- Sentinelle limitée aux écrans et opérations explicitement validés ci-dessus;
- tout écran vide après une erreur est traité comme un incident, jamais comme
  une preuve d'absence de données.

## Décision commerciale

`PILOTE ENCADRÉ` est maintenu. Mathieu peut démontrer les fonctions marquées
`VALIDÉ` et incluses, avec les restrictions ci-dessus. Les autres fonctions ne
doivent ni être promises ni présentées comme validées. Le portail n'est pas
déclaré fonctionnel à 100 %.
