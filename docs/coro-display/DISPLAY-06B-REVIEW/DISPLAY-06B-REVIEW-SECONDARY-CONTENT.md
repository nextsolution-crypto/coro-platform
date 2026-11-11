# DISPLAY-06B-REVIEW — Contenus secondaires

L'affichage exige approbation, non-révocation, portée organisation/bâtiment, fenêtre valide, version positive, SHA-256 exact, clé de confiance active et signature Ed25519 du contenu complet. Modifier les octets après approbation est refusé.

Correction : validation stricte des dates/digest/version et application de `activeFrom`, expiration et révocation de la clé. Le booléen `authenticated` historique ne constitue plus une preuve pour ce chemin signé.

Le raccordement du scheduler au type signé reste une responsabilité d'intégration; tant qu'il n'est pas effectué, le contenu secondaire doit rester désactivé dans le Player réel.
