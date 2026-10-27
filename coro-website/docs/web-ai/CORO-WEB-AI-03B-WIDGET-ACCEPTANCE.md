# CORO WEB-AI-03B — Widget public bilingue

## Verdict

`PASS_LOCAL`

Le widget public réutilise l'intégration existante et bascule vers l'orchestrateur seulement avec `NEXT_PUBLIC_WEB_AI_INTELLIGENT_ASSISTANT_ENABLED=true`. Les deux flags restent faux par défaut.

## Fonctionnalités vérifiées

- Interface FR-CA/EN-CA, suggestions, citations, liens officiels, remise à zéro et états indisponibles.
- Navigation clavier, fermeture par Échap, rôles accessibles, annonces de chargement et règle `prefers-reduced-motion`.
- Mobile plein écran par CSS stable; correction d'une divergence d'hydratation constatée pendant la recette.
- Aucun cookie, `localStorage`, `sessionStorage` ou analytics ajouté.
- Le chemin intelligent envoie uniquement le message courant, la langue, l'identifiant opaque éventuel et le `pathname`; aucun historique ou résultat privé.
- Le contact commercial demeure volontaire, avec consentement, résumé borné et idempotence.

## Preuves navigateur

Campagne Puppeteer réelle sur le serveur Next local et le backend réel, avec PostgreSQL 16 synthétique :

| Cas | Vue | Résultat | Réponse | Citations | Liens | Débordement | Console |
|---|---:|---|---:|---:|---:|---|---|
| FR desktop | 1440×900 | PASS | 43 ms | 2 | 2 | aucun | aucune erreur |
| EN desktop | 1440×900 | PASS | 21 ms | 2 | 2 | aucun | aucune erreur |
| FR mobile | 390×844 | PASS | 32 ms | 2 | 2 | aucun | aucune erreur |
| EN mobile | 390×844 | PASS | 20 ms | 2 | 2 | aucun | aucune erreur |

Captures et résultat JSON : `%TEMP%\coro-web-ai-03-evidence`.

## Réserves

Le site conserve sa dette historique : la racine HTML reste `lang="fr"` sur `?lang=en`. Le widget, ses requêtes et ses réponses sont bien en anglais. Un lecteur d'écran réel et les thèmes visuels complets n'ont pas été exercés; l'accessibilité structurelle est couverte par inspection et tests.
