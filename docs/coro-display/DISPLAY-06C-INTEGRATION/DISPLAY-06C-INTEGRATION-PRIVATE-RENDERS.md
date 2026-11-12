# Rendus privés

Le WebP synthétique est d’abord stocké dans le stockage privé, puis téléchargé par le vrai client HTTP M2M. La référence `private://` est résolue seulement après vérification de l’appareil, de l’affectation et de la publication.

Les substitutions de portée, références arbitraires, chemins et octets corrompus sont refusés. Aucun rendu privé client n’est inclus.
