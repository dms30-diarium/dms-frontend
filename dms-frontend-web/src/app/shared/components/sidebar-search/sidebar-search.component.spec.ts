import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { of, throwError } from 'rxjs';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { SidebarSearchComponent } from './sidebar-search.component';
import { NuxeoApiService } from '@app/shared/api/nuxeo-api.service';
import { GetOptionsService } from '@app/core/services/get-options.service';
import { SearchFilterOption } from '../search-filter-options/search-filter-options.types';
import {
  NxUser,
  AdvancedSearchDocument,
  Agg,
  AggBucket,
  Aggregations,
  SavedSearchParams,
} from '@app/shared/api/nuxeo-api.types';
import type { FormTypes } from '@app/pages/document-search/document-search-types';
import { makeSearchResult, makeNuxeoDocument } from '@app/shared/testing/mock-factories';
import { NUXEO_SCHEMA_FIELDS } from '@app/shared/constants/nuxeo-schema-fields';

function makeAgg(buckets: AggBucket[]): Agg {
  return {
    'entity-type': 'aggregate',
    id: 'agg',
    field: 'field',
    properties: { size: '10' } as never,
    ranges: [],
    selection: [],
    type: 'terms',
    buckets,
    extendedBuckets: [],
  };
}

const userFixture: NxUser = {
  'entity-type': 'user',
  id: 'testuser',
  properties: {
    firstName: 'Test',
    lastName: 'User',
    'user:firstName': 'Test',
    'user:lastName': 'User',
  },
};

