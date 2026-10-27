# DX-05 — PDF professionnel et partage

Date de recette : 27 octobre 2026
Branche : `feature/coro-diagnostic-express-v1`
Commit de base : `80f5c4f00ddeab6c24022cdf56490293caa8456f`
Verdict : **PASS LOCAL — DX-05 PRÊT POUR VALIDATION, NON FUSIONNÉ ET NON DÉPLOYÉ**

## Architecture PDF

- Génération intégralement locale dans le navigateur avec `jspdf@4.2.1`, chargé dynamiquement au clic.
- Format lettre nord-américaine (`612 × 792 pt`, 8,5 × 11 pouces), fond blanc explicite et pagination selon le contenu.
- Le générateur reçoit le `DiagnosticResultModel` canonique DX-02/DX-03 : il ne recalcule ni score, ni niveau, ni priorités, ni recommandations.
- La géométrie radar provient de `buildResiliencePortraitGeometry`, la même fonction pure que DX-03B.
- Les réponses D et E conservent leurs marqueurs respectifs; la représentation alternative est utilisée lorsque la surface radar n'est pas interprétable.
- Le logo est chargé depuis l'origine CORO; aucune ressource externe n'est requise.
- Aucun résultat n'est stocké côté serveur et aucune réponse n'est transmise.

## Contenu du rapport

Le rapport bilingue contient : portrait organisationnel, date, version, score indicatif ou partiel, niveau, couverture, synthèse, portrait et alternative textuelle, forces, priorités d'amélioration, priorités de vérification, réserves D/E, recommandations personnalisées, actions concrètes, plan 0–30/30–60/60–90 jours, modules CORO avec disponibilité réelle, limites méthodologiques et prochaines étapes.

Les échantillons FR 79 % et EN à couverture insuffisante comportent cinq pages chacun, sans page vide. La revue visuelle a détecté puis fait corriger un fond transparent et une pagination de recommandations susceptible de couper un bloc.

## Partage

- `navigator.share` est utilisé lorsqu'il est disponible.
- Le repli copie l'URL publique dans le presse-papiers.
- Valeurs observées : `/diagnostic` en français et `/diagnostic?lang=en` en anglais.
- Aucune réponse, score, priorité ou donnée individuelle n'est ajoutée à l'URL.

## Fichiers DX-05

- `lib/diagnostic/pdf.ts`
- `app/diagnostic/DiagnosticExperience.tsx`
- `app/diagnostic/diagnostic.module.css`
- `tests/diagnostic-pdf.test.ts`
- `scripts/dx05-generate-samples.mjs`
- `scripts/dx05-browser-qa.mjs`
- `package.json` et `package-lock.json`
- gardes de dépendances historiques dans cinq tests existants, ajustées uniquement pour autoriser `jspdf`

## Tests automatisés

| Contrôle | Résultat |
|---|---|
| PDF 100 %, 79 % et 0 % | PASS |
| Couverture insuffisante | PASS |
| Toutes réponses D | PASS |
| Toutes réponses E | PASS |
| Modèle canonique et géométrie DX-03B | PASS |
| Partage sans données individuelles | PASS |
| Téléchargement local et révocation de l'URL objet | PASS |
| Test DX-05 ciblé | 5/5 PASS |
| Suite complète | 704/704 PASS |
| TypeScript | PASS |
| ESLint ciblé | PASS |
| Build Next.js 16.4.3 | PASS |
| `git diff --check` | PASS |

Le build a émis uniquement l'avertissement fail-soft déjà connu du sitemap : l'API Blog n'était pas joignable, donc les routes statiques ont été produites sans les URL d'articles dynamiques.

## Recette Chrome réelle

Environnement : build de production local `http://127.0.0.1:3417`, Chrome headless dédié via CDP `9337`.

- Largeurs mesurées : 320, 375, 390, 768, 1024, 1440 et 1920 px.
- Débordement horizontal : aucun sur 7/7 largeurs.
- Boutons : 50 px de hauteur; largeur fluide sur mobile et disposition compacte à partir de 768 px.
- Téléchargement FR : `%PDF-`, 242 283 octets, 434 ms lors de la dernière campagne.
- Téléchargement EN : `%PDF-`, 241 897 octets, 316 ms lors de la dernière campagne.
- Partage natif FR et repli presse-papiers EN : PASS.
- Requêtes externes : 0.
- Requêtes mutatives : 0.
- Erreurs console : 0.
- Requêtes échouées : 0.

Preuves :

- `docs/diagnostic/evidence/dx05/dx05-browser-results.json`
- `docs/diagnostic/evidence/dx05/01-dx05-fr-desktop.png`
- `docs/diagnostic/evidence/dx05/02-dx05-en-desktop.png`
- `docs/diagnostic/evidence/dx05/03-dx05-fr-mobile.png`
- `docs/diagnostic/evidence/dx05/04-dx05-en-mobile.png`

## Exemples PDF rendus et inspectés

- `output/pdf/dx05/coro-diagnostic-express-fr-79.pdf`
- `output/pdf/dx05/coro-diagnostic-express-en-insufficient.pdf`
- rendus de contrôle : `tmp/pdfs/dx05-fr/` et `tmp/pdfs/dx05-en/`

## Confidentialité

La recette réseau confirme l'absence de transmission externe et de requête mutative. Le PDF est produit en mémoire, téléchargé par URL objet puis cette URL est révoquée. Le partage transmet uniquement l'adresse publique du questionnaire.

## Accessibilité et réserves

- Le PDF conserve des titres explicites, du texte sélectionnable, un contraste lisible et une alternative textuelle pour les huit dimensions.
- Les contenus restent compréhensibles sans le graphique.
- Limite honnête : le PDF généré par jsPDF n'est pas un PDF/UA balisé; l'ordre visuel et le texte sont lisibles, mais une conformité complète aux technologies d'assistance PDF n'est pas revendiquée.
- Les liens de modules sont décrits textuellement; aucune destination non publiée n'a été inventée.

## Anomalies corrigées

1. Fond de page transparent observé au premier rendu ImageMagick : fond blanc explicite ajouté.
2. Bloc de recommandation pouvant déborder en continuation : hauteur mesurée et pagination limitée à quatre recommandations par page.
3. Cinq gardes historiques supposaient une liste immuable de quatre dépendances : liste mise à jour pour la dépendance PDF explicitement autorisée.

## Verdict

**DX-05 : PASS LOCAL.** L'export PDF professionnel bilingue et le partage sans données individuelles satisfont le périmètre autorisé. Aucun stockage serveur, analytics, service tiers, backend, base de données, fusion ou déploiement n'a été introduit.

Point d'arrêt respecté : attendre une validation explicite avant DX-06, fusion ou publication.
