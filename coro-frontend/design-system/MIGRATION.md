# Migration progressive vers Liquid Glass — guide de travail

Décisions de référence (Phase 05B/05C) : shell Glass global avec îlots Legacy · registre de routes (défaut `legacy-only`) ·
tokens sémantiques directs avec repli Legacy · module commercial Tailwind maintenu en Legacy · feuilles documentaires toujours claires ·
préférence locale (par appareil) en V1.

## 1. Comment un écran est rendu

```
préférence utilisateur (Classique | Glass)        route active (registre)
              └───────────────┬────────────────────────┘
                              ▼
   mode de route :  glass | island | bare | legacy      →  <html data-ui="glass|legacy">
```

| Mode | Quand | Rendu |
|---|---|---|
| `legacy` | route inconnue, sans shell (plein écran, authentification) ou préférence Classique | Document entièrement Legacy. Aucun token, aucun fond Glass. |
| `island` | route `legacy-only` (ou `beta` sans activation) avec shell, préférence Glass | Shell Glass (barre, menu) + contenu Legacy dans `LegacyIsland` (fond clair, couleurs d'origine). |
| `bare` | route `legacy-only` avec `island: false` | Shell Glass, contenu NON enveloppé (exception à justifier). |
| `glass` | route `ga` (ou `beta` avec activation) | Shell et contenu Glass. |

Une route **absente du registre** est `legacy` : un nouvel écran ne passe jamais en Glass par accident.

## 2. Registre (`routes/route-registry.ts`)

- `legacy-only` (défaut) → `beta` (visible seulement avec l'activation de développement) → `ga` (validé).
- Activation bêta : développement → `localStorage['coro-glass-beta'] = 'on'` ou `NEXT_PUBLIC_GLASS_BETA=1`.
  **Production → désactivée par défaut** ; seule la valeur exacte `NEXT_PUBLIC_GLASS_BETA=production-preview` au build l'active
  (ni `1`, ni `true`, ni le stockage local d'un utilisateur). Une route bêta n'est donc jamais visible par accident.
- `route-registry.test.cjs` compare le registre au code (pages, shell, styles, actions destructives) et fige la liste des routes `ga` :
  activer une route exige de modifier explicitement `GA_ALLOWLIST` dans ce test.
- Les routes marquées `sensitivity: emergency-content | documents | financial-legal | auth` ne peuvent pas être `ga` sans validation distincte
  (le test l'impose).
- Inventaire lisible : `ROUTES.md` (`npm run glass:inventory -- --write`).

## 3. Îlot Legacy

`<LegacyIsland>` n'ajoute que fond, liséré, variables et `color-scheme: light`. Il ne crée **aucun** contexte d'empilement ni bloc conteneur
(pas de transform, filter, backdrop-filter, isolation, z-index, overflow, contain) : les modales à position fixe et menus flottants d'un
écran Legacy passent donc toujours au-dessus du shell. Exclusion : `island: false` au registre, ou `<LegacyIsland exempt>`.

## 4. Couleurs : convention pour les écrans migrés

- Nouveau code et écrans migrés : `var(--cg-token, #repli-legacy)`. Les tokens n'existent que sous `data-ui="glass"`, donc le repli reproduit
  exactement le rendu Legacy quand Glass est inactif. Pas de hook, pas de conditionnel.
- Les primitives du kit (`design-system/kit`) suivent la même règle.
- **Pas de conversion massive** des couleurs des pages métier : une route à la fois, avec le banc (section 6).
- `createPalette` (pages pilote) reste en place jusqu'à leur conversion ; ne pas l'étendre à de nouveaux écrans.
- États d'urgence et actions destructives : jamais de transparence ; `--cg-emergency-*` identiques en Light et en Dark ; aucune teinte sémantique
  (rouge danger, ambre alerte, vert succès) ne change sans justification écrite.

## 5. Kit de primitives (`design-system/kit`)

`GlassTable` · `GlassModal` · `GlassField` · `StatusBadge` · `PageHeader` · `GlassButton`. Aperçu et essai : route de développement `/glass-kit`
(fichier `app/glass-kit/page.dev.tsx` : l'extension `dev.tsx` n'est reconnue que hors production, voir `next.config.ts` ; la route n'existe pas dans un build de production). Elles ne remplacent aucun composant existant tant qu'un écran ne les adopte pas.
`window.confirm` / `alert` natifs ne sont pas stylables : un écran migré peut les remplacer par `GlassModal tone="danger"`, mais **sans changer le
libellé ni le moment** de la confirmation.

## 6. Protocole d'un lot de migration

1. Choisir les routes du lot ; vérifier au registre leur sensibilité. Sensibles → validation distincte demandée avant de commencer.
2. `snapshot` Legacy des routes (1600 et 390) → dossier AVANT (`bench/README.md`).
3. Migrer ; passer les routes en `beta`, activer la bêta en local, valider.
4. `snapshot` Legacy APRÈS + `compare` → **0 écart**. `contrast` Light et Dark, `shots` 320/390/768/1600, `scenarios`.
5. Tests : `npm run test:design-system`, `tsc`, tests de contrat existants, ESLint (aucun nouveau problème).
6. Revue par le propriétaire du produit → passage en `ga` (modification du registre ET de `GA_ALLOWLIST`).

## 7. Hors périmètre (décisions validées)

- Module commercial Tailwind (`/admin/commercial/*`, catalogue) : Legacy dans un îlot.
- Aperçus et feuilles de documents (éditeurs, export PDF) : toujours clairs, quel que soit le thème.
- Portail client, site vitrine, backend, API, permissions, exports PDF.
