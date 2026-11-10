# DISPLAY-06A-INTEGRATION — Régressions

- Player, adversarial et régressions Display : **12 suites, 79 tests PASS**, 1 test préexistant ignoré.
- Backend complet : **297 suites, 2 769 tests PASS**; 6 tests ignorés.
- Sept échecs initiaux dus au bac à sable; hors bac à sable, 6/7 passent.
- OCR PNG réel : **NOT_VERIFIED**, `pdftoppm` absent.
- TypeScript backend avec heap 8 Go : **PASS**.
- ESLint ciblé : **PASS**.
- Build Nest : **PASS**.

Aucune migration n'est ajoutée; les tests PostgreSQL ne sont donc pas requis pour une mutation de schéma. Les contrats Display existants restent couverts par leurs régressions unitaires; la CI Linux devra confirmer OCR et PostgreSQL à l'étape PR.
