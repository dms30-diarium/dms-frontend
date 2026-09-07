import { AccordionFieldService } from './accordion-field.service';

describe('AccordionFieldService', () => {
  let service: AccordionFieldService;

  beforeEach(() => {
    service = new AccordionFieldService();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getKeys', () => {
    it('returns object keys for a plain record', () => {
      expect(service.getKeys({ a: 1, b: 2 })).toEqual(['a', 'b']);
    });

    it('returns an empty array for arrays', () => {
      expect(service.getKeys([1, 2, 3])).toEqual([]);
    });

    it('returns an empty array for null', () => {
      expect(service.getKeys(null)).toEqual([]);
    });

    it('returns an empty array for primitives', () => {
      expect(service.getKeys('string')).toEqual([]);
      expect(service.getKeys(42)).toEqual([]);
    });
  });

  describe('isRecord', () => {
    it('returns true for plain objects', () => {
      expect(service.isRecord({})).toBeTrue();
    });

    it('returns false for arrays', () => {
      expect(service.isRecord([1, 2])).toBeFalse();
    });

    it('returns false for null', () => {
      expect(service.isRecord(null)).toBeFalse();
    });

    it('returns false for primitives', () => {
      expect(service.isRecord('x')).toBeFalse();
      expect(service.isRecord(1)).toBeFalse();
    });
  });

  describe('getRecord', () => {
    it('returns the value when it is a record', () => {
      const value = { a: 1 };
      expect(service.getRecord(value)).toBe(value);
    });

    it('returns an empty object for non-records', () => {
      expect(service.getRecord('x')).toEqual({});
      expect(service.getRecord([1, 2])).toEqual({});
      expect(service.getRecord(null)).toEqual({});
    });
  });

  describe('shouldRecurse', () => {
    it('returns false for non-records', () => {
      expect(service.shouldRecurse('x')).toBeFalse();
    });

    it('returns false when no nested record values exist', () => {
      expect(service.shouldRecurse({ a: 1, b: 'text' })).toBeFalse();
    });

    it('returns true when at least one nested value is a record', () => {
      expect(service.shouldRecurse({ a: 1, b: { c: 2 } })).toBeTrue();
    });
  });

  describe('getNestedRecord', () => {
    it('returns the nested record for an existing key', () => {
      const parent = { child: { a: 1 } };
      expect(service.getNestedRecord(parent, 'child')).toEqual({ a: 1 });
    });

    it('returns an empty object when the key is missing', () => {
      expect(service.getNestedRecord({}, 'missing')).toEqual({});
    });

    it('returns an empty object when the nested value is not a record', () => {
      expect(service.getNestedRecord({ child: 'text' }, 'child')).toEqual({});
    });

    it('returns an empty object when parent is not a record', () => {
      expect(service.getNestedRecord(null, 'child')).toEqual({});
    });
  });

  describe('getPipeJoined', () => {
    it('joins string and number values with " | "', () => {
      expect(service.getPipeJoined({ a: 'foo', b: 2 })).toBe('foo | 2');
    });

    it('renders non string/number values as empty strings', () => {
      expect(service.getPipeJoined({ a: 'foo', b: { nested: true }, c: null })).toBe('foo |  | ');
    });

    it('stringifies non-record values directly', () => {
      expect(service.getPipeJoined(42)).toBe('42');
      expect(service.getPipeJoined(null)).toBe('null');
    });
  });

  describe('getNestedValueAsString', () => {
    it('returns the nested value as a string', () => {
      const parent = { child: { label: 'Hello' } };
      expect(service.getNestedValueAsString(parent, 'child', 'label')).toBe('Hello');
    });

    it('stringifies numeric nested values', () => {
      const parent = { child: { count: 5 } };
      expect(service.getNestedValueAsString(parent, 'child', 'count')).toBe('5');
    });

    it('returns an empty string when the nested key is missing', () => {
      const parent = { child: { label: 'Hello' } };
      expect(service.getNestedValueAsString(parent, 'child', 'missing')).toBe('');
    });

    it('returns an empty string when the intermediate key is not a record', () => {
      const parent = { child: 'text' };
      expect(service.getNestedValueAsString(parent, 'child', 'label')).toBe('');
    });

    it('returns an empty string when parent is not a record', () => {
      expect(service.getNestedValueAsString(null, 'child', 'label')).toBe('');
    });
  });
});
