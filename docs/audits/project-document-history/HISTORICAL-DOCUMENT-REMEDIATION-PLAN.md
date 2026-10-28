# Plan conditionnel de remédiation historique

Ce plan ne constitue pas une autorisation de mutation. Il ne s'applique que si une exécution gouvernée retourne `PUBLIC_EXPOSURE_CONFIRMED > 0`.

## Préconditions

1. Conserver les identifiants concernés dans une preuve protégée, jamais dans GitHub.
2. Vérifier sauvegarde, restauration, verrou de maintenance et origine/CDN exacts.
3. Produire une sélection déterministe et un dry-run sans contenu.
4. Vérifier pour chaque objet la référence, le rattachement, la taille et l'intégrité attendue.

## Procédure proposée

1. Copier vers la clé privée canonique sans supprimer l'origine.
2. Vérifier taille et SHA-256 de la copie par l'autorité de service.
3. Mettre à jour la référence avec contrôle de concurrence et audit.
4. Vérifier le téléchargement authentifié et les refus inter-tenant/anonyme.
5. Retirer l'accès public à l'origine, puis invalider le CDN lorsque réellement applicable.
6. Vérifier anonymement l'origine et le CDN après expiration/invalidation.
7. Ne supprimer l'ancien objet qu'après une décision de rétention distincte.

## Échecs partiels et rollback

Une copie incomplète n'autorise aucune mise à jour de référence. Une référence mise à jour n'autorise aucun retrait avant validation du téléchargement privé. Le rollback doit conserver ou rétablir la référence privée vérifiée; il ne doit jamais restaurer une ACL publique. Toute divergence d'intégrité arrête le lot.

## Critère de clôture

Zéro exposition sur chaque chemin identifié, téléchargement autorisé conservé, rattachements et versions inchangés, preuve d'intégrité, audit complet et nouvelle exécution anonyme agrégée. L'absence de preuve d'accès par un tiers ne doit pas être présentée comme preuve qu'aucun accès n'a eu lieu.
