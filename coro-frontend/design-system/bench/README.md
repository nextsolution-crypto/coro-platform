# Banc de validation Liquid Glass

Outil de développement (jamais livré à l'utilisateur) qui pilote un **Chrome réel** pour prouver qu'une migration
n'a pas altéré le mode Legacy et que les rendus Glass sont lisibles. Sans dépendance : Node 22 + Chrome installé.

## Pré-requis

```
# 1. serveur de dev du frontend (port 3010 par défaut, BENCH_BASE_URL pour changer)
# 2. faux API local — données fictives, aucun backend, aucun secret
node design-system/bench/mock-api.cjs
```

Variables : `CHROME_PATH`, `BENCH_BASE_URL`, `BENCH_API_PORT`. Sous Git Bash, préfixer avec `MSYS_NO_PATHCONV=1`
pour que `/dashboard` ne soit pas converti en chemin Windows.

## Commandes

| Commande | Rôle |
|---|---|
| `snapshot --routes … --ui legacy --theme SYSTEM --viewports 1600,390 --out DIR` | Styles calculés de **chaque élément** (≈ 50 propriétés), un fichier par route × mode × largeur. |
| `compare --a AVANT --b APRÈS [--ignore width,height]` | Compare deux dossiers de captures : éléments manquants/en plus, propriété par propriété. Code de sortie 1 s'il y a un écart. |
| `contrast --routes … --ui glass --theme DARK --viewports 1600,320 [--out DIR]` | Ratio de contraste WCAG (AA : 4,5 ; 3 pour grand texte) de chaque nœud de texte visible. |
| `contrast-compare --a DIR_LEGACY --b DIR_GLASS` | Ne retient que les textes qui passent sous le seuil **en Glass sans l'être en Legacy** (un défaut historique n'est pas une régression). |
| `shots --routes … --ui … --theme … --viewports 320,390,768,1600 --out DIR` | Captures d'écran brutes, sans retouche. |
| `scenarios [--only drawer,kit-modal]` | Interactions réelles : vraies touches, molette, clics. Scénarios : `drawer` (tiroir mobile), `island-modal-above-shell`, `shell-floating-menu`, `kit-modal` (GlassModal), `unknown-and-fullscreen-routes`, `client-navigation`. |

Via npm : `npm run glass:bench -- <commande> …`.

## Protocole de non-régression Legacy (à suivre pour chaque lot de migration)

1. **Avant** de modifier le code : `snapshot` en Legacy (`--ui legacy`) pour les routes du lot, aux largeurs 1600 et 390 → dossier `AVANT`.
2. Migrer le lot.
3. **Après** : même commande → dossier `APRÈS`, puis `compare --a AVANT --b APRÈS`. Attendu : **0 écart**.
4. En Glass : `contrast` Light et Dark, `shots` aux 4 largeurs, `scenarios`.
5. Les captures d'écran servent à **regarder** ; elles ne sont jamais la seule preuve (voir Limites).

## Limites

- **Un hash d'image ne prouve rien à lui seul** : deux rendus identiques au pixel peuvent différer par le DOM, le focus ou l'accessibilité,
  et un hash différent peut venir d'une horloge ou d'une animation. Le banc compare des **styles calculés** ; les images complètent.
- **Couverture limitée par les données** : le faux API ne simule qu'une poignée de routes. Les pages rendues avec des listes vides ne
  montrent pas leurs lignes, badges, modales ni états d'erreur. Un écran non couvert doit être vérifié à la main avec des données réelles.
- **Contraste approximatif sur dégradé ou image** : le calcul ne sait pas évaluer un `linear-gradient` ni un `backdrop-filter`. Ces cas sont
  comptés (« fond dégradé/image ») et évalués avec la couleur de base du canevas : à confirmer à l'œil. Les textes sous `[inert]` ou hors écran sont ignorés.
- **Chrome headless uniquement** : pas de Safari, pas de Firefox, pas de **véritable appareil** mobile (clavier virtuel, barre d'URL dynamique,
  gestes tactiles, safe-areas). Les largeurs 320/390/768 sont émulées.
- **Instantané** : un seul état par page (après chargement et figement des transitions). Les états de survol, de chargement, d'erreur réseau
  et les contenus dépendant de l'heure ne sont pas parcourus, sauf scénario dédié.
- **Chemins d'authentification contournés** : la session est simulée par le faux API. Le comportement avec le vrai backend (expiration, MFA,
  rôles réels) n'est pas testé.
- **Structure** : les éléments sont alignés par leur chemin dans l'arbre DOM. Un changement de structure légitime se voit comme « manquant/en plus »
  et doit être relu, pas ignoré.
- **Entrée clavier du pilote** : après un chemin « redirection vers /login + connexion », Chrome pilote par DevTools ne livre plus aucune touche à la page
  (constaté en Legacy comme en Glass). Le banc entre donc par `/profile` avec une session semée puis navigue côté client. Tout nouveau scénario
  clavier doit commencer par vérifier que les touches arrivent (un `Tab` sans effet ferait croire à un piège de focus).
- **Le panneau d'outils de développement de Next.js** (`nextjs-portal`) est exclu des mesures.
