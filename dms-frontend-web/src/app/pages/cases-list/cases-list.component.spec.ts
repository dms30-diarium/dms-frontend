import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal, computed } from '@angular/core';
import { of, throwError } from 'rxjs';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { CasesListComponent } from './cases-list.component';
import { CasesService } from '@app/core/services/cases.service';
import { NuxeoApiService } from '@app/shared/api/nuxeo-api.service';
import { CSVExportService } from '@app/shared/services/csv-export.service';
import { CaseEditOptionsService } from '@app/core/services/case-edit-options.service';
import { AuthService } from '@app/core/services/auth.service';
import { GeneralStore } from '@app/core/services/general-store.service';
import { ConstantProvider } from './constants';
import { TableSortService } from '@app/core/services/table-sort.service';
import { ViewMode } from '@models/view-mode.enum';
import { NUXEO_SCHEMA_FIELDS } from '@app/shared/constants/nuxeo-schema-fields';
import { makeNuxeoDocument, makeNxUser, makeSearchResult } from '@app/shared/testing/mock-factories';
import { TableColumn } from '@app/shared/components/case-list-table/case-list-table.component';
import { ArendeExtendedProperties } from '@app/shared/api/nuxeo-api.types';
import type { DirectoryEntry, NuxeoDocument, NxUser, Aggregations, AggBucket } from '@app/shared/api/nuxeo-api.types';
import type { EditCaseResult } from '@app/pages/case-page/case-types';

function makeColumn(overrides: Partial<TableColumn> = {}): TableColumn {
  return {
    tableName: 'CASES_LIST',
    key: 'title',
    label: 'Title',
    visible: true,
    ...overrides,
  };
}

function makeAuthMock() {
  return {
    loaded: signal(false),
    loadError: signal(null),
    username: signal<string | null>(null),
    activeRole: signal<string | null>(null),
    adminViewEnabled: signal(false),
    isAdmin: computed(() => false),
    user: signal<unknown>(undefined),
    roles: signal<string[]>([]),
    loadMe: jasmine.createSpy('loadMe'),
    hasRole: jasmine.createSpy('hasRole').and.returnValue(false),
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
  };
}

