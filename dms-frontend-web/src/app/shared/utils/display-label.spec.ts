import { getUserFullName, getUserDisplayName, getUserInitials } from './display-label';

describe('getUserFullName', () => {
  it('returns empty string for undefined', () => {
    expect(getUserFullName(undefined)).toBe('');
  });

  it('returns user id when properties is missing', () => {
    expect(getUserFullName({ id: 'user1' } as never)).toBe('user1');
  });

  it('returns full name from properties', () => {
    const user = { id: 'u1', properties: { firstName: 'Anna', lastName: 'Svensson' } };
    expect(getUserFullName(user as never)).toBe('Anna Svensson');
  });

  it('trims result', () => {
    const user = { id: 'u1', properties: { firstName: 'Anna', lastName: '' } };
    expect(getUserFullName(user as never)).toBe('Anna');
  });
});

describe('getUserDisplayName', () => {
  it('returns empty string for undefined', () => {
    expect(getUserDisplayName(undefined)).toBe('');
  });

  it('returns full name when firstName and lastName present', () => {
    const user = { id: 'u1', properties: { firstName: 'Björn', lastName: 'Eriksson' } };
    expect(getUserDisplayName(user as never)).toBe('Björn Eriksson');
  });

  it('falls back to user id when no name parts', () => {
    const user = { id: 'fallback-id', properties: {} };
    expect(getUserDisplayName(user as never)).toBe('fallback-id');
  });

  it('returns single name part if only one present', () => {
    const user = { id: 'u1', properties: { firstName: 'Anna', lastName: '' } };
    expect(getUserDisplayName(user as never)).toBe('Anna');
  });
});

describe('getUserInitials', () => {
  it('returns bullet for undefined user', () => {
    expect(getUserInitials(undefined)).toBe('•');
  });

  it('returns initials for named user', () => {
    const user = { id: 'u1', properties: { firstName: 'Anna', lastName: 'Svensson' } };
    expect(getUserInitials(user as never)).toBe('AS');
  });
});
