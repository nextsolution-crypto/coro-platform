# Lots complémentaires après clôture du MASTER portail

Ces lots sont indépendants du périmètre déjà clos. Ils ne doivent pas rouvrir
les campagnes réussies sans changement pertinent ou indice de régression.

## Priorité 0 — contrôles nécessaires avant participants autonomes

### PORTAL-PILOT-GATE — restrictions opposables

- Scénario : prouver qu'un compte pilote ne peut appeler directement signature,
  invitation externe, mutation d'archive ou autre action fermée.
- Dépendances : décision sur le mécanisme de gate serveur et inventaire des
  comptes/modules/données pilote.
- Effets externes : aucun.
- Acceptation : refus serveur avant mutation, notification, tâche ou fichier;
  accès légitimes du périmètre validé préservés.

## Priorité 1

### BOOK-01 — réservation réussie et annulation

- Scénario : conseiller synthétique explicitement admissible, création,
  consultation, annulation, répétition et refus inter-tenant.
- Dépendances : `ProjectAdvisorEligibility`, créneaux et données synthétiques.
- Effets externes : notifications neutralisées.
- Acceptation : une réservation canonique, une annulation idempotente, audit et
  aucun effet hors périmètre.

### AUTH-01 — changement de mot de passe

- Scénario : compte synthétique dédié, ancien mot de passe, nouveau mot de
  passe, reconnexion, ancien secret refusé, autres sessions selon politique.
- Dépendances : capture MFA locale et restauration/rotation du compte QA.
- Effets externes : aucun courriel réel.
- Acceptation : mutation auditée, politique de mot de passe appliquée, aucune
  fuite de secret et session conforme.

### ARCHIVE-POLICY — décision métier

- Proposition : projet archivé en lecture seule; réouverture explicite,
  autorisée, justifiée et tracée.
- Dépendances : approbation produit.
- Effets externes : aucun.
- Acceptation : invariant serveur sur toutes les mutations, réouverture
  transactionnelle et tests liste/lecture/versions/Knowledge.

## Priorité 2

### SENT-INV-01 — invitations et communications externes

- Scénario : invitation synthétique, fournisseur simulé, succès, échec,
  résultat ambigu, retry sans doublon, expiration et révocation.
- Dépendances : permission distincte ou activation serveur, adaptateur local;
  fournisseur réel seulement sous mandat ultérieur.
- Effets externes : courriel; neutralisé en QA.
- Acceptation : aucun envoi sans autorité, preuve de livraison distincte de
  l'acceptation fournisseur et atomicité métier.

### SENT-ADV-01 — fonctions avancées Sentinelle

- Scénario : présences, visiteurs, historique autorisé, rapports, résilience et
  permissions par bâtiment, sans déclencher d'urgence réelle.
- Dépendances : acteurs synthétiques dotés des permissions exactes, kiosque QA.
- Effets externes : opérations d'urgence neutralisées.
- Acceptation : succès et refus par permission, bâtiment et tenant; 12/12
  responsive sur les écrans retenus.

### MAP-01 — carte et dépendances réseau

- Scénario : bâtiments avec/sans coordonnées, tuiles disponibles/indisponibles,
  navigation et erreur explicite.
- Dépendances : décision fournisseur, confidentialité, CSP, résilience et coût.
- Effets externes : requêtes de tuiles et chargement de bibliothèque.
- Acceptation : dépendances approuvées et épinglées, aucun secret/donnée client
  dans les requêtes, repli par liste et géométrie 12/12.

## Priorité 3

### SIGN-01 — signature et PDF officiel

- Scénario : document, auteur, approbateur et signataire fictifs; signature,
  génération asynchrone, téléchargement, empreinte, reprise et refus.
- Dépendances : autorisation expresse, permission/gate serveur, fournisseur et
  destinataires de test approuvés.
- Effets externes : signature, courriel et production de PDF; interdits avant
  autorisation.
- Acceptation : autorité indépendante, version exacte, PDF ouvrable et SHA-256,
  audit, idempotence et aucune sollicitation réelle non autorisée.
