# Player

`GovernedDisplayCommandProcessor` vérifie clé de confiance, signature, organisation, bâtiment, appareil, temps, séquence, priorité et incident de sortie. Il accuse RECEIVED, persiste l’état HMAC, bascule le mode, journalise puis accuse APPLIED.

Les tests démontrent la restauration d’une urgence après redémarrage et le refus d’un exercice concurrent. APPLIED reste une déclaration logicielle, jamais une preuve physique.
