# Contrat de commande

Contrat v1 : identifiant, incident, organisation, bâtiment, type, priorité, séquence, date, cible gelée, corrélation et version de politique. Le payload canonique est signé Ed25519 par l’autorité de manifeste existante.

Types : ENTER_EMERGENCY, ENTER_EXERCISE, MAINTAIN_EMERGENCY, UPDATE_EMERGENCY_CONTEXT, REQUEST_CLEAR, APPROVE_CLEAR, CANCEL_EXERCISE, RESTORE_NORMAL. RESTORE_NORMAL direct est interdit : il faut la sortie gouvernée.
