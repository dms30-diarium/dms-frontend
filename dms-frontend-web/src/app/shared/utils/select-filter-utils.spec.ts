import { buildSelectFilterOptions, SelectFilterOption } from './select-filter-utils';

const sourceOptions: SelectFilterOption[] = [
  { id: '1', label: 'Alpha' },
  { id: '2', label: 'Beta' },
  { id: '3', label: 'Gamma' },
];

describe('buildSelectFilterOptions', () => {
  it('returns all options when query is empty', () => {
    const result = buildSelectFilterOptions('', sourceOptions);
    expect(result.options.length).toBe(3);
  });

  it('filters by label (case-insensitive)', () => {
    const result = buildSelectFilterOptions('alpha', sourceOptions);
    expect(result.options.length).toBe(1);
    expect(result.options[0].id).toBe('1');
  });

  it('returns empty options when no match', () => {
    const result = buildSelectFilterOptions('zzz', sourceOptions);
    expect(result.options.length).toBe(0);
  });

  it('does not add created option when allowCreate is false', () => {
    const result = buildSelectFilterOptions('NewItem', sourceOptions, { allowCreate: false });
    expect(result.createdOption).toBeUndefined();
  });

  it('adds created option when allowCreate is true and no exact match', () => {
    const result = buildSelectFilterOptions('NewItem', sourceOptions, { allowCreate: true });
    expect(result.createdOption).toBeDefined();
    expect(result.createdOption?.label).toBe('NewItem');
  });

  it('does not add created option when exact match exists', () => {
    const result = buildSelectFilterOptions('Alpha', sourceOptions, { allowCreate: true });
    expect(result.createdOption).toBeUndefined();
  });

  it('uses custom createdOptionId when provided', () => {
    const result = buildSelectFilterOptions('NewItem', sourceOptions, {
      allowCreate: true,
      createdOptionId: 'custom-id',
    });
    expect(result.createdOption?.id).toBe('custom-id');
  });
});
