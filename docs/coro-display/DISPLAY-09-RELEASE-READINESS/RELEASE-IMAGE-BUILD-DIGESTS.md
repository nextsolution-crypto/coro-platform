# Images candidates locales

Construites le 2026-11-12 depuis `5ae7cd21`, Docker 29.9.2, `linux/amd64`. Aucun push.

| Image locale | Identifiant/digest local | Taille logique |
|---|---|---:|
| backend | `sha256:09c8119a804329d7d50c4b41aee66e097cf54737f8a8b870b996bd3a64066fa8` | 2 213 611 321 o |
| frontend | `sha256:84179111a1cc7c20cde175faf93248919f3c4559d909147c1b98003d2b299423` | 359 808 109 o |
| client-portal | `sha256:b8bdcc19a97f60bc5329ee62469f675dac6aec3a6be8d5d171d0889671e6a631` | 345 935 384 o |
| website | `sha256:063406f7f2dbcc63b19f774b24068d49dd58f721bba580271f810256c20ff21e` | 490 245 212 o |

Builds PASS; smokes Knowledge PDF/OCR PASS. Audit npm des dépendances de production : 0 vulnérabilité sur les quatre packages. Les avertissements de build concernent les dépendances de développement. Docker Scout externe n'a pas été utilisé afin de ne pas transmettre de métadonnées d'image.

Ces identifiants sont **locaux**. Digests de registre : `UNRESOLVED` jusqu'au build/push gouverné autorisé.
