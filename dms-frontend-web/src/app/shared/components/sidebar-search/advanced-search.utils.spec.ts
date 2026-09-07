import { buildAdvancedSearchQueryParams, AdvancedSearchQueryParams } from './advanced-search.utils';
import { FormTypes } from '@app/pages/document-search/document-search-types';

function makeForm(overrides: Partial<FormTypes> = {}): FormTypes {
  return { ...overrides };
}

describe('buildAdvancedSearchQueryParams', () => {
  describe('default values', () => {
    it('always includes offset=0', () => {
      const r: AdvancedSearchQueryParams = buildAdvancedSearchQueryParams();
      expect(r['offset']).toBe(0);
    });

    it('always includes pageSize=25', () => {
      const r: AdvancedSearchQueryParams = buildAdvancedSearchQueryParams();
      expect(r['pageSize']).toBe(25);
    });

    it('always includes additionalClause empty string', () => {
      const r: AdvancedSearchQueryParams = buildAdvancedSearchQueryParams();
      expect(r['additionalClause']).toBe('');
    });

    it('defaults currentPageIndex to 0 when page not provided', () => {
      const r: AdvancedSearchQueryParams = buildAdvancedSearchQueryParams();
      expect(r['currentPageIndex']).toBe(0);
    });

    it('sets currentPageIndex from page param', () => {
      const r: AdvancedSearchQueryParams = buildAdvancedSearchQueryParams(undefined, 3);
      expect(r['currentPageIndex']).toBe(3);
    });
  });

  describe('sort params', () => {
    it('adds sortBy when provided', () => {
      const r: AdvancedSearchQueryParams = buildAdvancedSearchQueryParams(undefined, 0, 'dc:title');
      expect(r['sortBy']).toBe('dc:title');
    });

    it('does not include sortBy when omitted', () => {
      const r: AdvancedSearchQueryParams = buildAdvancedSearchQueryParams();
      expect('sortBy' in r).toBeFalse();
    });

    it('adds sortOrder uppercased when both sortBy and sortOrder provided', () => {
      const r: AdvancedSearchQueryParams = buildAdvancedSearchQueryParams(undefined, 0, 'dc:title', 'asc');
      expect(r['sortOrder']).toBe('ASC');
    });

    it('does not add sortOrder without sortBy', () => {
      const r: AdvancedSearchQueryParams = buildAdvancedSearchQueryParams(undefined, 0, undefined, 'desc');
      expect('sortOrder' in r).toBeFalse();
    });
  });

  describe('docOptions', () => {
    it('includes system_primaryType_agg for string docOptions', () => {
      const form = { docOptions: 'Arende' } as unknown as FormTypes;
      const r: AdvancedSearchQueryParams = buildAdvancedSearchQueryParams(form);
      expect(r['system_primaryType_agg']).toBe(JSON.stringify(['Arende']));
    });

    it('includes system_primaryType_agg for array docOptions', () => {
      const r: AdvancedSearchQueryParams = buildAdvancedSearchQueryParams(
        makeForm({ docOptions: ['Arende', 'Handling'] })
      );
      expect(r['system_primaryType_agg']).toBe(JSON.stringify(['Arende', 'Handling']));
    });

    it('omits system_primaryType_agg when docOptions empty', () => {
      const r: AdvancedSearchQueryParams = buildAdvancedSearchQueryParams(makeForm());
      expect('system_primaryType_agg' in r).toBeFalse();
    });
  });

  describe('arende filters', () => {
    it('includes arende_arendestatus_agg when no docOptions filter', () => {
      const r: AdvancedSearchQueryParams = buildAdvancedSearchQueryParams(makeForm({ arendeStatus: ['Pagaende'] }));
      expect(r['arende_arendestatus_agg']).toBe(JSON.stringify(['Pagaende']));
    });

    it('includes arende_arendestatus_agg when Arende in docOptions', () => {
      const r: AdvancedSearchQueryParams = buildAdvancedSearchQueryParams(
        makeForm({ docOptions: ['Arende'], arendeStatus: ['Pagaende'] })
      );
      expect(r['arende_arendestatus_agg']).toBe(JSON.stringify(['Pagaende']));
    });

    it('excludes arende_arendestatus_agg when only Handling in docOptions', () => {
      const r: AdvancedSearchQueryParams = buildAdvancedSearchQueryParams(
        makeForm({ docOptions: ['Handling'], arendeStatus: ['Pagaende'] })
      );
      expect('arende_arendestatus_agg' in r).toBeFalse();
    });

    it('excludes arende_arendestatus_agg when only Utkast in docOptions', () => {
      const r: AdvancedSearchQueryParams = buildAdvancedSearchQueryParams(
        makeForm({ docOptions: ['Utkast'], arendeStatus: ['Pagaende'] })
      );
      expect('arende_arendestatus_agg' in r).toBeFalse();
    });

    it('includes arende_arendenummer when set', () => {
      const r: AdvancedSearchQueryParams = buildAdvancedSearchQueryParams(
        makeForm({ arende_arendenummer: 'A2024-001' })
      );
      expect(r['arende_arendenummer']).toBe('A2024-001');
    });

    it('includes arende_arendemening when set', () => {
      const r: AdvancedSearchQueryParams = buildAdvancedSearchQueryParams(
        makeForm({ arende_arendemening: 'Test mening' })
      );
      expect(r['arende_arendemening']).toBe('Test mening');
    });

    it('includes date range for arende_registrerat', () => {
      const r: AdvancedSearchQueryParams = buildAdvancedSearchQueryParams(
        makeForm({
          arende_arendet_registrerat_datum_min: '2024-01-01',
          arende_arendet_registrerat_datum_max: '2024-12-31',
        })
      );
      expect(r['arende_arendet_registrerat_datum_min']).toBe('2024-01-01');
      expect(r['arende_arendet_registrerat_datum_max']).toBe('2024-12-31');
    });

    it('includes motpart field when set', () => {
      const r: AdvancedSearchQueryParams = buildAdvancedSearchQueryParams(makeForm({ motpart: 'SomeMotpart' }));
      expect(r['arende_motpart_motpart']).toBe('SomeMotpart');
    });
  });

  describe('handling filters', () => {
    it('includes handling_handlingsstatus_agg when no docOptions', () => {
      const r: AdvancedSearchQueryParams = buildAdvancedSearchQueryParams(makeForm({ handlingsStatus: ['Inkommen'] }));
      expect(r['handling_handlingsstatus_agg']).toBe(JSON.stringify(['Inkommen']));
    });

    it('excludes handling_handlingsstatus_agg when only Utkast in docOptions', () => {
      const r: AdvancedSearchQueryParams = buildAdvancedSearchQueryParams(
        makeForm({ docOptions: ['Utkast'], handlingsStatus: ['Inkommen'] })
      );
      expect('handling_handlingsstatus_agg' in r).toBeFalse();
    });

    it('uses ecm_currentLifeCycleState_agg for Utkast only', () => {
      const r: AdvancedSearchQueryParams = buildAdvancedSearchQueryParams(
        makeForm({ docOptions: ['Utkast'], handlingsStatus: ['draft'] })
      );
      expect(r['ecm_currentLifeCycleState_agg']).toBe(JSON.stringify(['draft']));
    });

    it('includes handling_handlingsnummer when set', () => {
      const r: AdvancedSearchQueryParams = buildAdvancedSearchQueryParams(
        makeForm({ handling_handlingsnummer: 'H2024-042' })
      );
      expect(r['handling_handlingsnummer']).toBe('H2024-042');
    });

    it('includes handling date ranges', () => {
      const r: AdvancedSearchQueryParams = buildAdvancedSearchQueryParams(
        makeForm({
          handling_inkommen_datum_min: '2024-01-01',
          handling_inkommen_datum_max: '2024-06-30',
        })
      );
      expect(r['handling_inkommen_datum_min']).toBe('2024-01-01');
      expect(r['handling_inkommen_datum_max']).toBe('2024-06-30');
    });
  });

  describe('text search', () => {
    it('includes system_fulltext when searchLine provided', () => {
      const r: AdvancedSearchQueryParams = buildAdvancedSearchQueryParams(makeForm({ searchLine: 'test query' }));
      expect(r['system_fulltext']).toBe(JSON.stringify('test query'));
    });

    it('omits system_fulltext when searchLine is empty', () => {
      const r: AdvancedSearchQueryParams = buildAdvancedSearchQueryParams(makeForm({ searchLine: '' }));
      expect('system_fulltext' in r).toBeFalse();
    });
  });

  describe('skapaOptions', () => {
    it('includes dublincore_created_agg when skapaOptions provided', () => {
      const r: AdvancedSearchQueryParams = buildAdvancedSearchQueryParams(makeForm({ skapaOptions: ['lastWeek'] }));
      expect(r['dublincore_created_agg']).toBe(JSON.stringify(['lastWeek']));
    });
  });

  describe('date scalar conversions', () => {
    it('converts Date object to ISO date string', () => {
      const r: AdvancedSearchQueryParams = buildAdvancedSearchQueryParams(
        makeForm({ arende_arendet_registrerat_datum_min: new Date('2024-03-15') })
      );
      expect(r['arende_arendet_registrerat_datum_min']).toMatch(/^2024-03-1[45]$/);
    });

    it('passes through ISO date string unchanged', () => {
      const r: AdvancedSearchQueryParams = buildAdvancedSearchQueryParams(
        makeForm({ arende_arendet_registrerat_datum_min: '2024-06-01' })
      );
      expect(r['arende_arendet_registrerat_datum_min']).toBe('2024-06-01');
    });
  });
});
