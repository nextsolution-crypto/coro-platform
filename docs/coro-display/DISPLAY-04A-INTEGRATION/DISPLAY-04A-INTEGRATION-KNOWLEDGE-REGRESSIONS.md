# DISPLAY-04A-INTEGRATION — Régressions Knowledge

Rejeu dans Debian Bookworm avec Poppler 22.12.0, LibreOffice 7.4.7 et Tesseract 5.3.0, sans réseau : **7/7 PASS** en 1,835 s.

- Office/XLSX : 107 ms; l’ancien timeout Windows n’est pas reproduit.
- OCR PNG produit avec `pdftoppm` : 552 ms, PASS.

Une première image QA sans Tesseract a correctement échoué `OFFICE_INVALID`; l’image alignée sur les dépendances de production passe. Aucun timeout n’a été augmenté et aucun test désactivé. Conclusion : les deux échecs historiques étaient environnementaux.
