# DISPLAY-06B-INTEGRATION — Authentification appareil

La signature Ed25519 lie appareil, timestamp, nonce, méthode, chemin et digest du corps. Les appareils non actifs/révoqués, signatures invalides, opérations substituées, timestamps périmés et rejeux sont refusés.

Le ledger expose un snapshot restaurable; le test prouve le refus après restauration. Sa persistance atomique réelle et la rotation des clés appartiennent aux futurs adaptateurs. Aucune session utilisateur ni secret universel n'est introduit.
