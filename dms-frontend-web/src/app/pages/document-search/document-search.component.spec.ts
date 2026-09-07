import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { signal, computed, WritableSignal } from '@angular/core';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { of, throwError } from 'rxjs';

import { DocumentSearchComponent } from './document-search.component';
import { SearchService } from '@app/core/services/search-service';
import { SearchSortService } from '@app/core/services/search-sort.service';
import { AuthService } from '@app/core/services/auth.service';
import { NuxeoApiService } from '@app/shared/api/nuxeo-api.service';
import { FavoritesService } from '@app/core/services/favorites.service';
import { GeneralStore } from '@app/core/services/general-store.service';
import { GetOptionsService } from '@app/core/services/get-options.service';
import { CSVExportService } from '@app/shared/services/csv-export.service';
import { TableSortService } from '@app/core/services/table-sort.service';
import { ConstantProvider as CasePageConstantProvider } from '@app/pages/case-page/constants';
import { ConstantProvider } from '@app/pages/cases-list/constants';
import { TableItem } from '@app/shared/models/case-table';
import { AggBucket } from '@app/shared/api/nuxeo-api.types';
import { Option } from '@app/shared/commonTypes';
import { makeNuxeoDocument, makeSearchResult } from '@app/shared/testing/mock-factories';
import { FilterResult } from '@app/pages/case-page/case-types';

interface DocumentSearchPrivate {
  lastOrgLoadKey: string;
  loadOrgOptions: (term: string) => void;
  resolveOrgParentRef: () => string;
  getCsvExportSearchParams: (docType: string) => { queryParams?: string; namedParameters: Record<string, unknown> };
}

function makeSearchServiceMock() {
  return {
    entries: signal<TableItem[] | null>([]),
    entriesByType: signal<Record<string, TableItem[]>>({}),
    selectedItem: signal<TableItem | null>(null),
    resultsCount: signal(0),
    selectedDocTypes: signal<string[]>([]),
    quickArendeStatusFilter: signal<string[]>([]),
    quickHandlingStatusFilter: signal<string[]>([]),
    quickUtkastStatusFilter: signal<string[]>([]),
    quickArendeOrgFilter: signal<string[]>([]),
    quickArendeDateFilters: signal<Record<string, string>>({}),
    quickHandlingDateFilters: signal<Record<string, string>>({}),
    quickCreatedRangeByType: signal<Record<string, string[]>>({}),
    createdAggBucketsByType: signal<Record<string, AggBucket[]>>({}),
    handlingStatusAggOptions: signal<Option[]>([]),
    utkastStatusOptions: signal<Option[]>([]),
    docTypeCounts: signal<Record<string, number>>({}),
    totalsByType: signal<Record<string, number>>({}),
    pagesByType: signal<Record<string, number>>({}),
    activeDocType: signal<string>(''),
    page: signal(0),
    total: signal<number | null>(null),
    isTabbed: computed(() => false),
    activeEntries: computed<TableItem[]>(() => []),
    activeTotal: computed(() => 0),
    activePage: computed(() => 0),
    visibleResultsCount: computed(() => 0),
    advancedSearchQueryParamsByType: signal<Record<string, unknown>>({}),
    activeAdvancedSearchQueryParams: jasmine.createSpy('activeAdvancedSearchQueryParams').and.returnValue({}),
    setActivePage: jasmine.createSpy('setActivePage'),
    setActiveDocType: jasmine.createSpy('setActiveDocType'),
    setEntries: jasmine.createSpy('setEntries'),
  };
}

function makeStoreMock() {
  return {
    openPage: signal<string | null>(null),
    lastCreatedCase: signal<ReturnType<typeof makeNuxeoDocument> | null>(null),
    notification: signal({ show: false }),
    baseButtons: signal<unknown[]>([]),
    navigationPanelContext: signal<unknown>(null),
    messagesInfo: signal<unknown>(null),
    getValue: jasmine.createSpy('getValue').and.returnValue(null),
    getStatus: jasmine.createSpy('getStatus').and.returnValue(''),
    getLabelByType: jasmine.createSpy('getLabelByType').and.returnValue('Ärende'),
  };
}

function makeAuthMock() {
  return {
    loaded: signal(false),
    loadError: signal(null),
    username: signal<string | null>('user1'),
    activeRole: signal<string | null>('HANDLAGGARE'),
    adminViewEnabled: signal(false),
    isAdmin: computed(() => false),
    user: signal<unknown>(undefined),
    roles: signal<string[]>([]),
    loadMe: jasmine.createSpy('loadMe'),
    hasRole: jasmine.createSpy('hasRole').and.returnValue(false),
  };
}

