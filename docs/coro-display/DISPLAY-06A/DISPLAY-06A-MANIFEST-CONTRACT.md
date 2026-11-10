# DISPLAY-06A — Contrat du manifeste

Le manifeste version 1 contient l'affectation, la portée locative, la publication et version exacte, SHA-256, profil/dimensions, émission/réévaluation, révocation connue, référence privée du rendu, politique et séquence monotone.

L'enveloppe porte `keyId`, `algorithm=Ed25519` et une signature base64 du JSON canonique. Le Player rejette schéma inconnu, clé inconnue/révoquée, signature invalide, portée divergente, séquence ancienne, horloge manifestement incohérente, révocation connue et fichier non conforme.

La clé privée demeure côté autorité de publication. Le Player ne reçoit que les clés publiques de confiance et leur statut.
