export const TARGET_PAGE_SIZE = 25;

export async function loadAllTargets(fetchPage) {
  const targets = [];
  let page = 1;
  let total = 0;

  do {
    const result = await fetchPage({ page, pageSize: TARGET_PAGE_SIZE });
    const items = Array.isArray(result.items) ? result.items : [];
    total =
      Number.isSafeInteger(result.total) && result.total >= 0
        ? result.total
        : items.length;
    targets.push(...items);

    if (items.length === 0) break;
    page += 1;
  } while (targets.length < total);

  return targets;
}
