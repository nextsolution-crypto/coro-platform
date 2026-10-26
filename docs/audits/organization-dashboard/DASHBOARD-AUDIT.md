# Audit ciblé — tableau de bord organisation CORO

Date de l'audit : 2026-10-26  
Route : `https://app.getcoro.io/dashboard`  
Code examiné : `1d1683202882ca8761eb0c94dcaad3d4d94cc0f1` (`origin/main`)  
Production inspectée : même SHA, inspection gouvernée `40397389247` — `PASS/GO`  
Nature : audit seulement; aucun code produit, aucune donnée et aucune configuration n'ont été modifiés.

## Résumé décisionnel

### Ce qui fonctionne

- La route authentifiée se charge en production pour un SUPER_ADMIN actif.
- Le dashboard affiche les quatre KPI, les activités à venir, les tâches, les renouvellements et les cinq projets récents.
- La liste principale des projets utilise `projectAccessWhere(actor)` : organisation pour ADMIN/SUPER_ADMIN, projets assignés ou modifiés pour OPERATOR.
- Les lectures principales sont protégées par JWT et `OrganizationStatusGuard`.
- Les destinations affichées correspondent à des routes existantes.
- Le rendu production observé ne présente pas d'écran vide ni d'erreur visible.
- Les contrats ciblés existants passent : 3/3 pour les approbations et 6/6 pour les finitions visuelles.

### Défauts bloquants

1. **DASH-001 — périmètre OPERATOR incohérent.** Les mises à jour documentaires, approbations, activités récurrentes et activités à venir sont requêtées sur toute l'organisation et non avec la portée canonique de l'utilisateur. Le moteur de recherche global du shell suit aussi seulement `organizationId`. Un conseiller peut donc recevoir des métadonnées ou agrégats de projets qui ne lui sont pas affectés.
2. **DASH-002 — pannes transformées en faux zéros ou faux états vides.** Cinq appels secondaires absorbent toute erreur avec `catch(() => ({ data: [] }))`. Une panne, un 403 ou une session devenue invalide s'affiche comme « aucune donnée ».
3. **DASH-003 — “Mes tâches” n'est jamais alimenté.** `lateTasks` est initialisé à `[]`, mais aucun appel ni `setLateTasks` n'existe. Le message « Aucune tâche en retard » est donc systématique et ne constitue pas un résultat métier.

### Défauts non bloquants

- **DASH-004 :** l'étape d'accueil « Au moins un conseiller dans l'équipe » est automatiquement vraie pour tout administrateur (`projets.length >= 0 && isAdmin`).
- **DASH-005 :** plusieurs cartes et lignes cliquables sont des `div`/`tr` sans rôle, tabulation ni gestion clavier.
- **DASH-006 :** une erreur du chargement principal ne produit aucun message ni bouton Réessayer; les valeurs par défaut restent visibles.

### Améliorations UX recommandées

- afficher le périmètre courant et une date/heure de fraîcheur;
- définir clairement « actif », « validé », « mise à jour due » et la période des activités;
- distinguer zéro, absence de données et indisponibilité;
- remplacer les surfaces cliquables par des liens ou boutons sémantiques;
- isoler l'échec d'un widget sans masquer les widgets sains;
- ajouter un filtre/périmètre explicite seulement si les règles produit l'autorisent.

### Points non vérifiés

- matrice QA multi-organisations et multi-rôles sur le SHA courant;
- thèmes Classic, Glass Light et Glass Dark aux quatre viewports demandés;
- comportement réel sur réponse lente, erreur partielle, réseau coupé, session expirée et changement d'affectation;
- navigation clavier complète et contraste mesuré;
- destination de chaque action exécutée sous ADMIN et OPERATOR.

## Inventaire fonctionnel

| Élément | Question utilisateur | Source | Périmètre observé | Période/unité | Statut |
|---|---|---|---|---|---|
| Projets actifs | Combien de projets sont en cours? | `GET /projects` | canonique par rôle | instantané; nombre | PASS pour source principale |
| En révision | Combien attendent une révision? | `GET /projects` | canonique par rôle | instantané; nombre | PASS pour source principale |
| Validés | Combien sont validés? | `GET /projects` | canonique par rôle | instantané; nombre | PASS pour source principale |
| Mises à jour dues | Quels documents ont plus de 12 mois? | `GET /projects/upcoming-updates` | organisation seulement | âge en mois; seuil 12 | FAIL pour OPERATOR |
| Approbations | Quels documents sont à approuver? | `GET /projects/pending-approval` | organisation, hors propres soumissions | instantané; nombre | FAIL pour OPERATOR; rôle approbateur non filtré à la lecture |
| Délais de mandat | Quels forfaits approchent leur date limite? | `GET /notifications/mandate-delays` | organisation; OPERATOR limité au projet/mandat | jours | PASS dans le code |
| Activités récurrentes | Quoi renouveler après 10 mois? | `GET /activities/recurring-to-renew` | organisation seulement | âge en mois | FAIL pour OPERATOR |
| Activités à venir | Quoi faire dans 30 jours? | `GET /activities/upcoming` | organisation seulement | 30 jours | FAIL pour OPERATOR |
| Mes tâches | Quelles tâches sont en retard? | aucune | aucune | jours de retard | FAIL — source absente |
| Projets récents | Quels projets ont changé récemment? | `GET /projects` | canonique par rôle | cinq derniers `updatedAt` | PASS dans le code |
| Checklist d'accueil | L'organisation est-elle configurée? | utilisateur + projets | organisation | progression en % | PARTIEL; une étape est toujours vraie |
| Recherche du shell | Trouver projet/client/bâtiment | `GET /projects/search` | organisation seulement | résultats limités | FAIL pour OPERATOR |

## Autorisation et données

Le contrôle canonique est défini dans `coro-backend/src/auth/project-access.ts` :

- ADMIN et SUPER_ADMIN : organisation courante;
- OPERATOR : organisation courante et projet dont il est responsable ou dernier éditeur;
- tout autre rôle : refus.

La liste et la lecture directe des projets utilisent cette règle. Les quatre sources secondaires précitées reçoivent toutefois uniquement `organizationId`; leur contenu n'est pas ramené au même périmètre. L'isolation inter-organisation est présente dans les requêtes examinées, mais cela ne prouve pas la confidentialité entre utilisateurs de la même organisation.

## États et résilience

Le dashboard possède un état global `loading`, mais pas de modèle par widget. La résolution partielle par tableau vide empêche de distinguer :

- une réponse vide réelle;
- une erreur réseau;
- un refus d'accès;
- une session expirée;
- un service indisponible.

Il n'existe ni bandeau d'erreur, ni bouton Réessayer, ni indicateur de données périmées. La reprise après F5 n'a été observée que sur la session SUPER_ADMIN de production; les scénarios de panne restent `NOT_VERIFIED`.

## Décision propre au dashboard

**CORRECTION REQUISE AVANT UTILISATION par des OPERATOR.**

Le dashboard est consultable par un administrateur d'organisation, avec réserves sur les faux états vides et le widget de tâches. Il ne doit pas être considéré comme validé pour un conseiller à portée restreinte tant que les sources secondaires et la recherche n'appliquent pas `projectAccessWhere(actor)`. Ce verdict ne s'étend à aucun autre écran CORO.

