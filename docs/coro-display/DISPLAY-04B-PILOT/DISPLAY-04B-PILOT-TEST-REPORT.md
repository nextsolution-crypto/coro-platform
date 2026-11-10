# DISPLAY-04B-PILOT — Test report

| Control | Result |
|---|---|
| Source SHA-256 | PASS |
| Real PDF isolated render | PASS |
| Three exact profile dimensions | PASS |
| Contain/no crop/no stretch | PASS |
| Profile unit tests | PASS — 4 tests |
| DISPLAY renderer/profile targeted suites | PASS — 8 tests across 2 discovered suites |
| DISPLAY-03 PostgreSQL governance | PASS — 1 test |
| Prisma 6.19.3 validate | PASS in Linux builder image |
| Migrations | PASS — 179 applied; second status reports up to date |
| Backend production Docker build | PASS |
| Backend local Nest build | PASS |
| ESLint on changed TypeScript | PASS |
| npm production dependency audit | PASS — 0 findings |
| npm complete dependency audit | RESERVATION — 30 development-tool findings (4 low, 23 moderate, 3 high); no unsafe automatic fix applied |
| Visual engineering inspection | PASS with mandatory human approval outstanding |
| Production/shared environment | NOT TOUCHED |

The first standalone `prisma validate` invocation omitted `DATABASE_URL` and failed with P1012; it was rerun with a syntactically valid, non-secret local URL and passed. This was configuration, not a schema defect.

Windows Prisma generation could not reach its engine download endpoint in the restricted environment. The locked Prisma 6.19.3 generation, schema validation, build, migrations, and tests all passed inside the project Docker builder, which is the relevant Linux runtime path.
