# DISPLAY-03 — Sommaire exécutif

DISPLAY-03 ajoute une autorité de publication gouvernée entre les `ProjectFile` approuvés et le futur Player. Une publication est liée à une version et une empreinte exactes, à un bâtiment, un étage et un emplacement actif. Le backend reste l’unique arbitre de la publication sélectionnable.

Livré localement : modèle Prisma, migration additive, six permissions dédiées, génération déterministe de variantes « Vous êtes ici », séparation auteur/réviseur/approbateur/publieur, cycle de vie, audit immuable, API et contrat de lecture Player.

Non livré : Player, Controller d’urgence, interface d’administration, conversion PDF/PNG/WebP complète et validation réglementaire. Verdict : **GO CONDITIONNEL pour DISPLAY-04**.