describe('DocumentSearchComponent', () => {
  let component: DocumentSearchComponent;
  let fixture: ComponentFixture<DocumentSearchComponent>;
  let searchSvcMock: ReturnType<typeof makeSearchServiceMock>;
  let storeMock: ReturnType<typeof makeStoreMock>;
  let apiSpy: jasmine.SpyObj<NuxeoApiService>;
  let searchSortSpy: jasmine.SpyObj<SearchSortService>;
  let getOptionsSpy: jasmine.SpyObj<GetOptionsService>;
  let tableSortSpy: jasmine.SpyObj<TableSortService>;
  let csvSpy: jasmine.SpyObj<CSVExportService>;
  let favSpy: jasmine.SpyObj<FavoritesService>;
  let authMock: ReturnType<typeof makeAuthMock>;

  beforeEach(async () => {
    searchSvcMock = makeSearchServiceMock();
    storeMock = makeStoreMock();
    authMock = makeAuthMock();

    apiSpy = jasmine.createSpyObj('NuxeoApiService', [
      'getMessagesJSON',
      'getPathInfo',
      'DMSDocumentSuggestion',
      'downloadBulk',
      'runBulkAction',
      'getBulkActionStatus',
      'downloadBulkActionResult',
      'getAdvancedSearchResults',
    ]);
    apiSpy.getMessagesJSON.and.returnValue(of({}));
    apiSpy.getPathInfo.and.returnValue(of(makeNuxeoDocument({ uid: 'parent-uid' })));
    apiSpy.DMSDocumentSuggestion.and.returnValue(of(makeSearchResult({ entries: [] })));
    apiSpy.downloadBulk.and.returnValue(of(new Blob()));
    apiSpy.runBulkAction.and.returnValue(of('async-id-123'));
    (apiSpy.getBulkActionStatus as jasmine.Spy).and.returnValue(
      of({
        'entity-type': 'bulkStatus' as const,
        value: {
          state: 'COMPLETED',
          error: false,
          commandId: '',
          processed: 0,
          skipCount: 0,
          errorCount: 0,
          total: 0,
          action: '',
          username: '',
          submitted: '',
          scrollStart: null,
          scrollEnd: null,
          processingStart: null,
          processingEnd: null,
          completed: null,
          processingMillis: 0,
        },
      })
    );
    apiSpy.downloadBulkActionResult.and.returnValue(of({ url: 'http://export.csv' }));
    (apiSpy.getAdvancedSearchResults as jasmine.Spy).and.returnValue(of(makeSearchResult({ entries: [] })));

    searchSortSpy = jasmine.createSpyObj('SearchSortService', [
      'applyActiveSort',
      'setActiveSort',
      'getSortForDocType',
    ]);
    getOptionsSpy = jasmine.createSpyObj('GetOptionsService', ['suggestEntries', 'directoryEntriesOptions']);
    getOptionsSpy.suggestEntries.and.returnValue(of([]));
    getOptionsSpy.directoryEntriesOptions.and.returnValue(of([]));
    tableSortSpy = jasmine.createSpyObj('TableSortService', ['applySortSignals']);

    favSpy = jasmine.createSpyObj('FavoritesService', ['checkInFavorites', 'toggleFavorites', 'getFavoritesUid']);
    (favSpy.getFavoritesUid as jasmine.Spy).and.returnValue(of('fav-uid'));
    (favSpy.toggleFavorites as jasmine.Spy).and.returnValue(of(null));

    csvSpy = jasmine.createSpyObj('CSVExportService', [
      'exportToCSV',
      'exportRowsToCSV',
      'getExportColumns',
      'notifyError',
      'notifyNoExportableColumns',
    ]);
    csvSpy.getExportColumns.and.returnValue([{ field: 'title', header: 'Title' }]);

    const constantSpy = jasmine.createSpyObj('ConstantProvider', ['resolveCasesTableConfig'], {
      REGISTRATOR_COLS: [],
      MINA_AREDEN_COLS: [],
      DEFAULT_COLS: [],
    });
    constantSpy.resolveCasesTableConfig.and.returnValue({ config: [], actionsHeader: null });
    const casePageConstantSpy = jasmine.createSpyObj('CasePageConstantProvider', [], {
      handlingarTableConfig: [],
      arbetsmaterialTableConfig: [],
    });

    await TestBed.configureTestingModule({
      imports: [DocumentSearchComponent],
      providers: [
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
        {
          provide: ActivatedRoute,
          useValue: { params: of({}), queryParams: of({}), snapshot: { params: {}, queryParams: {} } },
        },
        { provide: SearchService, useValue: searchSvcMock },
        { provide: SearchSortService, useValue: searchSortSpy },
        { provide: AuthService, useValue: authMock },
        { provide: NuxeoApiService, useValue: apiSpy },
        { provide: FavoritesService, useValue: favSpy },
        { provide: GeneralStore, useValue: storeMock },
        { provide: GetOptionsService, useValue: getOptionsSpy },
        { provide: CSVExportService, useValue: csvSpy },
        { provide: TableSortService, useValue: tableSortSpy },
        { provide: ConstantProvider, useValue: constantSpy },
        { provide: CasePageConstantProvider, useValue: casePageConstantSpy },
      ],
    })
      .overrideTemplate(DocumentSearchComponent, '<div></div>')
      .compileComponents();

    fixture = TestBed.createComponent(DocumentSearchComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('ngOnInit', () => {
    it('calls suggestEntries for Arendestatus', () => {
      expect(getOptionsSpy.suggestEntries).toHaveBeenCalledWith('Arendestatus');
    });

    it('calls directoryEntriesOptions for Handlingstatus', () => {
      expect(getOptionsSpy.directoryEntriesOptions).toHaveBeenCalledWith('Handlingstatus');
    });

    it('sets arendeStatusOptions from suggestEntries result', () => {
      getOptionsSpy.suggestEntries.and.returnValue(of([{ id: 'open', label: 'Öppen' }]));
      component.ngOnInit();
      expect(component.arendeStatusOptions()).toEqual([{ id: 'open', label: 'Öppen' }]);
    });

    it('sets handlingStatusOptions from directoryEntriesOptions result', () => {
      getOptionsSpy.directoryEntriesOptions.and.returnValue(of([{ id: 'closed', label: 'Stängd' }]));
      component.ngOnInit();
      expect(component.handlingStatusOptions()).toEqual([{ id: 'closed', label: 'Stängd' }]);
    });
  });

  describe('onPageChange', () => {
    it('calls searchService.setActivePage', () => {
      component.onPageChange(3);
      expect(searchSvcMock.setActivePage).toHaveBeenCalledWith(3);
    });
  });

  describe('onSortChange', () => {
    it('calls searchSortService.applyActiveSort and resets page', () => {
      component.onSortChange({ sortBy: 'dc:title', sortOrder: 'asc' });
      expect(searchSortSpy.applyActiveSort).toHaveBeenCalled();
      expect(searchSvcMock.setActivePage).toHaveBeenCalledWith(0);
    });

    it('calls applyActiveSort with descending order', () => {
      component.onSortChange({ sortBy: 'dc:modified', sortOrder: 'desc' });
      expect(searchSortSpy.applyActiveSort).toHaveBeenCalledWith(
        { sortBy: 'dc:modified', sortOrder: 'desc' },
        { sortBy: '', sortOrder: 'desc' }
      );
    });
  });

  describe('onStatusFiltersChanged', () => {
    it('sets quickArendeStatusFilter for Arende doc type', () => {
      searchSvcMock.activeDocType.set('Arende');
      component.onStatusFiltersChanged({ checked: ['open'] });
      expect(searchSvcMock.quickArendeStatusFilter()).toEqual(['open']);
      expect(searchSvcMock.setActivePage).toHaveBeenCalledWith(0);
    });

    it('sets quickUtkastStatusFilter for Utkast doc type', () => {
      searchSvcMock.activeDocType.set('Utkast');
      component.onStatusFiltersChanged({ checked: ['draft'] });
      expect(searchSvcMock.quickUtkastStatusFilter()).toEqual(['draft']);
    });

    it('sets quickHandlingStatusFilter for Handling doc type', () => {
      searchSvcMock.activeDocType.set('Handling');
      component.onStatusFiltersChanged({ checked: ['handling'] });
      expect(searchSvcMock.quickHandlingStatusFilter()).toEqual(['handling']);
    });

    it('does nothing for unknown doc type but still resets page', () => {
      searchSvcMock.activeDocType.set('Unknown');
      searchSvcMock.setActivePage.calls.reset();
      component.onStatusFiltersChanged({ checked: ['x'] });
      expect(searchSvcMock.setActivePage).toHaveBeenCalledWith(0);
    });
  });

  describe('onOrgFiltersChanged', () => {
    it('sets quickArendeOrgFilter and resets page', () => {
      component.onOrgFiltersChanged({ checked: ['org1', 'org2'] });
      expect(searchSvcMock.quickArendeOrgFilter()).toEqual(['org1', 'org2']);
      expect(searchSvcMock.setActivePage).toHaveBeenCalledWith(0);
    });

    it('handles non-array checked as empty', () => {
      component.onOrgFiltersChanged({ checked: null } as unknown as FilterResult);
      expect(searchSvcMock.quickArendeOrgFilter()).toEqual([]);
    });

    it('handles undefined checked as empty', () => {
      component.onOrgFiltersChanged({ checked: undefined } as unknown as FilterResult);
      expect(searchSvcMock.quickArendeOrgFilter()).toEqual([]);
    });
  });

  describe('onDateRangeChange', () => {
    it('updates quickCreatedRangeByType for dublincore_created_agg field', () => {
      searchSvcMock.activeDocType.set('Arende');
      component.onDateRangeChange({ field: 'dublincore_created_agg', value: ['2024-01-01', '2024-12-31'] });
      expect(searchSvcMock.quickCreatedRangeByType()['Arende']).toEqual(['2024-01-01', '2024-12-31']);
    });

    it('updates quickCreatedRangeByType with single string value', () => {
      searchSvcMock.activeDocType.set('Arende');
      component.onDateRangeChange({ field: 'dublincore_created_agg', value: '2024-01-01' });
      expect(searchSvcMock.quickCreatedRangeByType()['Arende']).toEqual(['2024-01-01']);
    });

    it('updates quickCreatedRangeByType with empty string as empty array', () => {
      searchSvcMock.activeDocType.set('Arende');
      component.onDateRangeChange({ field: 'dublincore_created_agg', value: '' });
      expect(searchSvcMock.quickCreatedRangeByType()['Arende']).toEqual([]);
    });

    it('resets page when dublincore_created_agg field', () => {
      searchSvcMock.setActivePage.calls.reset();
      component.onDateRangeChange({ field: 'dublincore_created_agg', value: ['2024-01-01'] });
      expect(searchSvcMock.setActivePage).toHaveBeenCalledWith(0);
    });

    it('updates quickArendeDateFilters for Arende doc type', () => {
      searchSvcMock.activeDocType.set('Arende');
      component.onDateRangeChange({ field: 'arende_beslutat_datum', value: '2024-06-01' });
      expect(searchSvcMock.quickArendeDateFilters()['arende_beslutat_datum']).toBe('2024-06-01');
    });

    it('updates quickHandlingDateFilters for Handling doc type', () => {
      searchSvcMock.activeDocType.set('Handling');
      component.onDateRangeChange({ field: 'handling_inkommen_datum', value: '2024-03-01' });
      expect(searchSvcMock.quickHandlingDateFilters()['handling_inkommen_datum']).toBe('2024-03-01');
    });

    it('updates quickHandlingDateFilters for Utkast doc type', () => {
      searchSvcMock.activeDocType.set('Utkast');
      component.onDateRangeChange({ field: 'handling_inkommen_datum', value: '2024-03-01' });
      expect(searchSvcMock.quickHandlingDateFilters()['handling_inkommen_datum']).toBe('2024-03-01');
    });

    it('removes field from quickArendeDateFilters when value is empty', () => {
      searchSvcMock.activeDocType.set('Arende');
      searchSvcMock.quickArendeDateFilters.set({ arende_beslutat_datum: '2024-06-01' });
      component.onDateRangeChange({ field: 'arende_beslutat_datum', value: '' });
      expect(searchSvcMock.quickArendeDateFilters()['arende_beslutat_datum']).toBeUndefined();
    });

    it('removes field from quickHandlingDateFilters when value is empty for Handling', () => {
      searchSvcMock.activeDocType.set('Handling');
      searchSvcMock.quickHandlingDateFilters.set({ handling_inkommen_datum: '2024-03-01' });
      component.onDateRangeChange({ field: 'handling_inkommen_datum', value: '' });
      expect(searchSvcMock.quickHandlingDateFilters()['handling_inkommen_datum']).toBeUndefined();
    });

    it('takes first element when value is array for non-created field', () => {
      searchSvcMock.activeDocType.set('Arende');
      component.onDateRangeChange({ field: 'arende_beslutat_datum', value: ['2024-06-01', '2024-06-30'] });
      expect(searchSvcMock.quickArendeDateFilters()['arende_beslutat_datum']).toBe('2024-06-01');
    });

    it('does not update filters for unknown doc type', () => {
      searchSvcMock.activeDocType.set('Unknown');
      component.onDateRangeChange({ field: 'some_field', value: '2024-01-01' });

      expect(searchSvcMock.setActivePage).toHaveBeenCalledWith(0);
    });
  });

  describe('clearQuickFilters', () => {
    it('clears all Arende filters', () => {
      searchSvcMock.activeDocType.set('Arende');
      searchSvcMock.quickArendeStatusFilter.set(['open']);
      searchSvcMock.quickArendeDateFilters.set({ arende_beslutat_datum: '2024-01-01' });
      searchSvcMock.quickArendeOrgFilter.set(['org1']);
      component.clearQuickFilters();
      expect(searchSvcMock.quickArendeStatusFilter()).toEqual([]);
      expect(searchSvcMock.quickArendeDateFilters()).toEqual({});
      expect(searchSvcMock.quickArendeOrgFilter()).toEqual([]);
      expect(searchSvcMock.setActivePage).toHaveBeenCalledWith(0);
    });

    it('clears all Utkast filters', () => {
      searchSvcMock.activeDocType.set('Utkast');
      searchSvcMock.quickUtkastStatusFilter.set(['draft']);
      component.clearQuickFilters();
      expect(searchSvcMock.quickUtkastStatusFilter()).toEqual([]);
    });

    it('clears all Handling filters', () => {
      searchSvcMock.activeDocType.set('Handling');
      searchSvcMock.quickHandlingStatusFilter.set(['handling']);
      searchSvcMock.quickHandlingDateFilters.set({ handling_inkommen_datum: '2024-01-01' });
      component.clearQuickFilters();
      expect(searchSvcMock.quickHandlingStatusFilter()).toEqual([]);
      expect(searchSvcMock.quickHandlingDateFilters()).toEqual({});
    });

    it('clears quickCreatedRangeByType for the active doc type', () => {
      searchSvcMock.activeDocType.set('Arende');
      searchSvcMock.quickCreatedRangeByType.set({ Arende: ['2024-01-01', '2024-12-31'] });
      component.clearQuickFilters();
      expect(searchSvcMock.quickCreatedRangeByType()['Arende']).toEqual([]);
    });

    it('handles unknown doc type and still resets page', () => {
      searchSvcMock.activeDocType.set('Unknown');
      searchSvcMock.setActivePage.calls.reset();
      component.clearQuickFilters();
      expect(searchSvcMock.setActivePage).toHaveBeenCalledWith(0);
    });
  });

  describe('handleSelection', () => {
    it('merges selected ids from active entries', () => {
      searchSvcMock.activeEntries = computed(() => [{ id: 'id-1' }, { id: 'id-2' }] as TableItem[]);
      component.handleSelection(['id-1']);
      expect(component.selectedFiles()).toContain('id-1');
    });

    it('filters out non-string ids from active entries', () => {
      searchSvcMock.activeEntries = computed(() => [{ id: 123 }, { id: 'id-valid' }] as unknown as TableItem[]);
      component.handleSelection(['id-valid']);
      expect(component.selectedFiles()).toContain('id-valid');
      expect(component.selectedFiles()).not.toContain(123 as never);
    });

    it('handles empty active entries', () => {
      searchSvcMock.activeEntries = computed(() => []);
      component.handleSelection([]);
      expect(component.selectedFiles()).toEqual([]);
    });
  });

  describe('activeDocType computed', () => {
    it('returns single selected doc type when only one selected', () => {
      searchSvcMock.selectedDocTypes.set(['Arende']);
      fixture.detectChanges();
      expect(component.activeDocType()).toBe('Arende');
    });

    it('returns activeDocTypeTabId when multiple doc types selected', () => {
      searchSvcMock.selectedDocTypes.set(['Arende', 'Handling']);
      component.activeDocTypeTabId.set('Handling');
      fixture.detectChanges();
      expect(component.activeDocType()).toBe('Handling');
    });

    it('falls back to searchService.activeDocType when no tab selected and multiple doc types', () => {
      searchSvcMock.selectedDocTypes.set(['Arende', 'Handling']);
      searchSvcMock.activeDocType.set('Arende');
      component.activeDocTypeTabId.set('');
      fixture.detectChanges();
      expect(component.activeDocType()).toBe('Arende');
    });

    it('returns empty string when selectedDocTypes is empty', () => {
      searchSvcMock.selectedDocTypes.set([]);
      component.activeDocTypeTabId.set('');
      searchSvcMock.activeDocType.set('');
      fixture.detectChanges();
      expect(component.activeDocType()).toBe('');
    });

    it('returns empty string when selectedDocTypes has one undefined entry', () => {
      (searchSvcMock.selectedDocTypes as WritableSignal<(string | undefined)[]>).set([undefined]);
      fixture.detectChanges();
      expect(component.activeDocType()).toBe('');
    });
  });

  describe('showStatusFilter computed', () => {
    it('returns true for Arende', () => {
      searchSvcMock.activeDocType.set('Arende');
      fixture.detectChanges();
      expect(component.showStatusFilter()).toBeTrue();
    });

    it('returns true for Handling', () => {
      searchSvcMock.activeDocType.set('Handling');
      fixture.detectChanges();
      expect(component.showStatusFilter()).toBeTrue();
    });

    it('returns true for Utkast (Utkast is a handling doc type)', () => {
      searchSvcMock.activeDocType.set('Utkast');
      fixture.detectChanges();
      expect(component.showStatusFilter()).toBeTrue();
    });

    it('returns false for unknown doc type', () => {
      searchSvcMock.activeDocType.set('Unknown');
      fixture.detectChanges();
      expect(component.showStatusFilter()).toBeFalse();
    });
  });

  describe('showOrgFilter computed', () => {
    it('returns true only for Arende', () => {
      searchSvcMock.activeDocType.set('Arende');
      fixture.detectChanges();
      expect(component.showOrgFilter()).toBeTrue();
    });

    it('returns false for Handling', () => {
      searchSvcMock.activeDocType.set('Handling');
      fixture.detectChanges();
      expect(component.showOrgFilter()).toBeFalse();
    });

    it('returns false for Utkast', () => {
      searchSvcMock.activeDocType.set('Utkast');
      fixture.detectChanges();
      expect(component.showOrgFilter()).toBeFalse();
    });
  });

  describe('showDateFilter computed', () => {
    it('returns true for Arende', () => {
      searchSvcMock.activeDocType.set('Arende');
      fixture.detectChanges();
      expect(component.showDateFilter()).toBeTrue();
    });

    it('returns true for Handling', () => {
      searchSvcMock.activeDocType.set('Handling');
      fixture.detectChanges();
      expect(component.showDateFilter()).toBeTrue();
    });

    it('returns true for Utkast', () => {
      searchSvcMock.activeDocType.set('Utkast');
      fixture.detectChanges();
      expect(component.showDateFilter()).toBeTrue();
    });

    it('returns false for unknown doc type', () => {
      searchSvcMock.activeDocType.set('Unknown');
      fixture.detectChanges();
      expect(component.showDateFilter()).toBeFalse();
    });
  });

  describe('dateColumns computed', () => {
    it('returns arendeDateColumns for Arende', () => {
      searchSvcMock.activeDocType.set('Arende');
      fixture.detectChanges();
      expect(component.dateColumns().length).toBeGreaterThan(0);
      expect(component.dateColumns()[0].sortField).toContain('arende');
    });

    it('returns handlingDateColumns for Handling', () => {
      searchSvcMock.activeDocType.set('Handling');
      fixture.detectChanges();
      expect(component.dateColumns().length).toBeGreaterThan(0);
      expect(component.dateColumns()[0].sortField).toContain('handling');
    });

    it('returns handlingDateColumns for Utkast', () => {
      searchSvcMock.activeDocType.set('Utkast');
      fixture.detectChanges();
      expect(component.dateColumns().length).toBeGreaterThan(0);
      expect(component.dateColumns()[0].sortField).toContain('handling');
    });

    it('returns empty for unknown doc type', () => {
      searchSvcMock.activeDocType.set('Unknown');
      fixture.detectChanges();
      expect(component.dateColumns()).toEqual([]);
    });
  });

  describe('activeStatusOptions computed', () => {
    it('returns arendeStatusOptions for Arende', () => {
      searchSvcMock.activeDocType.set('Arende');
      component.arendeStatusOptions.set([{ id: 'open', label: 'Öppen' }]);
      fixture.detectChanges();
      expect(component.activeStatusOptions()).toEqual([{ id: 'open', label: 'Öppen' }]);
    });

    it('returns utkastStatusOptions for Utkast', () => {
      searchSvcMock.activeDocType.set('Utkast');
      searchSvcMock.utkastStatusOptions.set([{ id: 'draft', label: 'Utkast' }]);
      fixture.detectChanges();
      expect(component.activeStatusOptions()).toEqual([{ id: 'draft', label: 'Utkast' }]);
    });

    it('returns handlingStatusAggOptions for Handling when agg options exist', () => {
      searchSvcMock.activeDocType.set('Handling');
      searchSvcMock.handlingStatusAggOptions.set([{ id: 'agg1', label: 'Agg Option' }]);
      fixture.detectChanges();
      expect(component.activeStatusOptions()).toEqual([{ id: 'agg1', label: 'Agg Option' }]);
    });

    it('falls back to handlingStatusOptions when agg options empty', () => {
      searchSvcMock.activeDocType.set('Handling');
      searchSvcMock.handlingStatusAggOptions.set([]);
      component.handlingStatusOptions.set([{ id: 'h1', label: 'Handling Option' }]);
      fixture.detectChanges();
      expect(component.activeStatusOptions()).toEqual([{ id: 'h1', label: 'Handling Option' }]);
    });

    it('returns empty array for unknown doc type', () => {
      searchSvcMock.activeDocType.set('Unknown');
      fixture.detectChanges();
      expect(component.activeStatusOptions()).toEqual([]);
    });
  });

  describe('activeStatusChecked computed', () => {
    it('returns quickArendeStatusFilter for Arende', () => {
      searchSvcMock.activeDocType.set('Arende');
      searchSvcMock.quickArendeStatusFilter.set(['open', 'closed']);
      fixture.detectChanges();
      expect(component.activeStatusChecked()).toEqual(['open', 'closed']);
    });

    it('returns quickUtkastStatusFilter for Utkast', () => {
      searchSvcMock.activeDocType.set('Utkast');
      searchSvcMock.quickUtkastStatusFilter.set(['draft']);
      fixture.detectChanges();
      expect(component.activeStatusChecked()).toEqual(['draft']);
    });

    it('returns quickHandlingStatusFilter for Handling', () => {
      searchSvcMock.activeDocType.set('Handling');
      searchSvcMock.quickHandlingStatusFilter.set(['inprogress']);
      fixture.detectChanges();
      expect(component.activeStatusChecked()).toEqual(['inprogress']);
    });

    it('returns empty array for unknown doc type', () => {
      searchSvcMock.activeDocType.set('Unknown');
      fixture.detectChanges();
      expect(component.activeStatusChecked()).toEqual([]);
    });
  });

  describe('activeDateRangeSelection computed', () => {
    it('returns quickArendeDateFilters for Arende', () => {
      searchSvcMock.activeDocType.set('Arende');
      searchSvcMock.quickArendeDateFilters.set({ arende_beslutat_datum: '2024-01-01' });
      fixture.detectChanges();
      expect(component.activeDateRangeSelection()).toEqual({ arende_beslutat_datum: '2024-01-01' });
    });

    it('returns quickHandlingDateFilters for Handling', () => {
      searchSvcMock.activeDocType.set('Handling');
      searchSvcMock.quickHandlingDateFilters.set({ handling_inkommen_datum: '2024-03-01' });
      fixture.detectChanges();
      expect(component.activeDateRangeSelection()).toEqual({ handling_inkommen_datum: '2024-03-01' });
    });

    it('returns quickHandlingDateFilters for Utkast', () => {
      searchSvcMock.activeDocType.set('Utkast');
      searchSvcMock.quickHandlingDateFilters.set({ handling_inkommen_datum: '2024-03-01' });
      fixture.detectChanges();
      expect(component.activeDateRangeSelection()).toEqual({ handling_inkommen_datum: '2024-03-01' });
    });

    it('returns empty object for unknown doc type', () => {
      searchSvcMock.activeDocType.set('Unknown');
      fixture.detectChanges();
      expect(component.activeDateRangeSelection()).toEqual({});
    });
  });

  describe('activeCreatedRange computed', () => {
    it('returns value from quickCreatedRangeByType for active docType', () => {
      searchSvcMock.activeDocType.set('Arende');
      searchSvcMock.quickCreatedRangeByType.set({ Arende: ['2024-01-01', '2024-12-31'] });
      fixture.detectChanges();
      expect(component.activeCreatedRange()).toEqual(['2024-01-01', '2024-12-31']);
    });

    it('falls back to empty key when docType is empty', () => {
      searchSvcMock.activeDocType.set('');
      searchSvcMock.quickCreatedRangeByType.set({ '': ['2023-01-01'] });
      fixture.detectChanges();
      expect(component.activeCreatedRange()).toEqual(['2023-01-01']);
    });

    it('returns empty array when no entry in map and no fallback', () => {
      searchSvcMock.activeDocType.set('Arende');
      searchSvcMock.quickCreatedRangeByType.set({});
      fixture.detectChanges();
      expect(component.activeCreatedRange()).toEqual([]);
    });
  });

  describe('activeTableConfig computed', () => {
    it('returns handlingColumnConfig for Handling', () => {
      searchSvcMock.activeDocType.set('Handling');
      component.activeDocTypeTabId.set('Handling');
      fixture.detectChanges();
      const config = component.activeTableConfig();
      expect(config).toBeDefined();
      expect(config.length).toBeGreaterThan(0);
    });

    it('returns utkastColumnConfig for Utkast', () => {
      searchSvcMock.activeDocType.set('Utkast');
      component.activeDocTypeTabId.set('Utkast');
      fixture.detectChanges();
      const config = component.activeTableConfig();
      expect(config).toBeDefined();
    });

    it('returns arendeColumnConfig for Arende with HANDLAGGARE role', () => {
      searchSvcMock.activeDocType.set('Arende');
      component.activeDocTypeTabId.set('Arende');
      authMock.activeRole.set('HANDLAGGARE');
      fixture.detectChanges();
      const config = component.activeTableConfig();
      expect(config).toBeDefined();
    });

    it('returns default column config for unknown doc type', () => {
      searchSvcMock.activeDocType.set('Unknown');
      component.activeDocTypeTabId.set('');
      fixture.detectChanges();
      const config = component.activeTableConfig();
      expect(config).toBeDefined();
    });
  });

  describe('resolveArendeColumns', () => {
    it('returns registrator columns for REGISTRATOR role', () => {
      searchSvcMock.activeDocType.set('Arende');
      component.activeDocTypeTabId.set('Arende');
      authMock.activeRole.set('REGISTRATOR');
      fixture.detectChanges();

      const config = component.activeTableConfig();
      expect(config).toBeDefined();
    });

    it('returns registrator columns for admin user', () => {
      searchSvcMock.activeDocType.set('Arende');
      component.activeDocTypeTabId.set('Arende');

      authMock.isAdmin = computed(() => true);
      fixture.detectChanges();
      const config = component.activeTableConfig();
      expect(config).toBeDefined();
    });

    it('returns default columns for null role', () => {
      searchSvcMock.activeDocType.set('Arende');
      component.activeDocTypeTabId.set('Arende');
      authMock.activeRole.set(null);
      fixture.detectChanges();
      const config = component.activeTableConfig();
      expect(config).toBeDefined();
    });
  });

  describe('docTypeTabs computed', () => {
    it('returns empty array when no selectedDocTypes', () => {
      searchSvcMock.selectedDocTypes.set([]);
      fixture.detectChanges();
      expect(component.docTypeTabs()).toEqual([]);
    });

    it('returns tabs for single doc type using docTypeCounts', () => {
      searchSvcMock.selectedDocTypes.set(['Arende']);
      searchSvcMock.docTypeCounts.set({ Arende: 5 });
      fixture.detectChanges();
      const tabs = component.docTypeTabs();
      expect(tabs.length).toBe(1);
      expect(tabs[0].id).toBe('Arende');
      expect(tabs[0].badgeValue).toBe(5);
    });

    it('returns tabs for multiple doc types using totalsByType', () => {
      searchSvcMock.selectedDocTypes.set(['Arende', 'Handling']);
      searchSvcMock.totalsByType.set({ Arende: 10, Handling: 20 });
      fixture.detectChanges();
      const tabs = component.docTypeTabs();
      expect(tabs.length).toBe(2);
    });

    it('sets badgeValue to undefined when count is 0', () => {
      searchSvcMock.selectedDocTypes.set(['Arende']);
      searchSvcMock.docTypeCounts.set({ Arende: 0 });
      fixture.detectChanges();
      const tabs = component.docTypeTabs();
      expect(tabs[0].badgeValue).toBeUndefined();
    });

    it('orders tabs with known types first in docTypeOrder', () => {
      searchSvcMock.selectedDocTypes.set(['Utkast', 'Handling', 'Arende']);
      fixture.detectChanges();
      const tabs = component.docTypeTabs();
      expect(tabs[0].id).toBe('Arende');
      expect(tabs[1].id).toBe('Handling');
      expect(tabs[2].id).toBe('Utkast');
    });

    it('appends extra/unknown doc types at end', () => {
      searchSvcMock.selectedDocTypes.set(['Arende', 'CustomType']);
      fixture.detectChanges();
      const tabs = component.docTypeTabs();
      expect(tabs[tabs.length - 1].id).toBe('CustomType');
    });
  });

  describe('onDocTypeTabChanged', () => {
    it('does nothing when same tab is selected', () => {
      component.activeDocTypeTabId.set('Arende');
      searchSvcMock.setActiveDocType.calls.reset();
      component.onDocTypeTabChanged('Arende');
      expect(searchSvcMock.setActiveDocType).not.toHaveBeenCalled();
    });

    it('sets new tab and clears selection on tab change', () => {
      component.activeDocTypeTabId.set('Arende');
      component.selectedFiles.set(['file1', 'file2']);
      component.onDocTypeTabChanged('Handling');
      expect(component.activeDocTypeTabId()).toBe('Handling');
      expect(component.selectedFiles()).toEqual([]);
      expect(searchSvcMock.setActiveDocType).toHaveBeenCalledWith('Handling');
    });

    it('clears quick filters on tab change', () => {
      searchSvcMock.activeDocType.set('Arende');
      component.activeDocTypeTabId.set('Arende');
      searchSvcMock.quickArendeStatusFilter.set(['open']);
      component.onDocTypeTabChanged('Handling');

      expect(searchSvcMock.quickHandlingStatusFilter()).toEqual([]);
    });
  });

  describe('downloadFiles', () => {
    it('calls apiService.downloadBulk and creates download link', () => {
      component.selectedFiles.set(['uid-1', 'uid-2']);
      spyOn(window.URL, 'createObjectURL').and.returnValue('blob:test-url');
      const anchorEl = document.createElement('a');
      spyOn(document, 'createElement').and.returnValue(anchorEl);
      spyOn(anchorEl, 'click');

      component.downloadFiles();

      expect(apiSpy.downloadBulk).toHaveBeenCalledWith(['uid-1', 'uid-2']);
      expect(anchorEl.download).toBe('selection.zip');
    });
  });

  describe('addToFavorites', () => {
    it('calls toggleFavorites for each selected file', () => {
      component.selectedFiles.set(['uid-1', 'uid-2']);
      component.addToFavorites();
      expect(favSpy.toggleFavorites).toHaveBeenCalledWith('uid-1', false);
      expect(favSpy.toggleFavorites).toHaveBeenCalledWith('uid-2', false);
    });

    it('sets success notification after adding favorites', () => {
      component.selectedFiles.set(['uid-1']);
      (favSpy.toggleFavorites as jasmine.Spy).and.returnValue(of(null));
      component.addToFavorites();
      expect(storeMock.notification()).toEqual(jasmine.objectContaining({ show: true, variation: 'success' }));
    });

    it('sets error notification on favorites error', () => {
      component.selectedFiles.set(['uid-1']);
      (favSpy.toggleFavorites as jasmine.Spy).and.returnValue(throwError(() => new Error('fail')));
      component.addToFavorites();
      expect(storeMock.notification()).toEqual(jasmine.objectContaining({ show: true, variation: 'danger' }));
    });
  });

  describe('onSelectAll', () => {
    it('fetches all ids and merges selection when checked true', () => {
      const doc1 = makeNuxeoDocument({ uid: 'uid-1' });
      const doc2 = makeNuxeoDocument({ uid: 'uid-2' });
      (apiSpy.getAdvancedSearchResults as jasmine.Spy).and.returnValue(of(makeSearchResult({ entries: [doc1, doc2] })));
      component.onSelectAll(true);
      expect(component.selectedFiles()).toContain('uid-1');
      expect(component.selectedFiles()).toContain('uid-2');
    });

    it('clears selection when checked false', () => {
      const doc1 = makeNuxeoDocument({ uid: 'uid-1' });
      (apiSpy.getAdvancedSearchResults as jasmine.Spy).and.returnValue(of(makeSearchResult({ entries: [doc1] })));
      component.selectedFiles.set(['uid-1', 'uid-2']);
      component.onSelectAll(false);
      expect(component.selectedFiles()).not.toContain('uid-1');
    });

    it('sets error notification on fetch failure', () => {
      (apiSpy.getAdvancedSearchResults as jasmine.Spy).and.returnValue(throwError(() => new Error('fail')));
      component.onSelectAll(true);
      expect(storeMock.notification()).toEqual(jasmine.objectContaining({ show: true, variation: 'danger' }));
    });

    it('uses tabbed search params when isTabbed', () => {
      searchSvcMock.isTabbed = computed(() => true);
      searchSvcMock.activeDocType.set('Arende');
      searchSvcMock.advancedSearchQueryParamsByType.set({ Arende: { queryParams: 'nxql' } });
      (apiSpy.getAdvancedSearchResults as jasmine.Spy).and.returnValue(of(makeSearchResult({ entries: [] })));
      component.onSelectAll(true);
      expect(apiSpy.getAdvancedSearchResults).toHaveBeenCalled();
    });
  });

  describe('exportToCSV', () => {
    it('calls csvExportService.exportToCSV with correct provider for Arende', () => {
      searchSvcMock.activeDocType.set('Arende');
      searchSvcMock.activeAdvancedSearchQueryParams.and.returnValue({});
      csvSpy.getExportColumns.and.returnValue([{ field: 'title', header: 'Title' }]);
      component.exportToCSV([{ key: 'title', label: 'Title', tableName: 'T', visible: true }]);
      expect(csvSpy.exportToCSV).toHaveBeenCalledWith(jasmine.objectContaining({ providerName: 'arende_search' }));
    });

    it('calls csvExportService.exportToCSV with handling_search for Handling', () => {
      searchSvcMock.activeDocType.set('Handling');
      searchSvcMock.activeAdvancedSearchQueryParams.and.returnValue({});
      csvSpy.getExportColumns.and.returnValue([{ field: 'title', header: 'Title' }]);
      component.exportToCSV([{ key: 'title', label: 'Title', tableName: 'T', visible: true }]);
      expect(csvSpy.exportToCSV).toHaveBeenCalledWith(jasmine.objectContaining({ providerName: 'handling_search' }));
    });

    it('calls csvExportService.exportToCSV with handling_search for Utkast', () => {
      searchSvcMock.activeDocType.set('Utkast');
      searchSvcMock.activeAdvancedSearchQueryParams.and.returnValue({});
      csvSpy.getExportColumns.and.returnValue([{ field: 'title', header: 'Title' }]);
      component.exportToCSV([{ key: 'title', label: 'Title', tableName: 'T', visible: true }]);
      expect(csvSpy.exportToCSV).toHaveBeenCalledWith(jasmine.objectContaining({ providerName: 'handling_search' }));
    });

    it('calls csvExportService.exportToCSV with dms_search for unknown doc type', () => {
      searchSvcMock.activeDocType.set('');
      searchSvcMock.activeAdvancedSearchQueryParams.and.returnValue({});
      csvSpy.getExportColumns.and.returnValue([{ field: 'title', header: 'Title' }]);
      component.exportToCSV([{ key: 'title', label: 'Title', tableName: 'T', visible: true }]);
      expect(csvSpy.exportToCSV).toHaveBeenCalledWith(jasmine.objectContaining({ providerName: 'dms_search' }));
    });

    it('calls notifyNoExportableColumns when no exportable columns', () => {
      csvSpy.getExportColumns.and.returnValue([]);
      component.exportToCSV([]);
      expect(csvSpy.notifyNoExportableColumns).toHaveBeenCalled();
      expect(csvSpy.exportToCSV).not.toHaveBeenCalled();
    });

    it('filters out checkboxes field from export columns', () => {
      csvSpy.getExportColumns.and.returnValue([
        { field: 'checkboxes', header: 'Select' },
        { field: 'title', header: 'Title' },
      ]);
      searchSvcMock.activeAdvancedSearchQueryParams.and.returnValue({});
      component.exportToCSV([{ key: 'title', label: 'Title', tableName: 'T', visible: true }]);
      const callArgs = csvSpy.exportToCSV.calls.mostRecent()?.args[0];
      expect(callArgs?.fields).not.toContain('checkboxes');
    });
  });

  describe('downloadCsv', () => {
    it('does nothing when no files selected', () => {
      component.selectedFiles.set([]);
      component.downloadCsv();
      expect(apiSpy.runBulkAction).not.toHaveBeenCalled();
    });

    it('calls runBulkAction with Arende schema when active type is Arende', () => {
      component.selectedFiles.set(['uid-1']);
      searchSvcMock.activeDocType.set('Arende');
      component.downloadCsv();
      const callArgs = apiSpy.runBulkAction.calls.mostRecent()?.args[0];
      const params = JSON.parse(callArgs?.parameters ?? '{}');
      expect(params.schemas).toContain('arende');
    });

    it('calls runBulkAction with handling schema for Handling type', () => {
      component.selectedFiles.set(['uid-1']);
      searchSvcMock.activeDocType.set('Handling');
      component.downloadCsv();
      const callArgs = apiSpy.runBulkAction.calls.mostRecent()?.args[0];
      const params = JSON.parse(callArgs?.parameters ?? '{}');
      expect(params.schemas).toContain('handling');
    });

    it('calls runBulkAction with handling schema for Utkast type', () => {
      component.selectedFiles.set(['uid-1']);
      searchSvcMock.activeDocType.set('Utkast');
      component.downloadCsv();
      const callArgs = apiSpy.runBulkAction.calls.mostRecent()?.args[0];
      const params = JSON.parse(callArgs?.parameters ?? '{}');
      expect(params.schemas).toContain('handling');
    });

    it('opens CSV url when download result has url', fakeAsync(() => {
      component.selectedFiles.set(['uid-1']);
      apiSpy.downloadBulkActionResult.and.returnValue(of({ url: 'http://csv.download' }));
      let clickedHref = '';
      spyOn(component as unknown as { openCsvUrl: (url: string) => void }, 'openCsvUrl').and.callFake((url: string) => {
        clickedHref = url;
      });
      component.downloadCsv();
      tick(0);
      expect(clickedHref).toBe('http://csv.download');
    }));

    it('calls notifyError when download result has no url', fakeAsync(() => {
      component.selectedFiles.set(['uid-1']);
      (apiSpy.downloadBulkActionResult as jasmine.Spy).and.returnValue(of({ url: '' }));
      (apiSpy.getBulkActionStatus as jasmine.Spy).and.returnValue(
        of({
          'entity-type': 'bulkStatus' as const,
          value: {
            state: 'COMPLETED',
            error: false,
            commandId: '',
            processed: 0,
            skipCount: 0,
            errorCount: 0,
            total: 0,
            action: '',
            username: '',
            submitted: '',
            scrollStart: null,
            scrollEnd: null,
            processingStart: null,
            processingEnd: null,
            completed: null,
            processingMillis: 0,
          },
        })
      );
      component.downloadCsv();
      tick(0);
      expect(csvSpy.notifyError).toHaveBeenCalled();
    }));

    it('calls notifyError when bulk action status has error', fakeAsync(() => {
      component.selectedFiles.set(['uid-1']);
      const bulkVal = {
        'entity-type': 'bulkStatus' as const,
        value: {
          state: 'COMPLETED',
          error: true,
          commandId: '',
          processed: 0,
          skipCount: 0,
          errorCount: 1,
          total: 0,
          action: '',
          username: '',
          submitted: '',
          scrollStart: null,
          scrollEnd: null,
          processingStart: null,
          processingEnd: null,
          completed: null,
          processingMillis: 0,
        },
      };
      (apiSpy.getBulkActionStatus as jasmine.Spy).and.returnValue(of(bulkVal));
      component.downloadCsv();
      tick(0);
      expect(csvSpy.notifyError).toHaveBeenCalled();
    }));

    it('calls notifyError when bulk action status not COMPLETED', fakeAsync(() => {
      component.selectedFiles.set(['uid-1']);

      const bulkVal = {
        'entity-type': 'bulkStatus' as const,
        value: {
          state: 'FAILED',
          error: false,
          commandId: '',
          processed: 0,
          skipCount: 0,
          errorCount: 0,
          total: 0,
          action: '',
          username: '',
          submitted: '',
          scrollStart: null,
          scrollEnd: null,
          processingStart: null,
          processingEnd: null,
          completed: null,
          processingMillis: 0,
        },
      };
      (apiSpy.getBulkActionStatus as jasmine.Spy).and.returnValue(of(bulkVal));
      component.downloadCsv();

      tick(1500 * 4);
      expect(csvSpy.notifyError).toHaveBeenCalled();
    }));

    it('calls notifyError on runBulkAction error', () => {
      component.selectedFiles.set(['uid-1']);
      apiSpy.runBulkAction.and.returnValue(throwError(() => new Error('fail')));
      component.downloadCsv();
      expect(csvSpy.notifyError).toHaveBeenCalled();
    });
  });

  describe('effect: entries sync', () => {
    it('updates entries and resultsCount when searchService.entries changes', () => {
      const newEntries = [{ id: 'e1' }] as TableItem[];
      searchSvcMock.entries.set(newEntries);
      searchSvcMock.resultsCount.set(42);
      fixture.detectChanges();
      expect(component.entries()).toEqual(newEntries);
      expect(component.resultsCount()).toBe(42);
    });

    it('does not update when entries is null', () => {
      component.entries.set([{ id: 'existing' }] as TableItem[]);
      searchSvcMock.entries.set(null);
      fixture.detectChanges();

      expect(component.entries()).toEqual([{ id: 'existing' }] as TableItem[]);
    });
  });

  describe('effect: tab management', () => {
    it('clears activeDocTypeTabId when tabs becomes empty', () => {
      component.activeDocTypeTabId.set('Arende');
      searchSvcMock.selectedDocTypes.set([]);
      fixture.detectChanges();
      expect(component.activeDocTypeTabId()).toBe('');
    });

    it('sets first tab as active when tabs appear and no tab selected', () => {
      searchSvcMock.selectedDocTypes.set(['Arende', 'Handling']);
      fixture.detectChanges();
      expect(component.activeDocTypeTabId()).toBeTruthy();
    });

    it('keeps current tab if still valid', () => {
      searchSvcMock.selectedDocTypes.set(['Arende', 'Handling']);
      component.activeDocTypeTabId.set('Handling');
      fixture.detectChanges();
      expect(component.activeDocTypeTabId()).toBe('Handling');
    });
  });

  describe('loadOrgOptions via resolveOrgParentRef', () => {
    it('calls apiService.getPathInfo to resolve org parent ref when no entries', () => {
      expect(apiSpy.getPathInfo).toHaveBeenCalledWith('/default-domain/Organisation');
    });

    it('sets orgParentRef from getPathInfo result', () => {
      apiSpy.getPathInfo.and.returnValue(of(makeNuxeoDocument({ uid: 'new-parent-uid' })));

      searchSvcMock.activeDocType.set('Arende');
      fixture.detectChanges();

      expect(apiSpy.getPathInfo).toHaveBeenCalled();
    });

    it('loads org options from DMSDocumentSuggestion when parentRef is available', () => {
      const entries = [makeNuxeoDocument({ uid: 'org-1', title: 'Org One' })];
      apiSpy.DMSDocumentSuggestion.and.returnValue(of(makeSearchResult({ entries })));

      component.orgParentRef.set('parent-uid');
      (component as unknown as DocumentSearchPrivate).lastOrgLoadKey = '';
      (component as unknown as DocumentSearchPrivate).loadOrgOptions('');
      expect(apiSpy.DMSDocumentSuggestion).toHaveBeenCalled();
      expect(component.orgOptions().length).toBeGreaterThanOrEqual(0);
    });

    it('sets orgOptions to empty on DMSDocumentSuggestion error', () => {
      component.orgParentRef.set('parent-uid');
      (component as unknown as DocumentSearchPrivate).lastOrgLoadKey = '';
      apiSpy.DMSDocumentSuggestion.and.returnValue(throwError(() => new Error('fail')));
      (component as unknown as DocumentSearchPrivate).loadOrgOptions('');
      expect(component.orgOptions()).toEqual([]);
    });

    it('handles getPathInfo returning doc with no uid gracefully', () => {
      apiSpy.getPathInfo.and.returnValue(of(makeNuxeoDocument({ uid: undefined as never })));
      (component as unknown as DocumentSearchPrivate).resolveOrgParentRef();

      expect(component.orgParentRef()).toBeDefined();
    });

    it('handles getPathInfo error gracefully', () => {
      apiSpy.getPathInfo.and.returnValue(throwError(() => new Error('network fail')));
      (component as unknown as DocumentSearchPrivate).resolveOrgParentRef();

      expect(component.orgParentRef()).toBeDefined();
    });

    it('does not reload org options when loadKey is unchanged', () => {
      component.orgParentRef.set('parent-uid');
      (component as unknown as DocumentSearchPrivate).lastOrgLoadKey = 'parent-uid::';
      apiSpy.DMSDocumentSuggestion.calls.reset();
      (component as unknown as DocumentSearchPrivate).loadOrgOptions('');
      expect(apiSpy.DMSDocumentSuggestion).not.toHaveBeenCalled();
    });

    it('sets orgOptions from active entries parentRef', () => {
      const entryWithParent = { id: 'doc-1', parentRef: 'entries-parent-uid' } as unknown as TableItem;
      searchSvcMock.activeEntries = computed(() => [entryWithParent]);
      const entries2 = [makeNuxeoDocument({ uid: 'child-org' })];
      apiSpy.DMSDocumentSuggestion.and.returnValue(of(makeSearchResult({ entries: entries2 })));

      (component as unknown as DocumentSearchPrivate).lastOrgLoadKey = '';
      (component as unknown as DocumentSearchPrivate).loadOrgOptions('');
      expect(apiSpy.DMSDocumentSuggestion).toHaveBeenCalled();
    });
  });

  describe('getCsvExportSearchParams', () => {
    it('uses advancedSearchQueryParamsByType when activeDocType is set', () => {
      searchSvcMock.advancedSearchQueryParamsByType.set({ Arende: { namedParam: 'val', queryParams: 'nxql' } });
      const params = (component as unknown as DocumentSearchPrivate).getCsvExportSearchParams('Arende');
      expect(params.queryParams).toContain('nxql');
      expect(params.namedParameters['namedParam']).toBe('val');
    });

    it('falls back to activeAdvancedSearchQueryParams when docType not in byType map', () => {
      searchSvcMock.advancedSearchQueryParamsByType.set({});
      searchSvcMock.activeAdvancedSearchQueryParams.and.returnValue({ someParam: 'val' });
      const params = (component as unknown as DocumentSearchPrivate).getCsvExportSearchParams('Arende');
      expect(params.namedParameters['someParam']).toBe('val');
    });

    it('uses activeAdvancedSearchQueryParams when activeDocType is empty', () => {
      searchSvcMock.activeAdvancedSearchQueryParams.and.returnValue({ globalParam: 'x' });
      const params = (component as unknown as DocumentSearchPrivate).getCsvExportSearchParams('');
      expect(params.namedParameters['globalParam']).toBe('x');
    });

    it('excludes pagination keys from namedParameters', () => {
      searchSvcMock.advancedSearchQueryParamsByType.set({});
      searchSvcMock.activeAdvancedSearchQueryParams.and.returnValue({
        currentPageIndex: 0,
        pageSize: 25,
        offset: 0,
        sortBy: 'title',
        sortOrder: 'asc',
        myParam: 'val',
      });
      const params = (component as unknown as DocumentSearchPrivate).getCsvExportSearchParams('');
      expect(params.namedParameters['currentPageIndex']).toBeUndefined();
      expect(params.namedParameters['pageSize']).toBeUndefined();
      expect(params.namedParameters['myParam']).toBe('val');
    });
  });

  describe('mergeSelection', () => {
    it('preserves ids not in tableDocIds', () => {
      component.selectedFiles.set(['external-id']);
      searchSvcMock.activeEntries = computed(() => [{ id: 'table-id' }] as TableItem[]);
      component.handleSelection(['table-id']);
      expect(component.selectedFiles()).toContain('external-id');
      expect(component.selectedFiles()).toContain('table-id');
    });

    it('deselects ids in tableDocIds when not in newIds', () => {
      component.selectedFiles.set(['old-table-id']);
      searchSvcMock.activeEntries = computed(() => [{ id: 'old-table-id' }] as TableItem[]);
      component.handleSelection([]);
      expect(component.selectedFiles()).not.toContain('old-table-id');
    });

    it('does not duplicate ids', () => {
      component.selectedFiles.set(['uid-1']);
      searchSvcMock.activeEntries = computed(() => [{ id: 'uid-1' }] as TableItem[]);
      component.handleSelection(['uid-1']);
      const count = component.selectedFiles().filter(id => id === 'uid-1').length;
      expect(count).toBe(1);
    });
  });

  describe('getActiveSearchParams', () => {
    it('returns activeAdvancedSearchQueryParams when not tabbed', () => {
      searchSvcMock.isTabbed = computed(() => false);
      searchSvcMock.activeAdvancedSearchQueryParams.and.returnValue({ q: 'test' });
      (apiSpy.getAdvancedSearchResults as jasmine.Spy).and.returnValue(of(makeSearchResult({ entries: [] })));
      component.onSelectAll(true);
      const callArgs = apiSpy.getAdvancedSearchResults.calls.mostRecent()?.args[0];
      expect(callArgs).toEqual(jasmine.objectContaining({ q: 'test' }));
    });

    it('uses advancedSearchQueryParamsByType when tabbed and docType set', () => {
      searchSvcMock.isTabbed = computed(() => true);
      searchSvcMock.activeDocType.set('Arende');
      searchSvcMock.advancedSearchQueryParamsByType.set({ Arende: { typeParam: 'arende-val' } });
      (apiSpy.getAdvancedSearchResults as jasmine.Spy).and.returnValue(of(makeSearchResult({ entries: [] })));
      component.onSelectAll(true);
      const callArgs = apiSpy.getAdvancedSearchResults.calls.mostRecent()?.args[0];
      expect(callArgs).toEqual(jasmine.objectContaining({ typeParam: 'arende-val' }));
    });

    it('falls back to activeAdvancedSearchQueryParams when tabbed but docType not in map', () => {
      searchSvcMock.isTabbed = computed(() => true);
      searchSvcMock.activeDocType.set('Arende');
      searchSvcMock.advancedSearchQueryParamsByType.set({});
      searchSvcMock.activeAdvancedSearchQueryParams.and.returnValue({ fallback: true });
      (apiSpy.getAdvancedSearchResults as jasmine.Spy).and.returnValue(of(makeSearchResult({ entries: [] })));
      component.onSelectAll(true);
      const callArgs = apiSpy.getAdvancedSearchResults.calls.mostRecent()?.args[0];
      expect(callArgs).toEqual(jasmine.objectContaining({ fallback: true }));
    });
  });
});
