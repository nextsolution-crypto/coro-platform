# Intégrité documentaire

Le workflow ne modifie ni `ProjectFile`, ni publication, ni document d’origine. Les preuves de correction sont des références textuelles contrôlées; elles ne réécrivent aucun fichier.

Le test PostgreSQL prend des empreintes avant/après des enregistrements documentaires et confirme leur immutabilité. Aucun stockage partagé ni donnée de production n’a été utilisé.
