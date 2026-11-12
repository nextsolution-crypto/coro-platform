# CSP

La réponse loopback applique `default-src 'none'`, scripts/styles/images/connect limités à self, `object-src`, `frame-src`, `frame-ancestors`, `form-action` et `base-uri` à `none`. `unsafe-eval` est absent. Header testé; violations dans un Chromium réel: `NOT_VERIFIED`.
