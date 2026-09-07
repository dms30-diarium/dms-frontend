import { signal } from '@angular/core';
import { buildChildPath, resolveSubjectIds, resolveExpiresDate, updateFormFieldOptions } from './document-form-helpers';
import { FieldConfig } from '@app/shared/components/general-form/general-form.types';

describe('buildChildPath', () => {
  it('returns / when parent is / and name is empty', () => {
    expect(buildChildPath('/', '')).toBe('/');
  });

  it('appends name to root path', () => {
    expect(buildChildPath('/', 'folder')).toBe('/folder');
  });

  it('appends name to normal path', () => {
    expect(buildChildPath('/parent', 'child')).toBe('/parent/child');
  });

  it('handles trailing slash in parent', () => {
    expect(buildChildPath('/parent/', 'child')).toBe('/parent/child');
  });

  it('returns parent when name is empty', () => {
    expect(buildChildPath('/parent', '')).toBe('/parent');
  });

  it('returns / when both parent is / and name is empty', () => {
    expect(buildChildPath('/', '')).toBe('/');
  });
});

describe('resolveSubjectIds', () => {
  it('returns empty array for non-array input', () => {
    expect(resolveSubjectIds('notarray')).toEqual([]);
    expect(resolveSubjectIds(null)).toEqual([]);
  });

  it('extracts id from option objects', () => {
    expect(resolveSubjectIds([{ id: 'abc', label: 'ABC' }])).toEqual(['abc']);
  });

  it('extracts value when id not present', () => {
    expect(resolveSubjectIds([{ value: 'val1' }])).toEqual(['val1']);
  });

  it('uses raw item when neither id nor value present', () => {
    expect(resolveSubjectIds(['raw-id'])).toEqual(['raw-id']);
  });

  it('filters out empty strings', () => {
    expect(resolveSubjectIds([{ id: '' }, { id: 'valid' }])).toEqual(['valid']);
  });
});

describe('resolveExpiresDate', () => {
  it('returns empty string for null', () => {
    expect(resolveExpiresDate(null)).toBe('');
  });

  it('returns empty string for empty array', () => {
    expect(resolveExpiresDate([])).toBe('');
  });

  it('returns ISO string for Date object', () => {
    const date = new Date(2024, 0, 15);
    const result = resolveExpiresDate(date);
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('returns first element from array', () => {
    expect(resolveExpiresDate(['2024-03-01'])).toBe('2024-03-01');
  });

  it('returns trimmed string for string input', () => {
    expect(resolveExpiresDate('  2024-03-01  ')).toBe('2024-03-01');
  });
});

describe('updateFormFieldOptions', () => {
  it('updates options for the matching field', () => {
    const fields: FieldConfig[] = [
      { name: 'nature', type: 'select', label: 'Nature', options: [] },
      { name: 'subjects', type: 'select', label: 'Subjects', options: [] },
    ] as unknown as FieldConfig[];

    const configSignal = signal(fields);
    const newOptions = [{ id: '1', label: 'Opt 1', value: '1' }];

    updateFormFieldOptions(configSignal, 'nature', newOptions);

    const updated = configSignal();
    expect(updated.find(f => f.name === 'nature')?.options).toEqual(newOptions);
    expect(updated.find(f => f.name === 'subjects')?.options).toEqual([]);
  });
});
