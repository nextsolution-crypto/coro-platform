# DX-04 — Intégration publique et recette navigateur

Date de recette : 2026-10-27
Branche : `feature/coro-diagnostic-express-v1`
SHA de base testé : `80f5c4f00ddeab6c24022cdf56490293caa8456f`
Environnement : build Next.js 16.4.3 standalone local, `http://127.0.0.1:3414`, Chrome 156 dédié et profil temporaire isolé
Publication : **NON FUSIONNÉE — NON DÉPLOYÉE**

## Verdict

**DX-04 : PASS LOCAL — PRÊT POUR VALIDATION DE PUBLICATION.**

La route, les points d’entrée publics, les métadonnées et le sitemap sont préparés avec le statut `PUBLISH-NOW` dans la branche, mais aucune fusion ni publication réelle n’a été effectuée. DX-05 n’a pas été commencé.

## Périmètre livré

- `/diagnostic` et `/diagnostic?lang=en` enregistrés dans le registre public, indexables et présents au sitemap préparé.
- Entrée « Évaluer ma préparation » / « Assess my preparedness » dans le groupe Ressources, sans nouveau menu principal.
- Lien « Diagnostic Express » / « Express Diagnostic » dans le pied de page existant, sans nouvelle colonne.
- Invitation compacte intégrée au bloc Ressources de l’accueil, en français et en anglais.
- Titres, descriptions, canonical et hreflang FR-CA / EN-CA conformes aux textes approuvés.
- Mention discrète indiquant que le résultat est temporaire.
- Aucune transmission serveur, analytics, base de données, cookie supplémentaire, réponse dans l’URL ou formulaire commercial enrichi.
- Correction d’accessibilité ciblée : le résultat n’imbrique plus un second élément `main` dans le `main` du shell V2.

## Fichiers DX-04 modifiés ou ajoutés

- `app/diagnostic/page.tsx`
- `app/diagnostic/DiagnosticExperience.tsx`
- `app/diagnostic/diagnostic.module.css`
- `app/home/components/Sections.tsx`
- `app/home/components/sections.module.css`
- `app/home/content.ts`
- `components/conversion/footer-content.ts`
- `lib/site/navigation.ts`
- `lib/site/routes.ts`
- `lib/site/v2-migration.ts`
- `tests/diagnostic-public-integration.test.ts`
- `tests/diagnostic.test.ts`
- `tests/foundation.test.ts`
- `tests/sitemap.test.ts`
- `tests/fixtures/homepage-links-baseline.json`
- `scripts/dx04-browser-qa.mjs`

Les fichiers DX-01 à DX-03 présents dans la branche sont conservés; ils n’ont pas été refondus dans ce lot.

## Matrice d’acceptation navigateur

| Contrôle | Statut | Résultat |
|---|---|---|
| Accueil FR, invitation compacte | PASS | Invitation dans Ressources, lisible et distincte de la grande section Démonstration. |
| Accueil EN, invitation compacte | PASS | Traduction, CTA et destination anglaise conformes. |
| Accueil mobile | PASS | Carte sur une colonne, largeur interne au viewport, CTA et mention lisibles. |
| Navigation Ressources desktop | PASS | Entrée visible et destination `/diagnostic`. |
| Navigation Ressources mobile | PASS | Groupe ouvrable; entrée visible et accessible. |
| Pied de page | PASS | Lien ajouté à la colonne Entreprise existante; aucune colonne créée. |
| Introduction Diagnostic FR/EN | PASS | Contenu, faits, CTA et confidentialité visibles. |
| Huit questions | PASS | Les huit questions ont été parcourues dans l’ordre et répondues. |
| Résultat FR/EN | PASS | Score, couverture, niveau, changement de langue et résultat personnalisé rendus. |
| Résultat temporaire | PASS | Mention présente dans les deux langues. |
| Recommencer | PASS | Retour à l’introduction et suppression de l’état de session. |
| Console | PASS | 0 erreur sur le build standalone complet. |
| Réseau | PASS | 0 requête mutante, 0 requête externe, 0 échec non annulé. |
| Stockage | PASS | Aucun `localStorage`, cookie ou clé de session résiduelle après résultat/réinitialisation. |

