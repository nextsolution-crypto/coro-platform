# Recette visuelle

Chromium headless a chargé l'origine loopback en 1280×720, attendu `networkidle0`, puis confirmé le décodage de l'image. Le CSS utilise `contain`, largeur/hauteur 100 %, fond noir et débordement masqué.

Les trois profils et la géométrie sont couverts par les tests de validation DISPLAY existants. Écran physique, kiosque OS et coupure électrique réelle : `NOT_VERIFIED`, hors périmètre autorisé.
