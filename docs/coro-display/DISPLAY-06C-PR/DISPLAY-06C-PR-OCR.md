# DISPLAY-06C-PR — OCR

L’environnement Windows local ne fournissait ni `pdftoppm` ni `tesseract`; les échecs locaux Knowledge concernés ont donc été classés comme dépendance d’environnement et non maquillés en réussite.

GitHub Actions installe explicitement le runtime OCR avant la suite backend. Dans le run `43140951448`, l’installation OCR, le corpus synthétique et OCR local, puis l’extraction PDF depuis le build compilé ont tous conclu `success`.

Cette preuve concerne le pipeline OCR/PDF et ne remplace pas une validation fonctionnelle sur des documents client réels.
