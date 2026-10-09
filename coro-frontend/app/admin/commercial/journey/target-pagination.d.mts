export const TARGET_PAGE_SIZE: 25;

export function loadAllTargets<T>(
  fetchPage: (pagination: {
    page: number;
    pageSize: typeof TARGET_PAGE_SIZE;
  }) => Promise<{ items: T[]; total: number }>,
): Promise<T[]>;
