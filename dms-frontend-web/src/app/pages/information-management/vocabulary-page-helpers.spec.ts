import { sortAuditEntries, buildVocabStatusItems } from './vocabulary-page-helpers';
import { AuditEntry, NuxeoDocument } from '@app/shared/api/nuxeo-api.types';

describe('sortAuditEntries', () => {
  it('returns empty array for empty input', () => {
    expect(sortAuditEntries([])).toEqual([]);
  });

  it('sorts entries descending by eventDate', () => {
    const entries: AuditEntry[] = [
      { eventDate: '2024-01-01T00:00:00Z' } as AuditEntry,
      { eventDate: '2024-03-01T00:00:00Z' } as AuditEntry,
      { eventDate: '2024-02-01T00:00:00Z' } as AuditEntry,
    ];
    const sorted = sortAuditEntries(entries);
    expect(sorted[0].eventDate).toBe('2024-03-01T00:00:00Z');
    expect(sorted[2].eventDate).toBe('2024-01-01T00:00:00Z');
  });

  it('falls back to logDate when eventDate is missing', () => {
    const entries: AuditEntry[] = [
      { logDate: '2024-01-01T00:00:00Z' } as AuditEntry,
      { logDate: '2024-06-01T00:00:00Z' } as AuditEntry,
    ];
    const sorted = sortAuditEntries(entries);
    expect(sorted[0].logDate).toBe('2024-06-01T00:00:00Z');
  });

  it('does not mutate original array', () => {
    const entries: AuditEntry[] = [
      { eventDate: '2024-01-01T00:00:00Z' } as AuditEntry,
      { eventDate: '2024-03-01T00:00:00Z' } as AuditEntry,
    ];
    const original = [...entries];
    sortAuditEntries(entries);
    expect(entries[0].eventDate).toBe(original[0].eventDate);
  });
});

describe('buildVocabStatusItems', () => {
  const doc: Partial<NuxeoDocument> = {
    state: 'project',
    lastModified: '2024-06-01T00:00:00Z',
  };

  const props: Record<string, unknown> = {
    'dc:created': '2024-01-01T00:00:00Z',
    'dc:creator': { id: 'user1', properties: { firstName: 'Anna', lastName: 'Svensson' } },
    'dc:contributors': [{ id: 'user2', properties: { firstName: 'Björn', lastName: 'Karlsson' } }],
  };

  it('returns 5 items', () => {
    const items = buildVocabStatusItems(doc as NuxeoDocument, props);
    expect(items.length).toBe(5);
  });

  it('has Status as first item', () => {
    const items = buildVocabStatusItems(doc as NuxeoDocument, props);
    expect(items[0].label).toBe('Status');
    expect(items[0].value).toBe('project');
  });

  it('falls back to empty string for null document', () => {
    const items = buildVocabStatusItems(null, props);
    expect(items[0].value).toBe('');
  });

  it('includes creator full name', () => {
    const items = buildVocabStatusItems(doc as NuxeoDocument, props);
    const creator = items.find(i => i.label === 'Skapad av');
    expect(creator?.value).toContain('Anna');
  });
});
