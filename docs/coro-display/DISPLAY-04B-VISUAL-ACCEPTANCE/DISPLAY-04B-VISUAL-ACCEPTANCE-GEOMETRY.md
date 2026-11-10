# DISPLAY-04B-VISUAL-ACCEPTANCE — Geometry

Reference raster: 5100×3300, ratio 1.5454545455, SHA-256 `e7883991822a92a47931e8bb277f7bce1ec6cc3b948331557b60e7abbf542ca2`.

| Profile | Canvas | Content | Margins L/R/T/B | RMSE after normalization | Verdict |
|---|---:|---:|---:|---:|---|
| ORIGINAL_17X11 | 4080×2640 | 4080×2640 | 0/0/0/0 | `0 (0)` | PASS |
| SCREEN_16X9 | 3840×2160 | 3338×2160 | 251/251/0/0 | `0 (0)` | PASS |
| SCREEN_16X10 | 3840×2400 | 3709×2400 | 65/66/0/0 | `0 (0)` | PASS |

Render SHA-256 values:

- ORIGINAL_17X11: `528390e65e85204d9971aa11fab4775319cbf857fa5d68edf3b944b71e15cf44`.
- SCREEN_16X9: `9c69040b1aa354f0b019f515ceb593da212d43b79aff082427c7e8dc0ba82380`.
- SCREEN_16X10: `6760a254da203f8aad31b72b1feb6ed0c220710a252d64179c21a3c239bece4c`.

The one-pixel asymmetry on the 16:10 right margin is the deterministic result of centering an odd 131-pixel remainder. It does not affect content geometry. All content ratios differ from the source by rounding only; comparison against the equivalently resized source is exact.

No profile rotates, crops, stretches, or moves document content internally. White margins are presentation canvas, not PDF alterations.
