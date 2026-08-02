export function buildPaginationMeta(
  page: number,
  limit: number,
  totalItems: number,
) {
  return {
    page,
    limit,
    total_items: totalItems,
    total_pages: Math.ceil(totalItems / limit),
  };
}

export function getOffset(page: number, limit: number): number {
  return (page - 1) * limit;
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
