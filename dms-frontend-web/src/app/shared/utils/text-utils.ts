export const DEFAULT_TABLE_TEXT_MAX = 60;
export const DEFAULT_TITLE_TEXT_MAX = 80;
export const DEFAULT_BREADCRUMB_TEXT_MAX = 30;

export function truncateText(value: unknown, maxLength: number): string {
  if (value === null || value === undefined) return '';

  const text = String(value);
  if (!text.trim()) return '';

  if (text.length <= maxLength) return text;

  const sliceLength = Math.max(0, maxLength - 3);
  return `${text.slice(0, sliceLength).trimEnd()}...`;
}

export function truncateForTable(value: unknown, maxLength = DEFAULT_TABLE_TEXT_MAX): string {
  return truncateText(value, maxLength);
}

export function truncateForTitle(value: unknown, maxLength = DEFAULT_TITLE_TEXT_MAX): string {
  return truncateText(value, maxLength);
}

export function truncateForBreadcrumb(value: unknown, maxLength = DEFAULT_BREADCRUMB_TEXT_MAX): string {
  return truncateText(value, maxLength);
}
