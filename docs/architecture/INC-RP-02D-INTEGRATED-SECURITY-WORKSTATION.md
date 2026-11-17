# INC-RP-02D — Poste de sécurité intégré

## Portée

Cette livraison orchestre les moteurs existants sans nouvelle transition métier ni nouvelle autorité :

| Capacité | Contrat réutilisé | Garde serveur |
| --- | --- | --- |
| Main courante | `organizations/:organizationId/operational-log/entries` | `OPERATIONAL_LOG_*`, organisation et bâtiment |
| Quarts et relève | `organizations/:organizationId/operational-shifts` | `OPERATIONAL_SHIFT_*`, participant et bâtiment |
| Consignes | `organizations/:organizationId/operations/directives` | `OPERATIONAL_DIRECTIVE_*`, organisation et bâtiment |
| Suivis | `organizations/:organizationId/operations/follow-ups` | `OPERATIONAL_FOLLOWUP_*`, séparation exécutant/vérificateur |
| Rapports | `organizations/:organizationId/incident-reports` | `INCIDENT_REPORT_*`, organisation et bâtiment |

Le navigateur charge chaque capacité indépendamment avec `Promise.allSettled`. Une fonction désactivée (404), interdite (401/403) ou momentanément indisponible ne rend pas les autres fonctions inaccessibles. Les libellés expliquent l'état sans divulguer l'existence d'une ressource d'un autre tenant.

## Architecture UX

Le poste suit une hiérarchie opérationnelle unique :

1. contexte du bâtiment autorisé;
2. disponibilité réelle des cinq capacités;
3. situation du quart, consignes, suivis et rapports;
4. chronologie de main courante;
5. actions fréquentes;
6. liens vers les espaces spécialisés.

La saisie rapide crée une entrée via le contrat normal, avec clé d'idempotence. Les confirmations de consigne, décisions de relève et transitions de suivi utilisent exclusivement les routes déjà gouvernées.

## Matrice de permissions

| Profil de recette | Lecture | Actions attendues | Refus attendus |
| --- | --- | --- | --- |
| Agent A | bâtiment affecté, quart, consignes, main courante, ses rapports/suivis | confirmer, consigner, commencer/terminer, préparer via les modules spécialisés | approbation de son propre rapport, vérification de son propre suivi |
| Agent B | relève entrante et éléments transmis | accuser réception, demander clarification, reprendre les suivis | périmètres non affectés |
| Superviseur | bâtiments affectés et files autorisées | décisions de relève, approbation, publication, vérification | autre organisation, action sans permission explicite |
| Gestionnaire immobilier | synthèse des bâtiments autorisés | lecture des rapports publiés et indicateurs admissibles | données confidentielles et supervision non accordée |
| Non autorisé | aucune donnée métier | aucune | 401/403/404 sans divulgation |

L'interface ne déduit jamais une permission d'un rôle. Le serveur vérifie chaque permission et chaque affectation bâtiment.

## Accessibilité et responsive

- structure sémantique `header`, `nav`, `main`, `section`, `article`, `aside`;
- champs associés à leurs libellés;
- messages annoncés par `aria-live`;
- statut des capacités lisible sans dépendre uniquement de la couleur;
- contrôles d'au moins 42 px et navigation clavier native;
- disposition 1440/1050/720 px, une colonne sur téléphone;
- réduction des animations selon `prefers-reduced-motion`;
- reprise manuelle explicite après erreur; aucune relance automatique d'une mutation.

## Scénarios de recette synthétique

1. **Agent A** : choisir le bâtiment, ouvrir le quart spécialisé, confirmer une consigne, créer une entrée, créer/reprendre un rapport, préparer une relève.
2. **Agent B** : ouvrir le même bâtiment, accuser réception ou demander clarification, reprendre un suivi transmis.
3. **Superviseur** : consulter les éléments prioritaires, approuver un rapport, publier une consigne, vérifier un suivi.
4. **Gestionnaire** : consulter la synthèse, les événements et rapports autorisés, sans voir les données confidentielles.
5. **Non autorisé** : vérifier les refus organisation/bâtiment et l'absence de contenu résiduel après changement de contexte.

Pour chaque profil : desktop, tablette et téléphone; F5; navigation clavier; perte réseau puis reprise; double clic sur mutation; conflit de version; session expirée.

## Préproduction HTTPS

La recette navigateur complète exige un environnement privé avec le SHA candidat exact, PostgreSQL et stockage synthétiques, HTTPS valide, MFA normal et les cinq flags activés uniquement dans cet environnement. Aucun serveur local ne doit être exposé directement. Les fournisseurs de notification et intégrations physiques doivent rester absents ou simulés.

La présente PR ne crée ni ne publie cet environnement. Le statut de recette GPT Work demeure donc `NOT_VERIFIED` jusqu'à preuve d'accès HTTPS authentifié et exécution visuelle multi-profils.

## Sécurité et release

- Les cinq flags conservent leur sémantique exacte-`true` et restent désactivés par défaut.
- Aucun nouvel endpoint, modèle Prisma, secret, destinataire ou permission.
- Aucune donnée client ni fixture de production.
- La route intégrée est déclarée sensible dans le registre du Design System.
- Production : fusion et déploiement interdits sans autorisation distincte.

## Critères de sortie

- Contrat frontend, typecheck, build et Design System : PASS.
- Non-régression des moteurs backend existants : PASS.
- PostgreSQL isolé : les suites existantes des lots 0A à 02C restent la preuve d'intégrité; aucune migration dans ce lot.
- Recette navigateur multi-profils : `NOT_VERIFIED` tant que la préproduction privée n'est pas accessible.
