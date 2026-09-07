import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { SearchSortService } from './search-sort.service';

describe('SearchSortService', () => {
  let service: SearchSortService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        SearchSortService,
        provideRouter([]),
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
      ],
    });
    service = TestBed.inject(SearchSortService);
  });

  describe('initial state', () => {
    it('activeSortBy returns empty string by default (non-tabbed)', () => {
      expect(service.activeSortBy()).toBe('');
    });

    it('activeSortOrder returns "desc" by default', () => {
      expect(service.activeSortOrder()).toBe('desc');
    });
  });

  describe('setActiveSort (non-tabbed)', () => {
    it('updates activeSortBy and activeSortOrder', () => {
      service.setActiveSort('dc:title', 'asc');
      expect(service.activeSortBy()).toBe('dc:title');
      expect(service.activeSortOrder()).toBe('asc');
    });

    it('allows changing sort field', () => {
      service.setActiveSort('dc:modified', 'desc');
      expect(service.activeSortBy()).toBe('dc:modified');
      expect(service.activeSortOrder()).toBe('desc');
    });
  });

  describe('getSortForDocType', () => {
    it('returns current sort state in non-tabbed mode', () => {
      service.setActiveSort('dc:title', 'asc');
      const result = service.getSortForDocType('Arende');
      expect(result.sortBy).toBe('dc:title');
      expect(result.sortOrder).toBe('asc');
    });
  });

  describe('applyActiveSort', () => {
    it('applies next sort state when different from current', () => {
      const defaultSort = { sortBy: 'dc:modified', sortOrder: 'desc' as const };
      service.applyActiveSort({ sortBy: 'dc:title', sortOrder: 'asc' }, defaultSort);
      expect(service.activeSortBy()).toBe('dc:title');
      expect(service.activeSortOrder()).toBe('asc');
    });

    it('resets to default when same sort field clicked twice (resolveSort cycle)', () => {
      const defaultSort = { sortBy: 'dc:modified', sortOrder: 'desc' as const };
      service.setActiveSort('dc:title', 'desc');
      service.applyActiveSort({ sortBy: 'dc:title', sortOrder: 'asc' }, defaultSort);
      expect(service.activeSortBy()).toBe('dc:modified');
      expect(service.activeSortOrder()).toBe('desc');
    });
  });
});
