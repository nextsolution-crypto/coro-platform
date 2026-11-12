# Regression tests

Executed at development checkpoint:

- DISPLAY-08 physical policy: PASS (6);
- connected Player runtime and operational resilience: PASS; combined targeted result 22/22;
- installer/systemd/Chromium contract: PASS (3/3);
- complete DISPLAY-06/07/08 device + orchestration, with PostgreSQL enabled: PASS (16 suites, 79/79);
- 186 migrations from zero and second no-op pass: PASS;
- Nest build and targeted ESLint: PASS;
- npm runtime audit: PASS (0 vulnerabilities across 273 production dependencies);
- full npm audit: 30 development-tool findings (3 high, 23 moderate, 4 low), chiefly Prisma CLI/Jest/ESLint chains; not present in the Player production runtime, retained as upgrade debt rather than applying unsafe major-version fixes;
- targeted secret-pattern scan: PASS; the only match is the negative-test literal `BEGIN ... PRIVATE KEY`;
- `git diff --check`: PASS except Windows LF conversion warning.

Still required on integration SHA: DISPLAY-06A-D, DISPLAY-07, complete backend/Display/PostgreSQL/E2E/adversarial/Chromium, Documents, Knowledge, OCR, four TypeScript applications, Nest/Next builds, targeted ESLint, runtime/full npm audit and secret scan. Results will be updated from actual executions only.
