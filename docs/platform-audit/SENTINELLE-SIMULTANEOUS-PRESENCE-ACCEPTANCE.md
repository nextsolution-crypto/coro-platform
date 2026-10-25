# Sentinelle — présence simultanée et parcours restants

Date : 25 octobre 2026

Branche de réalisation : `feature/sentinelle-simultaneous-presence`
Commits de réalisation : `bac1e0fa`, `66f70ec9`
PR : `#72`
Commit fusionné et déployé : `4bbcd8f5842c25115cc214d7265d65d950c9fc9b`

## Flux utilisateur retenu

1. La borne d'une entrée affiche un QR renouvelé toutes les 30 secondes.
2. Le téléphone scanne le QR et démarre une transaction serveur pendant la
   fenêtre du QR.
3. La rotation suivante n'annule pas cette transaction déjà démarrée, dont
   l'échéance propre est de cinq minutes.
4. La personne s'identifie par PIN ou par une session opaque préalablement
   autorisée sur son téléphone personnel.
5. L'écran montre le nom, le bâtiment, l'entrée et l'action proposée; la
   personne confirme explicitement son arrivée ou son départ.
6. Une répétition réseau emploie la même clé d'idempotence et ne produit pas une
   seconde présence.

Le mode sans téléphone et l'accueil manuel existants restent disponibles sur
la borne. La présence demeure déclarative : aucune géolocalisation ou preuve de
position physique n'est revendiquée.

## Défauts reproduits et correction candidate

- Le QR précédent contenait le jeton statique de la borne; sa régénération
  toutes les 60 secondes reproduisait exactement la même valeur.
- Le parcours PIN public basculait immédiatement `IN` vers `OUT`; un double
  clic ou deux téléphones pouvaient donc inverser l'intention.
- Le parcours QR historique tentait de retrouver le jeton de borne dans le
  `localStorage` du téléphone, alors que la borne et le téléphone ne partagent
  pas ce stockage.
- Le contrôle « lire puis créer » n'était pas protégé contre deux transactions
  simultanées.

La candidate ajoute une migration additive avec transaction de présence,
affichages multiples nommés par entrée, session de téléphone opaque et index
PostgreSQL partiel garantissant une seule présence ouverte par employé. La
confirmation est sérialisée par verrou transactionnel PostgreSQL. Le jeton du
téléphone est conservé uniquement dans un cookie `HttpOnly`, `SameSite=Strict`;
la base ne conserve que son SHA-256. Le PIN et l'identité ne sont pas persistés
dans le navigateur. Le chemin PIN statique antérieur refuse désormais toute
mutation et invite à scanner le QR courant.

## Preuves d'acceptation

| Contrôle | Résultat | Preuve |
|---|---|---|
| Schéma Prisma | VALIDÉ_QA | schéma valide et client généré |
| Chaîne PostgreSQL 16 | VALIDÉ_QA | 155 migrations depuis zéro, head `20261109010000_sentinelle_presence_sessions` |
| Tests unitaires | VALIDÉ_QA | 5/5 |
| Contrats portail | VALIDÉ_QA | 4/4 |
| Concurrence PostgreSQL | VALIDÉ_QA | 2/2 : deux téléphones, une arrivée; un départ, une confirmation obsolète refusée |
| TypeScript | VALIDÉ_QA | backend et Client Portal |
| Builds | VALIDÉ_QA | backend et Client Portal |
| Navigateur | VALIDÉ_QA | 12/12, quatre viewports × Classic/Glass Light/Glass Dark |
| Géométrie responsive | VALIDÉ_QA | aucun débordement ou contrôle inaccessible mesuré |
| Deux entrées simultanées | VALIDÉ_QA | Entrée Est + Entrée Ouest, une seule présence ouverte |

Captures et mesures :
`D:\CORO-QA\tracking\client-portal\sentinelle-simultaneous-presence\2026-10-25`.

## Limites actionnables

### NOT_VERIFIED — parcours fournisseur et visiteurs restants

- **Impact :** l'invitation, le renvoi et la livraison réelle ne sont pas
  validés par cette campagne de présence.
- **Condition de levée :** faux fournisseur pour les effets techniques, puis
  destinataire de test désigné pour une preuve fournisseur distincte.
- **Responsable :** QA/produit puis responsable fournisseur.
- **Statut :** exclu de la présente validation.

### NOT_VERIFIED — session reconnue sur appareil partagé

- **Impact :** création, expiration et révocation sont implémentées; la
  campagne navigateur a vérifié l'interface mais pas une politique terrain sur
  appareil partagé.
- **Condition de levée :** scénario explicite téléphone personnel/appareil
  partagé avec réouverture de navigateur et révocation administrative.
- **Responsable :** QA/produit.
- **Statut :** amélioration nécessaire avant promesse commerciale autonome.

### NOT_VERIFIED — autres parcours du prompt MASTER

Historique et rapports avancés, entrepreneur selon modèle réel, calculs de
résilience indépendants, carte avec dépendances réelles et récupération de
compte/magic link conservent leur statut antérieur tant que leur propre recette
n'est pas exécutée. Les réservations et le changement de mot de passe déjà clos
ne sont pas rouverts.

## État de livraison

La correction a été publiée par la PR `#72`, puis déployée par le workflow
gouverné `40221424378`, conclu `SUCCESS`. L'inspection post-release en lecture
seule `40222413709` est également conclue `SUCCESS` avec
`inspectionExecution: PASS` et `releaseReadiness: GO`.

État vérifié après release :

- SHA actif : `4bbcd8f5842c25115cc214d7265d65d950c9fc9b`;
- PostgreSQL : 155 migrations, head
  `20261109010000_sentinelle_presence_sessions`;
- sauvegarde : `REMOTE_VERIFIED`, empreinte distante vérifiée et VersionId
  présent;
- restauration : `RESTORE_VERIFIED`;
- rollback : quatre images disponibles;
- release : `SUCCEEDED`, étape `COMPLETED`, verrou de déploiement libre;
- preuve assainie :
  `D:\CORO-QA\tracking\client-portal\sentinelle-simultaneous-presence\2026-10-25\post-release\production-inspection-report.json`.

La preuve navigateur 12/12 demeure une preuve QA synthétique authentifiée. La
production a fait l'objet d'une inspection technique en lecture seule; aucune
présence réelle, invitation externe ou opération d'urgence n'a été déclenchée.
Le verdict commercial global demeure `PILOTE ENCADRÉ`.
