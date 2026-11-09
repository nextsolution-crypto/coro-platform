# DISPLAY-03 — Spécification de rendu

Le rendu local déterministe prend une source PNG/JPEG approuvée et produit un SVG privé contenant l’image source sans déformation (`preserveAspectRatio="xMidYMid meet"`), un repère « Vous êtes ici », son orientation et les métadonnées de provenance.

Les coordonnées normalisées viennent exclusivement de `DisplayLocation`. Largeur, hauteur, type MIME, version de moteur, paramètres et SHA-256 sont figés. Le source n’est jamais modifié.

Limite volontaire : la conversion PDF et la production native PNG/WebP haute résolution ne sont pas encore branchées. Les PDF sont refusés explicitement, jamais rendus partiellement. DISPLAY-04 devra intégrer un moteur PDF borné, puis effectuer une recette visuelle de lisibilité 11×17, 16:9 et 16:10. Aucune conformité ISO 23601 n’est déclarée automatiquement.
