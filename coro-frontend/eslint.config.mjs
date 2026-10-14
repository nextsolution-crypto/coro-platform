import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: [
      "app/admin/commercial/assumptions/assumptions.contract.test.cjs",
      "app/admin/commercial/clauses/clauses.contract.test.cjs",
      "app/admin/commercial/commercial-center.contract.test.cjs",
      "app/admin/commercial/content/content.contract.test.cjs",
      "app/admin/commercial/dossier/dossier.contract.test.cjs",
      "app/admin/commercial/entitlements/capability-operations.contract.test.cjs",
      "app/admin/commercial/legal-issuer/legal-issuer.contract.test.cjs",
      "app/admin/organizations/*/capability-entitlements.contract.test.cjs",
      "app/admin/organizations/*/organization-contracts.contract.test.cjs",
    ],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
