/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require("node:assert/strict");
const test = require("node:test");

test("governed workspace filters clauses and preserves typed parameters", async () => {
  const workspace = await import("./proposal-document-workspace.mjs");
  const clauses = [
    {
      effectiveAt: "2026-01-01T00:00:00.000Z",
      parameterSchema: [
        { key: "paymentDeadlineDays", type: "DURATION_DAYS", required: true },
        {
          key: "applicableJurisdiction",
          type: "JURISDICTION",
          required: false,
        },
      ],
      applicabilities: [{ scope: "CORO_PROFESSIONAL" }],
    },
    {
      effectiveAt: "2099-01-01T00:00:00.000Z",
      parameterSchema: [],
      applicabilities: [{ scope: "ALL_OFFERS" }],
    },
  ];
  const applicable = workspace.applicableApprovedClauses(
    clauses,
    "CORO_PROFESSIONAL",
    "2026-10-09T00:00:00.000Z",
  );
  assert.equal(applicable.length, 1);
  assert.deepEqual(workspace.missingRequiredClauseParameters(applicable, {}), [
    "paymentDeadlineDays",
  ]);
  assert.deepEqual(
    workspace.typedClauseParameters(applicable, {
      paymentDeadlineDays: "30",
      applicableJurisdiction: "Québec",
    }),
    { paymentDeadlineDays: 30, applicableJurisdiction: "Québec" },
  );
});

test("workspace uses only approved content and verified issuers", async () => {
  const workspace = await import("./proposal-document-workspace.mjs");
  assert.equal(
    workspace.hasVerifiedIssuer([{ versions: [{ status: "DRAFT" }] }]),
    false,
  );
  assert.equal(
    workspace.hasVerifiedIssuer([{ versions: [{ status: "VERIFIED" }] }]),
    true,
  );
  const mapped = workspace.approvedContentForLines(
    [
      {
        code: "PRO",
        versions: [
          {
            id: "approved",
            status: "APPROVED",
            bindings: [{ targetType: "COMPONENT", targetCode: "SUBSCRIPTION" }],
          },
          {
            id: "draft",
            status: "DRAFT",
            bindings: [{ targetType: "COMPONENT", targetCode: "SECRET" }],
          },
        ],
      },
    ],
    [{ componentCode: "SUBSCRIPTION" }, { componentCode: "SECRET" }],
  );
  assert.equal(mapped[0].bindings.length, 1);
  assert.equal(mapped[1].bindings.length, 0);
});
