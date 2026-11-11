# DISPLAY-06A-REVIEW — Cryptographie

La signature Ed25519 couvre le payload canonique complet. La canonicalisation trie récursivement les clés et refuse `undefined`, fonctions, symboles et nombres non finis. L'enveloppe, le payload et la politique rejettent tout champ inattendu ou manquant.

Tests : signature valide, tronquée, payload modifié, ordre de propriétés différent, substitution de fichier, champ supplémentaire/manquant et nombre ambigu. SHA-256 ne sert qu'à l'intégrité; l'authenticité vient exclusivement de la signature et du registre de confiance.
