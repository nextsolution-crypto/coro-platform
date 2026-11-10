# DISPLAY-04A — Corpus de test

Corpus minimal couvert par les tests unitaires : enveloppe PDF passive, signature usurpée, page/DPI hors limites, JavaScript, EmbeddedFile et XFA. Le plan du corpus isolé ajoute : 11×17 portrait/paysage, 16:9, 16:10, rotations 90/180/270, transparence, polices incorporées, vecteurs, scans, PDF multi-pages, chiffré, polyglotte, récursif, très grand et tronqué.

Les cas hostiles ne doivent être ouverts que dans le worker isolé. Les fichiers de tiers ou réels sont exclus. La génération synthétique et la comparaison pixel/texte contre PDFium sont prévues en DISPLAY-04B.
