export function formatDateOrMissing(date: string | Date | undefined | null | unknown): string {
  if (!date) return '';
  try {
    if (typeof date === 'string' || date instanceof Date) {
      return date ? new Date(date).toLocaleDateString('sv-SE') : '(saknas)';
    }
    return '';
  } catch {
    return '';
  }
}

// Ensures a stable YYYY-MM-DD string without timezone shifts (prevents off-by-one day issues when sending dates to the backend)
export function toISODateOnlyString(date: string | Date): string {
  if (date instanceof Date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  return String(date).slice(0, 10);
}

// Formats a value for `<input type="date">` by returning a stable YYYY-MM-DD string.
export function formatDateForInput(value: string | null | undefined): string {
  if (!value) return '';
  if (/^\d{4}-\d{2}-\d{2}/.test(value)) return value.slice(0, 10);
  const date = new Date(value);
  if (!Number.isNaN(date.getTime())) return toISODateOnlyString(date);
  return String(value).slice(0, 10);
}
