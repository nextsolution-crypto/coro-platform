# Cle de chiffrement de l'outbox d'invitation Client

## Variables gouvernees

- `CLIENT_INVITATION_OUTBOX_KEY_BASE64` : cle active, exactement 32 octets apres decodage Base64.
- `CLIENT_INVITATION_OUTBOX_KEY_ID` : identifiant stable et non secret de la cle active, par exemple `2026-11-v1`.
- `CLIENT_INVITATION_OUTBOX_PREVIOUS_KEYS_BASE64` : objet JSON optionnel associant les anciens identifiants aux anciennes cles Base64 encore necessaires au dechiffrement des evenements non termines.

Aucune valeur par defaut utilisable n'existe. Une valeur absente, mal formee ou d'une longueur differente de 32 octets fait echouer la creation ou le traitement de l'invitation de maniere fermee. Les cles ne doivent apparaitre ni dans Git, ni dans les journaux, ni dans les preuves QA.

## Preparation avant release

1. Generer 32 octets avec le gestionnaire de secrets approuve; ne pas utiliser un mot de passe humain.
2. Enregistrer la valeur Base64 et son identifiant dans les secrets gouvernes du backend.
3. Verifier dans un preflight protege que le decodage produit exactement 32 octets, sans afficher la valeur.
4. Construire et inspecter la configuration effective sans exporter l'environnement ou les secrets dans les preuves.
5. Executer une invitation synthetique avec fournisseur simule ou destinataire explicitement autorise avant toute activation reelle.

## Rotation

1. Conserver l'ancienne paire identifiant/cle dans `CLIENT_INVITATION_OUTBOX_PREVIOUS_KEYS_BASE64`.
2. Installer une nouvelle cle active et un nouvel identifiant.
3. Les nouveaux evenements sont chiffres uniquement avec la nouvelle cle. Les evenements existants utilisent leur `encryptionKeyId` persiste.
4. Attendre que tous les evenements associes a l'ancienne cle soient `DELIVERED`, `CANCELLED` ou `EXHAUSTED`, puis verifier par requete gouvernee qu'aucun evenement traitable ne la reference.
5. Retirer ensuite seulement l'ancienne cle du gestionnaire de secrets. Ne jamais rechiffrer ou supprimer silencieusement un evenement en attente.

## Retour arriere

Restaurer la configuration de cle precedente depuis le gestionnaire de secrets, sans remettre en attente un evenement annule et sans reemettre une invitation deja livree. Une release ne doit pas demarrer si la cle necessaire a un evenement traitable est indisponible.

## Etat de ce mandat

Le code et les tests de format/rotation sont prepares. La configuration du secret de production reste `REQUIRED_BEFORE_RELEASE` et n'est pas modifiee par la PR #135.
