# DISPLAY-04B-PILOT — Document import

## Source verification

| Field | Verified value |
|---|---|
| File | `F:\coro-test-assets\display-04b\plan-groupe-vision.pdf` |
| Bytes | 458,311 |
| SHA-256 | `a278a9cadaed1d7650c55bb67f3138daf8a928021b2a7d7c989a02a5e906ef39` |
| Pages | 1 |
| Rendered source ratio | 5100:3300 (17:11) |

The file matched the mandate exactly. It was read only and was not copied into the repository. The pilot runner refuses a different digest before creating a render request.

## Import path exercised

DISPLAY-04A request validation exercised PDF magic/type, byte limit, digest, page selection, isolated rasterization, output PNG validation, dimensions, output digest, and private-output handling. DISPLAY-03 PostgreSQL tests exercised the governed document/building/location relationship and authorization rules with synthetic identities.

The local runner deliberately writes only to the private pilot folder. It does not create a production customer, invitation, notification, or public object.
