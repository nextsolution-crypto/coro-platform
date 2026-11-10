# DISPLAY-04B-PILOT — Rendering

## Pipeline

`PDF → DISPLAY-04A spool request → isolated Poppler worker → validated 5100×3300 PNG → deterministic contain profiles`.

The worker ran non-root (`1000:1000`), with no network, a read-only root filesystem, all capabilities dropped, `no-new-privileges`, 384 MiB memory, one CPU, and 16 PIDs.

## Profiles

| Profile | Canvas | Adaptation | SHA-256 |
|---|---:|---|---|
| Original 17×11 | 4080×2640 | contain, no margin | `528390e65e85204d9971aa11fab4775319cbf857fa5d68edf3b944b71e15cf44` |
| Screen 16:9 | 3840×2160 | contain, explicit white side margins | `9c69040b1aa354f0b019f515ceb593da212d43b79aff082427c7e8dc0ba82380` |
| Screen 16:10 | 3840×2400 | contain, explicit white side margins | `6760a254da203f8aad31b72b1feb6ed0c220710a252d64179c21a3c239bece4c` |

`DisplayPlanProfileService` is deterministic, validates PNG signatures/dimensions/size, calculates contain geometry, and produces exact-canvas SVG instructions with `preserveAspectRatio="xMidYMid meet"`. The local pilot script materializes equivalent PNG evidence with ImageMagick.
