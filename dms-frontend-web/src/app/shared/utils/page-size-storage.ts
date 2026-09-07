const STORAGE_KEY = 'pageSizeByUsername';
export const GLOBAL_PAGE_SIZE_KEY = '_global';

type PageSizeMap = Record<string, number>;

function parsePageSize(value: unknown): number | null {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function readStorage(): { pageSizeMap?: PageSizeMap } {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function writeStorage(data: { pageSizeMap?: PageSizeMap }): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function loadPageSize(username: string, _tableKey: string = GLOBAL_PAGE_SIZE_KEY): number | null {
  if (!username) return null;
  const data = readStorage();
  const userEntry = data.pageSizeMap?.[username];
  if (typeof userEntry === 'number') {
    return parsePageSize(userEntry);
  }
  return null;
}

export function savePageSize(username: string, _tableKey: string, pageSize: number): void {
  if (!username) return;
  const size = parsePageSize(pageSize);
  if (size == null) return;

  const data = readStorage();
  data.pageSizeMap = data.pageSizeMap ?? {};
  data.pageSizeMap[username] = size;
  writeStorage(data);
}
