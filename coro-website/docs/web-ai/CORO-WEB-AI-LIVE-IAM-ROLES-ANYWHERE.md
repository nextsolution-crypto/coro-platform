# CORO Web AI — IAM Roles Anywhere

## État inspecté

Le dépôt attend :

- profil AWS `coro-ai-production`;
- configuration `/etc/coro-ai/aws-config`;
- session de 900 secondes;
- montage `/etc/coro-ai` en lecture seule;
- montage en lecture seule du `aws_signing_helper` fourni par l'hôte;
- image backend immuable;
- métadonnées EC2 désactivées et une seule tentative AWS.

Le runtime policy refuse les symlinks, les propriétaires/modes non sûrs, les images non épinglées, les montages écrits et les redémarrages inattendus. Les fichiers de certificat et de clé ne sont ni intégrés à l'image ni au dépôt.

## Compatibilité conteneur

Le Dockerfile actuel utilise `node:22-bookworm-slim`, donc glibc. L'incompatibilité Alpine historique n'est plus présente dans l'image source. Cela ne prouve pas encore que le binaire précis installé sur l'hôte s'exécute dans le conteneur : son architecture, son chargeur dynamique, ses bibliothèques, son checksum et son exécution via `credential_process` restent à vérifier hors invocation.

AWS documente le helper Linux et son intégration `credential_process`; les sessions Roles Anywhere acceptent 900 à 43 200 secondes. CORO fixe le minimum à 900 secondes. Source : [AWS IAM Roles Anywhere credential helper](https://docs.aws.amazon.com/rolesanywhere/latest/userguide/credential-helper.html).

## Vérifications non sensibles requises avant campagne

À exécuter via une opération gouvernée et expurgée :

1. identité, propriétaire et permissions des chemins attendus;
2. absence de symlink;
3. checksum du helper comparé à la version approuvée;
4. `file` et résolution des bibliothèques dans l'image exacte;
5. profil/config valides sans afficher ARN, chemins de clé ou certificat;
6. obtention d'une identité temporaire de 900 secondes, sans afficher les credentials;
7. renouvellement après expiration contrôlée;
8. impossibilité d'écrire dans les montages;
9. impossibilité d'utiliser IMDS ou des credentials statiques;
10. révocation du certificat ou du profil testée dans une fenêtre distincte.

## Risques et contrôles

| Risque                              | Contrôle                                                        |
| ----------------------------------- | --------------------------------------------------------------- |
| clé privée copiée dans l'image/Git  | montages hôte read-only, scans de secrets                       |
| credentials temporaires journalisés | journalisation par codes et métadonnées seulement               |
| helper substitué                    | checksum/version épinglés et fichier root-owned                 |
| profil trop permissif               | rôle runtime limité au profil et modèle CA                      |
| session trop longue                 | 900 secondes validées par code et runtime policy                |
| accès d'un autre processus          | utilisateur conteneur dédié et chemins 0400/0500 à confirmer    |
| renouvellement défaillant           | test supérieur à une durée de session avant activation publique |

## Statut

- Architecture : PASS.
- Base glibc : PASS par inspection du Dockerfile.
- Authentification hôte : rapportée, non reverifiée.
- Exécution helper dans l'image active : NOT_VERIFIED.
- Renouvellement automatique : NOT_VERIFIED.
