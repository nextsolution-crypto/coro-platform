# TLS origin — synthèse

Au 2026-11-13, le routage applicatif de `display.getcoro.io` vers le Player est démontré (HTTP 404 attendu, `Cache-Control: no-store`), mais le certificat présenté par l'origine ne couvre pas Display. Le run gouverné [43430222072](https://github.com/nextsolution-crypto/coro-platform/actions/runs/43430222072) rapporte `originTls=FAIL`, `originSanMatches=false`, expiration le 9 janvier 2027 et runtime inchangé.

La phase A n'a modifié ni origine, ni DNS, ni Cloudflare. La solution privilégiée est un virtual host et un certificat dédiés à Display, sous réserve de confirmer le terminateur et le renouvellement par l'inspection approfondie proposée. Verdict : **GO CONDITIONNEL TLS-REMEDIATION-READY**.
