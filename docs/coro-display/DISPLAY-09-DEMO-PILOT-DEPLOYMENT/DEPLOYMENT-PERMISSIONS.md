# Permissions du pilote

Le portail exige `DISPLAY_CLIENT_PLAN_READ` et intersecte `displayBuildingIds` avec les batiments deja accessibles au ClientUser. Le backend applique ces deux autorites avant les listes, plans, apercus et observations.

Les operations professionnelles utilisent des permissions distinctes : lecture, creation, publication, gestion d'appareil et actions d'observation. Les services spatiaux verifient l'organisation et le batiment cote serveur; aucun role ADMIN/SUPER_ADMIN n'obtient implicitement une portee Display globale.

Plan phase B :

1. Acteur professionnel existant et habilite : permissions minimales creation/publication/enrolement, limitees au batiment canonique.
2. ClientUser existant : `DISPLAY_CLIENT_PLAN_READ` et uniquement le `buildingId` canonique.
3. Player : profil exclusivement `WEB_VIEW_ONLY`.
4. Interdits : `WEB_MANAGED_KIOSK`, `WEB_EMERGENCY_ELIGIBLE`, elevation ClientUser et toute permission d'urgence.

Les droits exacts preexistants devront etre releves avant mutation et restaures lors du retrait du pilote. Aucune permission n'a ete modifiee en phase A.
