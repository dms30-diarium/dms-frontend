import { getInitials } from './initials';

describe('getInitials', () => {
  it('returns bullet for undefined', () => {
    expect(getInitials(undefined)).toBe('•');
  });

  it('returns bullet for empty string', () => {
    expect(getInitials('')).toBe('•');
  });

  it('returns bullet for whitespace-only string', () => {
    expect(getInitials('   ')).toBe('•');
  });

  it('returns first letter uppercased for single word', () => {
    expect(getInitials('anna')).toBe('A');
  });

  it('returns two initials for two words', () => {
    expect(getInitials('Anna Svensson')).toBe('AS');
  });

  it('returns only first two initials for three+ words', () => {
    expect(getInitials('Anna Maria Svensson')).toBe('AM');
  });

  it('uppercases initials', () => {
    expect(getInitials('björn erik')).toBe('BE');
  });
});
