# CORO Diagnostic Express V1.0 — DX-01 Implémentation et QA

Date : 27 octobre 2026
Branche : `feature/coro-diagnostic-express-v1`
Baseline : `80f5c4f00ddeab6c24022cdf56490293caa8456f` (`origin/main`)
Worktree : `F:\coro-platform\.worktrees\coro-diagnostic-express-v1`
Statut : **DX-01 IMPLÉMENTÉ ET VALIDÉ LOCALEMENT — APPROBATION REQUISE AVANT DX-02**

## 1. Périmètre livré

DX-01 livre uniquement le questionnaire public masqué avant publication :

- route bilingue `/diagnostic` et `/diagnostic?lang=en` ;
- introduction et promesse limitée à une première lecture indicative ;
- huit dimensions et cinq réponses distinctes A à E ;
- une question par écran ;
- navigation précédente/suivante et progression ;
- conservation temporaire dans `sessionStorage`, limitée à l’onglet ;
- conservation lors du changement de langue ;
- suppression de la copie stockée à la fin et à la réinitialisation ;
- accessibilité clavier et sémantique native ;
- responsive de 320 à 1920 px ;
- page `noindex`, absente de la navigation et du sitemap.

Le score, les niveaux, les priorités, les recommandations, les modules associés, le PDF, la conversion enrichie et les analytics ne sont pas implémentés dans DX-01.

## 2. Architecture appliquée

- `page.tsx` reste un Server Component et porte les métadonnées et le shell V2.
- `DiagnosticExperience.tsx` est le seul îlot client interactif.
- Les questions bilingues sont séparées dans une configuration TypeScript versionnée.
- La validation du stockage temporaire est une fonction TypeScript pure et fail-closed.
- Aucun backend, fournisseur, cookie analytique ou nouvel appel réseau n’est utilisé.
- La route est enregistrée avec `BUILD-NOW-HIDDEN`, `indexable: false` et `sitemap: false`.
- Un registre `draftV2Routes` distinct évite de présenter le brouillon comme une migration V2 approuvée tout en empêchant le double pied de page.

Documentation Next.js 16.4.3 consultée avant développement : Server and Client Components, Linking and Navigating, Metadata and OG Images, `useSearchParams`.

## 3. Fichiers modifiés ou créés

| Fichier | Nature |
|---|---|
| `app/diagnostic/page.tsx` | Route serveur et métadonnées masquées |
| `app/diagnostic/DiagnosticExperience.tsx` | Parcours interactif |
| `app/diagnostic/diagnostic.module.css` | Mise en page responsive et états accessibles |
| `lib/diagnostic/types.ts` | Types stables du questionnaire |
| `lib/diagnostic/config.ts` | Huit questions FR-CA/EN-CA |
| `lib/diagnostic/storage.ts` | Validation de l’état temporaire |
| `lib/site/routes.ts` | Enregistrement non découvrable |
| `lib/site/v2-migration.ts` | Shell V2 brouillon séparé des migrations approuvées |
| `tests/diagnostic.test.ts` | Contrats DX-01 |
| `docs/diagnostic/DX-00-AUDIT-AND-DESIGN.md` | Audit approuvé, déjà produit |
| `docs/diagnostic/DX-01-IMPLEMENTATION-AND-QA.md` | Présent rapport |

`AGENTS.md` a été automatiquement retouché par Next.js au démarrage local puis restauré exactement. Aucun fichier d’instructions n’est inclus dans le diff.

## 4. Contrats fonctionnels vérifiés

| Contrat | Résultat |
|---|---|
| Huit identifiants stables D1 à D8 | PASS |
| Cinq réponses distinctes A/B/C/D/E | PASS |
| Traductions FR-CA et EN-CA | PASS |
| Une question par écran | PASS |
| Suivant désactivé sans réponse | PASS |
| Retour à une question précédente | PASS |
| Progression 1/8 à 8/8 | PASS |
| État conservé dans le même onglet | PASS |
| Changement FR→EN sans perte de réponse | PASS |
| Aucune réponse dans l’URL | PASS |
| État invalide ignoré sans erreur | PASS |
| Stockage supprimé à la fin | PASS — actualisation après fin retourne à l’introduction |
| Stockage supprimé à la réinitialisation | PASS — contrat automatisé |
| Aucune transmission serveur | PASS — aucun `fetch`, aucune API |
| Aucun scoring prématuré | PASS |
| `noindex`, hors navigation et sitemap | PASS |

## 5. Accessibilité

