export interface PageSignal {
  (): number;
  set: (value: number) => void;
}

export function paginateEntries<T>(entries: T[], page: number, pageSize: number): T[] {
  if (pageSize <= 0) return entries;
  const safePage = Math.max(0, page);
  const start = safePage * pageSize;
  return entries.slice(start, start + pageSize);
}

export function updateCurrentPage(pageSignal: PageSignal, total: number, pageSize: number): void {
  const maxPage = pageSize > 0 ? Math.max(0, Math.ceil(total / pageSize) - 1) : 0;
  const current = pageSignal();
  const next = Math.min(Math.max(0, current), maxPage);
  if (next !== current) {
    pageSignal.set(next);
  }
}
