# Permissions

ClientUser : lecture, prévisualisation et observations selon ses cinq permissions Display existantes. Professionnel habilité : création d'emplacement, approbation/publication, activation, rotation et révocation.

Le paramètre `buildingId` n'est jamais une autorité. Le backend intersecte organisation, client, bâtiments accessibles et bâtiments Display. Aucun droit ADMIN/SUPER_ADMIN implicite, aucune conversion ClientUser → User et aucune permission globale nouvelle.
