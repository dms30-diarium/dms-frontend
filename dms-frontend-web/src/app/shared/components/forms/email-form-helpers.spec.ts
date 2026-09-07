import { parseEmails, findInvalidEmails, isValidEmail, pickFirstString, getEmailOptionId } from './email-form-helpers';

describe('isValidEmail', () => {
  it('returns true for valid email', () => {
    expect(isValidEmail('user@example.com')).toBeTrue();
  });

  it('returns false for missing @', () => {
    expect(isValidEmail('userexample.com')).toBeFalse();
  });

  it('returns false for missing domain', () => {
    expect(isValidEmail('user@')).toBeFalse();
  });

  it('returns false for missing TLD', () => {
    expect(isValidEmail('user@example')).toBeFalse();
  });

  it('returns false for string with spaces', () => {
    expect(isValidEmail('user @example.com')).toBeFalse();
  });
});

describe('parseEmails', () => {
  it('returns empty array for null', () => {
    expect(parseEmails(null)).toEqual([]);
  });

  it('returns empty array for undefined', () => {
    expect(parseEmails(undefined)).toEqual([]);
  });

  it('splits comma-separated string', () => {
    expect(parseEmails('a@a.com, b@b.com')).toEqual(['a@a.com', 'b@b.com']);
  });

  it('splits semicolon-separated string', () => {
    expect(parseEmails('a@a.com;b@b.com')).toEqual(['a@a.com', 'b@b.com']);
  });

  it('extracts email field from array of contact objects', () => {
    const contacts = [{ email: 'user@example.com' }, { email: 'other@example.com' }];
    expect(parseEmails(contacts)).toEqual(['user@example.com', 'other@example.com']);
  });

  it('falls back to name when email is absent', () => {
    const contacts = [{ name: 'user@fallback.com' }];
    expect(parseEmails(contacts)).toEqual(['user@fallback.com']);
  });
});

describe('findInvalidEmails', () => {
  it('returns empty array when all are valid', () => {
    expect(findInvalidEmails('a@a.com, b@b.com')).toEqual([]);
  });

  it('returns invalid emails', () => {
    expect(findInvalidEmails('notanemail, valid@example.com')).toEqual(['notanemail']);
  });
});

describe('pickFirstString', () => {
  it('returns undefined for undefined props', () => {
    expect(pickFirstString(undefined, 'key')).toBeUndefined();
  });

  it('returns first non-empty string value', () => {
    const props = { a: '', b: 'hello', c: 'world' };
    expect(pickFirstString(props, 'a', 'b', 'c')).toBe('hello');
  });

  it('returns undefined when no key has a value', () => {
    expect(pickFirstString({ a: '' }, 'a')).toBeUndefined();
  });

  it('returns undefined when key not present', () => {
    expect(pickFirstString({}, 'missing')).toBeUndefined();
  });
});

describe('getEmailOptionId', () => {
  it('returns empty string for null', () => {
    expect(getEmailOptionId(null)).toBe('');
  });

  it('returns string value directly', () => {
    expect(getEmailOptionId('abc')).toBe('abc');
  });

  it('returns id from object', () => {
    expect(getEmailOptionId({ id: 'myid' })).toBe('myid');
  });

  it('falls back to value when id absent', () => {
    expect(getEmailOptionId({ value: 'myval' })).toBe('myval');
  });

  it('returns first element id from array', () => {
    expect(getEmailOptionId([{ id: 'first' }, { id: 'second' }])).toBe('first');
  });
});