## Responsive et géométrie

Largeurs mesurées sur l’accueil et le Diagnostic : **320, 375, 390, 768, 1024, 1440 et 1920 px**, soit 14 mesures.

- Débordement horizontal global : **0/14**.
- Composants DX-04 hors viewport : **0**.
- Largeur de l’invitation : 288 px à 320, 343 px à 375, 358 px à 390, 705 px à 768, 961 px à 1024 et maximum 1320 px sur grand écran.
- Le Diagnostic reste contenu dans le viewport à toutes les largeurs.
- Le résultat possède un seul landmark `main`.

Observation non bloquante : à 1440 px, une liste animée préexistante de l’accueil (`Savoir / Confirmer / Évacuer / Rassembler / Protéger`) possède momentanément des boîtes internes au-delà du viewport, mais elle est rognée par son conteneur; la largeur du document reste 1425 px pour un viewport de 1440 px et aucun défilement horizontal n’est créé. Cette observation ne concerne pas le composant DX-04.

## SEO et indexation

### Français

- Titre : `Diagnostic de préparation organisationnelle | CORO`
- Description : texte approuvé exact.
- Canonical : `https://getcoro.io/diagnostic`
- Robots : `index, follow`

### Anglais

- Titre : `Organizational Preparedness Assessment | CORO`
- Description : texte approuvé exact.
- Canonical : `https://getcoro.io/diagnostic?lang=en`
- Robots : `index, follow`

Les deux pages exposent `fr-CA`, `en-CA` et `x-default`. Le sitemap local contient les deux variantes. Les résultats individuels ne produisent ni URL, ni paramètre, ni page indexable distincte : ils restent un état client temporaire de la route publique.

## Captures navigateur réelles

1. [Accueil FR desktop](evidence/dx04/01-home-fr-desktop.png)
2. [Accueil EN desktop](evidence/dx04/02-home-en-desktop.png)
3. [Accueil FR mobile](evidence/dx04/03-home-fr-mobile.png)
4. [Navigation Ressources desktop](evidence/dx04/04-navigation-resources-desktop.png)
5. [Navigation mobile](evidence/dx04/05-navigation-mobile.png)
6. [Pied de page](evidence/dx04/06-footer-diagnostic-link.png)
7. [Diagnostic FR](evidence/dx04/07-diagnostic-fr.png)
8. [Diagnostic EN](evidence/dx04/08-diagnostic-en.png)
9. [Résultat FR](evidence/dx04/09-result-fr.png)
10. [Résultat EN](evidence/dx04/10-result-en.png)

Mesures brutes : [dx04-browser-results.json](evidence/dx04/dx04-browser-results.json).

## Validation technique consolidée

- Tests DX-04 et contrats connexes : **63/63 PASS**.
- Suite complète : **691/691 PASS**.
- TypeScript : **PASS**.
- ESLint ciblé : **PASS**.
- Build Next.js de production : **PASS**; route `/diagnostic` générée.
- `git diff --check` : **PASS**.

Le premier essai sous `next dev` a été interrompu par le contrôle CORS de Next.js sur le WebSocket HMR de `127.0.0.1`. La recette finale a été exécutée contre le build standalone assemblé avec ses actifs statiques, ce qui correspond au runtime livrable et n’a nécessité aucun changement produit.

## Anomalies, corrections et réserves

- Anomalie produit DX-04 démontrée pendant la recette finale : **aucune**.
- Correction réalisée : suppression du landmark `main` imbriqué dans la restitution, couverte par les tests et la mesure navigateur (`mainCount = 1`).
- Fournisseurs externes : **NOT_APPLICABLE**; le Diagnostic n’en utilise aucun.
- Analytics et conservation serveur : **NOT_APPLICABLE** et volontairement absents du périmètre.
- Publication production : **NOT_VERIFIED / NON AUTORISÉE** dans DX-04.

## Point d’arrêt

DX-04 est validé localement, y compris par navigateur réel. La branche reste isolée. Aucune fusion, aucun déploiement et aucun travail DX-05 n’ont été effectués. Une validation explicite est requise avant la prochaine étape.
