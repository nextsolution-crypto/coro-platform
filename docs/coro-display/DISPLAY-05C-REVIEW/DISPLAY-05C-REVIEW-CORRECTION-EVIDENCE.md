# Preuves de correction

Défaut corrigé : une référence fournie dans la même requête `RESOLVED` n’était pas incluse dans le contrôle de preuve. Le service calcule maintenant la référence et la preuve effectives avant validation.

Une référence exige type, identifiant et preuve. Ces champs passent par la validation texte brut. Lorsqu’une correction documentaire existe, le professionnel qui a pris la décision ne peut pas être celui qui la valide comme résolue; un second professionnel est requis.

L’interface expose désormais type, identifiant et preuve, sans masquer la règle serveur. Aucun fichier de preuve fictif n’est créé.
