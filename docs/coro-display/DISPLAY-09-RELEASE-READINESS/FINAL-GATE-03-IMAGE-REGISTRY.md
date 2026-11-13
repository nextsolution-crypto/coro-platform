# Gate 3 — registre d’images immuables

Publication gouvernée du 2026-11-12. Candidat exact : `5ae7cd213346169465ee739d09df6d39b26ac6c3`.

## Workflow et autorité

- PR d’outillage : [#264](https://github.com/nextsolution-crypto/coro-platform/pull/264), HEAD `5d4afbdd68a39c9b3978c53f123014333f5b746e`.
- Workflow manuel `Website Docker Check`, run [43341138318](https://github.com/nextsolution-crypto/coro-platform/actions/runs/43341138318) : **SUCCESS**.
- Autorité GHCR gouvernée existante (`GHCR_TOKEN`), sans nouveau jeton et sans exposition de secret.
- Checkout et validation explicites du SHA candidat; `linux/amd64`; provenance BuildKit `mode=max`.
- Tag neuf : `display09-candidate-5ae7cd213346169465ee739d09df6d39b26ac6c3`.
- Chaque job a relu le manifeste distant depuis GHCR et vérifié son digest et la plateforme `linux/amd64`.

## Digests distants

| Image | Digest GHCR |
|---|---|
| `ghcr.io/nextsolution-crypto/coro-backend` | `sha256:27983be97af79abadf0db2a612db480dc9261c52a3bcf41892946e54865aea0c` |
| `ghcr.io/nextsolution-crypto/coro-frontend` | `sha256:c54fe1952d3da44e6fde282e5c7459eda284ba69e437225713cc21e1c8e99c00` |
| `ghcr.io/nextsolution-crypto/coro-client-portal` | `sha256:186dfc9ba1b7953dcfbb21fa74a4c9e38eaf861b34c688c88282591cf699ed90` |
| `ghcr.io/nextsolution-crypto/coro-website` | `sha256:44288caa82b85ecb18b5546d92e30480587020f4016ee4986225e09b4f3f2cb8` |

Les quatre builds ont produit un manifeste d’attestation distinct. Aucun tag `latest`, `production`, `stable` ou de release existante n’a été remplacé. Aucun workflow `registry_package` n’existe; le job de déploiement n’a pas été déclenché; aucune migration ni release n’a été exécutée.

**Verdict : PASS.** Quatre images immuables publiées et relues à distance; SHA, architecture, provenance et absence de déploiement démontrés.
