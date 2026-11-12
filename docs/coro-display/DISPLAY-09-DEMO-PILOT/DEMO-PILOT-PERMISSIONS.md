# Permissions

Le portail conserve ses cinq capacités Display client existantes. La navigation ajoutée exige `DISPLAY_CLIENT_PLAN_READ`; le backend intersecte toujours les portées organisation, client, bâtiment et `displayBuildingIds`.

Les opérations de création d'emplacement, publication, activation, rotation et révocation restent des opérations internes gouvernées par les autorités Display professionnelles. Aucun droit `ADMIN` ou `SUPER_ADMIN` implicite et aucune transposition User → ClientUser n'ont été ajoutés. Pour le pilote, le client consulte/prévisualise; l'administration de l'emplacement et de l'activation doit être réalisée par un acteur professionnel explicitement habilité.
