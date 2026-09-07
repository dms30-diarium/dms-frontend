import { formatDateOrMissing, toISODateOnlyString, formatDateForInput } from './date-utils';

describe('formatDateOrMissing', () => {
  it('returns empty string for null', () => {
    expect(formatDateOrMissing(null)).toBe('');
  });

  it('returns empty string for undefined', () => {
    expect(formatDateOrMissing(undefined)).toBe('');
  });

  it('returns empty string for empty string', () => {
    expect(formatDateOrMissing('')).toBe('');
  });

  it('formats a valid ISO date string', () => {
    const result = formatDateOrMissing('2024-01-15T10:00:00Z');
    expect(result).toContain('2024');
  });

  it('formats a Date object', () => {
    const result = formatDateOrMissing(new Date('2024-06-01T00:00:00Z'));
    expect(result).toContain('2024');
  });

  it('returns empty string for non-string non-Date value', () => {
    expect(formatDateOrMissing(12345)).toBe('');
  });
});

describe('toISODateOnlyString', () => {
  it('returns YYYY-MM-DD from a Date object', () => {
    const date = new Date(2024, 0, 15); // local time
    const result = toISODateOnlyString(date);
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(result).toContain('2024');
  });

  it('slices first 10 chars from a string', () => {
    expect(toISODateOnlyString('2024-03-20T10:00:00Z')).toBe('2024-03-20');
  });

  it('pads month and day', () => {
    const date = new Date(2024, 0, 5); // Jan 5
    const result = toISODateOnlyString(date);
    expect(result).toMatch(/-01-05$/);
  });
});

describe('formatDateForInput', () => {
  it('returns empty string for null', () => {
    expect(formatDateForInput(null)).toBe('');
  });

  it('returns empty string for undefined', () => {
    expect(formatDateForInput(undefined)).toBe('');
  });

  it('returns first 10 chars if already YYYY-MM-DD', () => {
    expect(formatDateForInput('2024-03-20T10:00:00Z')).toBe('2024-03-20');
  });

  it('converts ISO timestamp to YYYY-MM-DD', () => {
    const result = formatDateForInput('2024-06-15T00:00:00.000Z');
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
