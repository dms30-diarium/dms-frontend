import {
  normalizeOptionToken,
  isOptionLike,
  extractMemberIds,
  buildOptionIndex,
  resolveOptionFromInput,
} from './option-utils';
import { Option } from '@app/shared/commonTypes';

describe('normalizeOptionToken', () => {
  it('trims string values', () => {
    expect(normalizeOptionToken('  hello  ')).toBe('hello');
  });

  it('converts number to string', () => {
    expect(normalizeOptionToken(42)).toBe('42');
  });

  it('converts boolean to string', () => {
    expect(normalizeOptionToken(true)).toBe('true');
  });

  it('returns empty string for objects', () => {
    expect(normalizeOptionToken({ id: 'x' })).toBe('');
  });

  it('returns empty string for null', () => {
    expect(normalizeOptionToken(null)).toBe('');
  });
});

describe('isOptionLike', () => {
  it('returns true for object with id', () => {
    expect(isOptionLike({ id: '1' })).toBeTrue();
  });

  it('returns true for object with label', () => {
    expect(isOptionLike({ label: 'foo' })).toBeTrue();
  });

  it('returns true for object with value', () => {
    expect(isOptionLike({ value: 'bar' })).toBeTrue();
  });

  it('returns false for null', () => {
    expect(isOptionLike(null)).toBeFalse();
  });

  it('returns false for plain string', () => {
    expect(isOptionLike('hello')).toBeFalse();
  });

  it('returns false for empty object', () => {
    expect(isOptionLike({})).toBeFalse();
  });
});

describe('extractMemberIds', () => {
  it('returns empty array for null', () => {
    expect(extractMemberIds(null)).toEqual([]);
  });

  it('returns string items directly', () => {
    expect(extractMemberIds(['a', 'b'])).toEqual(['a', 'b']);
  });

  it('extracts value from option objects', () => {
    const items = [{ id: '1', label: 'One', value: 'one' }];
    expect(extractMemberIds(items)).toEqual(['one']);
  });

  it('extracts id when value not present', () => {
    const items = [{ id: 'id1', label: 'One' }];
    expect(extractMemberIds(items)).toEqual(['id1']);
  });

  it('filters to selected-only when selectedOnly is true and items have selected flag', () => {
    const items = [
      { id: 'a', label: 'A', value: 'a', selected: true },
      { id: 'b', label: 'B', value: 'b', selected: false },
    ];
    expect(extractMemberIds(items, { selectedOnly: true })).toEqual(['a']);
  });
});

describe('buildOptionIndex', () => {
  it('indexes by id, value, and label', () => {
    const options: Option[] = [{ id: 'x', label: 'X label', value: 'xval' }];
    const index = buildOptionIndex(options);
    expect(index.has('x')).toBeTrue();
    expect(index.has('xval')).toBeTrue();
    expect(index.has('X label')).toBeTrue();
  });

  it('first occurrence wins for duplicate keys', () => {
    const options: Option[] = [
      { id: 'a', label: 'shared', value: 'v1' },
      { id: 'b', label: 'shared', value: 'v2' },
    ];
    const index = buildOptionIndex(options);
    expect(index.get('shared')?.id).toBe('a');
  });
});

describe('resolveOptionFromInput', () => {
  const options: Option[] = [{ id: 'foo', label: 'Foo Label', value: 'foo' }];
  let index: Map<string, Option>;

  beforeEach(() => {
    index = buildOptionIndex(options);
  });

  it('returns null for null input', () => {
    expect(resolveOptionFromInput(null, index)).toBeNull();
  });

  it('returns matched option for string input', () => {
    expect(resolveOptionFromInput('foo', index)?.label).toBe('Foo Label');
  });

  it('creates synthetic option when not found in index', () => {
    const result = resolveOptionFromInput('unknown', index);
    expect(result?.id).toBe('unknown');
    expect(result?.label).toBe('unknown');
  });

  it('returns null for empty string', () => {
    expect(resolveOptionFromInput('', index)).toBeNull();
  });

  it('resolves from option-like object', () => {
    expect(resolveOptionFromInput({ id: 'foo' }, index)?.label).toBe('Foo Label');
  });
});
