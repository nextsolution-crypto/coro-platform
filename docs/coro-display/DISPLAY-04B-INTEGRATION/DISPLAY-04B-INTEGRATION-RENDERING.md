# Rendu

| Profil | Dimensions | SHA-256 pilote | Résultat |
|---|---:|---|---|
| 17×11 | 4080×2640 | `528390e...` | PASS |
| 16:9 | 3840×2160 | `9c69040...` | PASS |
| 16:10 | 3840×2400 | `6760a254...` | PASS |

Le pilote utilise le PDF privé dont le SHA-256 est `a278a9cadaed1d7650c55bb67f3138daf8a928021b2a7d7c989a02a5e906ef39`. Les transformations emploient un ajustement proportionnel sans recadrage ni étirement. Les comparaisons de pixels donnent un RMSE normalisé nul, preuve de fidélité technique mais non de conformité normative.

Les fichiers privés restent sous `.worktrees\.private-coro-display-04b-*` et ne sont pas suivis par Git.
