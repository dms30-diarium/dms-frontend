import { GLOBAL_PAGE_SIZE_KEY, loadPageSize, savePageSize } from './page-size-storage';

describe('page-size-storage', () => {
  beforeEach(() => localStorage.clear());

  describe('loadPageSize', () => {
    it('returns null for empty username', () => {
      expect(loadPageSize('')).toBeNull();
    });

    it('returns null when nothing stored', () => {
      expect(loadPageSize('user1')).toBeNull();
    });

    it('returns saved size for user', () => {
      savePageSize('user1', GLOBAL_PAGE_SIZE_KEY, 50);
      expect(loadPageSize('user1')).toBe(50);
    });

    it('returns null for different user', () => {
      savePageSize('user1', GLOBAL_PAGE_SIZE_KEY, 50);
      expect(loadPageSize('user2')).toBeNull();
    });

    it('returns null when localStorage has invalid JSON', () => {
      localStorage.setItem('pageSizeByUsername', 'not-json');
      expect(loadPageSize('user1')).toBeNull();
    });

    it('returns null when pageSizeMap missing', () => {
      localStorage.setItem('pageSizeByUsername', JSON.stringify({}));
      expect(loadPageSize('user1')).toBeNull();
    });

    it('ignores tableKey parameter (global key)', () => {
      savePageSize('user1', 'someTable', 25);
      expect(loadPageSize('user1', 'someTable')).toBe(25);
    });
  });

  describe('savePageSize', () => {
    it('does nothing for empty username', () => {
      savePageSize('', GLOBAL_PAGE_SIZE_KEY, 25);
      expect(loadPageSize('')).toBeNull();
    });

    it('does nothing for non-finite page size', () => {
      savePageSize('user1', GLOBAL_PAGE_SIZE_KEY, NaN);
      expect(loadPageSize('user1')).toBeNull();
    });

    it('overwrites existing value', () => {
      savePageSize('user1', GLOBAL_PAGE_SIZE_KEY, 25);
      savePageSize('user1', GLOBAL_PAGE_SIZE_KEY, 100);
      expect(loadPageSize('user1')).toBe(100);
    });

    it('handles multiple users independently', () => {
      savePageSize('alice', GLOBAL_PAGE_SIZE_KEY, 10);
      savePageSize('bob', GLOBAL_PAGE_SIZE_KEY, 50);
      expect(loadPageSize('alice')).toBe(10);
      expect(loadPageSize('bob')).toBe(50);
    });

    it('persists with string-number pageSize coercion', () => {
      savePageSize('user1', GLOBAL_PAGE_SIZE_KEY, 25.9);
      expect(loadPageSize('user1')).toBe(25.9);
    });
  });
});
