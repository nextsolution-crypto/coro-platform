# DISPLAY-03-REVIEW — Qualité visuelle

Le jeu synthétique devra comporter sorties, escaliers, cheminements, pictogrammes, légende, zones colorées, traits fins et textes de 6 à 24 points. Aucune donnée ou plan client ne sera utilisé.

Profils : 11×17 paysage à 300 DPI (5100×3300), 16:9 et 16:10 aux résolutions cibles. Le rendu doit utiliser `contain`, sans déformation ni rognage implicite. Mesurer ratio, résolution, contraste, netteté, marges, rotation et position du repère.

Automatisation : hash déterministe, pixel-diff avec tolérance documentée, détection des dimensions, quatre positions/orientations, texte minimum lisible et captures des trois profils. La sortie automatisée n’est jamais une déclaration de conformité réglementaire.

Acceptation humaine obligatoire par un professionnel qualifié, sur écran cible et impression 11×17, avec contrôle des parcours, pictogrammes, légendes et orientation réelle du lieu.