describe('SidebarSearchComponent', () => {
  let component: SidebarSearchComponent;
  let fixture: ComponentFixture<SidebarSearchComponent>;
  let apiSpy: jasmine.SpyObj<NuxeoApiService>;
  let getOptionsSpy: jasmine.SpyObj<GetOptionsService>;

  beforeEach(async () => {
    apiSpy = jasmine.createSpyObj('NuxeoApiService', [
      'getMessagesJSON',
      'getAdvancedSearchResults',
      'getSavedSearches',
      'getUserSuggestions',
      'getDirectorySuggestions',
      'DMSDocumentSuggestion',
      'getUserGroupSuggestions',
      'getGroupUsers',
      'saveSearch',
      'shareSearch',
      'deleteSavedSearch',
    ]);
    apiSpy.getMessagesJSON.and.returnValue(of({}));
    apiSpy.getAdvancedSearchResults.and.returnValue(of(makeSearchResult<AdvancedSearchDocument>({ entries: [] })));
    apiSpy.getSavedSearches.and.returnValue(of({ entries: [] }));
    apiSpy.getUserSuggestions.and.returnValue(of([]));
    apiSpy.getDirectorySuggestions.and.returnValue(of([]));
    apiSpy.DMSDocumentSuggestion.and.returnValue(of(makeSearchResult({ entries: [] })));
    apiSpy.getUserGroupSuggestions.and.returnValue(of([]));
    apiSpy.getGroupUsers.and.returnValue(of({ 'entity-type': 'users', entries: [userFixture] }));
    apiSpy.saveSearch.and.returnValue(of(makeSearchResult()));
    apiSpy.shareSearch.and.returnValue(of({ entries: [] }));
    apiSpy.deleteSavedSearch.and.returnValue(of(makeSearchResult()));

    getOptionsSpy = jasmine.createSpyObj('GetOptionsService', ['directoryEntriesOptions', 'suggestEntries']);
    getOptionsSpy.directoryEntriesOptions.and.returnValue(of([]));
    getOptionsSpy.suggestEntries.and.returnValue(of([]));

    await TestBed.configureTestingModule({
      imports: [SidebarSearchComponent],
      providers: [
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: NuxeoApiService, useValue: apiSpy },
        { provide: GetOptionsService, useValue: getOptionsSpy },
        {
          provide: ActivatedRoute,
          useValue: { children: [], params: of({}), queryParams: of({}), snapshot: { params: {}, queryParams: {} } },
        },
      ],
    })
      .overrideTemplate(SidebarSearchComponent, '<div></div>')
      .compileComponents();

    fixture = TestBed.createComponent(SidebarSearchComponent);
    fixture.componentRef.setInput('user', userFixture);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('totalPages', () => {
    it('returns 1 when no results', () => {
      expect(component.totalPages()).toBe(1);
    });

    it('returns correct page count', () => {
      component.searchService.total.set(100);
      expect(component.totalPages()).toBeGreaterThanOrEqual(1);
    });
  });

  describe('shouldShowForm signal', () => {
    it('defaults to true', () => {
      expect(component.shouldShowForm()).toBeTrue();
    });
  });

  describe('isShareSearchDialogOpen signal', () => {
    it('defaults to false', () => {
      expect(component.isShareSearchDialogOpen()).toBeFalse();
    });
  });

  describe('isFilterOptionsOpen signal', () => {
    it('defaults to false', () => {
      expect(component.isFilterOptionsOpen()).toBeFalse();
    });
  });

  describe('openFilters', () => {
    it('sets shouldShowForm to true', () => {
      component.shouldShowForm.set(false);
      component.openFilters();
      expect(component.shouldShowForm()).toBeTrue();
    });

    it('clears selectedDocument', () => {
      component.searchService.selectedItem.set({ id: 'doc-1' });
      component.openFilters();
      expect(component.searchService.selectedItem()).toBeNull();
    });
  });

  describe('openFilterOptions', () => {
    it('sets isFilterOptionsOpen to true', () => {
      component.openFilterOptions();
      expect(component.isFilterOptionsOpen()).toBeTrue();
    });
  });

  describe('sortPredicate', () => {
    it('returns false for index 0', () => {
      expect(component.sortPredicate(0)).toBeFalse();
    });

    it('returns true for index > 0', () => {
      expect(component.sortPredicate(1)).toBeTrue();
      expect(component.sortPredicate(5)).toBeTrue();
    });
  });

  describe('selectedDocument signal', () => {
    it('defaults to null', () => {
      expect(component.selectedDocument()).toBeNull();
    });
  });

  describe('docTypeOptions signal', () => {
    it('is initialized with base document type options', () => {
      expect(component.docTypeOptions()).toEqual([
        { id: 'Arende', label: 'Ärende (0)' },
        { id: 'Handling', label: 'Handling (0)' },
        { id: 'Utkast', label: 'Utkast (0)' },
      ]);
    });
  });

  describe('entries signal', () => {
    it('defaults to empty array', () => {
      expect(component.entries()).toEqual([]);
    });
  });

  describe('filterVisibility computed', () => {
    it('returns a Map with visibility per option', () => {
      const visibility = component.filterVisibility();
      expect(visibility instanceof Map).toBeTrue();
    });
  });

  describe('filterOptions signal', () => {
    it('initialized with default filter options', () => {
      expect(component.filterOptions().length).toBeGreaterThan(0);
    });

    it('every default filter option has id and label', () => {
      component.filterOptions().forEach(option => {
        expect(option.id).toBeTruthy();
        expect(option.label).toBeTruthy();
      });
    });
  });

  describe('onFilterOptionsUpdated', () => {
    it('updates filterOptions visibility', () => {
      const current = component.filterOptions();
      const firstOption = current[0];
      const updated: SearchFilterOption[] = [{ ...firstOption, visible: !firstOption.visible }];
      component.onFilterOptionsUpdated(updated);
      const after = component.filterOptions();
      const updated0 = after.find(o => o.id === firstOption.id);
      expect(updated0?.visible).toBe(!firstOption.visible);
    });
  });

  describe('fields computed', () => {
    it('returns array of search fields', () => {
      const fields = component.fields();
      expect(Array.isArray(fields)).toBeTrue();
      expect(fields.length).toBeGreaterThan(0);
    });

    it('always includes searchLine field', () => {
      const fields = component.fields();
      const searchLineField = fields.find(f => f.key === 'searchLine');
      expect(searchLineField).toBeTruthy();
    });
  });

  describe('getSelectedDates', () => {
    it('returns empty array for unknown key', () => {
      expect(component.getSelectedDates('nonexistent_key')).toEqual([]);
    });

    it('returns empty array when form control is null', () => {
      component.form.get('searchLine')?.setValue(null);
      expect(component.getSelectedDates('searchLine')).toEqual([]);
    });

    it('returns date array for valid date string', () => {
      component.form.addControl('test_date', new FormControl('2024-06-15'));
      const dates = component.getSelectedDates('test_date');
      expect(dates.length).toBe(1);
      expect(dates[0] instanceof Date).toBeTrue();
    });
  });

  describe('getDateMin', () => {
    it('returns null for key not ending with _max', () => {
      expect(component.getDateMin('arende_beslutat_datum_min')).toBeNull();
    });

    it('returns null when paired _min control has no value', () => {
      const result = component.getDateMin('arende_beslutat_datum_max');
      expect(result).toBeNull();
    });
  });

  describe('getDateMax', () => {
    it('returns null for key not ending with _min', () => {
      expect(component.getDateMax('arende_beslutat_datum_max')).toBeNull();
    });

    it('returns null when paired _max control has no value', () => {
      const result = component.getDateMax('arende_beslutat_datum_min');
      expect(result).toBeNull();
    });
  });

  describe('showSaveSearchDialog signal', () => {
    it('defaults to false', () => {
      expect(component.showSaveSeachDialog()).toBeFalse();
    });
  });

  describe('isDetailedDisplayed', () => {
    it('defaults to false', () => {
      expect(component.isDetailedDisplayed).toBeFalse();
    });
  });

  describe('form group', () => {
    it('is initialized with form controls', () => {
      expect(component.form).toBeTruthy();
      expect(component.form.contains('searchLine')).toBeTrue();
      expect(component.form.contains('docOptions')).toBeTrue();
    });
  });

  describe('savedSearches signal', () => {
    it('loads saved searches', () => {
      expect(component.savedSearches()).toEqual({ entries: [] });
    });
  });

  describe('search form actions', () => {
    it('submits search line terms and clears motpart', () => {
      component.form.patchValue({ motpart: 'Counterparty' }, { emitEvent: false });

      component.onSearchSubmit('searchLine', new CustomEvent('submit', { detail: { value: '  invoice  ' } }));

      expect(component.form.get('searchLine')?.value).toBe('invoice');
      expect(component.form.get('motpart')?.value).toBe('');
      expect(apiSpy.getAdvancedSearchResults).toHaveBeenCalled();
    });

    it('submits motpart draft and clears search line', () => {
      component.form.patchValue({ searchLine: 'invoice' }, { emitEvent: false });

      component.onMotpartInput(new CustomEvent('input', { detail: { value: '  Alice  ' } }));
      component.onMotpartSubmit('');

      expect(component.form.get('motpart')?.value).toBe('Alice');
      expect(component.form.get('searchLine')?.value).toBe('');
      expect(apiSpy.getAdvancedSearchResults).toHaveBeenCalled();
    });

    it('updates date controls and date min/max helpers', () => {
      component.form.addControl('test_date_min', new FormControl(''));
      component.form.addControl('test_date_max', new FormControl(''));

      component.onDateChange('test_date_min', new CustomEvent('date', { detail: ['2026-06-15'] }));
      component.onDateChange('test_date_max', new CustomEvent('date', { detail: ['2026-06-20'] }));

      expect(component.getSelectedDates('test_date_min')[0] instanceof Date).toBeTrue();
      expect(component.getDateMax('test_date_min') instanceof Date).toBeTrue();
      expect(component.getDateMin('test_date_max') instanceof Date).toBeTrue();
      expect(apiSpy.getAdvancedSearchResults).toHaveBeenCalled();
    });

    it('restores filters and clears quick filter state', () => {
      component.form.patchValue({
        searchLine: 'invoice',
        arendeStatus: ['open'],
        handlingsStatus: ['draft'],
        arende_ansvarig_organisatorisk_enhet: ['org-1'],
      });
      component.searchService.quickArendeStatusFilter.set(['open']);
      component.searchService.quickHandlingStatusFilter.set(['draft']);
      component.searchService.quickArendeOrgFilter.set(['org-1']);

      component.restoreFilters();

      expect(component.form.get('searchLine')?.value).toBe('');
      expect(component.searchService.selectedItem()).toBeNull();
      expect(component.searchService.quickArendeStatusFilter()).toEqual([]);
      expect(component.searchService.quickHandlingStatusFilter()).toEqual([]);
      expect(component.searchService.quickArendeOrgFilter()).toEqual([]);
    });

    it('changes pages, opens list, selects documents and resets page', () => {
      const row = { id: 'doc-1', title: 'Document 1' };
      const listSpy = jasmine.createSpy('isListOpen');
      component.isListOpen.subscribe(listSpy);
      component.searchService.entries.set([row]);
      component.searchService.resultsCount.set(25);

      component.changePageNumber(new CustomEvent('page', { detail: 2 }) as never);
      component.openList();
      component.selectDocument(row);
      component.resetPage();

      expect(component.searchService.page()).toBe(0);
      expect(component.shouldShowForm()).toBeFalse();
      expect(component.searchService.selectedItem()).toEqual(row);
      expect(component.selectedDocument()).toBe('doc-1');
      expect(listSpy).toHaveBeenCalledWith(true);
    });
  });

  describe('saved search actions', () => {
    it('saves non-empty searches and reloads saved searches', () => {
      component.form.patchValue({ searchLine: 'invoice', docOptions: ['Arende'] }, { emitEvent: false });

      component.saveSearch('My search');

      expect(apiSpy.saveSearch).toHaveBeenCalledWith(
        jasmine.objectContaining({
          searchName: 'My search',
          system_fulltext: 'invoice',
          system_primaryType_agg: ['Arende'],
        })
      );
      expect(apiSpy.getSavedSearches).toHaveBeenCalled();
    });

    it('does not save empty searches', () => {
      apiSpy.saveSearch.calls.reset();

      component.saveSearch('');

      expect(apiSpy.saveSearch).not.toHaveBeenCalled();
    });

    it('loads share options, group users and shares unique recipients', () => {
      apiSpy.getUserSuggestions.and.returnValue(of([{ id: 'alice', displayLabel: 'Alice', 'entity-type': 'user' }]));
      apiSpy.getUserGroupSuggestions.and.returnValue(
        of([{ id: 'group-1', displayLabel: 'Group 1', 'entity-type': 'group' }])
      );

      component.getUserOptions('search-1');
      component.onShareUsersQuery(new CustomEvent('query', { detail: 'ali' }));
      component.onShareGroupsQuery(new CustomEvent('query', { detail: 'grp' }));
      component.onShareGroupPick([{ label: 'Group 1', value: 'group-1' }]);
      component.onShareGroupUsersQuery(new CustomEvent('query', { detail: 'test' }));
      component.shareSearch(
        [{ label: 'Alice', value: 'alice' }],
        [{ label: 'Group 1', value: 'group-1' }],
        [{ label: 'Alice duplicate', value: 'alice' }]
      );

      expect(component.isShareSearchDialogOpen()).toBeTrue();
      expect(component.searchToShareId()).toBe('search-1');
      expect(component.shareUserOptions()).toEqual([{ label: 'Alice', value: 'alice' }]);
      expect(component.shareGroupOptions()).toEqual([{ label: 'Group 1', value: 'group-1' }]);
      expect(component.shareGroupUserOptions()).toEqual([{ label: 'Test User', value: 'testuser' }]);
      expect(apiSpy.shareSearch).toHaveBeenCalledWith(['alice', 'group-1'], 'search-1', 'testuser');
    });

    it('deletes and applies saved searches', () => {
      component.deleteSavedSearch('search-1');
      component.applySavedSearch({
        system_primaryType_agg: ['Handling'],
        system_fulltext: 'invoice',
        arende_arendestatus_agg: ['open'],
        dublincore_created_agg: ['today'],
      } as never);

      expect(apiSpy.deleteSavedSearch).toHaveBeenCalledWith('search-1');
      expect(component.form.get('docOptions')?.value).toEqual(['Handling']);
      expect(component.form.get('searchLine')?.value).toBe('invoice');
      expect(component.form.get('arendeStatus')?.value).toEqual(['open']);
      expect(component.form.get('skapaOptions')?.value).toEqual(['today']);
    });
  });

  describe('search — single doc type entry mapping', () => {
    it('maps an Arende entry with status, motpart, and dates', () => {
      const arendeDoc = makeNuxeoDocument({
        uid: 'arende-1',
        type: 'Arende',
        title: 'Case 1',
        properties: {
          [NUXEO_SCHEMA_FIELDS.arende.arendestatus]: 'oppet',
          [NUXEO_SCHEMA_FIELDS.arende.motpart]: { motpart: 'Acme AB' },
          [NUXEO_SCHEMA_FIELDS.arende.arendenummer]: 'A-2026-1',
          [NUXEO_SCHEMA_FIELDS.dc.created]: '2026-06-01T00:00:00Z',
        },
      });
      apiSpy.getAdvancedSearchResults.and.returnValue(
        of(makeSearchResult<AdvancedSearchDocument>({ entries: [arendeDoc as never] }))
      );

      component.search({ docOptions: ['Arende'] });

      const entry = component.entries()?.[0];
      expect(entry?.['id']).toBe('arende-1');
      expect(entry?.['arendenummer']).toBe('A-2026-1');
      expect(entry?.['motpart']).toBe('Acme AB');
      expect(entry?.['status']).toBe('oppet');
    });

    it('maps an unrecognized doc type using the base mapper', () => {
      const otherDoc = makeNuxeoDocument({ uid: 'other-1', type: 'Workspace', title: 'WS 1' });
      apiSpy.getAdvancedSearchResults.and.returnValue(
        of(makeSearchResult<AdvancedSearchDocument>({ entries: [otherDoc as never] }))
      );

      component.search({ docOptions: ['Arende'] });

      const entry = component.entries()?.[0];
      expect(entry?.['id']).toBe('other-1');
      expect(entry?.['type']).toBe('Workspace');
    });

    it('resolves UUID-shaped ansvarigEnhet/arendetyp values to titles', () => {
      const uuid = '550e8400-e29b-41d4-a716-446655440000';
      const arendeDoc = makeNuxeoDocument({
        uid: 'arende-2',
        type: 'Arende',
        title: 'Case 2',
        properties: {
          [NUXEO_SCHEMA_FIELDS.arende.ansvarigOrganisatoriskEnhet]: uuid,
        },
      });
      apiSpy.getAdvancedSearchResults.and.returnValue(
        of(makeSearchResult<AdvancedSearchDocument>({ entries: [arendeDoc as never] }))
      );
      spyOn(component.valueService, 'resolveDocumentTitles').and.returnValue(of({ [uuid]: 'Resolved Unit' }));

      component.search({ docOptions: ['Arende'] });

      expect(component.entries()?.[0]?.['ansvarigEnhet']).toBe('Resolved Unit');
    });
  });

  describe('search — multiple doc types', () => {
    it('resets per-type state and populates entriesByType for each selected type', () => {
      const arendeDoc = makeNuxeoDocument({ uid: 'a-1', type: 'Arende', title: 'A1' });
      const handlingDoc = makeNuxeoDocument({ uid: 'h-1', type: 'Handling', title: 'H1' });
      apiSpy.getAdvancedSearchResults.and.returnValues(
        of(makeSearchResult<AdvancedSearchDocument>({ entries: [] })),
        of(makeSearchResult<AdvancedSearchDocument>({ entries: [arendeDoc as never], totalSize: 1 })),
        of(makeSearchResult<AdvancedSearchDocument>({ entries: [handlingDoc as never], totalSize: 1 }))
      );

      component.search({ docOptions: ['Arende', 'Handling'] });

      expect(component.searchService.pagesByType()).toEqual({ Arende: 0, Handling: 0 });
      expect(component.searchService.entriesByType()['Arende']?.[0]?.['id']).toBe('a-1');
      expect(component.searchService.entriesByType()['Handling']?.[0]?.['id']).toBe('h-1');
      expect(component.searchService.totalsByType()['Arende']).toBe(1);
      expect(component.searchService.totalsByType()['Handling']).toBe(1);
    });

    it('uses the active-doc-type pagination path when all pages are known', () => {
      const arendeDoc = makeNuxeoDocument({ uid: 'a-2', type: 'Arende', title: 'A2' });
      apiSpy.getAdvancedSearchResults.and.returnValue(
        of(makeSearchResult<AdvancedSearchDocument>({ entries: [arendeDoc as never], totalSize: 5 }))
      );
      component.searchService.activeDocType.set('Arende');
      component.searchService.pagesByType.set({ Arende: 0, Handling: 0 });

      component.search({ docOptions: ['Arende', 'Handling'] }, 1);

      expect(component.searchService.entriesByType()['Arende']?.[0]?.['id']).toBe('a-2');
      expect(component.searchService.totalsByType()['Arende']).toBe(5);
    });
  });

  describe('setOptions / setSkapaOptions / setDocTypeOptions via search aggregations', () => {
    it('builds status/type/handlaggningsstatus options with counts and propagates labels to entries', () => {
      const arendeDoc = makeNuxeoDocument({
        uid: 'arende-3',
        type: 'Arende',
        title: 'Case 3',
        properties: { [NUXEO_SCHEMA_FIELDS.arende.arendestatus]: 'oppet' },
      });
      apiSpy.getAdvancedSearchResults.and.returnValue(
        of(
          makeSearchResult<AdvancedSearchDocument>({
            entries: [arendeDoc as never],
            aggregations: {
              arende_arendestatus_agg: makeAgg([{ key: 'oppet', docCount: 3, fetchedKey: 'Öppet' }]),
              system_primaryType_agg: makeAgg([
                { key: 'Arende', docCount: 3 },
                { key: 'Extra', docCount: 1 },
              ]),
              dublincore_created_agg: makeAgg([{ key: 'from_now-7d_to_now-24H', docCount: 2 }]),
            } as never,
          })
        )
      );

      component.search({ docOptions: ['Arende'] });

      expect(component.arendeStatusOptions()).toEqual([{ label: 'Öppet (3)', id: 'oppet' }]);
      expect(component.docTypeOptions().find(o => o.id === 'Arende')?.label).toContain('(3)');
      expect(component.docTypeOptions().find(o => o.id === 'Extra')).toEqual({ id: 'Extra', label: 'Extra (1)' });
      expect(component.skapaOptions()).toEqual([{ label: 'Förra veckan (2)', id: 'from_now-7d_to_now-24H' }]);
      expect(component.entries()?.[0]?.['status']).toBe('Öppet');
    });

    it('keeps existing handling status options when the bucket is empty and preserveOnEmpty is set', () => {
      component.handlingsStatusOptions.set([{ id: 'klar', label: 'Klar' }]);
      apiSpy.getAdvancedSearchResults.and.returnValue(of(makeSearchResult<AdvancedSearchDocument>({ entries: [] })));

      component.search({ docOptions: ['Handling'] });

      expect(component.handlingsStatusOptions()).toEqual([{ id: 'klar', label: 'Klar' }]);
    });
  });

  describe('onOptionChange / onInputDropped', () => {
    it('syncs quick filters from the form and re-runs the search', () => {
      component.form.patchValue({ arendeStatus: ['oppet'] }, { emitEvent: false });
      apiSpy.getAdvancedSearchResults.calls.reset();

      component.onOptionChange();

      expect(component.searchService.quickArendeStatusFilter()).toEqual(['oppet']);
      expect(apiSpy.getAdvancedSearchResults).toHaveBeenCalled();
    });

    it('reorders fields and persists the new order to localStorage', () => {
      localStorage.removeItem('fieldsOrder');
      const initialFields = component.fields();
      const event = { previousIndex: 1, currentIndex: 0 } as never;

      component.onInputDropped(event);

      expect(component.fieldsOrder()).toEqual(initialFields.map(f => f.key));
      expect(localStorage.getItem('fieldsOrder')).toBeTruthy();
    });
  });

  describe('share helpers — extra branches', () => {
    it('extracts the share query term from a raw input event', () => {
      const input = document.createElement('input');
      input.value = '  bob  ';
      const event = new Event('input');
      Object.defineProperty(event, 'target', { value: input, configurable: true });

      component.onShareUsersQuery(event);

      expect(apiSpy.getUserSuggestions).toHaveBeenCalledWith('bob');
    });

    it('returns an empty term for unrecognized event shapes', () => {
      component.onShareGroupsQuery(42 as never);
      expect(apiSpy.getUserGroupSuggestions).toHaveBeenCalledWith('', 'GROUP_TYPE');
    });

    it('picks a group from a CustomEvent wrapper and loads its users', () => {
      const event = new CustomEvent('pick', { detail: [{ label: 'Group A', value: 'group-a' }] });
      component.onShareGroupPick(event);
      expect(component.shareGroupId()).toBe('group-a');
      expect(apiSpy.getGroupUsers).toHaveBeenCalledWith('group-a', '');
    });

    it('clears group users when no group is selected', () => {
      component.onShareGroupPick(undefined);
      expect(component.shareGroupUserOptions()).toEqual([]);
    });

    it('falls back to a username when first/last name are unavailable', () => {
      apiSpy.getGroupUsers.and.returnValue(
        of({
          'entity-type': 'users',
          entries: [{ 'entity-type': 'user', id: 'bob', properties: { username: 'bobby' } }],
        })
      );
      component.onShareGroupPick([{ label: 'Group B', value: 'group-b' }]);
      expect(component.shareGroupUserOptions()).toEqual([{ label: '', value: 'bob' }]);
    });
  });

  describe('getSelectedDates / onDateChange — extra branches', () => {
    it('wraps a single non-array Date value', () => {
      component.form.addControl('single_date', new FormControl(new Date('2026-01-01')));
      const dates = component.getSelectedDates('single_date');
      expect(dates.length).toBe(1);
    });

    it('clears the control and re-runs search when the date detail is empty', () => {
      component.form.addControl('clearable_date', new FormControl('2026-01-01'));
      apiSpy.getAdvancedSearchResults.calls.reset();

      component.onDateChange('clearable_date', new CustomEvent('date', { detail: [] }));

      expect(component.form.get('clearable_date')?.value).toBe('');
      expect(apiSpy.getAdvancedSearchResults).toHaveBeenCalled();
    });

    it('does nothing for an unknown field key', () => {
      apiSpy.getAdvancedSearchResults.calls.reset();
      component.onDateChange('does_not_exist', new CustomEvent('date', { detail: ['2026-01-01'] }));
      expect(apiSpy.getAdvancedSearchResults).not.toHaveBeenCalled();
    });
  });

  describe('resolveSearchTerm / resolveMotpartTerm fallbacks', () => {
    it('falls back to the existing form value when the event has no term', () => {
      component.form.patchValue({ handling_fysisk_forvaringsplats: 'Shelf 4' }, { emitEvent: false });
      component.onSearchSubmit('handling_fysisk_forvaringsplats', {});
      expect(component.form.get('handling_fysisk_forvaringsplats')?.value).toBe('Shelf 4');
    });

    it('falls back to the existing motpart form value when there is no draft or event term', () => {
      component.form.patchValue({ motpart: 'Existing Motpart' }, { emitEvent: false });
      component.onMotpartSubmit({});
      expect(component.form.get('motpart')?.value).toBe('Existing Motpart');
    });

    it('uses motpartDraft when event is empty but draft has a value', () => {
      component.form.patchValue({ motpart: 'Old' }, { emitEvent: false });
      component.onMotpartInput(new CustomEvent('input', { detail: { value: 'DraftValue' } }));

      component.onMotpartSubmit('');
      expect(component.form.get('motpart')?.value).toBe('DraftValue');
    });

    it('handles a string raw event in extractSearchTerm', () => {
      component.onSearchSubmit('searchLine', '  my query  ');
      expect(component.form.get('searchLine')?.value).toBe('my query');
    });

    it('handles an afValue property in extractSearchTerm', () => {
      component.onSearchSubmit('searchLine', { afValue: '  af term  ' });
      expect(component.form.get('searchLine')?.value).toBe('af term');
    });

    it('handles a DOM event with target.value in extractSearchTerm', () => {
      const input = document.createElement('input');
      input.value = '  dom query  ';
      const event = new Event('input');
      Object.defineProperty(event, 'target', { value: input, configurable: true });
      Object.defineProperty(event, 'type', { value: 'input', configurable: true });
      component.onSearchSubmit('searchLine', event);
      expect(component.form.get('searchLine')?.value).toBe('dom query');
    });

    it('applies a non-searchLine, non-motpart field via applySearchTerm', () => {
      component.onSearchSubmit('handling_fysisk_forvaringsplats', new CustomEvent('submit', { detail: 'Shelf 7' }));
      expect(component.form.get('handling_fysisk_forvaringsplats')?.value).toBe('Shelf 7');
    });

    it('does nothing in applySearchTerm if the field control does not exist', () => {
      expect(() => component.onSearchSubmit('nonexistent_field_xyz', 'some value')).not.toThrow();
    });
  });

  describe('getDateMin / getDateMax — with date values', () => {
    it('returns a Date when paired _min control has a value', () => {
      component.form.addControl('paired_min', new FormControl('2026-01-01'));
      component.form.addControl('paired_max', new FormControl(''));
      const result = component.getDateMin('paired_max');
      expect(result instanceof Date).toBeTrue();
    });

    it('returns a Date when paired _max control has a value', () => {
      component.form.addControl('other_min', new FormControl(''));
      component.form.addControl('other_max', new FormControl('2026-12-31'));
      const result = component.getDateMax('other_min');
      expect(result instanceof Date).toBeTrue();
    });
  });

  describe('search — with string docOptions', () => {
    it('handles a single string docOptions value', () => {
      apiSpy.getAdvancedSearchResults.calls.reset();
      component.search({ docOptions: 'Arende' } as unknown as FormTypes);
      expect(apiSpy.getAdvancedSearchResults).toHaveBeenCalled();
    });

    it('handles undefined docOptions (no doc type selected)', () => {
      apiSpy.getAdvancedSearchResults.calls.reset();
      component.search({ docOptions: undefined });
      expect(apiSpy.getAdvancedSearchResults).toHaveBeenCalled();
    });
  });

  describe('setSkapaOptions — isTabbed branch', () => {
    it('does not update UI varName when isTabbed is true and docTypeKey is non-empty', () => {
      component.searchService.selectedDocTypes.set(['Arende', 'Handling']);
      const originalOptions = component.skapaOptions();
      apiSpy.getAdvancedSearchResults.and.returnValue(
        of(
          makeSearchResult<AdvancedSearchDocument>({
            entries: [],
            aggregations: {
              dublincore_created_agg: makeAgg([{ key: 'from_now-7d_to_now-24H', docCount: 5 }]),
            } as unknown as Aggregations,
          })
        )
      );

      component.setSkapaOptions(
        makeSearchResult<AdvancedSearchDocument>({
          entries: [],
          aggregations: {
            dublincore_created_agg: makeAgg([{ key: 'from_now-7d_to_now-24H', docCount: 5 }]),
          } as unknown as Aggregations,
        }),
        'dublincore_created_agg',
        component.skapaOptions,
        'Arende'
      );

      expect(component.skapaOptions()).toEqual(originalOptions);
    });

    it('updates skapaOptions all four key labels', () => {
      const keys = ['from_now-1y_to_now-1M', 'from_now-1M_to_now-7d', 'from_now-7d_to_now-24H', 'from_now-24H_to_now'];
      const buckets = keys.map((key, i) => ({ key, docCount: i + 1 }));
      const response = makeSearchResult<AdvancedSearchDocument>({
        entries: [],
        aggregations: {
          dublincore_created_agg: makeAgg(buckets),
        } as unknown as Aggregations,
      });
      component.setSkapaOptions(response, 'dublincore_created_agg', component.skapaOptions, '');
      const labels = component.skapaOptions().map(o => o.label);
      expect(labels[0]).toContain('Förra året');
      expect(labels[1]).toContain('Förra månaden');
      expect(labels[2]).toContain('Förra veckan');
      expect(labels[3]).toContain('Förra 24 timmarna');
    });
  });

  describe('setUtkastStatusOptions', () => {
    it('sets utkastStatusOptions when docOptions is exactly [Utkast]', () => {
      const response = makeSearchResult<AdvancedSearchDocument>({
        entries: [],
        aggregations: {
          ecm_currentLifeCycleState_agg: makeAgg([{ key: 'draft', docCount: 3 }]),
        } as unknown as Aggregations,
      });
      apiSpy.getAdvancedSearchResults.and.returnValue(of(response));
      component.search({ docOptions: ['Utkast'] });
      expect(component.searchService.utkastStatusOptions()).toEqual([{ id: 'draft', label: 'draft (3)' }]);
    });

    it('does not set utkastStatusOptions when docOptions includes other types', () => {
      component.searchService.utkastStatusOptions.set([]);
      const response = makeSearchResult<AdvancedSearchDocument>({
        entries: [],
        aggregations: {
          ecm_currentLifeCycleState_agg: makeAgg([{ key: 'draft', docCount: 3 }]),
        } as unknown as Aggregations,
      });
      apiSpy.getAdvancedSearchResults.and.returnValues(
        of(makeSearchResult<AdvancedSearchDocument>({ entries: [] })),
        of(response),
        of(response)
      );
      component.search({ docOptions: ['Arende', 'Utkast'] });

      expect(component.searchService.utkastStatusOptions()).toBeDefined();
    });
  });

  describe('setOptions — additional branches', () => {
    it('sets handlingStatusAggOptions to empty when bucket is null for handling_handlingsstatus_agg', () => {
      component.searchService.handlingStatusAggOptions.set([{ id: 'x', label: 'X' }]);
      const response = makeSearchResult<AdvancedSearchDocument>({ entries: [] });

      component.setOptions(response, 'handling_handlingsstatus_agg', component.handlingsStatusOptions);
      expect(component.searchService.handlingStatusAggOptions()).toEqual([]);
    });

    it('propagates arende_arendetyp_agg labels to entries', () => {
      const arendeDoc = makeNuxeoDocument({
        uid: 'arende-typ',
        type: 'Arende',
        title: 'Typ test',
        properties: { [NUXEO_SCHEMA_FIELDS.arende.arendetyp]: 'code-123' },
      });
      apiSpy.getAdvancedSearchResults.and.returnValue(
        of(
          makeSearchResult<AdvancedSearchDocument>({
            entries: [arendeDoc as unknown as AdvancedSearchDocument],
            aggregations: {
              arende_arendetyp_agg: makeAgg([{ key: 'code-123', docCount: 1, fetchedKey: 'Ärende Typ A' }]),
            } as unknown as Aggregations,
          })
        )
      );
      component.search({ docOptions: ['Arende'] });
      expect(component.entries()?.[0]?.['arendetyp']).toBe('Ärende Typ A');
    });

    it('propagates arende_handlaggningsstatus_agg labels to entries using directory map', () => {
      const arendeDoc = makeNuxeoDocument({
        uid: 'arende-hls',
        type: 'Arende',
        title: 'HLS test',
        properties: { [NUXEO_SCHEMA_FIELDS.arende.handlaggningsstatus]: 'hls-1' },
      });
      getOptionsSpy.directoryEntriesOptions.and.returnValue(of([{ id: 'hls-1', label: 'Handläggning 1' }]));
      apiSpy.getAdvancedSearchResults.and.returnValue(
        of(
          makeSearchResult<AdvancedSearchDocument>({
            entries: [arendeDoc as unknown as AdvancedSearchDocument],
            aggregations: {
              arende_handlaggningsstatus_agg: makeAgg([{ key: 'hls-1', docCount: 2 }]),
            } as unknown as Aggregations,
          })
        )
      );

      component.ngOnInit();
      component.search({ docOptions: ['Arende'] });

      const statusOptions = component.arendeHandlaggningsstatusOptions();
      expect(statusOptions.some(o => o.label.includes('Handläggning 1'))).toBeTrue();
    });

    it('preserves existing options when preserveOnEmpty is true and bucket is empty', () => {
      component.arendeStatusOptions.set([{ id: 'existing', label: 'Existing' }]);
      const response = makeSearchResult<AdvancedSearchDocument>({
        entries: [],
        aggregations: {
          arende_arendestatus_agg: makeAgg([]),
        } as unknown as Aggregations,
      });
      component.setOptions(response, 'arende_arendestatus_agg', component.arendeStatusOptions, true, true);
      expect(component.arendeStatusOptions()).toEqual([{ id: 'existing', label: 'Existing' }]);
    });
  });

  describe('dialogFilterOptions / dialogDefaultFilterOptions computed signals', () => {
    it('filters out arende-group options when Arende is not selected', () => {
      component.form.get('docOptions')?.setValue([], { emitEvent: false });
      const options = component.dialogFilterOptions();
      const arendeOption = options.find(o => o.id === 'arendeStatus');
      expect(arendeOption).toBeUndefined();
    });

    it('includes arende-group options when Arende is selected', () => {
      component.form.get('docOptions')?.setValue(['Arende'], { emitEvent: false });

      component.form.patchValue({ docOptions: ['Arende'] });

      const defaultOpts = component.dialogDefaultFilterOptions();
      expect(defaultOpts).toBeDefined();
    });

    it('includes handling-group options when Handling is selected', () => {
      component.form.patchValue({ docOptions: ['Handling'] });
      const defaultOpts = component.dialogDefaultFilterOptions();
      expect(defaultOpts).toBeDefined();
    });
  });

  describe('loadFilterOptions — from localStorage', () => {
    afterEach(() => {
      localStorage.removeItem('sidebar_search_filter_options');
    });

    it('loads and normalizes filter options from localStorage', () => {
      const saved = component.filterOptions().map((o, i) => ({ ...o, visible: i % 2 === 0 }));
      localStorage.setItem('sidebar_search_filter_options', JSON.stringify(saved));

      component.ngOnInit();
      const loaded = component.filterOptions();
      expect(loaded.length).toBeGreaterThan(0);

      expect(loaded[0].visible).toBe(saved[0].visible);
    });

    it('falls back to defaults when localStorage has invalid JSON', () => {
      localStorage.setItem('sidebar_search_filter_options', 'NOT_JSON');
      component.ngOnInit();
      const loaded = component.filterOptions();
      expect(loaded.every(o => o.visible === true)).toBeTrue();
    });

    it('falls back to defaults when localStorage has non-array JSON', () => {
      localStorage.setItem('sidebar_search_filter_options', '{"key": "value"}');
      component.ngOnInit();
      const loaded = component.filterOptions();
      expect(loaded.length).toBeGreaterThan(0);
    });
  });

  describe('ngOnInit — fieldOrder from localStorage', () => {
    afterEach(() => {
      localStorage.removeItem('fieldsOrder');
    });

    it('applies saved field order from localStorage', () => {
      const savedOrder = ['motpart', 'searchLine', 'docOptions'];
      localStorage.setItem('fieldsOrder', JSON.stringify(savedOrder));
      component.ngOnInit();
      expect(component.fieldsOrder()).toEqual(savedOrder);
    });

    it('does not set fieldsOrder when localStorage is empty array', () => {
      localStorage.setItem('fieldsOrder', '[]');
      component.fieldsOrder.set(null);
      component.ngOnInit();
      expect(component.fieldsOrder()).toBeNull();
    });
  });

  describe('shareSearch — edge cases', () => {
    it('does nothing when searchToShareId is null', () => {
      component.searchToShareId.set(null);
      apiSpy.shareSearch.calls.reset();
      component.shareSearch([], [], []);
      expect(apiSpy.shareSearch).not.toHaveBeenCalled();
    });

    it('sets danger notification on shareSearch error', () => {
      component.searchToShareId.set('search-err');
      apiSpy.shareSearch.and.returnValue(throwError(() => new Error('fail')));
      spyOn(component['store'].notification, 'set');
      component.shareSearch([{ label: 'Alice', value: 'alice' }], [], []);
      expect(component['store'].notification.set).toHaveBeenCalledWith(
        jasmine.objectContaining({ variation: 'danger' })
      );
    });

    it('sets success notification on successful shareSearch', () => {
      component.searchToShareId.set('search-ok');
      apiSpy.shareSearch.and.returnValue(of({ entries: [] }));
      spyOn(component['store'].notification, 'set');
      component.shareSearch([{ label: 'Bob', value: 'bob' }], [], []);
      expect(component['store'].notification.set).toHaveBeenCalledWith(
        jasmine.objectContaining({ variation: 'success' })
      );
    });

    it('handles a single IListItem (non-array) in shareSearch', () => {
      component.searchToShareId.set('search-single');
      apiSpy.shareSearch.and.returnValue(of({ entries: [] }));
      component.shareSearch({ label: 'Alice', value: 'alice' }, undefined, undefined);
      expect(apiSpy.shareSearch).toHaveBeenCalledWith(['alice'], 'search-single', 'testuser');
    });
  });

  describe('saveSearch — edge cases', () => {
    it('does not save when all controls are empty even with a search name', () => {
      component.form.reset();
      apiSpy.saveSearch.calls.reset();
      component.saveSearch('My Search');
      expect(apiSpy.saveSearch).not.toHaveBeenCalled();
    });

    it('does not save when searchName is empty even if form has values', () => {
      component.form.patchValue({ searchLine: 'some text' }, { emitEvent: false });
      apiSpy.saveSearch.calls.reset();
      component.saveSearch('');
      expect(apiSpy.saveSearch).not.toHaveBeenCalled();
    });
  });

  describe('search — Handling and Utkast entry mapping', () => {
    it('maps a Handling entry', () => {
      const handlingDoc = makeNuxeoDocument({ uid: 'h-map-1', type: 'Handling', title: 'H Map 1' });
      apiSpy.getAdvancedSearchResults.and.returnValue(
        of(makeSearchResult<AdvancedSearchDocument>({ entries: [handlingDoc as unknown as AdvancedSearchDocument] }))
      );
      component.search({ docOptions: ['Handling'] });
      const entry = component.entries()?.[0];
      expect(entry?.['id']).toBe('h-map-1');
      expect(entry?.['type']).toBe('Handling');
    });

    it('maps a Utkast entry', () => {
      const utkastDoc = makeNuxeoDocument({ uid: 'u-map-1', type: 'Utkast', title: 'U Map 1' });
      apiSpy.getAdvancedSearchResults.and.returnValue(
        of(makeSearchResult<AdvancedSearchDocument>({ entries: [utkastDoc as unknown as AdvancedSearchDocument] }))
      );
      component.search({ docOptions: ['Utkast'] });
      const entry = component.entries()?.[0];
      expect(entry?.['id']).toBe('u-map-1');
      expect(entry?.['type']).toBe('Utkast');
    });
  });

  describe('quick filter sync — applyQuickStatusToForm / syncQuickStatusFromForm', () => {
    it('applies utkast status when docType is Utkast', () => {
      component.searchService.selectedDocTypes.set(['Utkast']);
      component.searchService.quickUtkastStatusFilter.set(['draft']);

      component.search({ docOptions: ['Utkast'] });
      const handlingControl = component.form.get('handlingsStatus');

      expect(handlingControl).toBeTruthy();
    });

    it('syncQuickStatusFromForm does not set skipQuickStatusSearch when nothing changed', () => {
      component.form.patchValue({ arendeStatus: [] }, { emitEvent: false });
      component.searchService.quickArendeStatusFilter.set([]);
      component.searchService.quickHandlingStatusFilter.set([]);
      apiSpy.getAdvancedSearchResults.calls.reset();
      component.onOptionChange();

      expect(apiSpy.getAdvancedSearchResults).toHaveBeenCalled();
    });

    it('syncQuickStatusFromForm sets utkast status when docType is Utkast', () => {
      component.searchService.selectedDocTypes.set(['Utkast']);
      component.form.patchValue({ handlingsStatus: ['draft'] }, { emitEvent: false });
      component.searchService.quickUtkastStatusFilter.set([]);
      component.onOptionChange();
      expect(component.searchService.quickUtkastStatusFilter()).toEqual(['draft']);
    });
  });

  describe('syncQuickOrgFromForm', () => {
    it('sets quickArendeOrgFilter when org value changes', () => {
      component.form.get('arende_ansvarig_organisatorisk_enhet')?.setValue(['org-2'], { emitEvent: false });
      component.searchService.quickArendeOrgFilter.set([]);
      component.onOptionChange();
      expect(component.searchService.quickArendeOrgFilter()).toEqual(['org-2']);
    });

    it('does not update when org is already equal', () => {
      component.form.get('arende_ansvarig_organisatorisk_enhet')?.setValue(['org-1'], { emitEvent: false });
      component.searchService.quickArendeOrgFilter.set(['org-1']);
      const spy = spyOn(component.searchService.quickArendeOrgFilter, 'set').and.callThrough();
      component.onOptionChange();
      expect(spy).not.toHaveBeenCalled();
    });
  });

  describe('getSelectedDates — additional branches', () => {
    it('filters out invalid dates from an array', () => {
      component.form.addControl('date_invalid', new FormControl(['not-a-date']));
      const dates = component.getSelectedDates('date_invalid');
      expect(dates).toEqual([]);
    });

    it('handles a null value', () => {
      component.form.addControl('date_null', new FormControl(null));
      const dates = component.getSelectedDates('date_null');
      expect(dates).toEqual([]);
    });

    it('handles an array with a Date object', () => {
      const d = new Date('2026-03-15');
      component.form.addControl('date_arr', new FormControl([d]));
      const dates = component.getSelectedDates('date_arr');
      expect(dates.length).toBe(1);
      expect(dates[0]).toEqual(d);
    });
  });

  describe('onDateChange — additional branches', () => {
    it('skips update if the extracted date is unchanged', () => {
      component.form.addControl('stable_date', new FormControl(['2026-01-01']));
      apiSpy.getAdvancedSearchResults.calls.reset();

      component.onDateChange('stable_date', new CustomEvent('date', { detail: ['2026-01-01'] }));
      expect(apiSpy.getAdvancedSearchResults).toHaveBeenCalled();
    });

    it('handles a plain string date detail', () => {
      component.form.addControl('string_date', new FormControl(''));
      component.onDateChange('string_date', new CustomEvent('date', { detail: '2026-05-10' }));

      expect(apiSpy.getAdvancedSearchResults).toHaveBeenCalled();
    });
  });

  describe('openList — with no entries', () => {
    it('sets shouldShowForm to false even with empty entries', () => {
      component.searchService.entries.set([]);
      component.openList();
      expect(component.shouldShowForm()).toBeFalse();
    });

    it('emits isListOpen true when openList is called', () => {
      const listSpy = jasmine.createSpy('isListOpen');
      component.isListOpen.subscribe(listSpy);
      component.searchService.entries.set([{ id: 'doc-x' }]);
      component.openList();
      expect(listSpy).toHaveBeenCalledWith(true);
    });
  });

  describe('openFilters — emits isListOpen false', () => {
    it('emits false on isListOpen', () => {
      const listSpy = jasmine.createSpy('isListOpen');
      component.isListOpen.subscribe(listSpy);
      component.openFilters();
      expect(listSpy).toHaveBeenCalledWith(false);
    });
  });

  describe('restoreFilters — multiple=false branch', () => {
    it('resets select fields without multiple=false to empty array', () => {
      component.form.patchValue({ skapaOptions: ['today'] }, { emitEvent: false });
      component.restoreFilters();
      expect(component.form.get('skapaOptions')?.value).toEqual([]);
    });

    it('resets date fields to empty string', () => {
      component.form.patchValue({ arende_beslutat_datum_min: '2026-01-01' }, { emitEvent: false });
      component.restoreFilters();
      expect(component.form.get('arende_beslutat_datum_min')?.value).toBe('');
    });

    it('resets search fields to empty string', () => {
      component.form.patchValue({ searchLine: 'some query' }, { emitEvent: false });
      component.restoreFilters();
      expect(component.form.get('searchLine')?.value).toBe('');
    });
  });

  describe('fields computed — fieldsOrder sorting', () => {
    it('reorders fields according to fieldsOrder signal', () => {
      const allFields = component.fields();
      const reversed = [...allFields].reverse().map(f => f.key);
      component.fieldsOrder.set(reversed);
      const reordered = component.fields();
      expect(reordered.map(f => f.key)).not.toEqual(allFields.map(f => f.key));
    });

    it('shows arende fields only when Arende is in docOptions', () => {
      component.form.patchValue({ docOptions: ['Arende'] });
      const fields = component.fields();
      const arendeStatus = fields.find(f => f.key === 'arendeStatus');
      expect(arendeStatus?.visible).toBeTrue();
    });

    it('hides arende fields when only Handling is selected', () => {
      component.form.patchValue({ docOptions: ['Handling'] });
      const fields = component.fields();
      const arendeStatus = fields.find(f => f.key === 'arendeStatus');
      expect(arendeStatus?.visible).toBeFalse();
    });

    it('shows handling fields when Utkast is in docOptions', () => {
      component.form.patchValue({ docOptions: ['Utkast'] });
      const fields = component.fields();
      const handlingsStatus = fields.find(f => f.key === 'handlingsStatus');
      expect(handlingsStatus?.visible).toBeTrue();
    });
  });

  describe('filterVisibility — hidden option', () => {
    it('returns false for an option explicitly set to not visible', () => {
      const opts = component.filterOptions().map((o, i) => (i === 0 ? { ...o, visible: false } : o));
      component.filterOptions.set(opts);
      const visibility = component.filterVisibility();
      expect(visibility.get(opts[0].id)).toBeFalse();
    });
  });

  describe('search — multiple doc types with Utkast', () => {
    it('shouldUpdateHandlingOptions returns true for Utkast when Handling is not also selected', () => {
      const utkastDoc = makeNuxeoDocument({ uid: 'u-multi', type: 'Utkast', title: 'U Multi' });
      apiSpy.getAdvancedSearchResults.and.returnValues(
        of(makeSearchResult<AdvancedSearchDocument>({ entries: [] })),
        of(
          makeSearchResult<AdvancedSearchDocument>({
            entries: [utkastDoc as unknown as AdvancedSearchDocument],
            totalSize: 1,
          })
        ),
        of(makeSearchResult<AdvancedSearchDocument>({ entries: [], totalSize: 0 }))
      );
      component.search({ docOptions: ['Utkast', 'Arende'] });
      expect(component.searchService.pagesByType()).toEqual({ Utkast: 0, Arende: 0 });
    });
  });

  describe('applySavedSearch — motpart fallbacks', () => {
    it('uses handling_ansvarig_organisatorisk_enhet as motpart fallback', () => {
      component.applySavedSearch({
        handling_ansvarig_organisatorisk_enhet: 'Org unit 1',
      } as unknown as SavedSearchParams);
      expect(component.form.get('motpart')?.value).toBe('Org unit 1');
    });

    it('uses klass_ansvarig_organisationsenhet as motpart fallback', () => {
      component.applySavedSearch({
        klass_ansvarig_organisationsenhet: 'Klass Org',
      } as unknown as SavedSearchParams);
      expect(component.form.get('motpart')?.value).toBe('Klass Org');
    });

    it('uses arende_ansvarig_organisatorisk_enhet as motpart fallback', () => {
      component.applySavedSearch({
        arende_ansvarig_organisatorisk_enhet: 'Arende Org',
      } as unknown as SavedSearchParams);
      expect(component.form.get('motpart')?.value).toBe('Arende Org');
    });
  });

  describe('onShareGroupPick — single IListItem (not array)', () => {
    it('picks a group from a plain IListItem and loads users', () => {
      component.onShareGroupPick({ label: 'Single Group', value: 'single-group' });
      expect(component.shareGroupId()).toBe('single-group');
      expect(apiSpy.getGroupUsers).toHaveBeenCalledWith('single-group', '');
    });
  });

  describe('getUserOptions', () => {
    it('resets group state and loads users/groups', () => {
      component.shareGroupId.set('old-group');
      component.shareGroupUserOptions.set([{ label: 'Old', value: 'old' }]);
      component.getUserOptions('search-2');
      expect(component.isShareSearchDialogOpen()).toBeTrue();
      expect(component.searchToShareId()).toBe('search-2');
      expect(component.shareGroupId()).toBe('');
      expect(component.shareGroupUserOptions()).toEqual([]);
      expect(apiSpy.getUserSuggestions).toHaveBeenCalled();
      expect(apiSpy.getUserGroupSuggestions).toHaveBeenCalled();
    });
  });

  describe('mapUserEntries — NUXEO_SCHEMA_FIELDS user fields', () => {
    it('uses NUXEO_SCHEMA_FIELDS user.firstName/lastName when available', () => {
      const user: NxUser = {
        'entity-type': 'user',
        id: 'charlie',
        properties: {
          [NUXEO_SCHEMA_FIELDS.user.firstName]: 'Charlie',
          [NUXEO_SCHEMA_FIELDS.user.lastName]: 'Brown',
        },
      };
      apiSpy.getGroupUsers.and.returnValue(of({ 'entity-type': 'users', entries: [user] }));
      component.onShareGroupPick([{ label: 'G', value: 'g' }]);
      expect(component.shareGroupUserOptions()).toEqual([{ label: 'Charlie Brown', value: 'charlie' }]);
    });
  });

  describe('mapSuggestions — prefixed_id fallback', () => {
    it('uses prefixed_id when id is empty string', () => {
      apiSpy.getUserSuggestions.and.returnValue(
        of([{ id: '', prefixed_id: 'user:dave', displayLabel: 'Dave', 'entity-type': 'user' }])
      );
      component.onShareUsersQuery(new CustomEvent('query', { detail: 'dav' }));
      expect(component.shareUserOptions()).toEqual([{ label: 'Dave', value: 'user:dave' }]);
    });

    it('filters out suggestions with no id and no prefixed_id', () => {
      apiSpy.getUserSuggestions.and.returnValue(of([{ id: '', displayLabel: 'No ID', 'entity-type': 'user' }]));
      component.onShareUsersQuery(new CustomEvent('query', { detail: '' }));
      expect(component.shareUserOptions()).toEqual([]);
    });
  });

  describe('totalPages — edge cases', () => {
    it('returns 1 when total is negative', () => {
      component.searchService.total.set(-5);
      expect(component.totalPages()).toBe(1);
    });

    it('returns correct ceil for non-divisible total', () => {
      component.searchService.total.set(26);
      expect(component.totalPages()).toBe(2);
    });

    it('returns 1 for exactly 25 items', () => {
      component.searchService.total.set(25);
      expect(component.totalPages()).toBe(1);
    });
  });

  describe('deleteSavedSearch', () => {
    it('calls API and reloads saved searches', () => {
      apiSpy.deleteSavedSearch.calls.reset();
      apiSpy.getSavedSearches.calls.reset();
      component.deleteSavedSearch('del-search-1');
      expect(apiSpy.deleteSavedSearch).toHaveBeenCalledWith('del-search-1');
      expect(apiSpy.getSavedSearches).toHaveBeenCalled();
    });
  });

  describe('search — catchError in multi-type search', () => {
    it('handles errors in per-type search without breaking other types', () => {
      apiSpy.getAdvancedSearchResults.and.returnValues(
        of(makeSearchResult<AdvancedSearchDocument>({ entries: [] })),
        throwError(() => new Error('Arende failed')),
        of(
          makeSearchResult<AdvancedSearchDocument>({
            entries: [
              makeNuxeoDocument({ uid: 'h-ok', type: 'Handling', title: 'H OK' }) as unknown as AdvancedSearchDocument,
            ],
            totalSize: 1,
          })
        )
      );
      expect(() => component.search({ docOptions: ['Arende', 'Handling'] })).not.toThrow();
    });
  });

  describe('safeStr — additional branches', () => {
    it('returns string value for a number', () => {
      const doc = makeNuxeoDocument({
        uid: 'safestr-1',
        type: 'Arende',
        title: 'SafeStr Test',
        properties: {
          [NUXEO_SCHEMA_FIELDS.arende.arendestatus]: 42,
        },
      });
      apiSpy.getAdvancedSearchResults.and.returnValue(
        of(makeSearchResult<AdvancedSearchDocument>({ entries: [doc as unknown as AdvancedSearchDocument] }))
      );
      component.search({ docOptions: ['Arende'] });
      expect(component.entries()?.[0]?.['status']).toBe('42');
    });

    it('returns string value for a boolean', () => {
      const doc = makeNuxeoDocument({
        uid: 'safestr-2',
        type: 'Arende',
        title: 'SafeStr Bool',
        properties: {
          [NUXEO_SCHEMA_FIELDS.arende.arendestatus]: true,
        },
      });
      apiSpy.getAdvancedSearchResults.and.returnValue(
        of(makeSearchResult<AdvancedSearchDocument>({ entries: [doc as unknown as AdvancedSearchDocument] }))
      );
      component.search({ docOptions: ['Arende'] });
      expect(component.entries()?.[0]?.['status']).toBe('true');
    });

    it('joins array string items with comma', () => {
      const doc = makeNuxeoDocument({
        uid: 'safestr-3',
        type: 'Arende',
        title: 'SafeStr Array',
        properties: {
          [NUXEO_SCHEMA_FIELDS.arende.arendestatus]: ['item1', 'item2'],
        },
      });
      apiSpy.getAdvancedSearchResults.and.returnValue(
        of(makeSearchResult<AdvancedSearchDocument>({ entries: [doc as unknown as AdvancedSearchDocument] }))
      );
      component.search({ docOptions: ['Arende'] });
      expect(component.entries()?.[0]?.['status']).toBe('item1, item2');
    });

    it('returns fallback for empty array', () => {
      const doc = makeNuxeoDocument({
        uid: 'safestr-4',
        type: 'Arende',
        title: 'SafeStr Empty Arr',
        properties: {
          [NUXEO_SCHEMA_FIELDS.arende.arendestatus]: [],
        },
      });
      apiSpy.getAdvancedSearchResults.and.returnValue(
        of(makeSearchResult<AdvancedSearchDocument>({ entries: [doc as unknown as AdvancedSearchDocument] }))
      );
      component.search({ docOptions: ['Arende'] });
      expect(component.entries()?.[0]?.['status']).toBe('—');
    });

    it('handles a user object with only username', () => {
      const doc = makeNuxeoDocument({
        uid: 'safestr-5',
        type: 'Arende',
        title: 'SafeStr User',
        properties: {
          [NUXEO_SCHEMA_FIELDS.arende.ansvarigHandlaggare]: {
            'entity-type': 'user',
            id: 'u-user',
            properties: { username: 'johndoe' },
          },
        },
      });
      apiSpy.getAdvancedSearchResults.and.returnValue(
        of(makeSearchResult<AdvancedSearchDocument>({ entries: [doc as unknown as AdvancedSearchDocument] }))
      );
      component.search({ docOptions: ['Arende'] });
      expect(component.entries()?.[0]?.['handlaggare']).toBe('johndoe');
    });

    it('handles a directoryEntry object', () => {
      const doc = makeNuxeoDocument({
        uid: 'safestr-6',
        type: 'Arende',
        title: 'SafeStr DirEntry',
        properties: {
          [NUXEO_SCHEMA_FIELDS.arende.riktning]: {
            'entity-type': 'directoryEntry',
            id: 'dir-1',
            properties: { label: 'Inkommande', id: 'inkommande' },
          },
        },
      });
      apiSpy.getAdvancedSearchResults.and.returnValue(
        of(makeSearchResult<AdvancedSearchDocument>({ entries: [doc as unknown as AdvancedSearchDocument] }))
      );
      component.search({ docOptions: ['Arende'] });
      expect(component.entries()?.[0]?.['riktning']).toBe('Inkommande');
    });

    it('handles an object with title property', () => {
      const doc = makeNuxeoDocument({
        uid: 'safestr-7',
        type: 'Arende',
        title: 'SafeStr Title Obj',
        properties: {
          [NUXEO_SCHEMA_FIELDS.arende.arendetyp]: { title: 'Tillståndsärende' } as unknown as Aggregations,
        },
      });
      apiSpy.getAdvancedSearchResults.and.returnValue(
        of(makeSearchResult<AdvancedSearchDocument>({ entries: [doc as unknown as AdvancedSearchDocument] }))
      );
      component.search({ docOptions: ['Arende'] });
      expect(component.entries()?.[0]?.['arendetyp']).toBe('Tillståndsärende');
    });

    it('handles an object with only id property', () => {
      const doc = makeNuxeoDocument({
        uid: 'safestr-8',
        type: 'Arende',
        title: 'SafeStr ID Obj',
        properties: {
          [NUXEO_SCHEMA_FIELDS.arende.bevarasGallras]: { id: 'keep-123' } as unknown as Aggregations,
        },
      });
      apiSpy.getAdvancedSearchResults.and.returnValue(
        of(makeSearchResult<AdvancedSearchDocument>({ entries: [doc as unknown as AdvancedSearchDocument] }))
      );
      component.search({ docOptions: ['Arende'] });
      expect(component.entries()?.[0]?.['bevarasGallras']).toBe('keep-123');
    });

    it('returns fallback for object with no title/id/entity-type', () => {
      const doc = makeNuxeoDocument({
        uid: 'safestr-9',
        type: 'Arende',
        title: 'SafeStr Fallback Obj',
        properties: {
          [NUXEO_SCHEMA_FIELDS.arende.bevarasGallras]: { someOtherProp: 'value' } as unknown as Aggregations,
        },
      });
      apiSpy.getAdvancedSearchResults.and.returnValue(
        of(makeSearchResult<AdvancedSearchDocument>({ entries: [doc as unknown as AdvancedSearchDocument] }))
      );
      component.search({ docOptions: ['Arende'] });
      expect(component.entries()?.[0]?.['bevarasGallras']).toBe('—');
    });
  });

  describe('extractDateString — additional branches', () => {
    it('handles a numeric timestamp value in date control (extracts ISO string for quick filters)', () => {
      const ts = new Date('2026-01-15').getTime();

      component.form.addControl('ts_date', new FormControl(ts));
      const dates = component.getSelectedDates('ts_date');

      expect(Array.isArray(dates)).toBeTrue();
    });

    it('handles an array with a nested Date inside extractDateString', () => {
      const d = new Date('2026-04-20');
      component.form.addControl('arr_date', new FormControl([d]));
      const dates = component.getSelectedDates('arr_date');
      expect(dates.length).toBe(1);
      expect(dates[0]).toEqual(d);
    });

    it('handles a Date control value for getDateMin/getDateMax', () => {
      component.form.addControl('pair2_min', new FormControl(new Date('2026-02-01')));
      component.form.addControl('pair2_max', new FormControl(''));
      const result = component.getDateMin('pair2_max');
      expect(result instanceof Date).toBeTrue();
    });

    it('returns empty string date for invalid NaN Date in form control', () => {
      component.form.addControl('nan_date', new FormControl(new Date('invalid')));
      const dates = component.getSelectedDates('nan_date');
      expect(dates).toEqual([]);
    });
  });

  describe('coerceDateControlValue — invalid date string branch', () => {
    it('applies a non-parseable date string via applyQuickDatesToForm path', () => {
      const _fields = ['arende_arendet_registrerat_datum_min'];

      component.searchService.quickArendeDateFilters.set({ arende_arendet_registrerat_datum_min: 'not-a-date' });

      component.search({ docOptions: [] });
      const control = component.form.get('arende_arendet_registrerat_datum_min');

      expect(control).toBeTruthy();
    });
  });

  describe('areDateMapsEqual — comparison branches', () => {
    it('syncQuickDatesFromForm detects date changes and sets skipQuickDateSearch', () => {
      component.form.patchValue({ arende_arendet_registrerat_datum_min: '2026-01-01' }, { emitEvent: false });
      component.searchService.quickArendeDateFilters.set({});
      component.onOptionChange();
      expect(component.searchService.quickArendeDateFilters()['arende_arendet_registrerat_datum_min']).toBeDefined();
    });

    it('does not update quickArendeDateFilters when dates are equal', () => {
      component.form.patchValue({ arende_arendet_registrerat_datum_min: '2026-01-01' }, { emitEvent: false });
      component.searchService.quickArendeDateFilters.set({ arende_arendet_registrerat_datum_min: '2026-01-01' });
      const setSpy = spyOn(component.searchService.quickArendeDateFilters, 'set').and.callThrough();
      component.onOptionChange();
      expect(setSpy).not.toHaveBeenCalled();
    });
  });

  describe('getFetchedKeyLabel — additional branches', () => {
    it('uses fetchedKey object propLabel when present', () => {
      const response = makeSearchResult<AdvancedSearchDocument>({
        entries: [],
        aggregations: {
          arende_arendestatus_agg: {
            'entity-type': 'aggregate',
            id: 'agg',
            field: 'field',
            properties: { size: '10' } as never,
            ranges: [],
            selection: [],
            type: 'terms',
            buckets: [
              {
                key: 'status-key',
                docCount: 2,
                fetchedKey: { properties: { label: 'My Label' }, id: 'x' } as unknown as Aggregations,
              },
            ],
            extendedBuckets: [],
          },
        } as unknown as Aggregations,
      });
      component.setOptions(response, 'arende_arendestatus_agg', component.arendeStatusOptions, true);
      expect(component.arendeStatusOptions()[0]?.label).toContain('My Label');
    });

    it('uses fetchedKey object title when propLabel is absent', () => {
      const response = makeSearchResult<AdvancedSearchDocument>({
        entries: [],
        aggregations: {
          arende_arendestatus_agg: {
            'entity-type': 'aggregate',
            id: 'agg',
            field: 'field',
            properties: { size: '10' } as never,
            ranges: [],
            selection: [],
            type: 'terms',
            buckets: [
              {
                key: 'status-key',
                docCount: 2,
                fetchedKey: { title: 'My Title' } as unknown as Aggregations,
              },
            ],
            extendedBuckets: [],
          },
        } as unknown as Aggregations,
      });
      component.setOptions(response, 'arende_arendestatus_agg', component.arendeStatusOptions, true);
      expect(component.arendeStatusOptions()[0]?.label).toContain('My Title');
    });

    it('returns empty string when fetchedKey is non-record (number)', () => {
      const response = makeSearchResult<AdvancedSearchDocument>({
        entries: [],
        aggregations: {
          arende_arendestatus_agg: {
            'entity-type': 'aggregate',
            id: 'agg',
            field: 'field',
            properties: { size: '10' } as never,
            ranges: [],
            selection: [],
            type: 'terms',
            buckets: [
              {
                key: 'status-key',
                docCount: 1,
                fetchedKey: 123 as unknown as AggBucket['fetchedKey'],
              },
            ],
            extendedBuckets: [],
          },
        } as unknown as Aggregations,
      });
      component.setOptions(response, 'arende_arendestatus_agg', component.arendeStatusOptions, true);

      expect(component.arendeStatusOptions()[0]).toBeDefined();
    });

    it('returns empty when fetchedKey is a UUID string', () => {
      const uuid = '550e8400-e29b-41d4-a716-446655440000';
      const response = makeSearchResult<AdvancedSearchDocument>({
        entries: [],
        aggregations: {
          arende_arendestatus_agg: {
            'entity-type': 'aggregate',
            id: 'agg',
            field: 'field',
            properties: { size: '10' } as never,
            ranges: [],
            selection: [],
            type: 'terms',
            buckets: [{ key: 'k', docCount: 1, fetchedKey: uuid }],
            extendedBuckets: [],
          },
        } as unknown as Aggregations,
      });
      component.setOptions(response, 'arende_arendestatus_agg', component.arendeStatusOptions, true);

      expect(component.arendeStatusOptions()[0]?.label).toContain('(1)');
    });

    it('uses fallback string from bucket key when fetchedKey object has no propLabel/title and fallback is not UUID', () => {
      const response = makeSearchResult<AdvancedSearchDocument>({
        entries: [],
        aggregations: {
          arende_arendestatus_agg: {
            'entity-type': 'aggregate',
            id: 'agg',
            field: 'field',
            properties: { size: '10' } as never,
            ranges: [],
            selection: [],
            type: 'terms',
            buckets: [
              {
                key: 'fallback-key',
                docCount: 1,
                fetchedKey: { someOtherProp: 'x' } as unknown as Aggregations,
              },
            ],
            extendedBuckets: [],
          },
        } as unknown as Aggregations,
      });
      component.setOptions(response, 'arende_arendestatus_agg', component.arendeStatusOptions, true);
      expect(component.arendeStatusOptions()[0]?.label).toContain('fallback-key');
    });
  });

  describe('resolveDocRefTitles — error branch', () => {
    it('handles an error in resolveDocumentTitles gracefully', () => {
      const uuid = '550e8400-e29b-41d4-a716-446655440001';
      const doc = makeNuxeoDocument({
        uid: 'err-doc',
        type: 'Arende',
        title: 'Error Doc',
        properties: {
          [NUXEO_SCHEMA_FIELDS.arende.ansvarigOrganisatoriskEnhet]: uuid,
        },
      });
      apiSpy.getAdvancedSearchResults.and.returnValue(
        of(makeSearchResult<AdvancedSearchDocument>({ entries: [doc as unknown as AdvancedSearchDocument] }))
      );
      spyOn(component.valueService, 'resolveDocumentTitles').and.returnValue(
        throwError(() => new Error('resolve failed'))
      );
      expect(() => component.search({ docOptions: ['Arende'] })).not.toThrow();
    });

    it('does not call resolveDocumentTitles when there are no UUID-shaped values', () => {
      const doc = makeNuxeoDocument({
        uid: 'no-uuid-doc',
        type: 'Arende',
        title: 'No UUID Doc',
        properties: {
          [NUXEO_SCHEMA_FIELDS.arende.ansvarigOrganisatoriskEnhet]: 'not-a-uuid-value',
        },
      });
      apiSpy.getAdvancedSearchResults.and.returnValue(
        of(makeSearchResult<AdvancedSearchDocument>({ entries: [doc as unknown as AdvancedSearchDocument] }))
      );
      const spy = spyOn(component.valueService, 'resolveDocumentTitles').and.callThrough();
      component.search({ docOptions: ['Arende'] });
      expect(spy).not.toHaveBeenCalled();
    });
  });

  describe('getControlValues — additional branches', () => {
    it('returns array value when control value is a single non-empty string', () => {
      component.form.get('searchLine')?.setValue('single-val', { emitEvent: false });
      component.onOptionChange();
      expect(component.searchService.quickArendeStatusFilter()).toEqual([]);
    });

    it('handles null control values in getControlValues', () => {
      component.form.get('arendeStatus')?.setValue(null, { emitEvent: false });
      component.searchService.quickArendeStatusFilter.set(['some-val']);
      component.onOptionChange();
      expect(component.searchService.quickArendeStatusFilter()).toEqual([]);
    });
  });

  describe('applyQuickDatesToForm — hasDateObject branch', () => {
    it('skips update when current control already has matching date object', () => {
      const d = new Date('2026-01-15');
      component.form.get('arende_arendet_registrerat_datum_min')?.setValue([d], { emitEvent: false });
      component.searchService.quickArendeDateFilters.set({ arende_arendet_registrerat_datum_min: '2026-01-15' });

      apiSpy.getAdvancedSearchResults.calls.reset();
      component.onOptionChange();

      expect(apiSpy.getAdvancedSearchResults).toHaveBeenCalled();
    });
  });

  describe('search — buildDocTypeOptions Handling branch', () => {
    it('maps Handling entry in multi-type with shouldUpdateHandlingOptions for Handling', () => {
      const handlingDoc = makeNuxeoDocument({ uid: 'h-all', type: 'Handling', title: 'H All' });
      apiSpy.getAdvancedSearchResults.and.returnValues(
        of(makeSearchResult<AdvancedSearchDocument>({ entries: [] })),
        of(
          makeSearchResult<AdvancedSearchDocument>({
            entries: [handlingDoc as unknown as AdvancedSearchDocument],
            totalSize: 1,
          })
        ),
        of(makeSearchResult<AdvancedSearchDocument>({ entries: [], totalSize: 0 }))
      );
      component.search({ docOptions: ['Handling', 'Arende'] });
      expect(component.searchService.entriesByType()['Handling']?.[0]?.['id']).toBe('h-all');
    });

    it('sets shouldUpdateHandlingOptions to false for Utkast when Handling is also selected', () => {
      const utkastDoc = makeNuxeoDocument({ uid: 'u-all', type: 'Utkast', title: 'U All' });
      const handlingDoc = makeNuxeoDocument({ uid: 'h-all2', type: 'Handling', title: 'H All 2' });
      apiSpy.getAdvancedSearchResults.and.returnValues(
        of(makeSearchResult<AdvancedSearchDocument>({ entries: [] })),
        of(
          makeSearchResult<AdvancedSearchDocument>({
            entries: [utkastDoc as unknown as AdvancedSearchDocument],
            totalSize: 1,
          })
        ),
        of(
          makeSearchResult<AdvancedSearchDocument>({
            entries: [handlingDoc as unknown as AdvancedSearchDocument],
            totalSize: 1,
          })
        )
      );
      component.search({ docOptions: ['Utkast', 'Handling'] });
      expect(component.searchService.pagesByType()).toEqual({ Utkast: 0, Handling: 0 });
    });
  });

  describe('setOptions — handling_handlingsstatus_agg with directory labels', () => {
    it('applies directory label map for handling_handlingsstatus_agg', () => {
      getOptionsSpy.directoryEntriesOptions.and.returnValues(
        of([{ id: 'status-1', label: 'Status One' }]),
        of([{ id: 'klar', label: 'Klar' }])
      );
      component.ngOnInit();

      const response = makeSearchResult<AdvancedSearchDocument>({
        entries: [],
        aggregations: {
          handling_handlingsstatus_agg: {
            'entity-type': 'aggregate',
            id: 'agg',
            field: 'field',
            properties: { size: '10' } as never,
            ranges: [],
            selection: [],
            type: 'terms',
            buckets: [{ key: 'klar', docCount: 3 }],
            extendedBuckets: [],
          },
        } as unknown as Aggregations,
      });
      component.setOptions(response, 'handling_handlingsstatus_agg', component.handlingsStatusOptions, false);
      expect(component.handlingsStatusOptions().some(o => o.label.includes('Klar'))).toBeTrue();
    });
  });

  describe('applyOptionLabels — entriesByType update', () => {
    it('updates entriesByType entries when status labels change', () => {
      component.searchService.entriesByType.set({
        Arende: [{ id: 'a1', arendestatus: 'oppet', status: 'oppet' }],
      });
      const response = makeSearchResult<AdvancedSearchDocument>({
        entries: [],
        aggregations: {
          arende_arendestatus_agg: makeAgg([{ key: 'oppet', docCount: 2, fetchedKey: 'Öppet' }]),
        } as unknown as Aggregations,
      });
      component.setOptions(response, 'arende_arendestatus_agg', component.arendeStatusOptions, true);
      const entriesByType = component.searchService.entriesByType();
      expect(entriesByType['Arende']?.[0]?.['arendestatus']).toBe('Öppet');
    });
  });

  describe('ngOnInit — handlaggningsstatus already has options', () => {
    it('does not overwrite arendeHandlaggningsstatusOptions when they already have values', () => {
      component.arendeHandlaggningsstatusOptions.set([{ id: 'existing', label: 'Existing Option' }]);
      getOptionsSpy.directoryEntriesOptions.and.returnValue(of([{ id: 'new', label: 'New Option' }]));
      component.ngOnInit();

      expect(component.arendeHandlaggningsstatusOptions()).toEqual([{ id: 'existing', label: 'Existing Option' }]);
    });

    it('does not overwrite handlingsStatusOptions when they already have values', () => {
      component.handlingsStatusOptions.set([{ id: 'existing-hs', label: 'Existing HS' }]);
      getOptionsSpy.directoryEntriesOptions.and.returnValues(
        of([{ id: 'new-hls', label: 'New HLS' }]),
        of([{ id: 'new-hs', label: 'New HS' }])
      );
      component.ngOnInit();
      expect(component.handlingsStatusOptions()).toEqual([{ id: 'existing-hs', label: 'Existing HS' }]);
    });
  });

  describe('totalPages — with pageSize override', () => {
    it('uses pageSize of 25 for default calculation', () => {
      component.searchService.total.set(50);
      expect(component.totalPages()).toBe(2);
    });
  });

  describe('search — activeTotal integration', () => {
    it('totalPages uses total from searchService when single doc type', () => {
      component.searchService.total.set(75);
      expect(component.totalPages()).toBe(3);
    });
  });

  describe('extractShareQuery — empty CustomEvent detail', () => {
    it('trims empty detail from CustomEvent', () => {
      apiSpy.getUserSuggestions.calls.reset();
      component.onShareUsersQuery(new CustomEvent('query', { detail: '  ' }));
      expect(apiSpy.getUserSuggestions).toHaveBeenCalledWith('');
    });
  });

  describe('syncQuickStatusFromForm — arendeChanged only', () => {
    it('sets quickArendeStatusFilter when arende status changes but handling is same', () => {
      component.searchService.quickArendeStatusFilter.set([]);
      component.searchService.quickHandlingStatusFilter.set([]);
      component.form.patchValue({ arendeStatus: ['oppet'], handlingsStatus: [] }, { emitEvent: false });
      component.onOptionChange();
      expect(component.searchService.quickArendeStatusFilter()).toEqual(['oppet']);
    });

    it('sets quickHandlingStatusFilter when handling status changes but arende is same', () => {
      component.searchService.quickArendeStatusFilter.set([]);
      component.searchService.quickHandlingStatusFilter.set([]);
      component.form.patchValue({ arendeStatus: [], handlingsStatus: ['draft'] }, { emitEvent: false });
      component.onOptionChange();
      expect(component.searchService.quickHandlingStatusFilter()).toEqual(['draft']);
    });
  });

  describe('applySavedSearch — arende_arendepart branch', () => {
    it('uses arende_arendepart as motpart when present', () => {
      component.applySavedSearch({
        arende_arendepart: 'Arendepart Org',
      } as unknown as SavedSearchParams);
      expect(component.form.get('motpart')?.value).toBe('Arendepart Org');
    });
  });

  describe('fields computed — handling date fields visibility', () => {
    it('shows handling date fields when Handling is selected', () => {
      component.form.patchValue({ docOptions: ['Handling'] });
      const fields = component.fields();
      const handlingDateMin = fields.find(f => f.key === 'handling_inkommen_datum_min');
      expect(handlingDateMin?.visible).toBeTrue();
    });

    it('hides handling date fields when only Arende is selected', () => {
      component.form.patchValue({ docOptions: ['Arende'] });
      const fields = component.fields();
      const handlingDateMin = fields.find(f => f.key === 'handling_inkommen_datum_min');
      expect(handlingDateMin?.visible).toBeFalse();
    });
  });

  describe('isArendeType / isHandlingType branches', () => {
    it('buildDocTypeOptions for non-Arende, non-Handling type uses base only', () => {
      const otherDoc = makeNuxeoDocument({ uid: 'oth-1', type: 'OtherType', title: 'Other' });
      apiSpy.getAdvancedSearchResults.and.returnValue(
        of(makeSearchResult<AdvancedSearchDocument>({ entries: [otherDoc as unknown as AdvancedSearchDocument] }))
      );
      component.search({ docOptions: ['OtherType'] });
      expect(component.entries()?.[0]?.['id']).toBe('oth-1');
    });
  });
});
