# DISPLAY-03-REVIEW — Sécurité PDF

Architecture obligatoire : file de travaux → worker non privilégié → conteneur éphémère sans réseau → volume temporaire isolé → sortie raster réencodée → stockage privé immuable.

Garde-fous proposés : 25 Mio source, une page autorisée en V1, dimensions physiques bornées, 300 DPI maximum, 100 mégapixels, 30 secondes CPU, 512 Mio mémoire, un processus, répertoire aléatoire, nettoyage garanti, quota de concurrence et circuit breaker.

Valider extension, MIME, signature `%PDF-`, structure et nombre de pages; refuser chiffrement, pièces jointes, JavaScript, formulaires/XFA, fichiers polyglottes, pages multiples inattendues et erreurs de parse. Ne jamais faire confiance au nom ou au Content-Type client.

Scanner avant traitement lorsque l’infrastructure le permet. Conserver l’original privé, ne servir que la sortie reconstruite et vérifiée. Journaliser identifiants et hashes, jamais le contenu. Mettre à jour rapidement le moteur : les parseurs PDF traitent des entrées hostiles.

Référence de défense en profondeur : [OWASP File Upload Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html).
