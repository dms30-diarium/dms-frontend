import { TestBed } from '@angular/core/testing';
import { SearchService } from './search.service';

describe('SearchService', () => {
  let service: SearchService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [SearchService],
    });
    service = TestBed.inject(SearchService);
  });

  describe('toContainsPattern', () => {
    it('wraps term with % wildcards', () => {
      expect(service.toContainsPattern('hello')).toBe('%hello%');
    });

    it('returns empty string for empty input', () => {
      expect(service.toContainsPattern('')).toBe('');
    });

    it('strips existing % signs before wrapping', () => {
      expect(service.toContainsPattern('hel%lo')).toBe('%hello%');
    });

    it('trims whitespace', () => {
      expect(service.toContainsPattern('  hello  ')).toBe('%hello%');
    });

    it('returns empty string for whitespace-only input', () => {
      expect(service.toContainsPattern('   ')).toBe('');
    });
  });

  describe('extractTerm', () => {
    it('returns trimmed string', () => {
      expect(service.extractTerm('  hello  ')).toBe('hello');
    });

    it('returns empty string for null', () => {
      expect(service.extractTerm(null)).toBe('');
    });

    it('returns empty string for number', () => {
      expect(service.extractTerm(42)).toBe('');
    });

    it('extracts from CustomEvent with string detail', () => {
      const event = new CustomEvent('search', { detail: 'myterm' });
      expect(service.extractTerm(event)).toBe('myterm');
    });

    it('extracts from object with value property', () => {
      expect(service.extractTerm({ value: ' term ' })).toBe('term');
    });
  });

  describe('toContainsPatternFromEvent', () => {
    it('extracts and wraps term from string', () => {
      expect(service.toContainsPatternFromEvent('search')).toBe('%search%');
    });

    it('returns empty for null input', () => {
      expect(service.toContainsPatternFromEvent(null)).toBe('');
    });
  });
});
