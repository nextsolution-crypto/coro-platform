# DISPLAY-06A — Modes de panne

| Situation | Comportement sûr |
|---|---|
| Réseau perdu | conserver le plan vérifié, journaliser la dégradation |
| Téléchargement interrompu | abandonner le stage, conserver le plan courant |
| Fichier corrompu | refuser le candidat; ne jamais l'afficher |
| Manifeste invalide/rejoué | refuser sans mutation |
| Révocation connue | bloquer le plan révoqué |
| Horloge incohérente | refuser un manifeste futur; signaler l'horloge |
| Cache absent/indisponible | aucun plan prétendument approuvé; mode dégradé |
| Stockage saturé | conserver la dernière copie; refuser la mise à jour |
| Suspension/redémarrage | recalculer le cycle depuis un instant de référence |
| Erreur de rendu | signaler la dégradation sans substituer du contenu arbitraire |

Les pannes du stockage OS et du moteur graphique réel restent à valider sur le matériel cible.
