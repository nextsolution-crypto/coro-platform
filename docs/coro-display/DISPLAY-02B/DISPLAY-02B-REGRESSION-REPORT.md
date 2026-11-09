# DISPLAY-02B — Rapport de régression

## Contrôles locaux

- Build Nest/TypeScript : PASS.
- ESLint ciblé : PASS.
- Tests DISPLAY ciblés : 17/17 PASS.
- Test PostgreSQL réel : 1/1 PASS.
- Audit production npm, niveau high : 0 vulnérabilité.
- `git diff --check` : PASS.

## Suite backend complète

Exécution Windows en série : 284 suites réussies, 3 ignorées, 2 en échec; 2 663 tests réussis, 5 ignorés, 7 en échec. Les deux échecs sont exclusivement `spawn EPERM` imposé par le bac à sable sur les suites qui lancent un sous-processus.

Ces suites ont été rejouées sans réseau applicatif dans un conteneur Node 22 isolé :

- `office-extractor.spec.ts` : 7/7 PASS avec Poppler et Tesseract FR/EN.
- `bedrock-provider.adapter.spec.ts` : 28/28 PASS, dont `credential_process`.

Conclusion : aucune régression produit démontrée. La limite Windows est environnementale et entièrement compensée par l'exécution isolée.
