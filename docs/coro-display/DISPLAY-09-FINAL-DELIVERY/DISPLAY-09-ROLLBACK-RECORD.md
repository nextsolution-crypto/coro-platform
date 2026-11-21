# Rollback — registre

## Lot A

Retirer le DNS et le virtual host Display seulement, restaurer la sauvegarde NGINX, exécuter `nginx -t`, reload contrôlé, puis revalider les quatre SNI historiques.

## Lot B

Revenir aux quatre images actives précédentes par le workflow gouverné. Préserver les données; aucune inversion improvisée des migrations. Utiliser sauvegarde/restauration si l'intégrité l'exige.

## Lot C

Révoquer le Player, suspendre la publication et les accès temporaires, conserver les preuves et les objets synthétiques selon la politique autorisée.

Statut : plans préparés; aucun rollback exécuté.