describe('CasesListComponent', () => {
  let component: CasesListComponent;
  let fixture: ComponentFixture<CasesListComponent>;
  let authMock: ReturnType<typeof makeAuthMock>;
  let storeMock: ReturnType<typeof makeStoreMock>;
  let apiSpy: jasmine.SpyObj<NuxeoApiService>;
  let casesSpy: jasmine.SpyObj<CasesService>;
  let constantSpy: jasmine.SpyObj<ConstantProvider>;
  let tableSortSpy: jasmine.SpyObj<TableSortService>;

  beforeEach(async () => {
    authMock = makeAuthMock();
    storeMock = makeStoreMock();

    apiSpy = jasmine.createSpyObj('NuxeoApiService', [
      'getMessagesJSON',
      'getPathInfo',
      'getDocumentById',
      'deleteDocument',
      'editDocument',
    ]);
    apiSpy.getMessagesJSON.and.returnValue(of({}));
    apiSpy.getPathInfo.and.returnValue(of(makeNuxeoDocument({ uid: 'parent-uid-1' })));
    apiSpy.getDocumentById.and.returnValue(of(makeNuxeoDocument()));
    apiSpy.deleteDocument.and.returnValue(of(makeNuxeoDocument()));
    apiSpy.editDocument.and.returnValue(of(makeNuxeoDocument()));

    casesSpy = jasmine.createSpyObj('CasesService', [
      'getAllTasks',
      'listByTab',
      'getCountByTab',
      'getCreatedAggBucketsByTab',
      'getCsvExportParams',
    ]);
    casesSpy.getAllTasks.and.returnValue(of(makeSearchResult({ entries: [], resultsCount: 0 })));
    casesSpy.listByTab.and.returnValue(of(makeSearchResult({ entries: [], totalSize: 0 })));
    casesSpy.getCountByTab.and.returnValue(of(0));
    casesSpy.getCreatedAggBucketsByTab.and.returnValue(of([]));
    casesSpy.getCsvExportParams.and.returnValue({ providerName: 'prov', namedParameters: {}, queryParams: [] });

    const csvSpy = jasmine.createSpyObj('CSVExportService', [
      'exportRowsToCSV',
      'getExportColumns',
      'exportToCSV',
      'notifyNoExportableColumns',
    ]);
    csvSpy.getExportColumns.and.returnValue([{ header: 'Title', field: 'title' }]);
    csvSpy.exportToCSV.and.stub();
    csvSpy.notifyNoExportableColumns.and.stub();
    const editOptsSpy = jasmine.createSpyObj('CaseEditOptionsService', [
      'getDirectorySuggestions',
      'getUserSuggestions',
      'getDocumentSuggestions',
      'getLagrumSuggestions',
      'getBevarasSuggestions',
    ]);
    editOptsSpy.getDirectorySuggestions.and.returnValue(of([]));
    editOptsSpy.getUserSuggestions.and.returnValue(of([]));
    editOptsSpy.getDocumentSuggestions.and.returnValue(of([]));
    editOptsSpy.getLagrumSuggestions.and.returnValue(of([]));
    editOptsSpy.getBevarasSuggestions.and.returnValue(of([]));

    constantSpy = jasmine.createSpyObj('ConstantProvider', ['resolveCasesTableConfig']);
    constantSpy.resolveCasesTableConfig.and.returnValue({ config: [], actionsHeader: 'Åtgärder' });

    tableSortSpy = jasmine.createSpyObj('TableSortService', ['applySortSignals']);

    await TestBed.configureTestingModule({
      imports: [CasesListComponent],
      providers: [
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: AuthService, useValue: authMock },
        { provide: NuxeoApiService, useValue: apiSpy },
        { provide: GeneralStore, useValue: storeMock },
        { provide: CasesService, useValue: casesSpy },
        { provide: CSVExportService, useValue: csvSpy },
        { provide: CaseEditOptionsService, useValue: editOptsSpy },
        { provide: ConstantProvider, useValue: constantSpy },
        { provide: TableSortService, useValue: tableSortSpy },
      ],
    })
      .overrideTemplate(CasesListComponent, '<div></div>')
      .compileComponents();

    fixture = TestBed.createComponent(CasesListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('isGrid / isTable', () => {
    it('isTable returns true when viewMode is Table', () => {
      fixture.componentRef.setInput('viewMode', ViewMode.Table);
      expect(component.isTable()).toBeTrue();
      expect(component.isGrid()).toBeFalse();
    });

    it('isGrid returns true when viewMode is Grid', () => {
      fixture.componentRef.setInput('viewMode', ViewMode.Grid);
      expect(component.isGrid()).toBeTrue();
      expect(component.isTable()).toBeFalse();
    });
  });

  describe('totalPages', () => {
    it('returns 1 when total is 0', () => {
      component.total.set(0);
      component.pageSize.set(25);
      expect(component.totalPages()).toBe(1);
    });

    it('calculates correct pages', () => {
      component.total.set(100);
      component.pageSize.set(25);
      expect(component.totalPages()).toBe(4);
    });

    it('rounds up for partial pages', () => {
      component.total.set(26);
      component.pageSize.set(25);
      expect(component.totalPages()).toBe(2);
    });
  });

  describe('onPageChange', () => {
    it('sets page signal', () => {
      component.onPageChange(3);
      expect(component.page()).toBe(3);
    });
  });

  describe('onGridPageChange', () => {
    it('delegates to onPageChange', () => {
      spyOn(component, 'onPageChange');
      component.onGridPageChange(2);
      expect(component.onPageChange).toHaveBeenCalledWith(2);
    });
  });

  describe('onGridPageSizeSelect', () => {
    it('does nothing for non-finite value', () => {
      component.pageSize.set(25);
      component.onGridPageSizeSelect('abc');
      expect(component.pageSize()).toBe(25);
    });

    it('does nothing when same pageSize', () => {
      component.pageSize.set(25);
      component.onGridPageSizeSelect(25);
      expect(component.pageSize()).toBe(25);
    });

    it('does nothing for zero or negative', () => {
      component.pageSize.set(25);
      component.onGridPageSizeSelect(0);
      expect(component.pageSize()).toBe(25);
    });

    it('sets pageSize and resets page for valid value', () => {
      component.pageSize.set(25);
      component.page.set(2);
      component.onGridPageSizeSelect(50);
      expect(component.pageSize()).toBe(50);
      expect(component.page()).toBe(0);
    });
  });

  describe('onSort', () => {
    it('calls tableSortService.applySortSignals and resets page', () => {
      component.page.set(2);
      component.onSort({ sortBy: 'dc:title', sortOrder: 'asc' });
      expect(tableSortSpy.applySortSignals).toHaveBeenCalled();
      expect(component.page()).toBe(0);
    });
  });

  describe('onColumnSearch', () => {
    it('sets field in columnFilters for string value', () => {
      component.onColumnSearch({ field: 'dc:title', value: 'test' });
      expect(component.columnFilters()['dc:title']).toBe('test');
    });

    it('deletes field when value is empty string', () => {
      component.columnFilters.set({ 'dc:title': 'test' });
      component.onColumnSearch({ field: 'dc:title', value: '' });
      expect(component.columnFilters()['dc:title']).toBeUndefined();
    });

    it('handles array value', () => {
      component.onColumnSearch({ field: 'arende_arendestatus', value: ['open', 'closed'] });
      expect(component.columnFilters()['arende_arendestatus']).toEqual(['open', 'closed']);
    });

    it('resets page to 0', () => {
      component.page.set(3);
      component.onColumnSearch({ field: 'dc:title', value: 'search' });
      expect(component.page()).toBe(0);
    });

    it('handles date column by setting min/max fields', () => {
      component.onColumnSearch({
        field: 'dc:created',
        value: '2024-01-15',
        column: makeColumn({ searchInputType: 'date' }),
      });
      expect(component.columnFilters()['dublincore_created_min']).toContain('2024-01-15');
      expect(component.columnFilters()['dublincore_created_max']).toContain('2024-01-15');
    });

    it('clears min/max date fields when date value is empty', () => {
      component.columnFilters.set({
        dublincore_created_min: '2024-01-15T00:00:00Z',
        dublincore_created_max: '2024-01-15T23:59:59.999Z',
      });
      component.onColumnSearch({
        field: 'dc:created',
        value: '',
        column: makeColumn({ searchInputType: 'date' }),
      });
      expect(component.columnFilters()['dublincore_created_min']).toBeUndefined();
      expect(component.columnFilters()['dublincore_created_max']).toBeUndefined();
    });
  });

  describe('hasActiveTableState', () => {
    it('returns false when everything is at defaults', () => {
      component.columnFilters.set({});
      component.page.set(0);
      component.sortBy.set(NUXEO_SCHEMA_FIELDS.dc.created);
      component.sortOrder.set('desc');
      expect(component.hasActiveTableState()).toBeFalse();
    });

    it('returns true when column filters are set', () => {
      component.columnFilters.set({ 'dc:title': 'test' });
      expect(component.hasActiveTableState()).toBeTrue();
    });

    it('returns true when page is not 0', () => {
      component.page.set(2);
      expect(component.hasActiveTableState()).toBeTrue();
    });

    it('returns true when sortBy differs from default', () => {
      component.sortBy.set('dc:title');
      expect(component.hasActiveTableState()).toBeTrue();
    });

    it('returns true when sortOrder is asc', () => {
      component.sortOrder.set('asc');
      expect(component.hasActiveTableState()).toBeTrue();
    });
  });

  describe('resetTableFilters', () => {
    it('resets filters when state is active', () => {
      component.columnFilters.set({ 'dc:title': 'test' });
      component.page.set(2);
      component.resetTableFilters();
      expect(component.columnFilters()).toEqual({});
      expect(component.page()).toBe(0);
    });

    it('does nothing when no active state', () => {
      component.columnFilters.set({});
      component.page.set(0);
      component.sortBy.set(NUXEO_SCHEMA_FIELDS.dc.created);
      component.sortOrder.set('desc');
      const initialFilters = component.columnFilters();
      component.resetTableFilters();
      expect(component.columnFilters()).toEqual(initialFilters);
    });
  });

  describe('openAssignUserOrg', () => {
    it('sets isAssignUserOpened to the given id', () => {
      component.openAssignUserOrg('doc-uid-1');
      expect(component.isAssignUserOpened()).toBe('doc-uid-1');
    });
  });

  describe('deleteItem', () => {
    it('does nothing when isDeleteDialogOpened is null', () => {
      component.isDeleteDialogOpened.set(null);
      component.deleteItem();
      expect(apiSpy.deleteDocument).not.toHaveBeenCalled();
    });

    it('calls deleteDocument and removes item from casesSig', () => {
      component.casesSig.set([
        { id: 'doc-1', title: 'Test' },
        { id: 'doc-2', title: 'Other' },
      ]);
      component.total.set(2);
      component.isDeleteDialogOpened.set({ id: 'doc-1' });
      component.deleteItem();
      expect(apiSpy.deleteDocument).toHaveBeenCalledWith('doc-1');
      expect(component.casesSig().length).toBe(1);
      expect(component.total()).toBe(1);
    });
  });

  describe('updateTableConfig', () => {
    it('calls resolveCasesTableConfig and sets tableConfig', () => {
      constantSpy.resolveCasesTableConfig.and.returnValue({
        config: [makeColumn({ id: 'title', key: 'title', label: 'Titel' })],
        actionsHeader: 'Actions',
      });
      component.updateTableConfig();
      expect(component.tableConfig.length).toBe(1);
      expect(component.tableButtonColName()).toBe('Actions');
    });
  });

  describe('combinedColumnFilters', () => {
    it('merges internal and external filters', () => {
      component.columnFilters.set({ 'dc:title': 'test' });
      fixture.componentRef.setInput('externalColumnFilters', { arende_arendestatus: ['open'] });
      fixture.detectChanges();
      const combined = component.combinedColumnFilters();
      expect(combined['dc:title']).toBe('test');
      expect(combined['arende_arendestatus']).toEqual(['open']);
    });
  });

  describe('onColumnSearch statusFilterChange output', () => {
    it('emits statusFilterChange when field is arende_arendestatus with array value', () => {
      let emitted: string[] | undefined;
      component.statusFilterChange.subscribe(v => (emitted = v));
      component.onColumnSearch({ field: 'arende_arendestatus', value: ['open', 'closed'] });
      expect(emitted).toEqual(['open', 'closed']);
    });

    it('emits statusFilterChange when field is arende_arendestatus with string value', () => {
      let emitted: string[] | undefined;
      component.statusFilterChange.subscribe(v => (emitted = v));
      component.onColumnSearch({ field: 'arende_arendestatus', value: 'open' });
      expect(emitted).toEqual(['open']);
    });

    it('emits empty array for arende_arendestatus with empty string', () => {
      let emitted: string[] | undefined;
      component.statusFilterChange.subscribe(v => (emitted = v));
      component.onColumnSearch({ field: 'arende_arendestatus', value: '' });
      expect(emitted).toEqual([]);
    });

    it('does NOT emit statusFilterChange for other fields', () => {
      let emitted: string[] | undefined;
      component.statusFilterChange.subscribe(v => (emitted = v));
      component.onColumnSearch({ field: 'dc:title', value: 'hello' });
      expect(emitted).toBeUndefined();
    });

    it('deletes empty array value for a non-status field', () => {
      component.columnFilters.set({ 'dc:title': 'x' });
      component.onColumnSearch({ field: 'dc:title', value: [] });
      expect(component.columnFilters()['dc:title']).toBeUndefined();
    });
  });

  describe('editFormReady', () => {
    it('returns false when editDoc is null', () => {
      component.editDoc.set(null);
      expect(component.editFormReady()).toBeFalse();
    });

    it('returns false when some required suggestion keys are missing', () => {
      component.editDoc.set(makeNuxeoDocument() as unknown as NuxeoDocument<ArendeExtendedProperties>);
      component.suggestions.set({ riktning: [] });
      expect(component.editFormReady()).toBeFalse();
    });

    it('returns true when editDoc is set and all required suggestion keys are present', () => {
      component.editDoc.set(makeNuxeoDocument() as unknown as NuxeoDocument<ArendeExtendedProperties>);
      component.suggestions.set({
        riktning: [],
        secret: [],
        secretClass: [],
        lagrum: [],
        arendestatus: [],
        handlaggningsstatus: [],
        beslutTyp: [],
        beredningsbeslut: [],
        organization: [],
        bevaras: [],
      });
      expect(component.editFormReady()).toBeTrue();
    });
  });

  describe('editConfig', () => {
    it('returns empty array when editDoc is null', () => {
      component.editDoc.set(null);
      expect(component.editConfig()).toEqual([]);
    });

    it('returns non-empty array when editDoc is set', () => {
      component.editDoc.set(makeNuxeoDocument<ArendeExtendedProperties>({ uid: 'doc-uid' }));
      const config = component.editConfig();
      expect(Array.isArray(config)).toBeTrue();
    });
  });

  describe('getFullNames', () => {
    it('returns empty string when props is undefined', () => {
      expect(component.getFullNames(undefined)).toBe('');
    });

    it('returns firstName + lastName when props is provided', () => {
      const user = { properties: { firstName: 'Anna', lastName: 'Berg' } } as unknown as NxUser;
      expect(component.getFullNames(user)).toBe('Anna Berg');
    });
  });

  describe('getDefaultColumnOptions', () => {
    it('maps tableConfig to TableColOption array', () => {
      component.tableConfig = [
        makeColumn({ key: 'title', label: 'Titel', visible: true }),
        makeColumn({ key: 'status', label: 'Status', visible: false }),
      ];
      const opts = component.getDefaultColumnOptions();
      expect(opts.length).toBe(2);
      expect(opts[0].id).toBe('title');
      expect(opts[0].label).toBe('Titel');
      expect(opts[0].visible).toBeTrue();
      expect(opts[1].visible).toBeFalse();
    });

    it('defaults visible to true when column.visible is undefined', () => {
      component.tableConfig = [makeColumn({ key: 'title', label: 'T', visible: undefined })];
      const opts = component.getDefaultColumnOptions();
      expect(opts[0].visible).toBeTrue();
    });
  });

  describe('toTableItem via fetch — my-cases tab', () => {
    beforeEach(() => {
      authMock.username.set('user1');
      authMock.activeRole.set('ROLE_ADMIN');
    });

    it('maps a document to a TableItem for my-cases tab', () => {
      const props: ArendeExtendedProperties = {
        'arende:arendenummer': 'ARN-001',
        'arende:arendestatus': {
          id: 'status-1',
          properties: { id: 'open', label: 'Open' },
        } as unknown as DirectoryEntry,
        'arende:riktning': {
          id: 'rik-1',
          properties: { label: 'Inkommande', id: 'inkommande' },
        } as unknown as DirectoryEntry,
        'arende:sekretess': { id: 'sek-1', properties: { label: 'Nej', id: 'nej' } } as unknown as DirectoryEntry,
        'arende:handlaggningsstatus': {
          id: 'hls-1',
          properties: { id: 'paborjad', label: 'Påbörjad' },
        } as unknown as DirectoryEntry,
        'arende:behorighetsstatus': {
          id: 'beh-1',
          properties: { label: 'Normal', id: 'normal' },
        } as unknown as DirectoryEntry,
        'arende:arendetyp': { uid: 'type-1', title: 'Tillståndsärende' } as unknown as NuxeoDocument,
        'arende:ansvarigOrganisatoriskEnhet': { uid: 'unit-1', title: 'Enhet A' } as unknown as NuxeoDocument,
        'arende:ansvarigHandlaggare': {
          'entity-type': 'user',
          id: 'hxyz',
          properties: { firstName: 'Anna', lastName: 'Berg' },
        },
        'arende:motpart': { motpart: 'Sökanden' },
        'arende:medhandlaggare': [],
        'arende:granskare': [],
      };
      const doc = makeNuxeoDocument<ArendeExtendedProperties>({
        uid: 'doc-uid-cases',
        title: 'Test ärende',
        state: 'open',
        properties: props,
      });
      casesSpy.listByTab.and.returnValue(of(makeSearchResult({ entries: [doc], totalSize: 1 })));
      fixture.componentRef.setInput('tab', 'my-cases');
      fixture.detectChanges();

      const rows = component.casesSig();
      expect(rows.length).toBe(1);
      expect(rows[0]['id']).toBe('doc-uid-cases');
      expect(rows[0]['title']).toBe('Test ärende');
      expect(rows[0]['arendenummer']).toBe('ARN-001');
      expect(rows[0]['handlaggare']).toBe('Anna Berg');
      expect(rows[0]['motpart']).toBe('Sökanden');
    });

    it('uses fallback dashes when optional props are absent', () => {
      const doc = makeNuxeoDocument<ArendeExtendedProperties>({
        uid: 'doc-uid-fallback',
        title: undefined,
        state: undefined,
        properties: {},
      });
      casesSpy.listByTab.and.returnValue(of(makeSearchResult({ entries: [doc], totalSize: 1 })));
      fixture.componentRef.setInput('tab', 'my-cases');
      fixture.detectChanges();

      const rows = component.casesSig();
      expect(rows[0]['title']).toBe('—');
      expect(rows[0]['arendenummer']).toBe('—');
      expect(rows[0]['handlaggare']).toBe('—');
      expect(rows[0]['motpart']).toBe('—');
    });
  });

  describe('toTableItem via fetch — my-utkasts tab', () => {
    beforeEach(() => {
      authMock.username.set('user1');
      authMock.activeRole.set('ROLE_ADMIN');
    });

    it('maps a document for my-utkasts tab', () => {
      const props: ArendeExtendedProperties = {
        'dc:creator': makeNxUser({ id: 'u1', properties: { firstName: 'Bo', lastName: 'Lund' } }),
        'dc:lastContributor': makeNxUser({ id: 'u2', properties: { firstName: 'Carin', lastName: 'Ek' } }),
        'dc:contributors': [],
        'dc:created': '2024-03-01T10:00:00Z',
        'dc:modified': '2024-03-10T10:00:00Z',
      };
      const doc = makeNuxeoDocument<ArendeExtendedProperties>({
        uid: 'utkast-1',
        title: 'Utkast titel',
        state: 'draft',
        properties: props,
      });
      casesSpy.listByTab.and.returnValue(of(makeSearchResult({ entries: [doc], totalSize: 1 })));
      fixture.componentRef.setInput('tab', 'my-utkasts');
      fixture.detectChanges();

      const rows = component.casesSig();
      expect(rows.length).toBe(1);
      expect(rows[0]['id']).toBe('utkast-1');
      expect(rows[0]['title']).toBe('Utkast titel');
    });
  });

  describe('toTableItem via fetch — all-docs tab', () => {
    beforeEach(() => {
      authMock.username.set('user1');
      authMock.activeRole.set('ROLE_ADMIN');
    });

    it('maps a document for all-docs tab', () => {
      const props: ArendeExtendedProperties = {
        'arende:arendenummer': 'ARN-ALL-001',
        'arende:arendestatus': { id: 's1', properties: { id: 'open', label: 'Open' } } as unknown as DirectoryEntry,
        'arende:medhandlaggare': [],
        'arende:granskare': [],
        'arende:ansvarigHandlaggare': {
          'entity-type': 'user',
          id: 'hxyz',
          properties: { firstName: 'Diana', lastName: 'Holm' },
        },
      };
      const doc = makeNuxeoDocument<ArendeExtendedProperties>({
        uid: 'all-doc-1',
        title: 'All docs ärende',
        state: 'open',
        properties: props,
      });
      casesSpy.listByTab.and.returnValue(of(makeSearchResult({ entries: [doc], totalSize: 1 })));
      fixture.componentRef.setInput('tab', 'all-docs');
      fixture.detectChanges();

      const rows = component.casesSig();
      expect(rows.length).toBe(1);
      expect(rows[0]['id']).toBe('all-doc-1');
      expect(rows[0]['arendenummer']).toBe('ARN-ALL-001');
      expect(rows[0]['handlaggare']).toBe('Diana Holm');
    });
  });

  describe('toTableItem via fetch — ready-to-close tab', () => {
    beforeEach(() => {
      authMock.username.set('user1');
      authMock.activeRole.set('ROLE_ADMIN');
    });

    it('maps a document for ready-to-close tab', () => {
      const props: ArendeExtendedProperties = {
        'arende:arendenummer': 'ARN-RTC-001',
        'arende:arendestatus': {
          id: 's1',
          properties: { id: 'readyToClose', label: 'Redo att stänga' },
        } as unknown as DirectoryEntry,
        'arende:arendetyp': { uid: 'type-1', title: 'Tillståndsärende' } as unknown as NuxeoDocument,
        'arende:riktning': {
          id: 'rik-1',
          properties: { label: 'Inkommande', id: 'inkommande' },
        } as unknown as DirectoryEntry,
        'arende:ansvarigOrganisatoriskEnhet': { uid: 'unit-1', title: 'Enhet B' } as unknown as NuxeoDocument,
        'arende:ansvarigHandlaggare': {
          'entity-type': 'user',
          id: 'hxyz',
          properties: { firstName: 'Erik', lastName: 'Sand' },
        },
        'arende:motpart': { motpart: 'Motpart AB' },
        'arende:medhandlaggare': [],
        'arende:granskare': [],
      };
      const doc = makeNuxeoDocument<ArendeExtendedProperties>({
        uid: 'rtc-1',
        title: 'Redo ärende',
        state: 'readyToClose',
        properties: props,
      });
      casesSpy.listByTab.and.returnValue(of(makeSearchResult({ entries: [doc], totalSize: 1 })));
      fixture.componentRef.setInput('tab', 'ready-to-close');
      fixture.detectChanges();

      const rows = component.casesSig();
      expect(rows.length).toBe(1);
      expect(rows[0]['id']).toBe('rtc-1');
      expect(rows[0]['arendenummer']).toBe('ARN-RTC-001');
      expect(rows[0]['arendepart']).toBe('Motpart AB');
    });
  });

  describe('toTableItem via fetch — e-post tab', () => {
    beforeEach(() => {
      authMock.username.set('user1');
      authMock.activeRole.set('ROLE_ADMIN');
    });

    it('maps a document for e-post tab', () => {
      const props: ArendeExtendedProperties = {
        'mail:sender': 'sender@example.com',
        'mail:recipients': ['rec@example.com'],
        'dc:created': '2024-05-01T08:00:00Z',
        'dc:modified': '2024-05-02T08:00:00Z',
        'dc:lastContributor': makeNxUser({ id: 'u3', properties: { firstName: 'Fanny', lastName: 'Dal' } }),
      };
      const doc = makeNuxeoDocument<ArendeExtendedProperties>({
        uid: 'epost-1',
        title: 'Epost titel',
        type: 'Mail',
        state: 'new',
        properties: props,
      });
      casesSpy.listByTab.and.returnValue(of(makeSearchResult({ entries: [doc], totalSize: 1 })));
      fixture.componentRef.setInput('tab', 'e-post');
      fixture.detectChanges();

      const rows = component.casesSig();
      expect(rows.length).toBe(1);
      expect(rows[0]['id']).toBe('epost-1');
      expect(rows[0]['sender']).toBe('sender@example.com');
      expect(rows[0]['lastContributor']).toBe('Fanny Dal');
    });
  });

  describe('toTableItem via fetch — scans tab', () => {
    beforeEach(() => {
      authMock.username.set('user1');
      authMock.activeRole.set('ROLE_ADMIN');
    });

    it('maps a document for scans tab', () => {
      const props: ArendeExtendedProperties = {
        'dc:created': '2024-06-01T08:00:00Z',
        'dc:modified': '2024-06-02T08:00:00Z',
        'dc:lastContributor': makeNxUser({ id: 'u4', properties: { firstName: 'Gustav', lastName: 'Vik' } }),
        'dc:description': 'A scan description',
      };
      const doc = makeNuxeoDocument<ArendeExtendedProperties>({
        uid: 'scan-1',
        title: 'Scan doc',
        type: 'Scan',
        state: 'new',
        properties: props,
      });
      casesSpy.listByTab.and.returnValue(of(makeSearchResult({ entries: [doc], totalSize: 1 })));
      fixture.componentRef.setInput('tab', 'scans');
      fixture.detectChanges();

      const rows = component.casesSig();
      expect(rows.length).toBe(1);
      expect(rows[0]['id']).toBe('scan-1');
      expect(rows[0]['lastContributor']).toBe('Gustav Vik');
    });
  });

  describe('toTableItem via fetch — default tab', () => {
    beforeEach(() => {
      authMock.username.set('user1');
      authMock.activeRole.set('ROLE_ADMIN');
    });

    it('maps a document for an unknown tab using default case', () => {
      const props: ArendeExtendedProperties = {
        'arende:arendenummer': 'ARN-DEF-001',
        'arende:arendestatus': {
          id: 's1',
          properties: { id: 'someStatus', label: 'Some' },
        } as unknown as DirectoryEntry,
        'arende:ansvarigHandlaggare': {
          'entity-type': 'user',
          id: 'hxyz',
          properties: { firstName: 'Helga', lastName: 'Pers' },
        },
      };
      const doc = makeNuxeoDocument<ArendeExtendedProperties>({
        uid: 'def-1',
        title: 'Default ärende',
        state: 'open',
        properties: props,
      });
      casesSpy.listByTab.and.returnValue(of(makeSearchResult({ entries: [doc], totalSize: 1 })));
      fixture.componentRef.setInput('tab', 'some-unknown-tab');
      fixture.detectChanges();

      const rows = component.casesSig();
      expect(rows.length).toBe(1);
      expect(rows[0]['id']).toBe('def-1');
      expect(rows[0]['handlingsnummer']).toBe('ARN-DEF-001');
      expect(rows[0]['avandare']).toBe('Helga Pers');
    });

    it('uses fallback dashes in default case when props are absent', () => {
      const doc = makeNuxeoDocument({
        uid: 'def-2',
        title: undefined,
        properties: {},
      });
      casesSpy.listByTab.and.returnValue(of(makeSearchResult({ entries: [doc], totalSize: 1 })));
      fixture.componentRef.setInput('tab', 'another-unknown-tab');
      fixture.detectChanges();

      const rows = component.casesSig();
      expect(rows[0]['title']).toBe('—');
      expect(rows[0]['handlingsnummer']).toBe('—');
      expect(rows[0]['avandare']).toBe('—');
    });
  });

  describe('toTableItem via fetch — my-tasks tab (task items)', () => {
    beforeEach(() => {
      authMock.username.set('user1');
      authMock.activeRole.set('ROLE_ADMIN');
    });

    it('maps workflow tasks for my-tasks tab', () => {
      const taskResult = makeSearchResult({
        entries: [
          {
            workflowModelName: 'SomeModel',
            workflowTitle: 'task-title',
            targetDocumentIds: [{ uid: 'doc-1', title: 'Doc Title' }],
            created: new Date('2024-01-01'),
            workflowInitiator: 'user1',
            state: 'running',
            actors: [],
            variables: { deadline: null, paminnelse: null, beskrivning: 'bskr' },
          },
        ] as unknown as NuxeoDocument[],
        resultsCount: 1,
      });
      (casesSpy.getAllTasks as jasmine.Spy).and.returnValue(of(taskResult));
      storeMock.getValue.and.returnValue('Translated Label');
      fixture.componentRef.setInput('tab', 'my-tasks');
      fixture.detectChanges();

      const rows = component.casesSig();
      expect(rows.length).toBe(1);
      expect(rows[0]['docTitel']).toBe('Doc Title');
      expect(rows[0]['description']).toBe('bskr');
    });
  });

  describe('toTableItem via fetch — my-monitoring tab (deadline tasks)', () => {
    beforeEach(() => {
      authMock.username.set('user1');
      authMock.activeRole.set('ROLE_ADMIN');
    });

    it('filters only DeadlineOchPaminnelse tasks for my-monitoring tab', () => {
      const taskResult = makeSearchResult({
        entries: [
          {
            workflowModelName: 'DeadlineOchPaminnelse',
            workflowTitle: 'deadline-wf',
            targetDocumentIds: [{ uid: 'doc-a', title: 'A' }],
            created: new Date('2024-01-01'),
            workflowInitiator: 'user1',
            state: 'running',
            actors: [],
            variables: {
              deadline: new Date('2024-12-31'),
              paminnelse: new Date('2024-12-25'),
              valdAtgard: { properties: { label: 'Åtgärd' } },
            },
          },
          {
            workflowModelName: 'OtherModel',
            workflowTitle: 'other-wf',
            targetDocumentIds: [{ uid: 'doc-b', title: 'B' }],
            created: new Date('2024-01-01'),
            workflowInitiator: 'user1',
            state: 'running',
            actors: [],
            variables: { deadline: null, paminnelse: null },
          },
        ] as unknown as NuxeoDocument[],
        resultsCount: 2,
      });
      (casesSpy.getAllTasks as jasmine.Spy).and.returnValue(of(taskResult));
      fixture.componentRef.setInput('tab', 'my-monitoring');
      fixture.detectChanges();

      const rows = component.casesSig();
      expect(rows.length).toBe(1);
      expect(rows[0]['docTitel']).toBe('A');
    });
  });

  describe('formatEditForm', () => {
    beforeEach(() => {
      authMock.username.set('user1');
      authMock.activeRole.set('ROLE_ADMIN');
    });

    it('does nothing when editDoc is null', () => {
      component.editDoc.set(null);
      component.formatEditForm({ arendeDetails: {} } as unknown as EditCaseResult);
      expect(apiSpy.editDocument).not.toHaveBeenCalled();
    });

    it('calls editDocument and sets success notification on success', () => {
      const doc = makeNuxeoDocument<ArendeExtendedProperties>({ uid: 'edit-uid-1' });
      component.editDoc.set(doc);
      apiSpy.editDocument.and.returnValue(of(makeNuxeoDocument()));
      const notifSpy = spyOn(storeMock.notification, 'set').and.callThrough();

      component.formatEditForm({
        arendeDetails: { registered: [new Date('2026-01-01')] },
        motpartContacts: [{ motpart: 'Test AB' }],
        medhandlaggare: [],
        internArendereferens: [],
        internHandlingsreferens: [],
      } as unknown as EditCaseResult);

      expect(apiSpy.editDocument).toHaveBeenCalledWith('edit-uid-1', jasmine.any(Object));
      expect(notifSpy).toHaveBeenCalledWith(jasmine.objectContaining({ variation: 'success' }));
      expect(component.isEditDialogOpen()).toBeFalse();
    });

    it('sets danger notification on editDocument error', () => {
      const doc = makeNuxeoDocument<ArendeExtendedProperties>({ uid: 'edit-uid-err' });
      component.editDoc.set(doc);
      apiSpy.editDocument.and.returnValue(
        throwError(() => ({ error: { violations: [{ message: 'Validation error' }] } }))
      );
      const notifSpy = spyOn(storeMock.notification, 'set').and.callThrough();

      component.formatEditForm({
        arendeDetails: {},
        motpartContacts: [{ motpart: 'Test AB' }],
        medhandlaggare: [],
        internArendereferens: [],
        internHandlingsreferens: [],
      } as unknown as EditCaseResult);

      expect(notifSpy).toHaveBeenCalledWith(
        jasmine.objectContaining({ variation: 'danger', text: 'Validation error' })
      );
    });

    it('uses fallback save error message when violations is absent', () => {
      const doc = makeNuxeoDocument<ArendeExtendedProperties>({ uid: 'edit-uid-err2' });
      component.editDoc.set(doc);
      apiSpy.editDocument.and.returnValue(throwError(() => ({})));
      const notifSpy = spyOn(storeMock.notification, 'set').and.callThrough();

      component.formatEditForm({
        arendeDetails: {},
        motpartContacts: [{ motpart: 'Test AB' }],
        medhandlaggare: [],
        internArendereferens: [],
        internHandlingsreferens: [],
      } as unknown as EditCaseResult);

      expect(notifSpy).toHaveBeenCalledWith(jasmine.objectContaining({ variation: 'danger' }));
    });
  });

  describe('updateDropdownValues', () => {
    it('does nothing when fieldName is not organization', () => {
      const doc = makeNuxeoDocument<ArendeExtendedProperties>({ uid: 'org-doc', parentRef: 'parent-ref-1' });
      component.editDoc.set(doc);
      component.updateDropdownValues({ fieldName: 'other', value: 'val' });

      expect(component.suggestions()).toEqual({});
    });

    it('does nothing when editDoc has no parentRef', () => {
      component.editDoc.set(
        makeNuxeoDocument({
          uid: 'no-parent',
          parentRef: undefined,
        }) as unknown as NuxeoDocument<ArendeExtendedProperties>
      );
      component.updateDropdownValues({ fieldName: 'organization', value: 'some-value' });
      expect(component.suggestions()).toEqual({});
    });

    it('updates organization suggestions on success', () => {
      const doc = makeNuxeoDocument<ArendeExtendedProperties>({ uid: 'org-doc2', parentRef: 'parent-ref-2' });
      component.editDoc.set(doc);
      const editOptsSpy = TestBed.inject(CaseEditOptionsService) as jasmine.SpyObj<CaseEditOptionsService>;
      (editOptsSpy.getDocumentSuggestions as jasmine.Spy).and.returnValue(of([{ id: 'org-1', label: 'Org 1' }]));

      component.updateDropdownValues({ fieldName: 'organization', value: 'sub-value' });

      expect(component.suggestions()['organization']).toEqual([{ id: 'org-1', label: 'Org 1' }]);
    });

    it('sets danger notification on organization suggestions error', () => {
      const doc = makeNuxeoDocument<ArendeExtendedProperties>({ uid: 'org-doc3', parentRef: 'parent-ref-3' });
      component.editDoc.set(doc);
      const editOptsSpy = TestBed.inject(CaseEditOptionsService) as jasmine.SpyObj<CaseEditOptionsService>;
      (editOptsSpy.getDocumentSuggestions as jasmine.Spy).and.returnValue(throwError(() => ({ status: 500 })));
      const notifSpy = spyOn(storeMock.notification, 'set').and.callThrough();

      component.updateDropdownValues({ fieldName: 'organization', value: 'bad-value' });

      expect(notifSpy).toHaveBeenCalledWith(jasmine.objectContaining({ variation: 'danger' }));
      expect(component.suggestions()['organization']).toEqual([]);
    });
  });

  describe('openCreateHandlingDialog', () => {
    beforeEach(() => {
      authMock.username.set('user1');
      authMock.activeRole.set('ROLE_ADMIN');
    });

    it('opens the create handling dialog and sets attachments', () => {
      const fullDoc = makeNuxeoDocument({
        uid: 'mail-uid',
        properties: {
          'files:files': [{ file: { name: 'attachment1.pdf' } }, { file: { name: 'attachment2.pdf' } }],
        },
      });
      apiSpy.getDocumentById.and.returnValue(of(fullDoc));

      component.openCreateHandlingDialog('mail-uid');

      expect(component.isCreateHandlingOpen()).toBeTrue();
      expect(component.attachmentsOptions().length).toBe(2);
      expect(component.attachmentsOptions()[0].label).toBe('attachment1.pdf');
    });

    it('uses fallback label when file name is absent', () => {
      const fullDoc = makeNuxeoDocument({
        uid: 'mail-uid-2',
        properties: {
          'files:files': [{ file: {} }],
        },
      });
      apiSpy.getDocumentById.and.returnValue(of(fullDoc));

      component.openCreateHandlingDialog('mail-uid-2');

      expect(component.attachmentsOptions()[0].label).toBe('Bilaga 1');
    });

    it('handles document with no files:files property', () => {
      const fullDoc = makeNuxeoDocument({ uid: 'mail-uid-3', properties: {} });
      apiSpy.getDocumentById.and.returnValue(of(fullDoc));

      component.openCreateHandlingDialog('mail-uid-3');

      expect(component.attachmentsOptions()).toEqual([]);
      expect(component.isCreateHandlingOpen()).toBeTrue();
    });
  });

  describe('exportToCSV', () => {
    it('calls exportToCSV with correct parameters when columns are exportable', () => {
      authMock.username.set('user1');
      authMock.activeRole.set('ROLE_ADMIN');
      const csvSpy = TestBed.inject(CSVExportService) as jasmine.SpyObj<CSVExportService>;
      csvSpy.getExportColumns.and.returnValue([{ header: 'Titel', field: 'title' }]);

      component.exportToCSV([makeColumn({ key: 'title', label: 'Titel' })]);

      expect(csvSpy.exportToCSV).toHaveBeenCalled();
    });

    it('calls notifyNoExportableColumns when no exportable columns', () => {
      authMock.username.set('user1');
      authMock.activeRole.set('ROLE_ADMIN');
      const csvSpy = TestBed.inject(CSVExportService) as jasmine.SpyObj<CSVExportService>;
      csvSpy.getExportColumns.and.returnValue([]);

      component.exportToCSV([makeColumn({ key: 'isTrashed', label: 'Is Trashed' })]);

      expect(csvSpy.notifyNoExportableColumns).toHaveBeenCalled();
    });
  });

  describe('pickCreatedAggBuckets — branches', () => {
    beforeEach(() => {
      authMock.username.set('user1');
      authMock.activeRole.set('ROLE_ADMIN');
    });

    it('emits extendedBuckets when buckets are empty but extendedBuckets have items', () => {
      let emitted: AggBucket[] | undefined;
      component.createdAggBucketsChange.subscribe(v => (emitted = v));
      fixture.componentRef.setInput('loadCreatedAggs', false);

      const resultWithExtended = makeSearchResult({
        entries: [],
        totalSize: 0,
        aggregations: {
          dublincore_created_agg: {
            buckets: [],
            extendedBuckets: [{ key: 'ext-key', docCount: 5 }],
          },
        } as unknown as Aggregations,
      });
      casesSpy.listByTab.and.returnValue(of(resultWithExtended));
      fixture.componentRef.setInput('tab', 'my-cases');
      fixture.detectChanges();

      expect(emitted).toEqual([{ key: 'ext-key', docCount: 5 }]);
    });

    it('emits empty array when both buckets and extendedBuckets are empty', () => {
      let emitted: AggBucket[] | undefined;
      component.createdAggBucketsChange.subscribe(v => (emitted = v));
      fixture.componentRef.setInput('loadCreatedAggs', false);

      const resultWithEmpty = makeSearchResult({
        entries: [],
        totalSize: 0,
        aggregations: {
          dublincore_created_agg: {
            buckets: [],
            extendedBuckets: [],
          },
        } as unknown as Aggregations,
      });
      casesSpy.listByTab.and.returnValue(of(resultWithEmpty));
      fixture.componentRef.setInput('tab', 'my-cases');
      fixture.detectChanges();

      expect(emitted).toEqual([]);
    });
  });

  describe('fetch — loadCreatedAggs=true path', () => {
    beforeEach(() => {
      authMock.username.set('user1');
      authMock.activeRole.set('ROLE_ADMIN');
    });

    it('does not emit createdAggBuckets from fetch when shouldLoadAggs is true', () => {
      let _emitted: AggBucket[] | undefined;
      component.createdAggBucketsChange.subscribe(v => (_emitted = v));
      fixture.componentRef.setInput('loadCreatedAggs', true);

      const resultWithAgg = makeSearchResult({
        entries: [],
        totalSize: 5,
        aggregations: {
          dublincore_created_agg: {
            buckets: [{ key: 'k', docCount: 5 }],
            extendedBuckets: [],
          },
        } as unknown as Aggregations,
      });
      casesSpy.listByTab.and.returnValue(of(resultWithAgg));
      casesSpy.getCreatedAggBucketsByTab.and.returnValue(of([{ key: 'from-agg', docCount: 3 }]));
      fixture.componentRef.setInput('tab', 'my-cases');
      fixture.detectChanges();

      expect(component.total()).toBe(5);
    });
  });

  describe('fetch — catchError path', () => {
    beforeEach(() => {
      authMock.username.set('user1');
      authMock.activeRole.set('ROLE_ADMIN');
    });

    it('sets empty casesSig and zero total on listByTab error', () => {
      casesSpy.listByTab.and.returnValue(throwError(() => new Error('fetch failed')));
      fixture.componentRef.setInput('tab', 'my-cases');
      fixture.detectChanges();

      expect(component.casesSig()).toEqual([]);
      expect(component.total()).toBe(0);
      expect(component.loading()).toBeFalse();
    });

    it('sets empty casesSig on getAllTasks error', () => {
      casesSpy.getAllTasks.and.returnValue(throwError(() => new Error('tasks failed')));
      fixture.componentRef.setInput('tab', 'my-tasks');
      fixture.detectChanges();

      expect(component.casesSig()).toEqual([]);
      expect(component.total()).toBe(0);
    });
  });

  describe('fetchCreatedAggBuckets — error path', () => {
    beforeEach(() => {
      authMock.username.set('user1');
      authMock.activeRole.set('ROLE_ADMIN');
    });

    it('emits emptyAggBuckets on getCreatedAggBucketsByTab error', () => {
      let emitted: AggBucket[] | undefined;
      component.createdAggBucketsChange.subscribe(v => (emitted = v));
      casesSpy.getCreatedAggBucketsByTab.and.returnValue(throwError(() => new Error('agg failed')));
      fixture.componentRef.setInput('loadCreatedAggs', true);
      fixture.componentRef.setInput('tab', 'my-cases');
      fixture.detectChanges();

      expect(emitted).toEqual([]);
    });
  });

  describe('toRangeFieldBase — various field name branches', () => {
    it('maps dc:modified to dublincore_modified', () => {
      component.onColumnSearch({
        field: 'dc:modified',
        value: '2024-06-01',
        column: makeColumn({ searchInputType: 'date' }),
      });
      expect(component.columnFilters()['dublincore_modified_min']).toBeDefined();
      expect(component.columnFilters()['dublincore_modified_max']).toBeDefined();
    });

    it('normalizes field with colon replacement', () => {
      component.onColumnSearch({
        field: 'arende:arendenummer',
        value: '2024-06-15',
        column: makeColumn({ searchInputType: 'date' }),
      });
      expect(component.columnFilters()['arende_arendenummer_min']).toBeDefined();
    });

    it('handles already normalized field name (no colon)', () => {
      component.onColumnSearch({
        field: 'some_field',
        value: '2024-07-01',
        column: makeColumn({ searchInputType: 'date' }),
      });
      expect(component.columnFilters()['some_field_min']).toBeDefined();
    });
  });

  describe('openEditDialog — full flow', () => {
    beforeEach(() => {
      authMock.username.set('user1');
      authMock.activeRole.set('ROLE_ADMIN');
    });

    it('opens dialog, sets editDoc and loads suggestions', () => {
      const doc = makeNuxeoDocument<ArendeExtendedProperties>({
        uid: 'edit-dialog-uid',
        parentRef: 'parent-ref-dialog',
      });
      apiSpy.getDocumentById.and.returnValue(of(doc));
      const editOptsSpy = TestBed.inject(CaseEditOptionsService) as jasmine.SpyObj<CaseEditOptionsService>;
      (editOptsSpy.getDocumentSuggestions as jasmine.Spy).and.returnValue(of([{ id: 'opt1', label: 'Opt 1' }]));

      component.openEditDialog('edit-dialog-uid');

      expect(component.isEditDialogOpen()).toBeTrue();
      expect(component.editDoc()).toBeTruthy();
    });

    it('loads lagrum suggestions using pathStartsWith prefix', () => {
      const doc = makeNuxeoDocument<ArendeExtendedProperties>({
        uid: 'edit-dialog-uid2',
        parentRef: 'parent-ref-lagrum',
      });
      apiSpy.getDocumentById.and.returnValue(of(doc));
      const editOptsSpy = TestBed.inject(CaseEditOptionsService) as jasmine.SpyObj<CaseEditOptionsService>;
      (editOptsSpy.getDocumentSuggestions as jasmine.Spy).and.returnValue(of([]));
      (editOptsSpy.getLagrumSuggestions as jasmine.Spy).and.returnValue(of([]));

      fixture.componentRef.setInput('filters', { pathStartsWith: '/root/subfolder' });
      component.openEditDialog('edit-dialog-uid2');

      expect(editOptsSpy.getLagrumSuggestions).toHaveBeenCalledWith('/root');
    });
  });

  describe('loadSuggestions — error path', () => {
    beforeEach(() => {
      authMock.username.set('user1');
      authMock.activeRole.set('ROLE_ADMIN');
    });

    it('sets danger notification when a suggestion observable errors', () => {
      const doc = makeNuxeoDocument<ArendeExtendedProperties>({
        uid: 'sug-err-uid',
        parentRef: 'parent-ref-sug',
      });
      apiSpy.getDocumentById.and.returnValue(of(doc));
      const editOptsSpy = TestBed.inject(CaseEditOptionsService) as jasmine.SpyObj<CaseEditOptionsService>;
      (editOptsSpy.getDocumentSuggestions as jasmine.Spy).and.returnValue(of([]));

      (editOptsSpy.getDirectorySuggestions as jasmine.Spy).and.callFake((key: string) => {
        if (key === 'ArendeRiktning') return throwError(() => new Error('riktning failed'));
        return of([]);
      });

      const notifSpy = spyOn(storeMock.notification, 'set').and.callThrough();
      component.openEditDialog('sug-err-uid');

      expect(notifSpy).toHaveBeenCalledWith(jasmine.objectContaining({ variation: 'danger' }));
    });
  });

  describe('buildInternalContactsData — user shape variations', () => {
    beforeEach(() => {
      authMock.username.set('user1');
      authMock.activeRole.set('ROLE_ADMIN');
    });

    it('handles string user value (sets id from string)', () => {
      const props: ArendeExtendedProperties = {
        [NUXEO_SCHEMA_FIELDS.arende.ansvarigHandlaggare]: 'string-user-id' as unknown as NxUser,
        [NUXEO_SCHEMA_FIELDS.arende.medhandlaggare]: [],
        [NUXEO_SCHEMA_FIELDS.arende.ansvarigBeslutsfattare]: null as unknown as NxUser,
        [NUXEO_SCHEMA_FIELDS.arende.granskare]: [],
      };
      const doc = makeNuxeoDocument<ArendeExtendedProperties>({
        uid: 'internal-contacts-uid',
        parentRef: 'parent-ref-contacts',
        properties: props,
      });
      apiSpy.getDocumentById.and.returnValue(of(doc));
      const editOptsSpy = TestBed.inject(CaseEditOptionsService) as jasmine.SpyObj<CaseEditOptionsService>;
      (editOptsSpy.getDocumentSuggestions as jasmine.Spy).and.returnValue(of([]));
      (editOptsSpy.getDirectorySuggestions as jasmine.Spy).and.returnValue(of([]));

      component.openEditDialog('internal-contacts-uid');

      expect(component.internalContactsData()[0].name).toBe('string-user-id');
    });

    it('handles null user value (no id)', () => {
      const props: ArendeExtendedProperties = {
        [NUXEO_SCHEMA_FIELDS.arende.ansvarigHandlaggare]: null as unknown as NxUser,
        [NUXEO_SCHEMA_FIELDS.arende.medhandlaggare]: [],
        [NUXEO_SCHEMA_FIELDS.arende.ansvarigBeslutsfattare]: null as unknown as NxUser,
        [NUXEO_SCHEMA_FIELDS.arende.granskare]: [],
      };
      const doc = makeNuxeoDocument<ArendeExtendedProperties>({
        uid: 'internal-null-uid',
        parentRef: 'parent-ref-null',
        properties: props,
      });
      apiSpy.getDocumentById.and.returnValue(of(doc));
      const editOptsSpy = TestBed.inject(CaseEditOptionsService) as jasmine.SpyObj<CaseEditOptionsService>;
      (editOptsSpy.getDocumentSuggestions as jasmine.Spy).and.returnValue(of([]));
      (editOptsSpy.getDirectorySuggestions as jasmine.Spy).and.returnValue(of([]));

      component.openEditDialog('internal-null-uid');

      expect(component.internalContactsData()[0].name).toBeUndefined();
    });

    it('handles NxUser with email and company properties', () => {
      const props: ArendeExtendedProperties = {
        [NUXEO_SCHEMA_FIELDS.arende.ansvarigHandlaggare]: {
          'entity-type': 'user',
          id: 'u-email',
          properties: {
            firstName: 'Eva',
            lastName: 'Lind',
            email: 'eva@example.com',
            company: 'Acme',
          },
        },
        [NUXEO_SCHEMA_FIELDS.arende.medhandlaggare]: [],
        [NUXEO_SCHEMA_FIELDS.arende.ansvarigBeslutsfattare]: null as unknown as NxUser,
        [NUXEO_SCHEMA_FIELDS.arende.granskare]: [],
      };
      const doc = makeNuxeoDocument<ArendeExtendedProperties>({
        uid: 'internal-email-uid',
        parentRef: 'parent-ref-email',
        properties: props,
      });
      apiSpy.getDocumentById.and.returnValue(of(doc));
      const editOptsSpy = TestBed.inject(CaseEditOptionsService) as jasmine.SpyObj<CaseEditOptionsService>;
      (editOptsSpy.getDocumentSuggestions as jasmine.Spy).and.returnValue(of([]));
      (editOptsSpy.getDirectorySuggestions as jasmine.Spy).and.returnValue(of([]));

      component.openEditDialog('internal-email-uid');

      expect(component.internalContactsData()[0].email).toBe('eva@example.com');
      expect(component.internalContactsData()[0].org).toBe('Acme');
    });
  });

  describe('fetch — parentRef update', () => {
    beforeEach(() => {
      authMock.username.set('user1');
      authMock.activeRole.set('ROLE_ADMIN');
    });

    it('updates columnSearchParentRef when parentRef from result differs', () => {
      component.columnSearchParentRef.set('old-ref');
      const doc = makeNuxeoDocument<ArendeExtendedProperties>({
        uid: 'doc-ref-1',
        parentRef: 'new-parent-ref',
        properties: {},
      });
      casesSpy.listByTab.and.returnValue(of(makeSearchResult({ entries: [doc], totalSize: 1 })));
      fixture.componentRef.setInput('tab', 'my-cases');
      fixture.detectChanges();

      expect(component.columnSearchParentRef()).toBe('new-parent-ref');
    });

    it('does not update columnSearchParentRef when parentRef matches current', () => {
      component.columnSearchParentRef.set('same-ref');
      const doc = makeNuxeoDocument<ArendeExtendedProperties>({
        uid: 'doc-ref-2',
        parentRef: 'same-ref',
        properties: {},
      });
      casesSpy.listByTab.and.returnValue(of(makeSearchResult({ entries: [doc], totalSize: 1 })));
      fixture.componentRef.setInput('tab', 'my-cases');
      fixture.detectChanges();

      expect(component.columnSearchParentRef()).toBe('same-ref');
    });
  });

  describe('onColumnSearch — date with empty array value', () => {
    it('clears min/max when date value is an empty array', () => {
      component.columnFilters.set({
        dublincore_created_min: '2024-01-01T00:00:00Z',
        dublincore_created_max: '2024-01-01T23:59:59.999Z',
      });
      component.onColumnSearch({
        field: 'dc:created',
        value: [],
        column: makeColumn({ searchInputType: 'date' }),
      });
      expect(component.columnFilters()['dublincore_created_min']).toBeUndefined();
      expect(component.columnFilters()['dublincore_created_max']).toBeUndefined();
    });
  });

  describe('deleteItem — total does not go below 0', () => {
    beforeEach(() => {
      authMock.username.set('user1');
      authMock.activeRole.set('ROLE_ADMIN');
    });

    it('keeps total at 0 when deleting from 0-total', () => {
      component.casesSig.set([{ id: 'doc-del' }]);
      component.total.set(0);
      component.isDeleteDialogOpened.set({ id: 'doc-del' });
      component.deleteItem();
      expect(component.total()).toBe(0);
    });
  });

  describe('getDate', () => {
    it('returns formatted date string for a valid ISO date', () => {
      const result = component.getDate('2026-01-15T00:00:00Z');
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    it('returns fallback for null', () => {
      const result = component.getDate(null);
      expect(typeof result).toBe('string');
    });

    it('returns fallback for undefined', () => {
      const result = component.getDate(undefined);
      expect(typeof result).toBe('string');
    });
  });

  describe('updateDocument', () => {
    beforeEach(() => {
      authMock.username.set('user1');
      authMock.activeRole.set('ROLE_ADMIN');
    });

    it('triggers a fetch via updateDocument', () => {
      (casesSpy.listByTab as jasmine.Spy).calls.reset();
      fixture.componentRef.setInput('tab', 'my-cases');
      fixture.detectChanges();
      (casesSpy.listByTab as jasmine.Spy).calls.reset();

      component.updateDocument();

      expect(casesSpy.listByTab).toHaveBeenCalled();
    });
  });

  describe('effect — tab change resets columnSearch', () => {
    beforeEach(() => {
      authMock.username.set('user1');
      authMock.activeRole.set('ROLE_ADMIN');
    });

    it('resets column filters when tab changes', () => {
      component.columnFilters.set({ 'dc:title': 'test-value' });
      fixture.componentRef.setInput('tab', 'my-cases');
      fixture.detectChanges();
      fixture.componentRef.setInput('tab', 'all-docs');
      fixture.detectChanges();

      expect(component.columnFilters()).toEqual({});
    });
  });

  describe('effect — specifiedPageSize update', () => {
    beforeEach(() => {
      authMock.username.set('user1');
      authMock.activeRole.set('ROLE_ADMIN');
    });

    it('does nothing when specifiedPageSize is falsy', () => {
      component.pageSize.set(25);
      fixture.componentRef.setInput('specifiedPageSize', 0);
      fixture.detectChanges();
      expect(component.pageSize()).toBe(25);
    });

    it('updates pageSize and resets page when specifiedPageSize differs', () => {
      component.pageSize.set(25);
      component.page.set(2);
      fixture.componentRef.setInput('specifiedPageSize', 50);
      fixture.detectChanges();
      expect(component.pageSize()).toBe(50);
      expect(component.page()).toBe(0);
    });

    it('does nothing when specifiedPageSize equals current pageSize', () => {
      component.pageSize.set(25);
      component.page.set(2);
      fixture.componentRef.setInput('specifiedPageSize', 25);
      fixture.detectChanges();
      expect(component.page()).toBe(2);
    });
  });

  describe('ngOnChanges', () => {
    it('calls updateTableConfig on changes', () => {
      const spy = spyOn(component, 'updateTableConfig').and.callThrough();
      component.ngOnChanges();
      expect(spy).toHaveBeenCalled();
    });
  });

  describe('mapTaskItem — allmanArbetsflode model name', () => {
    beforeEach(() => {
      authMock.username.set('user1');
      authMock.activeRole.set('ROLE_ADMIN');
    });

    it('uses valdAtgard label for allmanArbetsflode workflow', () => {
      const taskResult = makeSearchResult({
        entries: [
          {
            workflowModelName: 'AllmanArbetsflode',
            workflowTitle: 'general-wf',
            targetDocumentIds: [{ uid: 'doc-g', title: 'G' }],
            created: new Date('2024-01-01'),
            workflowInitiator: 'user1',
            state: 'running',
            actors: [{ properties: { firstName: 'User', lastName: 'One' } }],
            variables: {
              deadline: null,
              paminnelse: null,
              valdAtgard: { properties: { label: 'Specialåtgärd' } },
              beskrivning: 'A description',
            },
          },
        ] as unknown as NuxeoDocument[],
        resultsCount: 1,
      });
      (casesSpy.getAllTasks as jasmine.Spy).and.returnValue(of(taskResult));
      fixture.componentRef.setInput('tab', 'my-tasks');
      fixture.detectChanges();

      const rows = component.casesSig();
      expect(rows.length).toBe(1);

      expect(rows[0]['title']).toBeDefined();

      expect(rows[0]['actors']).toBeDefined();
    });
  });
});
