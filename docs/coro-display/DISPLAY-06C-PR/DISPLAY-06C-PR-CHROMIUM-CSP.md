# DISPLAY-06C-PR — Chromium et CSP

Le pilote Chromium local a vérifié le rendu du Player, le redémarrage et la reprise. Les contenus privés sont rendus dans un contexte contraint; les sources de scripts ne sont pas élargies pour accepter du contenu arbitraire.

Les scénarios testent l’activation de manifeste après validation, l’absence d’exécution de scripts de document et le comportement hors ligne. Aucun contournement CSP, `unsafe-eval` ajouté pour le Player, ni chargement d’origine externe non autorisée n’a été accepté.

La diversité matérielle réelle, les politiques kiosque des appareils cibles et la recette visuelle humaine restent à exécuter en DISPLAY-06D.
