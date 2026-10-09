import assert from "node:assert/strict";
import { loadAllTargets, TARGET_PAGE_SIZE } from "./target-pagination.mjs";

assert.equal(TARGET_PAGE_SIZE, 25);

const allTargets = Array.from({ length: 61 }, (_, index) => ({
  id: `target-${index + 1}`,
}));
const requestedPages = [];
const discovered = await loadAllTargets(async ({ page, pageSize }) => {
  requestedPages.push({ page, pageSize });
  const start = (page - 1) * pageSize;
  return {
    items: allTargets.slice(start, start + pageSize),
    total: allTargets.length,
  };
});
assert.deepEqual(discovered, allTargets);
assert.deepEqual(requestedPages, [
  { page: 1, pageSize: 25 },
  { page: 2, pageSize: 25 },
  { page: 3, pageSize: 25 },
]);

assert.deepEqual(
  await loadAllTargets(async ({ page, pageSize }) => {
    assert.equal(page, 1);
    assert.equal(pageSize, 25);
    return { items: [], total: 0 };
  }),
  [],
);

const expectedError = Object.assign(new Error("Unauthorized"), {
  response: { status: 401 },
});
await assert.rejects(
  loadAllTargets(async () => Promise.reject(expectedError)),
  (error) => error === expectedError,
);

console.log("commercial Founder target pagination: PASS");