- Un seul `h1` pour chaque état visible.
- `fieldset` et radios natifs pour les réponses.
- Libellés complets cliquables, zones d’action d’au moins 44 px.
- Progression exposée avec `role="progressbar"` et valeurs ARIA.
- Focus programmatique sur le titre lors du changement de question.
- Bouton suivant réellement désactivé avant sélection.
- Information non portée uniquement par la couleur.
- Animations neutralisées avec `prefers-reduced-motion`.
- Navigation du site, lien d’évitement et changement de langue existants conservés.

## 6. Validation responsive et captures

Recette effectuée dans Chrome réel contre Next.js local sur `127.0.0.1:3411`.

| Largeur | Hauteur de mesure | Débordement global | Composants hors conteneur | Résultat |
|---:|---:|---:|---:|---|
| 320 | 700 | Non (`scrollWidth 305`, zone utile 305) | Non | PASS |
| 375 | 700 | Non (`scrollWidth 360`, zone utile 360) | Non | PASS |
| 390 | 700/844 | Non (`scrollWidth 375`, zone utile 375) | Non | PASS |
| 768 | 700 | Non (`scrollWidth 753`, zone utile 753) | Non | PASS |
| 1024 | 717 | Non (`scrollWidth 1009`, zone utile 1009) | Non | PASS |
| 1440 | 900/1000 | Non (`scrollWidth 1425`, zone utile 1425) | Non | PASS |
| 1920 | 1000 | Non (`scrollWidth 1905`, zone utile 1905) | Non | PASS |

Les écarts de 15 px correspondent à la barre de défilement verticale, pas à un débordement horizontal. Les bounding boxes des cartes, réponses et boutons sont restées dans la zone utile à chaque largeur.

Captures réalisées pendant la campagne :

1. Introduction FR à 390 × 844 : hero, quatre attributs, CTA et note de confidentialité.
2. Question EN à 1440 × 900 : progression, question, cinq réponses et commandes.
3. Question EN à 320 × 700 : empilement mobile et retours de ligne sans débordement.

La console Chrome ne contient aucune erreur ni aucun avertissement pour le parcours testé.

## 7. Tests techniques

| Commande | Résultat |
|---|---|
| `npm ci` | PASS — 440 paquets, 0 vulnérabilité rapportée |
| `node --experimental-strip-types --test tests/diagnostic.test.ts` | PASS — 4/4 |
| `npm test` | PASS — 655/655 |
| `npm run typecheck` | PASS |
| `npx eslint app/diagnostic lib/diagnostic tests/diagnostic.test.ts lib/site/routes.ts lib/site/v2-migration.ts` | PASS |
| `npm run build` | PASS — Next.js 16.4.3, route `/diagnostic` construite |
| `git diff --check` | PASS |

Le build a émis l’avertissement existant indiquant que les articles de blogue dynamiques ne pouvaient pas être récupérés pendant la génération du sitemap local. Le build a correctement servi les routes statiques et cet avertissement n’affecte pas DX-01.

Le lint global du dépôt reste non vert à cause d’erreurs préexistantes hors périmètre dans `HomePageClient.tsx`, `ChatWidget.tsx`, `CookieBanner.tsx` et `Footer.tsx`. Le lint ciblé de tous les fichiers DX-01 et des deux registres modifiés est vert. Aucun de ces fichiers historiques n’a été modifié.

## 8. Anomalies et réserves

| Élément | Statut | Conséquence |
|---|---|---|
| Score et niveau | Hors DX-01 | À construire seulement après autorisation DX-02 |
| Recommandations et modules | Hors DX-01 | Aucun résultat commercial n’est encore présenté |
| PDF, conversion enrichie, analytics | Hors P0 actuel | Aucun SDK ni collecte ajouté |
| Route publique masquée | Conforme | Accessible par URL directe pour validation, mais `noindex`, hors sitemap et navigation |
| Lint global historique | Réserve non liée | N’empêche pas les validations ciblées ni le build ; dette existante à traiter séparément |

## 9. Verdict

**DX-01 : PASS — IMPLÉMENTATION ET QA LOCALES TERMINÉES.**

Le questionnaire public masqué est fonctionnel, bilingue, accessible, responsive et sans transmission de données. Il ne calcule ni score ni recommandation. Aucune fusion et aucun déploiement n’ont été effectués.

## 10. Prochaine action

Attendre la validation explicite de DX-01 avant de commencer DX-02. Lors de DX-02, documenter puis implémenter la règle approuvée : priorités d’amélioration C puis B, vérifications D séparées, forces A, E exclue, départage D5 → D4 → D2 → D3 → D7 → D6 → D8 → D1, et niveau définitif uniquement avec au moins six dimensions évaluables.
