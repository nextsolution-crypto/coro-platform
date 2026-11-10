# DISPLAY-05A-REVIEW — follow-redirects

## Analyse

Le frontend utilisait `axios@1.20.0`, qui résolvait transitivement `follow-redirects@1.16.1`. Cette version est concernée par `GHSA-mrwp-f3q8-3g9p` (CWE-201, exposition possible d'en-têtes lors de redirections malveillantes). CORO n'importe pas directement la bibliothèque, mais Axios la charge côté Node; l'impact était donc transitoire mais réel pour toute requête serveur suivant une redirection non fiable.

## Correction

Un `override` npm ciblé verrouille `follow-redirects` à `1.16.3`, compatible avec la plage Axios existante. Aucun `audit fix --force` ni changement majeur n'a été utilisé. Le lockfile a été régénéré et `npm ci` a réussi.

## Preuves

- `npm ls axios follow-redirects` : Axios 1.20.0 → follow-redirects 1.16.3 overridden.
- `npm audit --omit=dev` frontend : 0 vulnérabilité.
- TypeScript frontend : PASS.
- Build Next.js production : PASS.

## Risques résiduels

L'audit complet signale huit vulnérabilités modérées dans l'outillage ESLint/TypeScript. Elles ne sont pas embarquées en production; la correction proposée par npm serait cassante et n'a pas été forcée.
