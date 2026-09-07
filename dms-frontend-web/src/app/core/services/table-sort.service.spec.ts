import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { TableSortService } from './table-sort.service';

describe('TableSortService', () => {
  let service: TableSortService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [TableSortService] });
    service = TestBed.inject(TableSortService);
  });

  describe('sortLocalItems', () => {
    const items = [
      { name: 'Banana', count: 2 },
      { name: 'Apple', count: 10 },
      { name: 'Cherry', count: 1 },
    ];

    it('sorts ascending by string field', () => {
      const result = service.sortLocalItems(items, 'name', 'asc');
      expect(result.map(i => i.name)).toEqual(['Apple', 'Banana', 'Cherry']);
    });

    it('sorts descending by string field', () => {
      const result = service.sortLocalItems(items, 'name', 'desc');
      expect(result.map(i => i.name)).toEqual(['Cherry', 'Banana', 'Apple']);
    });

    it('does not mutate original array', () => {
      const original = [...items];
      service.sortLocalItems(items, 'name', 'asc');
      expect(items).toEqual(original);
    });

    it('sorts numerically by numeric string field', () => {
      const numItems = [{ val: '10' }, { val: '2' }, { val: '1' }];
      const result = service.sortLocalItems(numItems, 'val', 'asc');
      expect(result.map(i => i.val)).toEqual(['1', '2', '10']);
    });
  });

  describe('resolveSort', () => {
    const defaultSort = { sortBy: 'name', sortOrder: 'asc' as const };

    it('returns next sort when not at default', () => {
      const current = { sortBy: 'date', sortOrder: 'asc' as const };
      const next = { sortBy: 'date', sortOrder: 'desc' as const };
      const result = service.resolveSort(current, next, defaultSort);
      expect(result).toEqual(next);
    });

    it('resets to default when cycling back from desc on same field', () => {
      const current = { sortBy: 'date', sortOrder: 'desc' as const };
      const next = { sortBy: 'date', sortOrder: 'asc' as const };
      const result = service.resolveSort(current, next, defaultSort);
      expect(result).toEqual(defaultSort);
    });

    it('does not reset when already at default', () => {
      const next = { sortBy: 'name', sortOrder: 'desc' as const };
      const result = service.resolveSort(defaultSort, next, defaultSort);
      expect(result).toEqual(next);
    });

    it('does not reset when switching to a different field', () => {
      const current = { sortBy: 'date', sortOrder: 'desc' as const };
      const next = { sortBy: 'name', sortOrder: 'asc' as const };
      const result = service.resolveSort(current, next, defaultSort);
      expect(result).toEqual(next);
    });
  });

  describe('applySortSignals', () => {
    it('updates signals with resolved sort', () => {
      const sortBy = signal('name');
      const sortOrder = signal<'asc' | 'desc'>('asc');
      const defaultSort = { sortBy: 'name', sortOrder: 'asc' as const };
      const next = { sortBy: 'date', sortOrder: 'desc' as const };

      TestBed.runInInjectionContext(() => {
        const result = service.applySortSignals(sortBy, sortOrder, next, defaultSort);
        expect(sortBy()).toBe('date');
        expect(sortOrder()).toBe('desc');
        expect(result).toEqual(next);
      });
    });
  });
});
