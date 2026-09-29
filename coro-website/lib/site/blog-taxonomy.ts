/**
 * MIG-07C — small pure helpers for Blog discovery (category/tag filtering).
 * `category`/`tags` are free-text fields on BlogPost (Prisma: category String?, tags String[]),
 * not a normalized taxonomy table — production data has real casing variants
 * (e.g. "Conformité" vs "conformité"), so matching is case/whitespace-insensitive while display
 * always uses the original stored value from the clicked-through article, never a canonicalized form.
 */

export type TaggedPost = { category?: string; tags?: string[] };

/** Comparison-only normalization. Never used for display or URL encoding. */
export function normalizeTaxonomyValue(value: string): string {
  return value.trim().toLowerCase();
}

/** Filters posts by an active category (exact match) and/or an active tag (case/whitespace-insensitive
 * match against any of the post's tags). Filtering must happen before pagination. */
export function filterPostsByTaxonomy<T extends TaggedPost>(posts: T[], activeCategory: string, activeTag: string): T[] {
  let result = activeCategory ? posts.filter((p) => p.category === activeCategory) : posts;
  if (activeTag) {
    const normalizedTag = normalizeTaxonomyValue(activeTag);
    result = result.filter((p) => (p.tags ?? []).some((tag) => normalizeTaxonomyValue(tag) === normalizedTag));
  }
  return result;
}
