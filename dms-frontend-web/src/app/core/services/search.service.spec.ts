import { SearchService } from './search.service';

describe('SearchService', () => {
  let service: SearchService;

  beforeEach(() => {
    service = new SearchService();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('extractTerm', () => {
    it('trims a plain string', () => {
      expect(service.extractTerm('  hello  ')).toBe('hello');
    });

    it('extracts a string detail from a CustomEvent', () => {
      expect(service.extractTerm(new CustomEvent('x', { detail: '  invoice  ' }))).toBe('invoice');
    });

    it('extracts a value property from a CustomEvent detail object', () => {
      expect(service.extractTerm(new CustomEvent('x', { detail: { value: '  invoice  ' } }))).toBe('invoice');
    });

    it('extracts the value from a DOM input event target', () => {
      const input = document.createElement('input');
      input.value = '  invoice  ';
      const event = new Event('input');
      Object.defineProperty(event, 'target', { value: input, configurable: true });
      expect(service.extractTerm(event)).toBe('invoice');
    });

    it('extracts a value property from a plain object', () => {
      expect(service.extractTerm({ value: '  invoice  ' })).toBe('invoice');
    });

    it('returns an empty string for unrecognized shapes', () => {
      expect(service.extractTerm(42)).toBe('');
      expect(service.extractTerm(null)).toBe('');
      expect(service.extractTerm(undefined)).toBe('');
      expect(service.extractTerm({})).toBe('');
    });
  });

  describe('toContainsPattern', () => {
    it('wraps a non-empty term in % characters', () => {
      expect(service.toContainsPattern('invoice')).toBe('%invoice%');
    });

    it('trims surrounding whitespace before wrapping', () => {
      expect(service.toContainsPattern('  invoice  ')).toBe('%invoice%');
    });

    it('strips existing % characters from the term', () => {
      expect(service.toContainsPattern('in%voice')).toBe('%invoice%');
    });

    it('returns an empty string for blank input', () => {
      expect(service.toContainsPattern('')).toBe('');
      expect(service.toContainsPattern('   ')).toBe('');
    });

    it('returns an empty string when stripping % leaves nothing', () => {
      expect(service.toContainsPattern('%%%')).toBe('');
    });
  });

  describe('toContainsPatternFromEvent', () => {
    it('extracts the term from an event and wraps it', () => {
      expect(service.toContainsPatternFromEvent(new CustomEvent('x', { detail: 'invoice' }))).toBe('%invoice%');
    });

    it('returns an empty string when no term can be extracted', () => {
      expect(service.toContainsPatternFromEvent(null)).toBe('');
    });
  });
});
