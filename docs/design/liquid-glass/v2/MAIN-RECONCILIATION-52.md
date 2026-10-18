# Réconciliation de Liquid Glass V2 avec `main` mis à jour (mandat 52)

| Élément | Valeur |
|---|---|
| HEAD V2 avant fusion | `d176de8103974220f571112fea15b8d3c23400ee` |
| `main` fusionné | `3fca79965ec68c258a8394e5e1c3f7589298ea2a` (`origin/main`, vérifié) |
| Référence de repli locale | branche `backup/v2-pre-main-52` → `d176de81` |
| Fusion | **commit de fusion normal** (`--no-ff`), sans rebase, reset ni cherry-pick ; **aucun conflit** (simulation `merge-tree` puis fusion) |
| Contenu apporté par `main` | `3fca7996` : correctif des approbations en attente du tableau de bord (`app/dashboard/page.tsx`, menu de notifications d'`AppLayout.tsx`, test `pending-approvals.contract.test.cjs`, script `test:ui-units`) |
| Correction de la barre latérale 350 px | `56dcb5a1`, déjà ancêtre de V2 : présente **une seule fois** (un seul commit correspondant dans l'historique) |
| Dépôt principal et worktrees historiques | non modifiés (`F:\coro-platform` : seul `CLAUDE.md` et `.worktrees/` locaux, inchangés) |

## Preuves après fusion (backend et base de test jetables, données synthétiques)

| Contrôle | Résultat |
|---|---|
| TypeScript application et portail | OK |
| 31 scripts `test:*` des deux applications (`design-system` : 188 tests ; `ui-units` : 16 dont les approbations) | **31 / 31** |
| Tableau de bord avec une approbation en attente : référence `main`, V2 Classique, V2 Glass Clair, V2 Glass Sombre | rendu normal dans les 4 cas, approbation affichée, 0 exception JavaScript |
| Barre latérale : 350 px par défaut en Glass, bornes 180–400, largeur valide conservée, 240 px en Classique | OK (scénario navigateur réel) |
| Classique V2 contre `main` `3fca7996` (styles calculés de chaque élément, 1600 et 390 px) | application : **0 écart** (143 vérifications) ; portail : 0 écart hors section « Apparence » volontaire de `/profile` |
| Parité RBAC (7 rôles réels × 15 routes sensibles) contre `main` | **105 / 105** identiques |
| Balayage visuel Light/Dark × 320/390/768/1600 post-fusion | 0 défaut réel (application 82 routes, portail 35) ; faux positifs connus : emoji ✅ de la borne, redirections |
| Scénarios (Classique, chargement paresseux, apparence Clair/Sombre/Système, clavier, modale) | tous satisfaits (application et portail) |
| Builds de production : application sans jeton / jeton accidentel `1` / jeton exact ; portail sans jeton et avec jeton | OK ; Glass uniquement avec le jeton exact |
| Outils de développement absents de la production ; `/glass-kit` introuvable | 32 / 32 + 29 / 29 |
| Registres de routes (application 84, portail 36) | tests de cohérence OK |
| Sensibilité : `/admin/platform-permission-grants` couverte par Glass selon l'amendement 27 ; aucune route sensible `ga` | OK |

Note : les captures d'écran du dossier d'acceptation ont été prises avant la fusion ; la fusion n'a touché que le tableau de bord et le menu de notifications, dont le rendu a été recontrôlé (balayage et scénarios post-fusion).

## Le P1 hérité est résolu

Le plantage de `/dashboard` (palette `p` masquée dans `pendingApprovals.map`) signalé à l'issue du mandat 49 est corrigé par `3fca7996`, désormais dans V2. P1 ouvert : **0**.
