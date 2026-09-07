import {
  truncateText,
  truncateForTable,
  truncateForTitle,
  truncateForBreadcrumb,
  DEFAULT_TABLE_TEXT_MAX,
  DEFAULT_TITLE_TEXT_MAX,
  DEFAULT_BREADCRUMB_TEXT_MAX,
} from './text-utils';

describe('truncateText', () => {
  it('returns empty string for null', () => {
    expect(truncateText(null, 10)).toBe('');
  });

  it('returns empty string for undefined', () => {
    expect(truncateText(undefined, 10)).toBe('');
  });

  it('returns empty string for whitespace-only string', () => {
    expect(truncateText('   ', 10)).toBe('');
  });

  it('returns full string when shorter than maxLength', () => {
    expect(truncateText('hello', 10)).toBe('hello');
  });

  it('returns full string when equal to maxLength', () => {
    const str = 'a'.repeat(10);
    expect(truncateText(str, 10)).toBe(str);
  });

  it('truncates and appends ellipsis when over maxLength', () => {
    const result = truncateText('hello world', 8);
    expect(result.endsWith('...')).toBeTrue();
    expect(result.length).toBeLessThanOrEqual(8);
  });

  it('coerces numbers to string', () => {
    expect(truncateText(12345, 10)).toBe('12345');
  });
});

describe('truncateForTable', () => {
  it('uses DEFAULT_TABLE_TEXT_MAX as default', () => {
    const long = 'a'.repeat(DEFAULT_TABLE_TEXT_MAX + 10);
    const result = truncateForTable(long);
    expect(result.endsWith('...')).toBeTrue();
  });
});

describe('truncateForTitle', () => {
  it('uses DEFAULT_TITLE_TEXT_MAX as default', () => {
    const long = 'a'.repeat(DEFAULT_TITLE_TEXT_MAX + 10);
    const result = truncateForTitle(long);
    expect(result.endsWith('...')).toBeTrue();
  });
});

describe('truncateForBreadcrumb', () => {
  it('uses DEFAULT_BREADCRUMB_TEXT_MAX as default', () => {
    const long = 'a'.repeat(DEFAULT_BREADCRUMB_TEXT_MAX + 10);
    const result = truncateForBreadcrumb(long);
    expect(result.endsWith('...')).toBeTrue();
  });
});
