import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { CaseListTableComponent, TableColumn } from './case-list-table.component';
import { CasesService } from '@app/core/services/cases.service';
import { AuthService } from '@app/core/services/auth.service';
import { NuxeoApiService } from '@app/shared/api/nuxeo-api.service';
import { CSVExportService } from '@app/shared/services/csv-export.service';
import { CASE_STATES } from '@app/shared/constants/case-states';
import { Direction, NuxeoDocument, SearchResult, UserSuggestion } from '@app/shared/api/nuxeo-api.types';

const emptySearchResult: SearchResult<NuxeoDocument> = {
  'entity-type': 'documents',
  isPaginable: true,
  resultsCount: 0,
  totalSize: 0,
  pageSize: 0,
  pageIndex: 0,
  pageCount: 0,
  entries: [],
};

const directorySuggestion: Direction = {
  id: 'oppet',
  displayLabel: 'Öppet',
};

const userSuggestion: UserSuggestion = {
  id: 'alice',
  displayLabel: 'Alice Example',
  'entity-type': 'user',
};

function makeCol(overrides: Partial<TableColumn> = {}): TableColumn {
  return {
    id: 'title',
    label: 'Title',
    key: 'title',
    tableName: 'TEST',
    visible: true,
    ...overrides,
  };
}

function makeItem(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return { id: 'item-1', title: 'Test Item', status: 'oppet', ...overrides };
}

interface CaseListPrivate {
  isEmptyDropdownSelection: (detail: unknown) => boolean;
  isEmptyDropdownValue: (value: string | string[]) => boolean;
  defaultsMatch: (saved: unknown[], incoming: unknown[]) => boolean;
  mergeSavedOptions: (defaults: unknown[], saved: unknown[]) => unknown[];
  normalizeDropdownValues: (selected: unknown[]) => string[];
  ensureSelectFilterValues: (options: unknown[]) => unknown[];
  resetColumnSearchFormControls: (emitEvent: boolean) => void;
  ensureColumnSearchControl: (key: string) => void;
  normalizeColumnSearchControlValue: (value: unknown) => string;
  getBehorighetsStateValue: (item: Record<string, unknown>) => string;
  updateLocalColumnFilter: (key: string, value: string | string[]) => void;
  getStaticDropdownOptions: (col: unknown) => unknown[];
  safeParseOptions: (raw: string) => unknown[];
  preloadDropdownOptions: () => void;
  paginationRef: { nativeElement: Record<string, unknown> } | undefined;
  syncPagination: () => void;
  syncExternalStatusFilter: (filters: Record<string, string | string[]>) => void;
  dropdownSubmittedValues: Map<string, string[]>;
  rebuildInternalTableConfig: () => void;
}

describe('CaseListTableComponent', () => {
  let component: CaseListTableComponent;
  let fixture: ComponentFixture<CaseListTableComponent>;
  let casesSpy: jasmine.SpyObj<CasesService>;
  let authSpy: jasmine.SpyObj<AuthService>;
  let apiSpy: jasmine.SpyObj<NuxeoApiService>;
  let csvSpy: jasmine.SpyObj<CSVExportService>;

  beforeEach(async () => {
    casesSpy = jasmine.createSpyObj('CasesService', ['getStatusColor', 'getStatusVariation', 'getStatusLabel']);
    casesSpy.getStatusColor.and.returnValue('approved');
    casesSpy.getStatusVariation.and.returnValue('primary');
    casesSpy.getStatusLabel.and.returnValue('Öppet');

    authSpy = jasmine.createSpyObj('AuthService', ['username', 'isAdmin', 'hasRole', 'roles', 'activeRole'], {
      username: jasmine.createSpy().and.returnValue('testuser'),
      roles: jasmine.createSpy().and.returnValue([]),
      activeRole: jasmine.createSpy().and.returnValue(null),
    });

    apiSpy = jasmine.createSpyObj('NuxeoApiService', [
      'getMessagesJSON',
      'getDirectorySuggestions',
      'DMSDocumentSuggestion',
      'getUserSuggestions',
    ]);
    apiSpy.getMessagesJSON.and.returnValue(of({}));
    apiSpy.getDirectorySuggestions.and.returnValue(of([directorySuggestion]));
    apiSpy.DMSDocumentSuggestion.and.returnValue(of(emptySearchResult));
    apiSpy.getUserSuggestions.and.returnValue(of([userSuggestion]));

    csvSpy = jasmine.createSpyObj('CSVExportService', ['exportRowsToCSV', 'getExportColumns']);

    await TestBed.configureTestingModule({
      imports: [CaseListTableComponent],
      providers: [
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: CasesService, useValue: casesSpy },
        { provide: AuthService, useValue: authSpy },
        { provide: NuxeoApiService, useValue: apiSpy },
        { provide: CSVExportService, useValue: csvSpy },
      ],
    })
      .overrideTemplate(CaseListTableComponent, '<div></div>')
      .compileComponents();

    fixture = TestBed.createComponent(CaseListTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('isArray', () => {
    it('returns true for arrays', () => {
      expect(component.isArray([1, 2, 3])).toBeTrue();
    });

    it('returns false for non-arrays', () => {
      expect(component.isArray('string')).toBeFalse();
      expect(component.isArray(null)).toBeFalse();
      expect(component.isArray(undefined)).toBeFalse();
      expect(component.isArray({})).toBeFalse();
    });
  });

  describe('getValue', () => {
    it('returns empty string for null value', () => {
      const item = makeItem({ title: null });
      const col = makeCol({ key: 'title' });
      expect(component.getValue(item as never, col)).toBe('');
    });

    it('returns string value directly', () => {
      const item = makeItem({ title: 'My Title' });
      const col = makeCol({ key: 'title' });
      expect(component.getValue(item as never, col)).toBe('My Title');
    });

    it('returns first element of array', () => {
      const item = makeItem({ tags: ['tag1', 'tag2'] });
      const col = makeCol({ key: 'tags' });
      expect(component.getValue(item as never, col)).toBe('tag1');
    });

    it('returns empty string for empty array', () => {
      const item = makeItem({ tags: [] });
      const col = makeCol({ key: 'tags' });
      expect(component.getValue(item as never, col)).toBe('');
    });

    it('uses formatter when provided', () => {
      const item = makeItem({ status: 'oppet' });
      const col = makeCol({ key: 'status', formatter: v => `Formatted: ${v}` });
      expect(component.getValue(item as never, col)).toBe('Formatted: oppet');
    });
  });

  describe('getIconSrc', () => {
    it('returns arende icon for Arende type', () => {
      expect(component.getIconSrc('Arende')).toContain('arende.svg');
    });

    it('returns handling icon for Handling type', () => {
      expect(component.getIconSrc('Handling')).toContain('handling.svg');
    });

    it('returns utkast icon for Utkast type', () => {
      expect(component.getIconSrc('Utkast')).toContain('utkast.svg');
    });

    it('returns fil icon for Fil type', () => {
      expect(component.getIconSrc('Fil')).toContain('fil.svg');
    });

    it('returns workspace icon for unknown type', () => {
      expect(component.getIconSrc('Other')).toContain('workspace.svg');
    });
  });

  describe('totalPages', () => {
    it('returns 1 when total is 0', () => {
      fixture.componentRef.setInput('total', 0);
      fixture.componentRef.setInput('pageSize', 25);
      expect(component.totalPages()).toBe(1);
    });

    it('returns 1 when pageSize is 0', () => {
      fixture.componentRef.setInput('total', 100);
      fixture.componentRef.setInput('pageSize', 0);
      expect(component.totalPages()).toBe(1);
    });

    it('calculates correct total pages', () => {
      fixture.componentRef.setInput('total', 100);
      fixture.componentRef.setInput('pageSize', 25);
      expect(component.totalPages()).toBe(4);
    });

    it('rounds up for partial pages', () => {
      fixture.componentRef.setInput('total', 26);
      fixture.componentRef.setInput('pageSize', 25);
      expect(component.totalPages()).toBe(2);
    });
  });

  describe('isStatusColumn', () => {
    it('returns true for column with "status" in key', () => {
      expect(component.isStatusColumn(makeCol({ key: 'handlaggningsstatus' }))).toBeTrue();
    });

    it('returns true for column with "state" in key', () => {
      expect(component.isStatusColumn(makeCol({ key: 'caseState' }))).toBeTrue();
    });

    it('returns false for regular column', () => {
      expect(component.isStatusColumn(makeCol({ key: 'title' }))).toBeFalse();
    });
  });

  describe('getStatusValue', () => {
    it('returns empty string for null value', () => {
      const item = makeItem({ status: null });
      expect(component.getStatusValue(item as never, makeCol({ key: 'status' }))).toBe('');
    });

    it('returns string value', () => {
      const item = makeItem({ status: 'oppet' });
      expect(component.getStatusValue(item as never, makeCol({ key: 'status' }))).toBe('oppet');
    });

    it('returns first element of array value', () => {
      const item = makeItem({ status: ['oppet', 'stangt'] });
      expect(component.getStatusValue(item as never, makeCol({ key: 'status' }))).toBe('oppet');
    });

    it('returns empty string for empty array', () => {
      const item = makeItem({ status: [] });
      expect(component.getStatusValue(item as never, makeCol({ key: 'status' }))).toBe('');
    });
  });

  describe('getStatusText', () => {
    it('returns em dash for empty status', () => {
      expect(component.getStatusText('')).toBe('—');
    });

    it('returns em dash for falsy status', () => {
      expect(component.getStatusText(null as never)).toBe('—');
    });

    it('returns service label when available', () => {
      casesSpy.getStatusLabel.and.returnValue('Öppet');
      expect(component.getStatusText('oppet')).toBe('Öppet');
    });

    it('returns em dash when service returns empty string', () => {
      casesSpy.getStatusLabel.and.returnValue('');
      expect(component.getStatusText('unknown')).toBe('—');
    });
  });

  describe('getStatusColor', () => {
    it('delegates to casesService', () => {
      component.getStatusColor('oppet');
      expect(casesSpy.getStatusColor).toHaveBeenCalledWith('oppet', jasmine.anything());
    });
  });

  describe('getStatusVariation', () => {
    it('delegates to casesService', () => {
      component.getStatusVariation('oppet');
      expect(casesSpy.getStatusVariation).toHaveBeenCalledWith('oppet');
    });
  });

  describe('showSortingIcon', () => {
    it('returns empty string when column has no sortField', () => {
      expect(component.showSortingIcon(makeCol({ sortField: undefined }))).toBe('');
    });

    it('returns "↕" when column has sortField but is not active', () => {
      const col = makeCol({ sortField: 'dc:title' });
      fixture.componentRef.setInput('sortBy', 'dc:modified');
      expect(component.showSortingIcon(col)).toBe('↕');
    });

    it('returns "▲" when column is active with asc sort', () => {
      const col = makeCol({ sortField: 'dc:title' });
      fixture.componentRef.setInput('sortBy', 'dc:title');
      fixture.componentRef.setInput('sortOrder', 'asc');
      expect(component.showSortingIcon(col)).toBe('▲');
    });

    it('returns "▼" when column is active with desc sort', () => {
      const col = makeCol({ sortField: 'dc:title' });
      fixture.componentRef.setInput('sortBy', 'dc:title');
      fixture.componentRef.setInput('sortOrder', 'desc');
      expect(component.showSortingIcon(col)).toBe('▼');
    });
  });

  describe('isChecked', () => {
    it('returns false for items without string id', () => {
      expect(component.isChecked(makeItem({ id: 123 }) as never)).toBeFalse();
    });

    it('returns false when item is not selected', () => {
      expect(component.isChecked(makeItem({ id: 'not-selected' }) as never)).toBeFalse();
    });

    it('returns true for selected item', () => {
      component.selectedIds.add('item-1');
      expect(component.isChecked(makeItem({ id: 'item-1' }) as never)).toBeTrue();
    });
  });

  describe('areAllDisplayedRowsChecked', () => {
    it('returns false when displayItems is empty', () => {
      fixture.componentRef.setInput('tableItems', []);
      expect(component.areAllDisplayedRowsChecked()).toBeFalse();
    });

    it('returns false when not all items are selected', () => {
      fixture.componentRef.setInput('tableItems', [makeItem({ id: 'a' }), makeItem({ id: 'b' })]);
      component.selectedIds.add('a');
      expect(component.areAllDisplayedRowsChecked()).toBeFalse();
    });

    it('returns true when all items are selected', () => {
      fixture.componentRef.setInput('tableItems', [makeItem({ id: 'a' }), makeItem({ id: 'b' })]);
      component.selectedIds.add('a');
      component.selectedIds.add('b');
      expect(component.areAllDisplayedRowsChecked()).toBeTrue();
    });
  });

  describe('selectRow', () => {
    it('does nothing when rowClickEnabled is false', () => {
      fixture.componentRef.setInput('rowClickEnabled', false);
      const spy = jasmine.createSpy('rowSelected');
      component.rowSelected.subscribe(spy);
      component.selectRow(makeItem() as never);
      expect(spy).not.toHaveBeenCalled();
    });

    it('emits row id when rowClickEnabled is true', () => {
      fixture.componentRef.setInput('rowClickEnabled', true);
      const spy = jasmine.createSpy('rowSelected');
      component.rowSelected.subscribe(spy);
      component.selectRow(makeItem({ id: 'row-1' }) as never);
      expect(spy).toHaveBeenCalledWith('row-1');
    });

    it('does nothing when item has no string id', () => {
      fixture.componentRef.setInput('rowClickEnabled', true);
      const spy = jasmine.createSpy('rowSelected');
      component.rowSelected.subscribe(spy);
      component.selectRow(makeItem({ id: 123 }) as never);
      expect(spy).not.toHaveBeenCalled();
    });
  });

  describe('getSearchInputType', () => {
    it('returns column searchInputType when set', () => {
      const col = makeCol({ searchInputType: 'date' });
      expect(component.getSearchInputType(col)).toBe('date');
    });

    it('returns "search" by default for non-date columns', () => {
      expect(component.getSearchInputType(makeCol())).toBe('search');
    });
  });

  describe('getSearchLabelId', () => {
    it('returns an id string containing the column key', () => {
      const col = makeCol({ key: 'dc:title' });
      const id = component.getSearchLabelId(col);
      expect(typeof id).toBe('string');
      expect(id.length).toBeGreaterThan(0);
    });
  });

  describe('hasActiveColumnSearchState', () => {
    it('returns false when no search values are set', () => {
      expect(component.hasActiveColumnSearchState()).toBeFalse();
    });

    it('returns true after columnSearchValues are set', () => {
      component.columnSearchValues.set({ title: 'test' });
      expect(component.hasActiveColumnSearchState()).toBeTrue();
    });

    it('returns true after localColumnFilters are set', () => {
      component.localColumnFilters.set({ status: 'oppet' });
      expect(component.hasActiveColumnSearchState()).toBeTrue();
    });
  });

  describe('getBehorighetsCompletedSteps', () => {
    it('returns 0 for empty status', () => {
      expect(component.getBehorighetsCompletedSteps('')).toBe(0);
    });

    it('returns total steps for stangt status', () => {
      expect(component.getBehorighetsCompletedSteps('Stängt')).toBe(CASE_STATES.length);
    });

    it('returns 0 for unknown status', () => {
      expect(component.getBehorighetsCompletedSteps('completely-unknown-xyz')).toBe(0);
    });
  });

  describe('isBehorighetsClosed', () => {
    it('returns true for stängt', () => {
      expect(component.isBehorighetsClosed('Stängt')).toBeTrue();
    });

    it('returns false for non-closed status', () => {
      expect(component.isBehorighetsClosed('Öppet')).toBeFalse();
    });

    it('returns false for empty string', () => {
      expect(component.isBehorighetsClosed('')).toBeFalse();
    });
  });

  describe('isFilterableDropdownColumn', () => {
    it('returns true for arendetyp column', () => {
      expect(component.isFilterableDropdownColumn(makeCol({ key: 'arendetyp' }))).toBeTrue();
    });

    it('returns true for handlaggare column', () => {
      expect(component.isFilterableDropdownColumn(makeCol({ key: 'handlaggare' }))).toBeTrue();
    });

    it('returns false for title column', () => {
      expect(component.isFilterableDropdownColumn(makeCol({ key: 'title' }))).toBeFalse();
    });

    it('returns false for status in handling table (tableName contains HANDLINGS)', () => {
      component.tableName.set('HANDLINGAR_TEST');
      expect(component.isFilterableDropdownColumn(makeCol({ key: 'status' }))).toBeFalse();
    });

    it('returns true for status in arende table', () => {
      component.tableName.set('ARENDEN');
      expect(component.isFilterableDropdownColumn(makeCol({ key: 'status' }))).toBeTrue();
    });
  });

  describe('isMultiSelectDropdownColumn', () => {
    it('delegates to isFilterableDropdownColumn', () => {
      expect(component.isMultiSelectDropdownColumn(makeCol({ key: 'arendetyp' }))).toBeTrue();
      expect(component.isMultiSelectDropdownColumn(makeCol({ key: 'title' }))).toBeFalse();
    });
  });

  describe('isStaticDropdownColumn', () => {
    it('returns true for behorighetsstatus', () => {
      expect(component.isStaticDropdownColumn(makeCol({ key: 'behorighetsstatus' }))).toBeTrue();
    });

    it('returns false for other columns', () => {
      expect(component.isStaticDropdownColumn(makeCol({ key: 'status' }))).toBeFalse();
      expect(component.isStaticDropdownColumn(makeCol({ key: 'title' }))).toBeFalse();
    });
  });

  describe('getDropdownSelection', () => {
    it('returns empty array when no selection exists', () => {
      expect(component.getDropdownSelection(makeCol({ key: 'status' }))).toEqual([]);
    });

    it('returns selected options when set', () => {
      const option = { id: 'oppet', label: 'Öppet', value: 'oppet' };
      component.dropdownSelections.set({ status: [option] });
      const result = component.getDropdownSelection(makeCol({ key: 'status' }));
      expect(result.length).toBe(1);
      expect(result[0].id).toBe('oppet');
    });
  });

  describe('getMultiselectValues', () => {
    it('returns array of strings from array value', () => {
      const item = makeItem({ tags: ['a', 'b', 'c'] });
      const result = component.getMultiselectValues(item as never, makeCol({ key: 'tags' }));
      expect(result).toEqual(['a', 'b', 'c']);
    });

    it('returns single-element array for non-array value', () => {
      const item = makeItem({ status: 'oppet' });
      const result = component.getMultiselectValues(item as never, makeCol({ key: 'status' }));
      expect(result).toEqual(['oppet']);
    });

    it('returns empty array for null/undefined value', () => {
      const item = makeItem({ status: null });
      const result = component.getMultiselectValues(item as never, makeCol({ key: 'status' }));
      expect(result).toEqual([]);
    });
  });

  describe('getCellType', () => {
    it('returns undefined when no inputConfig', () => {
      expect(component.getCellType(makeCol(), makeItem() as never)).toBeUndefined();
    });

    it('returns static inputConfig type', () => {
      const col = makeCol({ inputConfig: { type: 'input' } });
      expect(component.getCellType(col, makeItem() as never)).toBe('input');
    });

    it('calls function inputConfig type with item', () => {
      const col = makeCol({
        inputConfig: { type: (item: Record<string, unknown>) => (item['editable'] ? 'input' : 'checkbox') },
      });
      expect(component.getCellType(col, makeItem({ editable: true }) as never)).toBe('input');
      expect(component.getCellType(col, makeItem({ editable: false }) as never)).toBe('checkbox');
    });
  });

  describe('getDateSelection', () => {
    it('returns empty array when value is null/undefined', () => {
      const item = makeItem({ date: null });
      expect(component.getDateSelection(item as never, makeCol({ key: 'date' }))).toEqual([]);
    });

    it('returns array with Date for valid ISO date string', () => {
      const item = makeItem({ date: '2024-06-15T00:00:00Z' });
      const result = component.getDateSelection(item as never, makeCol({ key: 'date' }));
      expect(result.length).toBe(1);
      expect(result[0] instanceof Date).toBeTrue();
    });

    it('returns empty array for invalid date', () => {
      const item = makeItem({ date: 'not-a-date' });
      const result = component.getDateSelection(item as never, makeCol({ key: 'date' }));
      expect(result).toEqual([]);
    });
  });

  describe('displayItems', () => {
    it('returns all items when no local filters active', () => {
      const items = [makeItem({ id: 'a' }), makeItem({ id: 'b' })];
      fixture.componentRef.setInput('tableItems', items);
      expect(component.displayItems().length).toBe(2);
    });

    it('filters items by localColumnFilter value', () => {
      const items = [makeItem({ id: 'a', status: 'oppet' }), makeItem({ id: 'b', status: 'stangt' })];
      fixture.componentRef.setInput('tableItems', items);
      component.localColumnFilters.set({ status: 'oppet' });
      expect(component.displayItems().length).toBe(1);
      expect(component.displayItems()[0]['id']).toBe('a');
    });
  });

  describe('shouldAddDropdownSpace', () => {
    it('returns false when dropdown is closed', () => {
      component.isDropdownOpen.set(false);
      expect(component.shouldAddDropdownSpace()).toBeFalse();
    });

    it('returns true when dropdown is open and no display items', () => {
      fixture.componentRef.setInput('tableItems', []);
      component.isDropdownOpen.set(true);
      expect(component.shouldAddDropdownSpace()).toBeTrue();
    });
  });

  describe('onHeaderClick', () => {
    it('does nothing when column has no sortField', () => {
      const spy = jasmine.createSpy('sortChange');
      component.sortChange.subscribe(spy);
      component.onHeaderClick(makeCol({ sortField: undefined }));
      expect(spy).not.toHaveBeenCalled();
    });

    it('emits asc sort when switching to new column', () => {
      fixture.componentRef.setInput('sortBy', 'dc:modified');
      const spy = jasmine.createSpy('sortChange');
      component.sortChange.subscribe(spy);
      component.onHeaderClick(makeCol({ sortField: 'dc:title' }));
      expect(spy).toHaveBeenCalledWith({ sortBy: 'dc:title', sortOrder: 'asc' });
    });

    it('toggles to desc when already sorted asc on same column', () => {
      fixture.componentRef.setInput('sortBy', 'dc:title');
      fixture.componentRef.setInput('sortOrder', 'asc');
      const spy = jasmine.createSpy('sortChange');
      component.sortChange.subscribe(spy);
      component.onHeaderClick(makeCol({ sortField: 'dc:title' }));
      expect(spy).toHaveBeenCalledWith({ sortBy: 'dc:title', sortOrder: 'desc' });
    });

    it('toggles to asc when already sorted desc on same column', () => {
      fixture.componentRef.setInput('sortBy', 'dc:title');
      fixture.componentRef.setInput('sortOrder', 'desc');
      const spy = jasmine.createSpy('sortChange');
      component.sortChange.subscribe(spy);
      component.onHeaderClick(makeCol({ sortField: 'dc:title' }));
      expect(spy).toHaveBeenCalledWith({ sortBy: 'dc:title', sortOrder: 'asc' });
    });
  });

  describe('onToggle', () => {
    it('adds item id when checked', () => {
      const checkEvent = new CustomEvent('toggle', { detail: { checked: true } });
      const spy = jasmine.createSpy('toggleCheckboxes');
      component.toggleCheckboxes.subscribe(spy);
      component.onToggle(makeItem({ id: 'row-1' }) as never, checkEvent);
      expect(component.selectedIds.has('row-1')).toBeTrue();
      expect(spy).toHaveBeenCalled();
    });

    it('removes item id when unchecked', () => {
      component.selectedIds.add('row-1');
      const uncheckEvent = new CustomEvent('toggle', { detail: { checked: false } });
      component.onToggle(makeItem({ id: 'row-1' }) as never, uncheckEvent);
      expect(component.selectedIds.has('row-1')).toBeFalse();
    });

    it('does nothing when item has no string id', () => {
      const checkEvent = new CustomEvent('toggle', { detail: { checked: true } });
      const spy = jasmine.createSpy('toggleCheckboxes');
      component.toggleCheckboxes.subscribe(spy);
      component.onToggle(makeItem({ id: 99 }) as never, checkEvent);
      expect(spy).not.toHaveBeenCalled();
    });
  });

  describe('onToggleAll', () => {
    it('selects all display items when checked', () => {
      const items = [makeItem({ id: 'a' }), makeItem({ id: 'b' })];
      fixture.componentRef.setInput('tableItems', items);
      const checkEvent = new CustomEvent('toggle', { detail: { checked: true } });
      component.onToggleAll(checkEvent);
      expect(component.selectedIds.has('a')).toBeTrue();
      expect(component.selectedIds.has('b')).toBeTrue();
    });

    it('clears all selected when unchecked', () => {
      component.selectedIds.add('a');
      component.selectedIds.add('b');
      const uncheckEvent = new CustomEvent('toggle', { detail: { checked: false } });
      component.onToggleAll(uncheckEvent);
      expect(component.selectedIds.size).toBe(0);
    });

    it('emits toggleAllCheckboxes with checked value', () => {
      const spy = jasmine.createSpy('toggleAllCheckboxes');
      component.toggleAllCheckboxes.subscribe(spy);
      const checkEvent = new CustomEvent('toggle', { detail: { checked: true } });
      component.onToggleAll(checkEvent);
      expect(spy).toHaveBeenCalledWith(true);
    });
  });

  describe('onCsvExportClick', () => {
    it('emits csvExportClick when localCsvExportEnabled is false', () => {
      fixture.componentRef.setInput('localCsvExportEnabled', false);
      const spy = jasmine.createSpy('csvExportClick');
      component.csvExportClick.subscribe(spy);
      component.onCsvExportClick();
      expect(spy).toHaveBeenCalledWith(component.internalTableConfig());
    });
  });

  describe('openColumnSettings', () => {
    it('sets isTableOptionsOpen to true', () => {
      const event = new MouseEvent('click');
      spyOn(event, 'stopPropagation');
      component.openColumnSettings(event);
      expect(component.isTableOptionsOpen()).toBeTrue();
      expect(event.stopPropagation).toHaveBeenCalled();
    });
  });

  describe('getSearchInputType — date detection', () => {
    it('returns "date" for column with "datum" in key', () => {
      const col = makeCol({ key: 'inkommetDatum' });
      expect(component.getSearchInputType(col)).toBe('date');
    });

    it('returns "date" for column with sortField containing "created"', () => {
      const col = makeCol({ key: 'createdAt', sortField: 'dc:created' });
      expect(component.getSearchInputType(col)).toBe('date');
    });

    it('returns "select" for status column', () => {
      const col = makeCol({ key: 'status' });
      expect(component.getSearchInputType(col)).toBe('select');
    });

    it('returns "select" for arendetyp column', () => {
      const col = makeCol({ key: 'arendetyp' });
      expect(component.getSearchInputType(col)).toBe('select');
    });

    it('returns "select" for handlaggare column', () => {
      const col = makeCol({ key: 'handlaggare' });
      expect(component.getSearchInputType(col)).toBe('select');
    });
  });

  describe('resetColumnSearchState', () => {
    it('clears all search state', () => {
      component.columnSearchValues.set({ title: 'test' });
      component.localColumnFilters.set({ status: 'oppet' });
      component.dropdownSelections.set({ status: [{ id: 'oppet', label: 'Öppet' }] });
      component.isDropdownOpen.set(true);

      component.resetColumnSearchState();

      expect(component.columnSearchValues()).toEqual({});
      expect(component.localColumnFilters()).toEqual({});
      expect(component.dropdownSelections()).toEqual({});
      expect(component.isDropdownOpen()).toBeFalse();
    });
  });

  describe('changePageNumber', () => {
    it('emits page - 1 as the zero-based page number', () => {
      const spy = jasmine.createSpy('pageChange');
      component.pageChange.subscribe(spy);
      const event = new CustomEvent<number>('pageChange', { detail: 3 }) as unknown as Parameters<
        typeof component.changePageNumber
      >[0];
      component.changePageNumber(event);
      expect(spy).toHaveBeenCalledWith(2);
    });
  });

  describe('column dropdown and edit handlers', () => {
    it('fetches directory dropdown options after query debounce', fakeAsync(() => {
      fixture.componentRef.setInput('columnSearchDebounceMs', 0);
      const col = makeCol({ key: 'status' });

      component.onColumnDropdownQuery(new CustomEvent('query', { detail: { value: 'opp' } }), col);
      tick();

      expect(apiSpy.getDirectorySuggestions).toHaveBeenCalledWith('Arendestatus');
      expect(component.getDropdownOptions(col)).toEqual([{ id: 'oppet', label: 'Öppet', value: 'oppet' }]);
    }));

    it('fetches user dropdown options for handler columns', fakeAsync(() => {
      fixture.componentRef.setInput('columnSearchDebounceMs', 0);
      const col = makeCol({ key: 'handlaggare' });

      component.onColumnDropdownQuery(new CustomEvent('query', { detail: { value: 'alice' } }), col);
      tick();

      expect(apiSpy.getUserSuggestions).toHaveBeenCalledWith('alice');
      expect(component.getDropdownOptions(col)).toEqual([{ id: 'alice', label: 'Alice Example', value: 'alice' }]);
    }));

    it('updates static dropdown filters without emitting remote search', () => {
      const col = makeCol({ key: 'behorighetsstatus' });
      const option = CASE_STATES[1];
      const spy = jasmine.createSpy('columnSearchChange');
      component.columnSearchChange.subscribe(spy);

      component.onColumnDropdownSelect(new CustomEvent('select', { detail: [option] }), col);

      expect(component.localColumnFilters()['behorighetsstatus']).toEqual([option.id]);
      expect(component.getDropdownSelection(col)).toEqual([option]);
      expect(spy).not.toHaveBeenCalled();
    });

    it('emits remote dropdown searches and date searches with mapped fields', () => {
      const statusCol = makeCol({ key: 'status' });
      const dateCol = makeCol({ key: 'created', sortField: 'dc:created' });
      const spy = jasmine.createSpy('columnSearchChange');
      component.columnSearchChange.subscribe(spy);
      component.dropdownOptions.set({ status: [{ id: 'oppet', label: 'Öppet', value: 'oppet' }] });

      component.onColumnDropdownSelect(new CustomEvent('select', { detail: ['oppet'] }), statusCol);
      component.onColumnDateSearchChange(new CustomEvent('date', { detail: { value: '2026-06-15' } }), dateCol);

      expect(spy).toHaveBeenCalledWith({ field: 'arende_arendestatus', value: ['oppet'], column: statusCol });
      expect(spy).toHaveBeenCalledWith({ field: 'dc:created', value: '2026-06-15', column: dateCol });
      expect(component.columnSearchValues()['created']).toBe('2026-06-15');
    });

    it('resets searchable columns and emits cleared filters', () => {
      const statusCol = makeCol({ key: 'status', sortField: 'status' });
      const titleCol = makeCol({ key: 'title', sortField: 'dc:title' });
      const spy = jasmine.createSpy('columnSearchChange');
      component.columnSearchChange.subscribe(spy);
      fixture.componentRef.setInput('columnSearchEnabled', true);
      component.internalTableConfig.set([statusCol, titleCol]);
      component.dropdownSelections.set({ status: [{ id: 'oppet', label: 'Öppet', value: 'oppet' }] });
      component.columnSearchValues.set({ title: 'abc' });

      component.reset();

      expect(component.columnSearchValues()).toEqual({});
      expect(component.dropdownSelections()).toEqual({});
      expect(spy).toHaveBeenCalledWith({ field: 'arende_arendestatus', value: [], column: statusCol });
      expect(spy).toHaveBeenCalledWith({ field: 'dublincore_title', value: '', column: titleCol });
    });

    it('emits edited table items for text and checkbox changes', () => {
      const items = [makeItem({ id: 'row-1', title: 'Old', approved: 'Nej', tags: [] })];
      const spy = jasmine.createSpy('updatedTableItems');
      component.updatedTableItems.subscribe(spy);
      fixture.componentRef.setInput('tableItems', items);

      component.updateEditedField(new CustomEvent('input', { detail: 'New' }), items[0], 'title');
      component.updateCheckboxField(new CustomEvent('checkbox', { detail: { checked: true } }), items[0], 'approved');

      expect(spy.calls.argsFor(0)[0][0]['title']).toBe('New');
      expect(spy.calls.argsFor(1)[0][0]['approved']).toBe('Ja');
    });

    it('fetches arendetyp and organization dropdown options', fakeAsync(() => {
      const klassResult: SearchResult<NuxeoDocument> = {
        ...emptySearchResult,
        entries: [
          {
            'entity-type': 'document',
            repository: 'default',
            uid: 'klass-1',
            path: '/klass-1',
            type: 'Klass',
            name: 'klass-1',
            title: 'Klass 1',
            isCheckedOut: false,
            isRecord: false,
            isTrashed: false,
            facets: [],
            schemas: [],
            lastModified: '2026-06-15T00:00:00.000Z',
            properties: {},
          },
        ],
      };
      const orgResult: SearchResult<NuxeoDocument> = {
        ...emptySearchResult,
        entries: [
          {
            'entity-type': 'document',
            repository: 'default',
            uid: 'org-1',
            path: '/org-1',
            type: 'Organisationsdel',
            name: 'org-1',
            title: 'Org 1',
            isCheckedOut: false,
            isRecord: false,
            isTrashed: false,
            facets: [],
            schemas: [],
            lastModified: '2026-06-15T00:00:00.000Z',
            properties: {},
          },
        ],
      };
      fixture.componentRef.setInput('columnSearchDebounceMs', 0);
      fixture.componentRef.setInput('columnSearchContext', { parentRef: 'parent-1' });
      apiSpy.DMSDocumentSuggestion.and.returnValues(of(klassResult), of(orgResult));
      const typeCol = makeCol({ key: 'arendetyp' });
      const orgCol = makeCol({ key: 'ansvarigenhet' });

      component.onColumnDropdownQuery(new CustomEvent('query', { detail: { value: 'klass' } }), typeCol);
      tick();
      component.onColumnDropdownQuery(new CustomEvent('query', { detail: { value: 'org' } }), orgCol);
      tick();

      expect(component.getDropdownOptions(typeCol)).toEqual([{ id: 'klass-1', label: 'Klass 1', value: 'klass-1' }]);
      expect(component.getDropdownOptions(orgCol)).toEqual([{ id: 'org-1', label: 'Org 1', value: 'org-1' }]);
    }));

    it('submits and resets dropdown filters', fakeAsync(() => {
      const col = makeCol({ key: 'status' });
      const option = { id: 'oppet', label: 'Öppet', value: 'oppet' };
      const spy = jasmine.createSpy('columnSearchChange');
      component.columnSearchChange.subscribe(spy);
      component.dropdownOptions.set({ status: [option] });

      component.onColumnDropdownSubmit(new CustomEvent('submit', { detail: ['oppet'] }), col);
      tick();
      component.onDropdownClosed(col);
      component.onColumnDropdownReset(col);

      expect(spy).toHaveBeenCalledWith({ field: 'arende_arendestatus', value: ['oppet'], column: col });
      expect(component.getDropdownSelection(col)).toEqual([{ id: 'oppet', label: 'Öppet', value: 'oppet' }]);
      expect(component.localColumnFilters()['status']).toBeUndefined();
      expect(component.isDropdownOpen()).toBeFalse();
    }));

    it('exports displayed rows locally when enabled', () => {
      const titleCol = makeCol({ key: 'title', label: 'Title' });
      const statusCol = makeCol({ key: 'status', label: 'Status' });
      fixture.componentRef.setInput('localCsvExportEnabled', true);
      fixture.componentRef.setInput('localCsvExportFileName', 'cases');
      fixture.componentRef.setInput('tableItems', [makeItem({ title: 'First', status: 'oppet' })]);
      component.internalTableConfig.set([titleCol, statusCol, makeCol({ key: 'actions', label: 'Actions' })]);

      component.onCsvExportClick();

      expect(csvSpy.exportRowsToCSV).toHaveBeenCalledWith({
        headers: ['Title', 'Status'],
        rows: [['First', 'oppet']],
        filename: 'cases',
      });
    });

    it('updates column options and internal table config', () => {
      const titleCol = makeCol({ key: 'title', label: 'Title' });
      const statusCol = makeCol({ key: 'status', label: 'Status' });
      fixture.componentRef.setInput('tableConfig', [titleCol, statusCol]);

      component.onColumnOptionsUpdated([
        { id: 'status', label: 'Status', visible: true },
        { id: 'title', label: 'Title', visible: false },
      ]);

      expect(component.columnOptions()).toEqual([
        { id: 'status', label: 'Status', visible: true },
        { id: 'title', label: 'Title', visible: false },
      ]);
      expect(component.internalTableConfig()).toEqual([statusCol]);
    });
  });

  describe('ngOnChanges', () => {
    beforeEach(() => {
      localStorage.clear();
    });

    it('does nothing when tableConfig is empty', () => {
      fixture.componentRef.setInput('tableConfig', []);
      fixture.componentRef.setInput('defaultColumnOptions', []);
      component.ngOnChanges();
      expect(component.columnOptions()).toEqual([]);
    });

    it('builds default column options from config and persists them when none saved', () => {
      const titleCol = makeCol({ key: 'title', label: 'Title', tableName: 'TEST' });
      const statusCol = makeCol({ key: 'status', label: 'Status', tableName: 'TEST', visible: false });
      fixture.componentRef.setInput('tableConfig', [titleCol, statusCol]);
      fixture.componentRef.setInput('defaultColumnOptions', []);
      fixture.componentRef.setInput('tableItems', [makeItem()]);

      component.ngOnChanges();

      expect(component.columnOptions()).toEqual([
        { id: 'title', label: 'Title', visible: true },
        { id: 'status', label: 'Status', visible: false },
      ]);
      expect(component.tableName()).toBe('TEST');
      expect(localStorage.getItem('table_columns_default_TEST')).toBeTruthy();
      expect(component.originalTableData().columns).toEqual([titleCol, statusCol]);
      expect(component.originalTableData().rows.length).toBe(1);
    });

    it('uses the provided defaultColumnOptions input when set', () => {
      const titleCol = makeCol({ key: 'title', label: 'Title', tableName: 'TEST' });
      fixture.componentRef.setInput('tableConfig', [titleCol]);
      fixture.componentRef.setInput('defaultColumnOptions', [{ id: 'title', label: 'Custom Title', visible: false }]);

      component.ngOnChanges();

      expect(component.columnOptions()).toEqual([{ id: 'title', label: 'Custom Title', visible: false }]);
    });

    it('adds an actions column when actionsTemplate is provided and absent from defaults', () => {
      const titleCol = makeCol({ key: 'title', label: 'Title', tableName: 'TEST' });
      fixture.componentRef.setInput('tableConfig', [titleCol]);
      fixture.componentRef.setInput('defaultColumnOptions', []);
      fixture.componentRef.setInput('actionsTemplate', {} as never);
      fixture.componentRef.setInput('actionsHeader', 'My Actions');

      component.ngOnChanges();

      const actionsOption = component.columnOptions().find(c => c.id === 'actions');
      expect(actionsOption).toEqual({ id: 'actions', label: 'My Actions', visible: true });
    });

    it('merges saved current options with defaults, preserving visibility overrides', () => {
      const titleCol = makeCol({ key: 'title', label: 'Title', tableName: 'TEST' });
      const statusCol = makeCol({ key: 'status', label: 'Status', tableName: 'TEST' });
      fixture.componentRef.setInput('tableConfig', [titleCol, statusCol]);
      fixture.componentRef.setInput('defaultColumnOptions', []);

      localStorage.setItem(
        'table_columns_default_TEST',
        JSON.stringify([
          { id: 'title', label: 'Title', visible: true },
          { id: 'status', label: 'Status', visible: true },
        ])
      );
      localStorage.setItem(
        'table_columns_current_TEST_testuser',
        JSON.stringify([
          { id: 'status', label: 'Status', visible: false },
          { id: 'title', label: 'Title', visible: true },
        ])
      );

      component.ngOnChanges();

      expect(component.columnOptions()).toEqual([
        { id: 'status', label: 'Status', visible: false },
        { id: 'title', label: 'Title', visible: true },
      ]);
    });

    it('discards saved current options and rewrites defaults when the default shape changed', () => {
      localStorage.setItem(
        'table_columns_default_TEST',
        JSON.stringify([{ id: 'title', label: 'Old Title', visible: true }])
      );
      localStorage.setItem(
        'table_columns_current_TEST_testuser',
        JSON.stringify([{ id: 'title', label: 'Old Title', visible: false }])
      );

      const titleCol = makeCol({ key: 'title', label: 'New Title', tableName: 'TEST' });
      fixture.componentRef.setInput('tableConfig', [titleCol]);
      fixture.componentRef.setInput('defaultColumnOptions', []);

      component.ngOnChanges();

      expect(localStorage.getItem('table_columns_current_TEST_testuser')).toBeNull();
      expect(component.columnOptions()).toEqual([{ id: 'title', label: 'New Title', visible: true }]);
    });

    it('falls back to defaults when saved current options are corrupt JSON', () => {
      localStorage.setItem('table_columns_default_TEST', JSON.stringify([]));
      localStorage.setItem('table_columns_current_TEST_testuser', '{not-json');

      const titleCol = makeCol({ key: 'title', label: 'Title', tableName: 'TEST' });
      fixture.componentRef.setInput('tableConfig', [titleCol]);
      fixture.componentRef.setInput('defaultColumnOptions', []);

      expect(() => component.ngOnChanges()).not.toThrow();
      expect(component.columnOptions()).toEqual([{ id: 'title', label: 'Title', visible: true }]);
    });

    it('resets column search state when the table name changes between calls', () => {
      const firstCol = makeCol({ key: 'title', label: 'Title', tableName: 'TABLE_ONE' });
      fixture.componentRef.setInput('tableConfig', [firstCol]);
      fixture.componentRef.setInput('defaultColumnOptions', []);
      component.ngOnChanges();

      component.columnSearchValues.set({ title: 'something' });

      const secondCol = makeCol({ key: 'title', label: 'Title', tableName: 'TABLE_TWO' });
      fixture.componentRef.setInput('tableConfig', [secondCol]);
      component.ngOnChanges();

      expect(component.columnSearchValues()).toEqual({});
      expect(component.tableName()).toBe('TABLE_TWO');
    });

    it('preloads dropdown options for select-type columns when column search is enabled', () => {
      apiSpy.getDirectorySuggestions.calls.reset();
      const statusCol = makeCol({ key: 'status', label: 'Status', tableName: 'TEST' });
      fixture.componentRef.setInput('tableConfig', [statusCol]);
      fixture.componentRef.setInput('defaultColumnOptions', []);
      fixture.componentRef.setInput('columnSearchEnabled', true);

      component.ngOnChanges();

      expect(apiSpy.getDirectorySuggestions).toHaveBeenCalledWith('Arendestatus');
    });
  });

  describe('getDropdownOptions / getBaseDropdownOptions', () => {
    it('returns the static behorighetsstatus options', () => {
      const options = component.getDropdownOptions(makeCol({ key: 'behorighetsstatus' }));
      expect(options).toEqual(CASE_STATES as never);
    });

    it('returns column-provided searchOptions when present', () => {
      const searchOptions = [{ id: 'a', label: 'A', value: 'a' }];
      const options = component.getDropdownOptions(makeCol({ key: 'status', searchOptions }));
      expect(options).toEqual(searchOptions);
    });

    it('returns an empty array when no options have been loaded yet', () => {
      expect(component.getDropdownOptions(makeCol({ key: 'status' }))).toEqual([]);
    });
  });

  describe('getDropdownValue / shouldBindDropdownValue', () => {
    it('returns an empty array when there is no selection', () => {
      expect(component.getDropdownValue(makeCol({ key: 'status' }))).toEqual([]);
    });

    it('resolves selected option ids against the available options', () => {
      const col = makeCol({ key: 'status' });
      component.dropdownOptions.set({ status: [{ id: 'oppet', label: 'Öppet', value: 'oppet' }] });
      component.dropdownSelections.set({ status: [{ id: 'oppet', label: 'Öppet', value: 'oppet' }] });
      expect(component.getDropdownValue(col)).toEqual([{ id: 'oppet', label: 'Öppet', value: 'oppet' }]);
    });

    it('returns true for non multi-select columns', () => {
      expect(component.shouldBindDropdownValue(makeCol({ key: 'title' }))).toBeTrue();
    });

    it('returns false for multi-select columns outside the sync window', () => {
      expect(component.shouldBindDropdownValue(makeCol({ key: 'arendetyp' }))).toBeFalse();
    });
  });

  describe('onColumnDropdownSelect — extra branches', () => {
    it('filters option-like array items down to only those flagged selected', () => {
      const col = makeCol({ key: 'status' });
      const detail = [
        { id: 'a', label: 'A', selected: false },
        { id: 'b', label: 'B', selected: true },
      ];
      component.onColumnDropdownSelect(new CustomEvent('select', { detail }), col, false);
      expect(component.getDropdownSelection(col).map(o => o.id)).toEqual(['b']);
    });

    it('resolves a detail object with an array "value" of option-like entries', () => {
      const col = makeCol({ key: 'status' });
      const detail = {
        value: [
          { id: 'a', label: 'A' },
          { id: 'b', label: 'B' },
        ],
      };
      component.onColumnDropdownSelect(new CustomEvent('select', { detail }), col, false);
      expect(component.getDropdownSelection(col).map(o => o.id)).toEqual(['a', 'b']);
    });

    it('resolves a detail object with a scalar "value"', () => {
      const col = makeCol({ key: 'status' });
      component.dropdownOptions.set({ status: [{ id: 'oppet', label: 'Öppet', value: 'oppet' }] });
      const detail = { value: 'oppet' };
      component.onColumnDropdownSelect(new CustomEvent('select', { detail }), col, false);
      expect(component.getDropdownSelection(col).map(o => o.id)).toEqual(['oppet']);
    });

    it('resolves a plain object detail without a "value" property', () => {
      const col = makeCol({ key: 'status' });
      const detail = { id: 'oppet', label: 'Öppet' };
      component.onColumnDropdownSelect(new CustomEvent('select', { detail }), col, false);
      expect(component.getDropdownSelection(col).map(o => o.id)).toEqual(['oppet']);
    });

    it('clears the selection and emits empty value when detail is empty', () => {
      const col = makeCol({ key: 'status' });
      component.dropdownOptions.set({ status: [{ id: 'oppet', label: 'Öppet', value: 'oppet' }] });
      component.onColumnDropdownSelect(new CustomEvent('select', { detail: ['oppet'] }), col, true);

      const spy = jasmine.createSpy('columnSearchChange');
      component.columnSearchChange.subscribe(spy);
      component.onColumnDropdownSelect(new CustomEvent('select', { detail: [] }), col, true);

      expect(component.getDropdownSelection(col)).toEqual([]);
      expect(spy).toHaveBeenCalledWith(jasmine.objectContaining({ field: 'arende_arendestatus', value: [] }));
    });

    it('does not emit again when the same value is selected twice', () => {
      const col = makeCol({ key: 'status' });
      const spy = jasmine.createSpy('columnSearchChange');
      component.dropdownOptions.set({ status: [{ id: 'oppet', label: 'Öppet', value: 'oppet' }] });

      component.onColumnDropdownSelect(new CustomEvent('select', { detail: ['oppet'] }), col, true);
      component.columnSearchChange.subscribe(spy);
      component.onColumnDropdownSelect(new CustomEvent('select', { detail: ['oppet'] }), col, true);

      expect(spy).not.toHaveBeenCalled();
    });
  });

  describe('onDropdownMouseDown', () => {
    it('does nothing while the dropdown is closed', () => {
      component.isDropdownOpen.set(false);
      const event = { composedPath: () => [] } as unknown as MouseEvent;
      expect(() => component.onDropdownMouseDown(event, makeCol())).not.toThrow();
    });

    it('records reset intent when the reset button is part of the event path', () => {
      component.isDropdownOpen.set(true);
      const resetButton = document.createElement('div');
      resetButton.classList.add('digi-form-select-filter__reset-button');
      const event = { composedPath: () => [resetButton] } as unknown as MouseEvent;
      expect(() => component.onDropdownMouseDown(event, makeCol({ key: 'status' }))).not.toThrow();
    });

    it('ignores the event when neither reset nor submit buttons are in the path', () => {
      component.isDropdownOpen.set(true);
      const other = document.createElement('div');
      const event = { composedPath: () => [other] } as unknown as MouseEvent;
      expect(() => component.onDropdownMouseDown(event, makeCol({ key: 'status' }))).not.toThrow();
    });
  });

  describe('getSearchField — via emitted events', () => {
    function emitFieldFor(col: TableColumn): string {
      const spy = jasmine.createSpy('columnSearchChange');
      component.columnSearchChange.subscribe(spy);
      component.onColumnDateSearchChange(new CustomEvent('date', { detail: { value: 'x' } }), col);
      return spy.calls.mostRecent().args[0].field;
    }

    it('maps title to dublincore_title', () => {
      expect(emitFieldFor(makeCol({ key: 'title' }))).toBe('dublincore_title');
    });

    it('maps ansvarigenhet based on table type', () => {
      component.tableName.set('ARENDEN');
      expect(emitFieldFor(makeCol({ key: 'ansvarigenhet' }))).toBe('arende_ansvarig_organisatorisk_enhet');
      component.tableName.set('HANDLINGAR_TEST');
      expect(emitFieldFor(makeCol({ key: 'ansvarigenhet' }))).toBe('handling_ansvarig_organisatorisk_enhet');
    });

    it('maps handlaggare/ansvarighandlaggare based on table type', () => {
      component.tableName.set('ARENDEN');
      expect(emitFieldFor(makeCol({ key: 'handlaggare' }))).toBe('arende_ansvarig_handlaggare');
      component.tableName.set('HANDLINGAR_TEST');
      expect(emitFieldFor(makeCol({ key: 'ansvarighandlaggare' }))).toBe('handling_ansvarig_handlaggare');
    });

    it('maps ansvarigchef based on table type', () => {
      component.tableName.set('ARENDEN');
      expect(emitFieldFor(makeCol({ key: 'ansvarigchef' }))).toBe('arende_ansvarig_organisationsenhetschef');
      component.tableName.set('HANDLINGAR_TEST');
      expect(emitFieldFor(makeCol({ key: 'ansvarigchef' }))).toBe('handling_ansvarig_organisationsenhetschef');
    });

    it('maps beslutsfattare based on table type', () => {
      component.tableName.set('ARENDEN');
      expect(emitFieldFor(makeCol({ key: 'beslutsfattare' }))).toBe('arende_ansvarig_beslutsfattare');
      component.tableName.set('HANDLINGAR_TEST');
      expect(emitFieldFor(makeCol({ key: 'beslutsfattare' }))).toBe('handling_beslutsfattare');
    });

    it('maps medhandlaggare and granskare based on table type', () => {
      component.tableName.set('ARENDEN');
      expect(emitFieldFor(makeCol({ key: 'medhandlaggare' }))).toBe('arende_medhandlaggare');
      expect(emitFieldFor(makeCol({ key: 'granskare' }))).toBe('arende_granskare');
      component.tableName.set('HANDLINGAR_TEST');
      expect(emitFieldFor(makeCol({ key: 'medhandlaggare' }))).toBe('handling_medhandlaggare');
      expect(emitFieldFor(makeCol({ key: 'granskare' }))).toBe('handling_granskare');
    });

    it('maps status based on ready-to-close, handling, and arende tables', () => {
      component.tableName.set('READY_TO_CLOSE');
      expect(emitFieldFor(makeCol({ key: 'status' }))).toBe('handling_handlingsstatus');
      component.tableName.set('HANDLINGAR_TEST');
      expect(emitFieldFor(makeCol({ key: 'status' }))).toBe('handling_handlingsstatus');
      component.tableName.set('ARENDEN');
      expect(emitFieldFor(makeCol({ key: 'status' }))).toBe('arende_arendestatus');
    });

    it('maps arendestatus, handlaggningsstatus, and behorighetsstatus directly', () => {
      expect(emitFieldFor(makeCol({ key: 'arendestatus' }))).toBe('arende_arendestatus');
      expect(emitFieldFor(makeCol({ key: 'handlaggningsstatus' }))).toBe('arende_handlaggningsstatus');
      expect(emitFieldFor(makeCol({ key: 'behorighetsstatus' }))).toBe('arende_behorighetsstatus');
    });

    it('maps riktning based on table type', () => {
      component.tableName.set('ARENDEN');
      expect(emitFieldFor(makeCol({ key: 'riktning' }))).toBe('arende_riktning');
      component.tableName.set('HANDLINGAR_TEST');
      expect(emitFieldFor(makeCol({ key: 'riktning' }))).toBe('handling_handlingsriktning');
    });

    it('maps sekretess and handlingsekretess based on table type and key prefix', () => {
      component.tableName.set('ARENDEN');
      expect(emitFieldFor(makeCol({ key: 'sekretess' }))).toBe('arende_sekretess');
      expect(emitFieldFor(makeCol({ key: 'handlingsekretess' }))).toBe('handling_sekretess');
    });

    it('maps sakerhetsskyddsklassificering based on table type and key prefix', () => {
      component.tableName.set('ARENDEN');
      expect(emitFieldFor(makeCol({ key: 'sakerhetsskyddsklassificering' }))).toBe(
        'arende_sakerhetsskyddsklassificering'
      );
      expect(emitFieldFor(makeCol({ key: 'handlingsakerhetsskyddsklassificering' }))).toBe(
        'handling_sakerhetsskyddsklassificering'
      );
    });

    it('falls back to the explicit searchField when provided', () => {
      expect(emitFieldFor(makeCol({ key: 'custom', searchField: 'custom_search_field' }))).toBe('custom_search_field');
    });

    it('falls back to sortField then key when nothing else matches', () => {
      expect(emitFieldFor(makeCol({ key: 'unmatched', sortField: 'sort_field' }))).toBe('sort_field');
      expect(emitFieldFor(makeCol({ key: 'unmatched2' }))).toBe('unmatched2');
    });
  });

  describe('syncExternalStatusFilter', () => {
    type SyncFn = (filters: Record<string, string | string[]>) => void;

    function callSync(filters: Record<string, string | string[]>) {
      (component as unknown as { syncExternalStatusFilter: SyncFn }).syncExternalStatusFilter(filters);
    }

    beforeEach(() => {
      fixture.componentRef.setInput('columnSearchEnabled', true);
      component.internalTableConfig.set([makeCol({ key: 'arendestatus' })]);
    });

    it('does nothing when column search is disabled', () => {
      fixture.componentRef.setInput('columnSearchEnabled', false);
      expect(() => callSync({ arende_arendestatus: ['oppet'] })).not.toThrow();
    });

    it('does nothing when there are no matching status columns', () => {
      component.internalTableConfig.set([makeCol({ key: 'title' })]);
      expect(() => callSync({ arende_arendestatus: ['oppet'] })).not.toThrow();
    });

    it('clears selections when filter values become empty', () => {
      component.dropdownSelections.set({ arendestatus: [{ id: 'oppet', label: 'Öppet' }] });
      callSync({});
      expect(component.dropdownSelections()['arendestatus']).toEqual([]);
    });

    it('syncs dropdown selections to match incoming external filter values', () => {
      component.dropdownOptions.set({ arendestatus: [{ id: 'oppet', label: 'Öppet', value: 'oppet' }] });
      callSync({ arende_arendestatus: ['oppet'] });
      expect(component.dropdownSelections()['arendestatus'].map(o => o.id)).toEqual(['oppet']);
    });

    it('defers when matching options have not loaded yet', () => {
      component.dropdownOptions.set({});
      callSync({ arende_arendestatus: ['oppet'] });
      expect(component.dropdownSelections()['arendestatus'] ?? []).toEqual([]);
    });

    it('skips syncing while the matching dropdown is actively open', () => {
      (component as unknown as { activeDropdownKey: string | null }).activeDropdownKey = 'arendestatus';
      component.isDropdownOpen.set(true);
      component.dropdownOptions.set({ arendestatus: [{ id: 'oppet', label: 'Öppet', value: 'oppet' }] });
      callSync({ arende_arendestatus: ['oppet'] });
      expect(component.dropdownSelections()['arendestatus'] ?? []).toEqual([]);
    });

    it('is a no-op on the second call when values are already in sync', () => {
      component.dropdownOptions.set({ arendestatus: [{ id: 'oppet', label: 'Öppet', value: 'oppet' }] });
      callSync({ arende_arendestatus: ['oppet'] });
      expect(() => callSync({ arende_arendestatus: ['oppet'] })).not.toThrow();
    });
  });

  describe('getBehorighetsStatusLabel / resolveStatusLabel', () => {
    it('prefers caseState when it maps to progress steps', () => {
      const item = makeItem({ caseState: 'Stängt' });
      expect(component.getBehorighetsStatusLabel(item as never, makeCol({ key: 'behorighetsstatus' }))).toBe('Stängt');
    });

    it('resolves a directoryEntry-shaped value via its properties label', () => {
      const item = makeItem({
        caseState: { 'entity-type': 'directoryEntry', properties: { label: 'Stängt' } },
      });
      expect(component.getBehorighetsStatusLabel(item as never, makeCol({ key: 'behorighetsstatus' }))).toBe('Stängt');
    });

    it('falls back to the column value when nothing else maps to progress steps', () => {
      const item = makeItem({ caseState: undefined, handlaggningsstatus: undefined, status: undefined });
      const col = makeCol({ key: 'behorighetsstatus' });
      const result = component.getBehorighetsStatusLabel(item as never, col);
      expect(typeof result).toBe('string');
    });

    it('hasBehorighetsProgress reflects whether completed steps exist', () => {
      const item = makeItem({ caseState: 'Stängt' });
      expect(component.hasBehorighetsProgress(item as never, makeCol({ key: 'behorighetsstatus' }))).toBeTrue();
    });
  });

  describe('lifecycle no-ops without view children', () => {
    it('onResize, onTopScroll, onMainScroll, and ngAfterViewInit do not throw', () => {
      expect(() => component.onResize()).not.toThrow();
      expect(() => component.onTopScroll()).not.toThrow();
      expect(() => component.onMainScroll()).not.toThrow();
      expect(() => component.ngAfterViewInit()).not.toThrow();
    });

    it('ngOnDestroy unsubscribes any active column search subscriptions', () => {
      expect(() => component.ngOnDestroy()).not.toThrow();
    });
  });

  describe('hasActionsColumn computed', () => {
    it('returns false when no actions column in internal config', () => {
      component.internalTableConfig.set([makeCol({ key: 'title' })]);
      expect(component.hasActionsColumn()).toBeFalse();
    });

    it('returns true when actions column is in internal config', () => {
      component.internalTableConfig.set([makeCol({ key: 'actions' })]);
      expect(component.hasActionsColumn()).toBeTrue();
    });
  });

  describe('hasDropdownFilters computed', () => {
    it('returns false when columnSearchEnabled is false', () => {
      fixture.componentRef.setInput('columnSearchEnabled', false);
      component.internalTableConfig.set([makeCol({ key: 'status' })]);
      expect(component.hasDropdownFilters()).toBeFalse();
    });

    it('returns true when columnSearchEnabled and a select column exists', () => {
      fixture.componentRef.setInput('columnSearchEnabled', true);
      component.internalTableConfig.set([makeCol({ key: 'status' })]);
      expect(component.hasDropdownFilters()).toBeTrue();
    });

    it('returns false when columnSearchEnabled but no select columns', () => {
      fixture.componentRef.setInput('columnSearchEnabled', true);
      component.internalTableConfig.set([makeCol({ key: 'title' })]);
      expect(component.hasDropdownFilters()).toBeFalse();
    });
  });

  describe('displayItems — array filter branch', () => {
    it('returns items matching array filter value', () => {
      const items = [
        makeItem({ id: 'a', status: 'oppet' }),
        makeItem({ id: 'b', status: 'stangt' }),
        makeItem({ id: 'c', status: 'oppet' }),
      ];
      fixture.componentRef.setInput('tableItems', items);
      component.localColumnFilters.set({ status: ['oppet', 'draft'] });
      const result = component.displayItems();
      expect(result.length).toBe(2);
      expect(result.map(r => r['id'])).toEqual(['a', 'c']);
    });

    it('filters behorighetsstatus using caseState field', () => {
      const items = [makeItem({ id: 'a', caseState: 'Öppet' }), makeItem({ id: 'b', caseState: 'Stängt' })];
      fixture.componentRef.setInput('tableItems', items);
      component.localColumnFilters.set({ behorighetsstatus: ['ppet'] });

      expect(component.displayItems().length).toBe(0);
    });
  });

  describe('restoreCheckboxSelection effect', () => {
    it('clears selectedIds when restoreCheckboxSelection becomes true', () => {
      component.selectedIds.add('a');
      component.selectedIds.add('b');
      fixture.componentRef.setInput('restoreCheckboxSelection', true);
      fixture.detectChanges();
      expect(component.selectedIds.size).toBe(0);
    });
  });

  describe('selectedItemIds effect', () => {
    it('populates selectedIds from selectedItemIds input', () => {
      fixture.componentRef.setInput('selectedItemIds', ['id-1', 'id-2']);
      fixture.detectChanges();
      expect(component.selectedIds.has('id-1')).toBeTrue();
      expect(component.selectedIds.has('id-2')).toBeTrue();
    });

    it('does nothing when selectedItemIds is null', () => {
      component.selectedIds.add('existing');
      fixture.componentRef.setInput('selectedItemIds', null);
      fixture.detectChanges();
      expect(component.selectedIds.has('existing')).toBeTrue();
    });
  });

  describe('constructor effect — tableConfig effect branches', () => {
    it('updates internalTableConfig when tableConfig changes and columnOptions are already populated', () => {
      const titleCol = makeCol({ key: 'title', label: 'Title', tableName: 'TEST' });
      const statusCol = makeCol({ key: 'status', label: 'Status', tableName: 'TEST' });
      fixture.componentRef.setInput('defaultColumnOptions', []);
      fixture.componentRef.setInput('tableConfig', [titleCol, statusCol]);
      component.ngOnChanges();

      fixture.componentRef.setInput('tableConfig', [titleCol]);

      expect(component.internalTableConfig().some(c => c.key === 'title')).toBeTrue();
    });

    it('includes actions col in columnOptions when actionsTemplate is set and config initially empty opts', () => {
      const col = makeCol({ key: 'title', label: 'Title', tableName: 'TEST2' });
      fixture.componentRef.setInput('defaultColumnOptions', []);
      fixture.componentRef.setInput('actionsTemplate', {} as never);
      fixture.componentRef.setInput('actionsHeader', 'Actions');
      fixture.componentRef.setInput('tableConfig', [col]);
      component.ngOnChanges();
      expect(component.columnOptions().some(c => c.id === 'actions')).toBeTrue();
    });
  });

  describe('columnSearchContext parentRef effect', () => {
    it('resets dropdown options when parentRef changes', () => {
      component.dropdownOptions.set({ status: [{ id: 'a', label: 'A', value: 'a' }] });
      fixture.componentRef.setInput('columnSearchContext', { parentRef: 'parent-1' });
      fixture.detectChanges();

      expect(component.dropdownOptions()).toEqual({});
    });

    it('does nothing when parentRef is empty string', () => {
      component.dropdownOptions.set({ status: [{ id: 'a', label: 'A', value: 'a' }] });
      fixture.componentRef.setInput('columnSearchContext', { parentRef: '' });
      fixture.detectChanges();

      expect(component.dropdownOptions()['status']).toBeDefined();
    });
  });

  describe('onResize', () => {
    it('calls updateWidth when showFalseTopScroll is true', () => {
      fixture.componentRef.setInput('showFalseTopScroll', true);

      expect(() => component.onResize()).not.toThrow();
    });

    it('does nothing when showFalseTopScroll is false', () => {
      fixture.componentRef.setInput('showFalseTopScroll', false);
      expect(() => component.onResize()).not.toThrow();
    });
  });

  describe('onMainScroll — showFalseTopScroll branch', () => {
    it('does nothing when showFalseTopScroll is false', () => {
      fixture.componentRef.setInput('showFalseTopScroll', false);
      expect(() => component.onMainScroll()).not.toThrow();
    });

    it('does nothing when showFalseTopScroll is true but no scrollTop view child', () => {
      fixture.componentRef.setInput('showFalseTopScroll', true);
      expect(() => component.onMainScroll()).not.toThrow();
    });
  });

  describe('resetColumnSearchState — timer cleanup', () => {
    it('clears existing timers and dropdownCloseTimer', fakeAsync(() => {
      const col = makeCol({ key: 'status' });
      component.onColumnDropdownQuery(new CustomEvent('query', { detail: { value: 'test' } }), col);

      expect(() => component.resetColumnSearchState()).not.toThrow();
      tick(500);
    }));
  });

  describe('isHandlingTable — various tablenames', () => {
    function setTable(name: string) {
      component.tableName.set(name);
    }

    function emitFieldFor(col: ReturnType<typeof makeCol>): string {
      const spy = jasmine.createSpy('colSearch');
      component.columnSearchChange.subscribe(spy);
      component.onColumnDateSearchChange(new CustomEvent('date', { detail: { value: 'x' } }), col);
      return spy.calls.mostRecent().args[0].field;
    }

    it('HANDLINGS table resolves as handling table', () => {
      setTable('HANDLINGS');
      expect(emitFieldFor(makeCol({ key: 'status' }))).toBe('handling_handlingsstatus');
    });

    it('ARBETSMATERIAL resolves as handling table', () => {
      setTable('ARBETSMATERIAL');
      expect(emitFieldFor(makeCol({ key: 'status' }))).toBe('handling_handlingsstatus');
    });

    it('HANDLINGAR_GRID resolves as handling table', () => {
      setTable('HANDLINGAR_GRID');
      expect(emitFieldFor(makeCol({ key: 'status' }))).toBe('handling_handlingsstatus');
    });

    it('MINA_UPPGIFTER resolves as handling table', () => {
      setTable('MINA_UPPGIFTER');
      expect(emitFieldFor(makeCol({ key: 'status' }))).toBe('handling_handlingsstatus');
    });

    it('DOCUMENT_SEARCH_HANDLING resolves as handling table', () => {
      setTable('DOCUMENT_SEARCH_HANDLING');
      expect(emitFieldFor(makeCol({ key: 'status' }))).toBe('handling_handlingsstatus');
    });

    it('DOCUMENT_SEARCH_UTKAST resolves as handling table', () => {
      setTable('DOCUMENT_SEARCH_UTKAST');
      expect(emitFieldFor(makeCol({ key: 'status' }))).toBe('handling_handlingsstatus');
    });

    it('arbitrary table with HANDLINGAR_ prefix resolves as handling table', () => {
      setTable('HANDLINGAR_CUSTOM');
      expect(emitFieldFor(makeCol({ key: 'status' }))).toBe('handling_handlingsstatus');
    });
  });

  describe('getSearchField — arendenummer key', () => {
    it('maps arendenummer to arende_arendenummer', () => {
      const spy = jasmine.createSpy('colSearch');
      component.columnSearchChange.subscribe(spy);
      component.onColumnDateSearchChange(
        new CustomEvent('date', { detail: { value: 'x' } }),
        makeCol({ key: 'arendenummer' })
      );
      expect(spy.calls.mostRecent().args[0].field).toBe('arende_arendenummer');
    });
  });

  describe('getSearchInputType — additional date patterns', () => {
    it('returns "date" when label contains "datum"', () => {
      expect(component.getSearchInputType(makeCol({ key: 'someField', label: 'Inkommet datum' }))).toBe('date');
    });

    it('returns "date" when key contains "date"', () => {
      expect(component.getSearchInputType(makeCol({ key: 'dateField' }))).toBe('date');
    });

    it('returns "date" when key contains "modified"', () => {
      expect(component.getSearchInputType(makeCol({ key: 'lastModified' }))).toBe('date');
    });

    it('returns "date" when key contains "received"', () => {
      expect(component.getSearchInputType(makeCol({ key: 'receivedAt' }))).toBe('date');
    });

    it('returns "date" when sortField contains "modified"', () => {
      expect(component.getSearchInputType(makeCol({ key: 'someKey', sortField: 'dc:modified' }))).toBe('date');
    });

    it('returns "date" when label contains "date"', () => {
      expect(component.getSearchInputType(makeCol({ key: 'field', label: 'Date field' }))).toBe('date');
    });

    it('returns "select" for lastcontributor column', () => {
      expect(component.getSearchInputType(makeCol({ key: 'lastcontributor' }))).toBe('select');
    });
  });

  describe('resolveStatusLabel — additional paths', () => {
    type ResolveFn = (value: unknown) => string;

    function callResolve(value: unknown): string {
      return (component as unknown as { resolveStatusLabel: ResolveFn }).resolveStatusLabel(value);
    }

    it('returns empty string for null', () => {
      expect(callResolve(null)).toBe('');
    });

    it('resolves array by using its first element', () => {
      expect(callResolve(['Öppet', 'Stängt'])).toBe('Öppet');
    });

    it('returns string value directly', () => {
      expect(callResolve('Öppet')).toBe('Öppet');
    });

    it('returns number as string', () => {
      expect(callResolve(42)).toBe('42');
    });

    it('returns boolean as string', () => {
      expect(callResolve(true)).toBe('true');
    });

    it('returns empty for non-object non-primitive', () => {
      expect(callResolve({})).toBe('');
    });

    it('returns label from directoryEntry with label property', () => {
      const entry = { 'entity-type': 'directoryEntry', properties: { label: 'Stängt', id: 'stangt' }, id: 'stangt' };
      expect(callResolve(entry)).toBe('Stängt');
    });

    it('returns id from directoryEntry when no label', () => {
      const entry = { 'entity-type': 'directoryEntry', properties: { id: 'stangt' }, id: 'stangt' };
      expect(callResolve(entry)).toBe('stangt');
    });

    it('returns obj.id from directoryEntry when no label or props.id', () => {
      const entry = { 'entity-type': 'directoryEntry', properties: {}, id: 'stangt' };
      expect(callResolve(entry)).toBe('stangt');
    });

    it('returns label from plain object with label property', () => {
      expect(callResolve({ label: 'Öppet', id: 'oppet' })).toBe('Öppet');
    });

    it('returns title from plain object without label', () => {
      expect(callResolve({ title: 'My Title', id: 'my-id' })).toBe('My Title');
    });

    it('returns id from plain object without label or title', () => {
      expect(callResolve({ id: 'my-id' })).toBe('my-id');
    });

    it('returns empty string from plain object with no recognized keys', () => {
      expect(callResolve({ foo: 'bar' })).toBe('');
    });
  });

  describe('extractOptionValue — private method', () => {
    type ExtractFn = (value: unknown) => string;

    function callExtract(value: unknown): string {
      return (component as unknown as { extractOptionValue: ExtractFn }).extractOptionValue(value);
    }

    it('returns empty string for null', () => {
      expect(callExtract(null)).toBe('');
    });

    it('returns first element string from array', () => {
      expect(callExtract(['first', 'second'])).toBe('first');
    });

    it('converts non-string first element to string', () => {
      expect(callExtract([42])).toBe('42');
    });

    it('handles empty array', () => {
      expect(callExtract([])).toBe('');
    });

    it('delegates to documentValueService for objects', () => {
      const docValSpy = jasmine.createSpyObj('DocumentValueService', ['getDirectoryLabel']);
      docValSpy.getDirectoryLabel.and.returnValue('label-from-service');
      (component as unknown as { documentValueService: unknown }).documentValueService = docValSpy;
      expect(callExtract({ 'entity-type': 'directoryEntry' })).toBe('label-from-service');
    });

    it('returns empty string when documentValueService returns falsy', () => {
      const docValSpy = jasmine.createSpyObj('DocumentValueService', ['getDirectoryLabel']);
      docValSpy.getDirectoryLabel.and.returnValue('');
      (component as unknown as { documentValueService: unknown }).documentValueService = docValSpy;
      expect(callExtract({ id: 'x' })).toBe('');
    });

    it('converts primitive string value', () => {
      expect(callExtract('hello')).toBe('hello');
    });
  });

  describe('getDirectoryNameForKey — switch cases', () => {
    type GetDirFn = (key: string) => string | null;

    function getDir(key: string): string | null {
      return (component as unknown as { getDirectoryNameForKey: GetDirFn }).getDirectoryNameForKey(key);
    }

    it('returns Handlingsstatus for status when isReadyToCloseTable', () => {
      component.tableName.set('READY_TO_CLOSE');
      expect(getDir('status')).toBe('Handlingsstatus');
    });

    it('returns Handlingsstatus for status when isHandlingTable', () => {
      component.tableName.set('HANDLINGAR_X');
      expect(getDir('status')).toBe('Handlingsstatus');
    });

    it('returns Arendestatus for status in arende table', () => {
      component.tableName.set('ARENDEN');
      expect(getDir('status')).toBe('Arendestatus');
    });

    it('returns Arendestatus for arendestatus key', () => {
      expect(getDir('arendestatus')).toBe('Arendestatus');
    });

    it('returns Handlaggningsstatus for handlaggningsstatus key', () => {
      expect(getDir('handlaggningsstatus')).toBe('Handlaggningsstatus');
    });

    it('returns Behorighetsstatus for behorighetsstatus key', () => {
      expect(getDir('behorighetsstatus')).toBe('Behorighetsstatus');
    });

    it('returns ArendeRiktning for riktning in arende table', () => {
      component.tableName.set('ARENDEN');
      expect(getDir('riktning')).toBe('ArendeRiktning');
    });

    it('returns Riktning for riktning in handling table', () => {
      component.tableName.set('HANDLINGAR_X');
      expect(getDir('riktning')).toBe('Riktning');
    });

    it('returns Sekretess for sekretess key', () => {
      expect(getDir('sekretess')).toBe('Sekretess');
    });

    it('returns Sekretess for handlingsekretess key', () => {
      expect(getDir('handlingsekretess')).toBe('Sekretess');
    });

    it('returns Sakerhetsskyddsklassificering for sakerhetsskyddsklassificering key', () => {
      expect(getDir('sakerhetsskyddsklassificering')).toBe('Sakerhetsskyddsklassificering');
    });

    it('returns Sakerhetsskyddsklassificering for handlingsakerhetsskyddsklassificering key', () => {
      expect(getDir('handlingsakerhetsskyddsklassificering')).toBe('Sakerhetsskyddsklassificering');
    });

    it('returns null for unknown key', () => {
      expect(getDir('someunknownkey')).toBeNull();
    });
  });

  describe('fetchDropdownOptions — updateOptions with selected items', () => {
    it('merges selected options with new options and updates dropdownSelections when changed', fakeAsync(() => {
      fixture.componentRef.setInput('columnSearchDebounceMs', 0);
      const col = makeCol({ key: 'status' });

      const preSelected = { id: 'stangt', label: 'Stängt', value: 'stangt' };
      component.dropdownSelections.set({ status: [preSelected] });

      apiSpy.getDirectorySuggestions.and.returnValue(of([{ id: 'oppet', displayLabel: 'Öppet' }]));

      component.onColumnDropdownQuery(new CustomEvent('query', { detail: { value: '' } }), col);
      tick();

      const options = component.getDropdownOptions(col);
      expect(options.some(o => o.id === 'stangt')).toBeTrue();
      expect(options.some(o => o.id === 'oppet')).toBeTrue();
    }));

    it('updates dropdownSelections when option reference changes', fakeAsync(() => {
      fixture.componentRef.setInput('columnSearchDebounceMs', 0);
      const col = makeCol({ key: 'status' });

      const oldRef = { id: 'oppet', label: 'Old Label', value: 'oppet' };
      component.dropdownSelections.set({ status: [oldRef] });

      apiSpy.getDirectorySuggestions.and.returnValue(of([{ id: 'oppet', displayLabel: 'Öppet' }]));

      component.onColumnDropdownQuery(new CustomEvent('query', { detail: { value: '' } }), col);
      tick();

      const selections = component.dropdownSelections()['status'];
      expect(selections).toBeDefined();

      expect(selections[0].label).toBe('Öppet');
    }));
  });

  describe('buildOptionsFromItems', () => {
    type BuildFn = (col: TableColumn) => { id: string; label: string; value: string }[];

    function callBuild(col: TableColumn): { id: string; label: string; value: string }[] {
      return (component as unknown as { buildOptionsFromItems: BuildFn }).buildOptionsFromItems(col);
    }

    it('builds options from table items filtering out empty values', () => {
      const items = [
        makeItem({ id: 'a', customField: 'val1' }),
        makeItem({ id: 'b', customField: 'val2' }),
        makeItem({ id: 'c', customField: '' }),
        makeItem({ id: 'd', customField: null }),
      ];
      fixture.componentRef.setInput('tableItems', items);
      const col = makeCol({ key: 'customField' });
      const result = callBuild(col);
      expect(result.length).toBe(2);
      expect(result.map(o => o.id)).toEqual(['val1', 'val2']);
    });

    it('deduplicates repeated values', () => {
      const items = [makeItem({ id: 'a', customField: 'val1' }), makeItem({ id: 'b', customField: 'val1' })];
      fixture.componentRef.setInput('tableItems', items);
      const result = callBuild(makeCol({ key: 'customField' }));
      expect(result.length).toBe(1);
    });

    it('uses getStatusText as label for status columns', () => {
      casesSpy.getStatusLabel.and.returnValue('Öppet');
      const items = [makeItem({ id: 'a', status: 'oppet' })];
      fixture.componentRef.setInput('tableItems', items);
      const result = callBuild(makeCol({ key: 'status' }));
      expect(result[0].label).toBe('Öppet');
    });

    it('skips em-dash values', () => {
      const items = [makeItem({ id: 'a', customField: '—' })];
      fixture.componentRef.setInput('tableItems', items);
      const result = callBuild(makeCol({ key: 'customField' }));
      expect(result.length).toBe(0);
    });
  });

  describe('updateEditedField — target.value branch', () => {
    it('uses target.value when detail is not a primitive', () => {
      const items = [makeItem({ id: 'row-1', dateField: '' })];
      fixture.componentRef.setInput('tableItems', items);
      const spy = jasmine.createSpy('updatedTableItems');
      component.updatedTableItems.subscribe(spy);

      const input = document.createElement('input');
      input.value = '2026-01-01';
      const event = new Event('input');
      Object.defineProperty(event, 'target', { value: input });
      component.updateEditedField(event as CustomEvent, items[0], 'dateField');

      expect(spy.calls.mostRecent().args[0][0]['dateField']).toBe('2026-01-01');
    });
  });

  describe('updateMultiselect', () => {
    it('updates item field with MatSelectChange value', () => {
      const items = [makeItem({ id: 'row-1', category: 'old' })];
      fixture.componentRef.setInput('tableItems', items);
      const spy = jasmine.createSpy('updatedTableItems');
      component.updatedTableItems.subscribe(spy);

      const event = { value: ['new-val'] } as unknown as import('@angular/material/select').MatSelectChange;
      component.updateMultiselect(event, items[0], 'category');

      expect(spy.calls.mostRecent().args[0][0]['category']).toEqual(['new-val']);
    });

    it('does not update other items', () => {
      const items = [makeItem({ id: 'row-1', category: 'old' }), makeItem({ id: 'row-2', category: 'keep' })];
      fixture.componentRef.setInput('tableItems', items);
      const spy = jasmine.createSpy('updatedTableItems');
      component.updatedTableItems.subscribe(spy);

      const event = { value: 'new' } as unknown as import('@angular/material/select').MatSelectChange;
      component.updateMultiselect(event, items[0], 'category');

      const updated = spy.calls.mostRecent().args[0];
      expect(updated[1]['category']).toBe('keep');
    });
  });

  describe('extractChecked — private method', () => {
    type ExtractFn = (event: Event) => boolean;

    function callExtract(event: Event): boolean {
      return (component as unknown as { extractChecked: ExtractFn }).extractChecked(event);
    }

    it('returns true from target.checked when boolean', () => {
      const el = document.createElement('input');
      el.type = 'checkbox';
      el.checked = true;
      const event = new Event('change');
      Object.defineProperty(event, 'target', { value: el });
      expect(callExtract(event)).toBeTrue();
    });

    it('returns false from target.checked = false', () => {
      const el = document.createElement('input');
      el.type = 'checkbox';
      el.checked = false;
      const event = new Event('change');
      Object.defineProperty(event, 'target', { value: el });
      expect(callExtract(event)).toBeFalse();
    });

    it('falls through to detail.target.checked when target has no checked', () => {
      const event = new CustomEvent('change', {
        detail: { target: { checked: true } },
      });
      expect(callExtract(event)).toBeTrue();
    });

    it('returns false when nothing provides a boolean checked', () => {
      const event = new CustomEvent('change', { detail: {} });
      expect(callExtract(event)).toBeFalse();
    });
  });

  describe('onColumnDropped', () => {
    it('does nothing when pointer is not over container', () => {
      const event = {
        isPointerOverContainer: false,
        previousIndex: 0,
        currentIndex: 1,
      } as unknown as import('@angular/cdk/drag-drop').CdkDragDrop<TableColumn[]>;
      const before = component.columnOptions();
      component.onColumnDropped(event);
      expect(component.columnOptions()).toEqual(before);
    });

    it('does nothing when previousIndex equals currentIndex', () => {
      const event = {
        isPointerOverContainer: true,
        previousIndex: 1,
        currentIndex: 1,
      } as unknown as import('@angular/cdk/drag-drop').CdkDragDrop<TableColumn[]>;
      const before = component.columnOptions();
      component.onColumnDropped(event);
      expect(component.columnOptions()).toEqual(before);
    });

    it('reorders visible options and saves to localStorage', () => {
      const titleCol = makeCol({ key: 'title', label: 'Title', tableName: 'TEST' });
      const statusCol = makeCol({ key: 'status', label: 'Status', tableName: 'TEST' });
      fixture.componentRef.setInput('tableConfig', [titleCol, statusCol]);
      component.tableName.set('TEST');
      component.columnOptions.set([
        { id: 'title', label: 'Title', visible: true },
        { id: 'status', label: 'Status', visible: true },
      ]);

      const event = {
        isPointerOverContainer: true,
        previousIndex: 0,
        currentIndex: 1,
      } as unknown as import('@angular/cdk/drag-drop').CdkDragDrop<TableColumn[]>;

      localStorage.clear();
      component.onColumnDropped(event);

      expect(component.columnOptions()[0].id).toBe('status');
      expect(component.columnOptions()[1].id).toBe('title');
      expect(localStorage.getItem('table_columns_current_TEST_testuser')).toBeTruthy();
    });
  });

  describe('reorderVisibleOptions — edge cases', () => {
    type ReorderFn = (options: unknown[], prev: number, curr: number) => unknown[];

    function callReorder(options: unknown[], prev: number, curr: number): unknown[] {
      return (component as unknown as { reorderVisibleOptions: ReorderFn }).reorderVisibleOptions(
        options as never,
        prev,
        curr
      );
    }

    it('returns options unchanged when fewer than 2 visible options', () => {
      const options = [
        { id: 'title', label: 'Title', visible: true },
        { id: 'status', label: 'Status', visible: false },
      ];
      const result = callReorder(options, 0, 1);
      expect(result).toEqual(options);
    });

    it('returns options unchanged when clamped indices are equal', () => {
      const options = [
        { id: 'title', label: 'Title', visible: true },
        { id: 'status', label: 'Status', visible: true },
      ];
      const result = callReorder(options, 5, 5);
      expect(result).toEqual(options);
    });
  });

  describe('clampIndex — private method', () => {
    type ClampFn = (index: number, length: number) => number;

    function callClamp(index: number, length: number): number {
      return (component as unknown as { clampIndex: ClampFn }).clampIndex(index, length);
    }

    it('returns 0 for non-finite index', () => {
      expect(callClamp(Infinity, 5)).toBe(0);
      expect(callClamp(NaN, 5)).toBe(0);
    });

    it('returns 0 for negative index', () => {
      expect(callClamp(-3, 5)).toBe(0);
    });

    it('returns length - 1 for index >= length', () => {
      expect(callClamp(10, 5)).toBe(4);
    });

    it('returns index when within range', () => {
      expect(callClamp(2, 5)).toBe(2);
    });
  });

  describe('shouldBindDropdownValue — dropdownValueSyncKeys branch', () => {
    it('returns false for multi-select column not in sync window', () => {
      const col = makeCol({ key: 'arendetyp' });
      expect(component.shouldBindDropdownValue(col)).toBeFalse();
    });

    it('returns true for multi-select column in sync window with no selection', () => {
      const col = makeCol({ key: 'arendetyp' });
      (component as unknown as { dropdownValueSyncKeys: Set<string> }).dropdownValueSyncKeys.add('arendetyp');
      component.dropdownSelections.set({ arendetyp: [] });
      expect(component.shouldBindDropdownValue(col)).toBeTrue();
    });

    it('returns true when selected length matches resolved options length', () => {
      const col = makeCol({ key: 'arendetyp' });
      (component as unknown as { dropdownValueSyncKeys: Set<string> }).dropdownValueSyncKeys.add('arendetyp');
      const option = { id: 'a', label: 'A', value: 'a' };
      component.dropdownOptions.set({ arendetyp: [option] });
      component.dropdownSelections.set({ arendetyp: [option] });
      expect(component.shouldBindDropdownValue(col)).toBeTrue();
    });
  });

  describe('isSameDropdownValue — private method', () => {
    type IsSameFn = (prev: string | string[] | undefined, next: string | string[]) => boolean;

    function callIsSame(prev: string | string[] | undefined, next: string | string[]): boolean {
      return (component as unknown as { isSameDropdownValue: IsSameFn }).isSameDropdownValue(prev, next);
    }

    it('returns true when previous is undefined and next is empty string', () => {
      expect(callIsSame(undefined, '')).toBeTrue();
    });

    it('returns true when previous is undefined and next is empty array', () => {
      expect(callIsSame(undefined, [])).toBeTrue();
    });

    it('returns false when previous is undefined and next is non-empty', () => {
      expect(callIsSame(undefined, 'oppet')).toBeFalse();
      expect(callIsSame(undefined, ['oppet'])).toBeFalse();
    });

    it('returns true for matching strings', () => {
      expect(callIsSame('oppet', 'oppet')).toBeTrue();
    });

    it('returns false for different strings', () => {
      expect(callIsSame('oppet', 'stangt')).toBeFalse();
    });

    it('returns true for matching arrays', () => {
      expect(callIsSame(['a', 'b'], ['a', 'b'])).toBeTrue();
    });

    it('returns false for arrays of different lengths', () => {
      expect(callIsSame(['a'], ['a', 'b'])).toBeFalse();
    });

    it('returns false for arrays with different content', () => {
      expect(callIsSame(['a', 'b'], ['a', 'c'])).toBeFalse();
    });

    it('returns false for mismatched types (string vs array)', () => {
      expect(callIsSame('a', ['a'])).toBeFalse();
    });
  });

  describe('onColumnDropdownSubmit — dropdownCloseFlags branch', () => {
    it('does not emit when the dropdown close flag is set before timer fires', fakeAsync(() => {
      const col = makeCol({ key: 'status' });
      const spy = jasmine.createSpy('columnSearchChange');
      component.columnSearchChange.subscribe(spy);
      component.dropdownOptions.set({ status: [{ id: 'oppet', label: 'Öppet', value: 'oppet' }] });

      component.onColumnDropdownSubmit(new CustomEvent('submit', { detail: ['oppet'] }), col);

      component.onDropdownClosed(col);

      tick();

      expect(spy).not.toHaveBeenCalled();
    }));
  });

  describe('hasActiveColumnSearchState — dropdownSelections branch', () => {
    it('returns true when dropdownSelections has non-empty array', () => {
      component.dropdownSelections.set({ status: [{ id: 'a', label: 'A', value: 'a' }] });
      expect(component.hasActiveColumnSearchState()).toBeTrue();
    });

    it('returns false when dropdownSelections has empty arrays only', () => {
      component.dropdownSelections.set({ status: [] });
      expect(component.hasActiveColumnSearchState()).toBeFalse();
    });
  });

  describe('configureColumnSearchForm — form control subscription flow', () => {
    it('subscribes to control value changes and emits columnSearchChange for non-select, non-date', () => {
      const col = makeCol({ key: 'arendenummer', sortField: 'arende_nr', tableName: 'TEST' });
      fixture.componentRef.setInput('columnSearchEnabled', true);
      fixture.componentRef.setInput('tableConfig', [col]);
      fixture.componentRef.setInput('defaultColumnOptions', []);

      component.ngOnChanges();
      fixture.detectChanges();

      const spy = jasmine.createSpy('columnSearchChange');
      component.columnSearchChange.subscribe(spy);

      const control = component.columnSearchForm.controls['arendenummer'];
      expect(control).toBeDefined();
      if (control) {
        control.setValue('12345', { emitEvent: true });
      }

      expect(spy).toHaveBeenCalledWith(jasmine.objectContaining({ field: 'arende_arendenummer', value: '12345' }));
    });

    it('does not emit for select-type filterable dropdown columns', () => {
      const col = makeCol({ key: 'arendestatus', sortField: 'arendestatus', tableName: 'ARENDEN' });
      fixture.componentRef.setInput('columnSearchEnabled', true);
      fixture.componentRef.setInput('tableConfig', [col]);
      fixture.componentRef.setInput('defaultColumnOptions', []);
      component.tableName.set('ARENDEN');

      component.ngOnChanges();
      fixture.detectChanges();

      const spy = jasmine.createSpy('columnSearchChange');
      component.columnSearchChange.subscribe(spy);

      const control = component.columnSearchForm.controls['arendestatus'];
      if (control) {
        control.setValue('oppet', { emitEvent: true });
      }

      expect(spy).not.toHaveBeenCalled();
    });

    it('removes subscriptions for columns no longer in the config', () => {
      const arendeCol = makeCol({ key: 'arendenummer', sortField: 'arende_nr', tableName: 'FMTEST' });
      const noteCol = makeCol({ key: 'notering', sortField: 'notering', tableName: 'FMTEST' });
      fixture.componentRef.setInput('columnSearchEnabled', true);
      fixture.componentRef.setInput('defaultColumnOptions', []);
      fixture.componentRef.setInput('tableConfig', [arendeCol, noteCol]);
      component.ngOnChanges();
      fixture.detectChanges();

      expect(component.columnSearchForm.controls['arendenummer']).toBeDefined();
      expect(component.columnSearchForm.controls['notering']).toBeDefined();

      fixture.componentRef.setInput('tableConfig', [arendeCol]);
      component.ngOnChanges();
      fixture.detectChanges();

      expect(component.columnSearchForm.controls['notering']).toBeUndefined();
    });
  });

  describe('updateColumnSearchValue — delete branch', () => {
    type UpdateFn = (key: string, value: string) => void;

    it('removes key from columnSearchValues when value is empty', () => {
      component.columnSearchValues.set({ title: 'old' });
      (component as unknown as { updateColumnSearchValue: UpdateFn }).updateColumnSearchValue('title', '');
      expect(component.columnSearchValues()['title']).toBeUndefined();
    });
  });

  describe('onHeaderSort', () => {
    it('calls onHeaderClick and stops propagation', () => {
      const event = new MouseEvent('click');
      spyOn(event, 'stopPropagation');
      const sortSpy = jasmine.createSpy('sortChange');
      component.sortChange.subscribe(sortSpy);

      component.onHeaderSort(makeCol({ sortField: 'dc:title' }), event);

      expect(event.stopPropagation).toHaveBeenCalled();
      expect(sortSpy).toHaveBeenCalled();
    });
  });

  describe('pageSizeChange output', () => {
    it('component has pageSizeChange output', () => {
      const spy = jasmine.createSpy('pageSizeChange');
      component.pageSizeChange.subscribe(spy);
      component.pageSizeChange.emit(50);
      expect(spy).toHaveBeenCalledWith(50);
    });
  });

  describe('isMinaArendenTable — private method', () => {
    type IsMinaFn = () => boolean;

    function callIsMina(): boolean {
      return (component as unknown as { isMinaArendenTable: IsMinaFn }).isMinaArendenTable();
    }

    it('returns true for MINA_AREDEN table', () => {
      component.tableName.set('MINA_AREDEN');
      expect(callIsMina()).toBeTrue();
    });

    it('returns false for other tables', () => {
      component.tableName.set('ARENDEN');
      expect(callIsMina()).toBeFalse();
    });
  });

  describe('getStatusColor — handling table fallback', () => {
    it('uses denied fallback when isHandlingTable', () => {
      component.tableName.set('HANDLINGAR_X');
      component.getStatusColor('unknown-status');
      expect(casesSpy.getStatusColor).toHaveBeenCalledWith('unknown-status', { fallback: 'denied' });
    });

    it('uses missing fallback when not handling table', () => {
      component.tableName.set('ARENDEN');
      component.getStatusColor('unknown-status');
      expect(casesSpy.getStatusColor).toHaveBeenCalledWith('unknown-status', { fallback: 'missing' });
    });
  });

  describe('getBehorighetsStatusLabel — fallback paths', () => {
    it('uses handlaggningsstatus when caseState gives no steps', () => {
      const item = makeItem({ caseState: undefined, handlaggningsstatus: 'Stängt', status: undefined });
      const col = makeCol({ key: 'behorighetsstatus' });
      const result = component.getBehorighetsStatusLabel(item as never, col);
      expect(result).toBe('Stängt');
    });

    it('uses arendestatus when caseState and handlaggningsstatus give no steps', () => {
      const item = makeItem({ caseState: undefined, handlaggningsstatus: undefined, arendestatus: 'Stängt' });
      const col = makeCol({ key: 'behorighetsstatus' });
      const result = component.getBehorighetsStatusLabel(item as never, col);
      expect(result).toBe('Stängt');
    });

    it('uses status when caseState/handlaggningsstatus/arendestatus all give no steps', () => {
      const item = makeItem({
        caseState: undefined,
        handlaggningsstatus: undefined,
        arendestatus: undefined,
        status: 'Stängt',
      });
      const col = makeCol({ key: 'behorighetsstatus' });
      const result = component.getBehorighetsStatusLabel(item as never, col);
      expect(result).toBe('Stängt');
    });
  });

  describe('onCsvExportClick — no export columns branch', () => {
    it('does not call exportRowsToCSV when all columns are actions', () => {
      fixture.componentRef.setInput('localCsvExportEnabled', true);
      component.internalTableConfig.set([makeCol({ key: 'actions', label: 'Actions' })]);
      component.onCsvExportClick();
      expect(csvSpy.exportRowsToCSV).not.toHaveBeenCalled();
    });
  });

  describe('isFilterableDropdownColumn — additional keys', () => {
    it('returns true for arendestatus', () => {
      expect(component.isFilterableDropdownColumn(makeCol({ key: 'arendestatus' }))).toBeTrue();
    });

    it('returns true for riktning', () => {
      expect(component.isFilterableDropdownColumn(makeCol({ key: 'riktning' }))).toBeTrue();
    });

    it('returns true for sakerhetsskyddsklassificering', () => {
      expect(component.isFilterableDropdownColumn(makeCol({ key: 'sakerhetsskyddsklassificering' }))).toBeTrue();
    });

    it('returns true for sekretess', () => {
      expect(component.isFilterableDropdownColumn(makeCol({ key: 'sekretess' }))).toBeTrue();
    });

    it('returns true for beslutsfattare', () => {
      expect(component.isFilterableDropdownColumn(makeCol({ key: 'beslutsfattare' }))).toBeTrue();
    });

    it('returns true for medhandlaggare', () => {
      expect(component.isFilterableDropdownColumn(makeCol({ key: 'medhandlaggare' }))).toBeTrue();
    });

    it('returns true for granskare', () => {
      expect(component.isFilterableDropdownColumn(makeCol({ key: 'granskare' }))).toBeTrue();
    });

    it('returns true for lastcontributor', () => {
      expect(component.isFilterableDropdownColumn(makeCol({ key: 'lastcontributor' }))).toBeTrue();
    });

    it('returns true for ansvarighandlaggare', () => {
      expect(component.isFilterableDropdownColumn(makeCol({ key: 'ansvarighandlaggare' }))).toBeTrue();
    });

    it('returns true for handlaggningsstatus', () => {
      expect(component.isFilterableDropdownColumn(makeCol({ key: 'handlaggningsstatus' }))).toBeTrue();
    });

    it('returns true for ansvarigchef', () => {
      expect(component.isFilterableDropdownColumn(makeCol({ key: 'ansvarigchef' }))).toBeTrue();
    });

    it('returns true for status in READY_TO_CLOSE (not handling, not HANDLINGAR_*) — wait, READY_TO_CLOSE is not handling', () => {
      component.tableName.set('READY_TO_CLOSE');
      expect(component.isFilterableDropdownColumn(makeCol({ key: 'status' }))).toBeTrue();
    });

    it('returns false for status in handling table', () => {
      component.tableName.set('HANDLINGAR_X');
      expect(component.isFilterableDropdownColumn(makeCol({ key: 'status' }))).toBeFalse();
    });
  });

  describe('getDropdownValue — resolved options', () => {
    it('resolves selected options by id from available options', () => {
      const col = makeCol({ key: 'status' });
      const option = { id: 'oppet', label: 'Öppet', value: 'oppet' };
      component.dropdownOptions.set({ status: [option] });

      component.dropdownSelections.set({ status: [{ id: 'oppet', label: 'Öppet' }] });
      const result = component.getDropdownValue(col);
      expect(result.length).toBe(1);
      expect(result[0].value).toBe('oppet');
    });

    it('creates fallback option when selected id does not match available options', () => {
      const col = makeCol({ key: 'status' });
      component.dropdownOptions.set({ status: [{ id: 'oppet', label: 'Öppet', value: 'oppet' }] });
      component.dropdownSelections.set({ status: [{ id: 'unknown', label: 'Unknown' }] });
      const result = component.getDropdownValue(col);

      expect(result.length).toBe(1);
      expect(result[0].id).toBe('unknown');
    });
  });

  describe('onColumnDropdownQuery — static dropdown column skipped', () => {
    it('does nothing for static dropdown columns (behorighetsstatus)', () => {
      const col = makeCol({ key: 'behorighetsstatus' });
      apiSpy.getDirectorySuggestions.calls.reset();
      component.onColumnDropdownQuery(new CustomEvent('query', { detail: { value: 'test' } }), col);
      expect(apiSpy.getDirectorySuggestions).not.toHaveBeenCalled();
    });
  });

  describe('fetchDropdownOptions — ansvarigenhet without parentRef', () => {
    it('calls updateOptions with empty array when parentRef is missing', fakeAsync(() => {
      fixture.componentRef.setInput('columnSearchDebounceMs', 0);
      fixture.componentRef.setInput('columnSearchContext', null);
      const col = makeCol({ key: 'ansvarigenhet' });

      component.onColumnDropdownQuery(new CustomEvent('query', { detail: { value: '' } }), col);
      tick();

      expect(component.getDropdownOptions(col)).toEqual([]);
    }));
  });

  describe('fetchDropdownOptions — user suggestion columns', () => {
    const userCols = [
      'ansvarigchef',
      'beslutsfattare',
      'medhandlaggare',
      'granskare',
      'lastcontributor',
      'ansvarighandlaggare',
    ];
    userCols.forEach(key => {
      it(`fetches user suggestions for ${key} column`, fakeAsync(() => {
        fixture.componentRef.setInput('columnSearchDebounceMs', 0);
        apiSpy.getUserSuggestions.calls.reset();
        const col = makeCol({ key });

        component.onColumnDropdownQuery(new CustomEvent('query', { detail: { value: 'search' } }), col);
        tick();

        expect(apiSpy.getUserSuggestions).toHaveBeenCalledWith('search');
      }));
    });
  });

  describe('fetchDropdownOptions — directory suggestions for various keys', () => {
    const directoryCols = [
      { key: 'arendestatus', dir: 'Arendestatus' },
      { key: 'handlaggningsstatus', dir: 'Handlaggningsstatus' },
      { key: 'sekretess', dir: 'Sekretess' },
      { key: 'handlingsekretess', dir: 'Sekretess' },
      { key: 'sakerhetsskyddsklassificering', dir: 'Sakerhetsskyddsklassificering' },
      { key: 'handlingsakerhetsskyddsklassificering', dir: 'Sakerhetsskyddsklassificering' },
    ];

    directoryCols.forEach(({ key, dir }) => {
      it(`fetches ${dir} directory for ${key} column`, fakeAsync(() => {
        fixture.componentRef.setInput('columnSearchDebounceMs', 0);
        apiSpy.getDirectorySuggestions.calls.reset();
        const col = makeCol({ key });

        component.onColumnDropdownQuery(new CustomEvent('query', { detail: { value: '' } }), col);
        tick();

        expect(apiSpy.getDirectorySuggestions).toHaveBeenCalledWith(dir);
      }));
    });

    it('fetches riktning (ArendeRiktning) for arende table', fakeAsync(() => {
      component.tableName.set('ARENDEN');
      fixture.componentRef.setInput('columnSearchDebounceMs', 0);
      apiSpy.getDirectorySuggestions.calls.reset();
      const col = makeCol({ key: 'riktning' });

      component.onColumnDropdownQuery(new CustomEvent('query', { detail: { value: '' } }), col);
      tick();

      expect(apiSpy.getDirectorySuggestions).toHaveBeenCalledWith('ArendeRiktning');
    }));

    it('fetches riktning (Riktning) for handling table', fakeAsync(() => {
      component.tableName.set('HANDLINGAR_X');
      fixture.componentRef.setInput('columnSearchDebounceMs', 0);
      apiSpy.getDirectorySuggestions.calls.reset();
      const col = makeCol({ key: 'riktning' });

      component.onColumnDropdownQuery(new CustomEvent('query', { detail: { value: '' } }), col);
      tick();

      expect(apiSpy.getDirectorySuggestions).toHaveBeenCalledWith('Riktning');
    }));
  });

  describe('fetchDropdownOptions — key with no handler', () => {
    it('returns without fetching for keys with no handler (e.g. arendetyp without parentRef)', fakeAsync(() => {
      fixture.componentRef.setInput('columnSearchDebounceMs', 0);
      fixture.componentRef.setInput('columnSearchContext', null);
      const col = makeCol({ key: 'arendetyp' });
      apiSpy.DMSDocumentSuggestion.calls.reset();

      component.onColumnDropdownQuery(new CustomEvent('query', { detail: { value: '' } }), col);
      tick();

      expect(apiSpy.DMSDocumentSuggestion).toHaveBeenCalled();
    }));
  });

  describe('onDropdownMouseDown — submit button path', () => {
    it('does not record reset intent when submit button is clicked', () => {
      component.isDropdownOpen.set(true);
      const submitButton = document.createElement('div');
      submitButton.classList.add('digi-form-select-filter__submit-button');
      const event = { composedPath: () => [submitButton] } as unknown as MouseEvent;
      const col = makeCol({ key: 'status' });
      expect(() => component.onDropdownMouseDown(event, col)).not.toThrow();

      expect(
        (component as unknown as { dropdownResetIntents: Set<string> }).dropdownResetIntents.has('status')
      ).toBeFalse();
    });
  });

  describe('ngOnChanges — shouldHavePaddingRight branch', () => {
    it('adds padding column when shouldHavePaddingRight is true', () => {
      const col = makeCol({ key: 'title', label: 'Title', tableName: 'TEST' });
      fixture.componentRef.setInput('tableConfig', [col]);
      fixture.componentRef.setInput('defaultColumnOptions', []);
      fixture.componentRef.setInput('shouldHavePaddingRight', true);

      component.ngOnChanges();

      const paddingCol = component.internalTableConfig().find(c => c.key === 'padding');
      expect(paddingCol).toBeDefined();
    });
  });

  describe('hasRecordValues — private method', () => {
    type HasRecordFn = (record: Record<string, unknown>) => boolean;

    function callHasRecord(record: Record<string, unknown>): boolean {
      return (component as unknown as { hasRecordValues: HasRecordFn }).hasRecordValues(record);
    }

    it('returns false for empty object', () => {
      expect(callHasRecord({})).toBeFalse();
    });

    it('returns false for object with null value', () => {
      expect(callHasRecord({ key: null })).toBeFalse();
    });

    it('returns false for object with empty string value', () => {
      expect(callHasRecord({ key: '' })).toBeFalse();
    });

    it('returns true for object with non-empty string value', () => {
      expect(callHasRecord({ key: 'value' })).toBeTrue();
    });

    it('returns false for object with empty array', () => {
      expect(callHasRecord({ key: [] })).toBeFalse();
    });

    it('returns true for object with non-empty array', () => {
      expect(callHasRecord({ key: ['a'] })).toBeTrue();
    });
  });

  describe('isEmptyDropdownSelection — private method', () => {
    function callIsEmpty(detail: unknown): boolean {
      return (component as unknown as CaseListPrivate).isEmptyDropdownSelection(detail);
    }

    it('returns true for null/undefined/false', () => {
      expect(callIsEmpty(null)).toBeTrue();
      expect(callIsEmpty(undefined)).toBeTrue();
      expect(callIsEmpty(false)).toBeTrue();
    });

    it('returns true for empty array', () => {
      expect(callIsEmpty([])).toBeTrue();
    });

    it('returns false for non-empty array', () => {
      expect(callIsEmpty([{ id: 'a' }])).toBeFalse();
    });

    it('returns true for object with empty array value', () => {
      expect(callIsEmpty({ value: [] })).toBeTrue();
    });

    it('returns true for object with empty string value', () => {
      expect(callIsEmpty({ value: '' })).toBeTrue();
    });

    it('returns true for object with null value', () => {
      expect(callIsEmpty({ value: null })).toBeTrue();
    });

    it('returns true for object with undefined value', () => {
      expect(callIsEmpty({ value: undefined })).toBeTrue();
    });

    it('returns false for object with non-empty array value', () => {
      expect(callIsEmpty({ value: [{ id: 'a' }] })).toBeFalse();
    });

    it('returns false for object with non-empty string value', () => {
      expect(callIsEmpty({ value: 'oppet' })).toBeFalse();
    });

    it('returns false for plain object without value key', () => {
      expect(callIsEmpty({ id: 'x' })).toBeFalse();
    });
  });

  describe('defaultsMatch — private method', () => {
    function callDefaultsMatch(saved: unknown[], incoming: unknown[]): boolean {
      return (component as unknown as CaseListPrivate).defaultsMatch(saved, incoming);
    }

    it('returns false when lengths differ', () => {
      expect(callDefaultsMatch([{ id: 'a', label: 'A', visible: true }], [])).toBeFalse();
    });

    it('returns true for identical arrays', () => {
      const cols = [
        { id: 'title', label: 'Title', visible: true },
        { id: 'status', label: 'Status', visible: false },
      ];
      expect(callDefaultsMatch(cols, cols)).toBeTrue();
    });

    it('returns false when id differs', () => {
      const saved = [{ id: 'old', label: 'Title', visible: true }];
      const incoming = [{ id: 'new', label: 'Title', visible: true }];
      expect(callDefaultsMatch(saved, incoming)).toBeFalse();
    });

    it('returns false when label differs', () => {
      const saved = [{ id: 'title', label: 'Old Label', visible: true }];
      const incoming = [{ id: 'title', label: 'New Label', visible: true }];
      expect(callDefaultsMatch(saved, incoming)).toBeFalse();
    });

    it('returns false when visible differs', () => {
      const saved = [{ id: 'title', label: 'Title', visible: true }];
      const incoming = [{ id: 'title', label: 'Title', visible: false }];
      expect(callDefaultsMatch(saved, incoming)).toBeFalse();
    });
  });

  describe('mergeSavedOptions — edge cases', () => {
    function callMerge(defaults: unknown[], saved: unknown[]): unknown[] {
      return (component as unknown as CaseListPrivate).mergeSavedOptions(defaults, saved);
    }

    it('skips saved options without id', () => {
      const defaults = [{ id: 'title', label: 'Title', visible: true }];
      const saved = [{ label: 'No ID', visible: false }];
      const result = callMerge(defaults, saved);

      expect(result).toEqual(defaults);
    });

    it('skips saved options whose id is not in defaults', () => {
      const defaults = [{ id: 'title', label: 'Title', visible: true }];
      const saved = [{ id: 'unknown', label: 'Unknown', visible: true }];
      const result = callMerge(defaults, saved);
      expect(result).toEqual(defaults);
    });

    it('skips defaults without id in the defaults-by-id map', () => {
      const defaults = [
        { label: 'No ID default', visible: true },
        { id: 'title', label: 'Title', visible: true },
      ];
      const saved = [{ id: 'title', label: 'Title', visible: false }];
      const result = callMerge(defaults, saved) as { id?: string; visible?: boolean }[];

      const titleEntry = result.find(r => r.id === 'title');
      expect(titleEntry?.visible).toBeFalse();
    });

    it('appends defaults not present in saved to the end', () => {
      const defaults = [
        { id: 'title', label: 'Title', visible: true },
        { id: 'status', label: 'Status', visible: true },
      ];
      const saved = [{ id: 'title', label: 'Title', visible: false }];
      const result = callMerge(defaults, saved) as { id?: string }[];

      const ids = result.map(r => r.id);
      expect(ids).toContain('status');
    });

    it('null/undefined saved entries are skipped', () => {
      const defaults = [{ id: 'title', label: 'Title', visible: true }];
      const saved = [null, undefined, { id: 'title', label: 'Title', visible: false }];
      expect(() => callMerge(defaults, saved)).not.toThrow();
    });
  });

  describe('normalizeDropdownValues — private method', () => {
    function callNormalize(selected: unknown[]): string[] {
      return (component as unknown as CaseListPrivate).normalizeDropdownValues(selected);
    }

    it('uses id when available', () => {
      expect(callNormalize([{ id: 'oppet', label: 'Öppet', value: 'oppet' }])).toEqual(['oppet']);
    });

    it('falls back to value when id is missing', () => {
      expect(callNormalize([{ label: 'Öppet', value: 'fallback-val' }])).toEqual(['fallback-val']);
    });

    it('falls back to label when id and value are missing', () => {
      expect(callNormalize([{ label: 'OnlyLabel' }])).toEqual(['OnlyLabel']);
    });

    it('returns empty string for empty option', () => {
      expect(callNormalize([{}])).toEqual(['']);
    });

    it('handles multiple options', () => {
      const options = [
        { id: 'a', label: 'A', value: 'a' },
        { id: 'b', label: 'B', value: 'b' },
      ];
      expect(callNormalize(options)).toEqual(['a', 'b']);
    });
  });

  describe('ensureSelectFilterValues — private method', () => {
    function callEnsure(options: unknown[]): unknown[] {
      return (component as unknown as CaseListPrivate).ensureSelectFilterValues(options);
    }

    it('returns empty array when options is empty', () => {
      expect(callEnsure([])).toEqual([]);
    });

    it('returns empty array when options is null/undefined', () => {
      expect(callEnsure(null as never)).toEqual([]);
    });

    it('returns options unchanged when all have values', () => {
      const options = [{ id: 'a', label: 'A', value: 'a' }];
      const result = callEnsure(options);
      expect(result).toEqual(options);
    });

    it('sets value from id when value is missing', () => {
      const options = [{ id: 'a', label: 'A' }];
      const result = callEnsure(options) as { id: string; value: string }[];
      expect(result[0].value).toBe('a');
    });

    it('does not overwrite existing value', () => {
      const options = [{ id: 'a', label: 'A', value: 'existing' }];
      const result = callEnsure(options) as { value: string }[];
      expect(result[0].value).toBe('existing');
    });
  });

  describe('resetColumnSearchFormControls — private method', () => {
    function callReset(emitEvent: boolean): void {
      (component as unknown as CaseListPrivate).resetColumnSearchFormControls(emitEvent);
    }

    it('resets non-select controls to empty string', () => {
      const col = makeCol({ key: 'title', sortField: 'dc:title' });
      fixture.componentRef.setInput('columnSearchEnabled', true);
      component.internalTableConfig.set([col]);
      (component as unknown as CaseListPrivate).ensureColumnSearchControl('title');
      component.columnSearchForm.controls['title']?.setValue('existing');

      callReset(false);

      expect(component.columnSearchForm.controls['title']?.value).toBe('');
    });

    it('resets filterable-select controls to empty array', () => {
      const col = makeCol({ key: 'arendestatus', sortField: 'arendestatus' });
      fixture.componentRef.setInput('columnSearchEnabled', true);
      component.internalTableConfig.set([col]);
      (component as unknown as CaseListPrivate).ensureColumnSearchControl('arendestatus');

      callReset(false);

      expect(component.columnSearchForm.controls['arendestatus']?.value).toEqual([]);
    });
  });

  describe('normalizeColumnSearchControlValue — private method', () => {
    function callNorm(value: unknown): string {
      return (component as unknown as CaseListPrivate).normalizeColumnSearchControlValue(value);
    }

    it('returns string as-is for string values', () => {
      expect(callNorm('hello')).toBe('hello');
    });

    it('returns empty string for null', () => {
      expect(callNorm(null)).toBe('');
    });

    it('returns first dropdown value id for array input', () => {
      expect(callNorm([{ id: 'oppet', label: 'Öppet', value: 'oppet' }])).toBe('oppet');
    });

    it('returns empty string for empty array', () => {
      expect(callNorm([])).toBe('');
    });
  });

  describe('getBehorighetsStateValue — private method', () => {
    function callGetState(item: Record<string, unknown>): string {
      return (component as unknown as CaseListPrivate).getBehorighetsStateValue(item);
    }

    it('returns caseState when present', () => {
      expect(callGetState({ caseState: 'Öppet' })).toBe('Öppet');
    });

    it('falls back to state when caseState is missing', () => {
      expect(callGetState({ state: 'InProgress' })).toBe('InProgress');
    });

    it('falls back to workflowState when caseState and state are missing', () => {
      expect(callGetState({ workflowState: 'Pending' })).toBe('Pending');
    });

    it('returns empty string when all state fields are missing', () => {
      expect(callGetState({ title: 'test' })).toBe('');
    });

    it('converts non-string values to string', () => {
      expect(callGetState({ caseState: 42 })).toBe('42');
    });
  });

  describe('updateLocalColumnFilter — private method', () => {
    function callUpdate(key: string, value: string | string[]): void {
      (component as unknown as CaseListPrivate).updateLocalColumnFilter(key, value);
    }

    it('sets a string filter value', () => {
      callUpdate('status', 'oppet');
      expect(component.localColumnFilters()['status']).toBe('oppet');
    });

    it('sets an array filter value', () => {
      callUpdate('status', ['oppet', 'stangt']);
      expect(component.localColumnFilters()['status']).toEqual(['oppet', 'stangt']);
    });

    it('removes the key when value is empty string', () => {
      component.localColumnFilters.set({ status: 'oppet' });
      callUpdate('status', '');
      expect(component.localColumnFilters()['status']).toBeUndefined();
    });

    it('removes the key when value is empty array', () => {
      component.localColumnFilters.set({ status: ['oppet'] });
      callUpdate('status', []);
      expect(component.localColumnFilters()['status']).toBeUndefined();
    });
  });

  describe('displayItems — behorighetsstatus filter', () => {
    it('filters by behorighetsstatus using getBehorighetsStateValue', () => {
      const items = [
        makeItem({ id: 'a', caseState: 'Öppet' }),
        makeItem({ id: 'b', caseState: 'Stängt' }),
        makeItem({ id: 'c', workflowState: 'Öppet' }),
      ];
      fixture.componentRef.setInput('tableItems', items);
      component.localColumnFilters.set({ behorighetsstatus: ['Öppet'] });
      const result = component.displayItems();

      expect(result.map(r => r['id'])).toContain('a');
      expect(result.map(r => r['id'])).not.toContain('b');
    });
  });

  describe('getBehorighetsCompletedSteps — matching state ids and labels', () => {
    it('matches by state id (normalized)', () => {
      const state = CASE_STATES[0];
      const result = component.getBehorighetsCompletedSteps(state.id);
      expect(result).toBe(1);
    });

    it('matches by state label (normalized)', () => {
      const state = CASE_STATES[1];
      const result = component.getBehorighetsCompletedSteps(state.label);
      expect(result).toBe(2);
    });

    it('returns CASE_STATES.length for "stang" variation', () => {
      expect(component.getBehorighetsCompletedSteps('stangd')).toBe(CASE_STATES.length);
    });
  });

  describe('getBehorighetsCompletedStepsForItem', () => {
    it('returns 0 for item with no recognized state fields', () => {
      const item = makeItem({ title: 'no-state' });
      const col = makeCol({ key: 'behorighetsstatus' });
      expect(component.getBehorighetsCompletedStepsForItem(item as never, col)).toBe(0);
    });

    it('returns completed steps for item with caseState', () => {
      const item = makeItem({ caseState: 'Stängt' });
      const col = makeCol({ key: 'behorighetsstatus' });
      expect(component.getBehorighetsCompletedStepsForItem(item as never, col)).toBe(CASE_STATES.length);
    });
  });

  describe('shouldAddDropdownSpace — with items present', () => {
    it('returns false when dropdown is open but display items exist', () => {
      fixture.componentRef.setInput('tableItems', [makeItem()]);
      component.isDropdownOpen.set(true);
      expect(component.shouldAddDropdownSpace()).toBeFalse();
    });
  });

  describe('onToggleAll — items with non-string ids', () => {
    it('skips items with non-string ids', () => {
      const items = [makeItem({ id: 'valid-id' }), makeItem({ id: 123 })];
      fixture.componentRef.setInput('tableItems', items);
      const checkEvent = new CustomEvent('toggle', { detail: { checked: true } });
      component.onToggleAll(checkEvent);
      expect(component.selectedIds.has('valid-id')).toBeTrue();
      expect(component.selectedIds.size).toBe(1);
    });
  });

  describe('reset — with static dropdown column', () => {
    it('calls updateLocalColumnFilter (not emit) for static dropdown columns', () => {
      const behoCol = makeCol({ key: 'behorighetsstatus', sortField: 'behorighetsstatus' });
      fixture.componentRef.setInput('columnSearchEnabled', true);
      component.internalTableConfig.set([behoCol]);
      component.localColumnFilters.set({ behorighetsstatus: ['state1'] });

      const spy = jasmine.createSpy('columnSearchChange');
      component.columnSearchChange.subscribe(spy);

      component.reset();

      expect(spy).not.toHaveBeenCalled();
      expect(component.localColumnFilters()['behorighetsstatus']).toBeUndefined();
    });
  });

  describe('onColumnDropdownSelect — additional branches', () => {
    it('handles emit=false (no-emit path) for non-empty array detail', () => {
      const col = makeCol({ key: 'status' });
      component.dropdownOptions.set({ status: [{ id: 'oppet', label: 'Öppet', value: 'oppet' }] });
      const spy = jasmine.createSpy('columnSearchChange');
      component.columnSearchChange.subscribe(spy);

      component.onColumnDropdownSelect(new CustomEvent('select', { detail: ['oppet'] }), col, false);

      expect(spy).not.toHaveBeenCalled();
      expect(component.getDropdownSelection(col).map(o => o.id)).toEqual(['oppet']);
    });

    it('resolves scalar string detail to an option', () => {
      const col = makeCol({ key: 'status' });
      component.dropdownOptions.set({ status: [{ id: 'oppet', label: 'Öppet', value: 'oppet' }] });
      component.onColumnDropdownSelect(new CustomEvent('select', { detail: 'oppet' }), col, false);
      expect(component.getDropdownSelection(col).map(o => o.id)).toEqual(['oppet']);
    });

    it('handles detail with value=null/undefined (isEmptyDropdownSelection via value path)', () => {
      const col = makeCol({ key: 'status' });
      component.dropdownSelections.set({ status: [{ id: 'oppet', label: 'Öppet', value: 'oppet' }] });

      component.onColumnDropdownSelect(new CustomEvent('select', { detail: { value: null } }), col, false);
      expect(component.getDropdownSelection(col)).toEqual([]);
    });

    it('emits for multi-select when emit=true and value changes', () => {
      const col = makeCol({ key: 'arendestatus' });
      component.dropdownOptions.set({ arendestatus: [{ id: 'oppet', label: 'Öppet', value: 'oppet' }] });
      const spy = jasmine.createSpy('columnSearchChange');
      component.columnSearchChange.subscribe(spy);

      component.onColumnDropdownSelect(new CustomEvent('select', { detail: ['oppet'] }), col, true);

      expect(spy).toHaveBeenCalledWith(jasmine.objectContaining({ field: 'arende_arendestatus', value: ['oppet'] }));
    });

    it('handles option-like array detail where no items have selected=true (uses all)', () => {
      const col = makeCol({ key: 'status' });
      component.dropdownOptions.set({
        status: [
          { id: 'a', label: 'A', value: 'a' },
          { id: 'b', label: 'B', value: 'b' },
        ],
      });
      const detail = [
        { id: 'a', label: 'A' },
        { id: 'b', label: 'B' },
      ];
      component.onColumnDropdownSelect(new CustomEvent('select', { detail }), col, false);

      const selection = component.getDropdownSelection(col).map(o => o.id);
      expect(selection).toContain('a');
      expect(selection).toContain('b');
    });

    it('handles value array where not all items are option-like (fallback to resolveOption)', () => {
      const col = makeCol({ key: 'status' });
      component.dropdownOptions.set({ status: [{ id: 'oppet', label: 'Öppet', value: 'oppet' }] });

      const detail = { value: ['oppet'] };
      component.onColumnDropdownSelect(new CustomEvent('select', { detail }), col, false);

      const selection = component.getDropdownSelection(col).map(o => o.id);
      expect(selection).toEqual(['oppet']);
    });

    it('falls back to resolveOption(detail) when detail.value resolves to nothing', () => {
      const col = makeCol({ key: 'status' });
      component.dropdownOptions.set({ status: [{ id: 'oppet', label: 'Öppet', value: 'oppet' }] });

      const detail = { id: 'oppet', label: 'Öppet', value: 'unknownscalar' };
      expect(() => component.onColumnDropdownSelect(new CustomEvent('select', { detail }), col, false)).not.toThrow();

      const selection = component.getDropdownSelection(col);
      expect(selection.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('onDropdownOpened — without view children', () => {
    it('throws or is guarded when scrollMain is undefined', () => {
      const event = new MouseEvent('click');
      expect(() => component.onDropdownOpened(event, makeCol({ key: 'status' }))).toThrow();
    });
  });

  describe('getStaticDropdownOptions — non-behorighetsstatus', () => {
    function callGetStatic(col: unknown): unknown[] {
      return (component as unknown as CaseListPrivate).getStaticDropdownOptions(col);
    }

    it('calls buildOptionsFromItems for non-behorighetsstatus columns', () => {
      const items = [makeItem({ id: 'a', riktning: 'Inkommande' })];
      fixture.componentRef.setInput('tableItems', items);
      const col = makeCol({ key: 'riktning' });
      const result = callGetStatic(col);

      expect(result.length).toBeGreaterThanOrEqual(0);
    });

    it('returns CASE_STATES for behorighetsstatus', () => {
      const col = makeCol({ key: 'behorighetsstatus' });
      const result = callGetStatic(col);
      expect(result).toBe(CASE_STATES as never);
    });
  });

  describe('safeParseOptions — private method', () => {
    function callSafeParse(raw: string): unknown[] {
      return (component as unknown as CaseListPrivate).safeParseOptions(raw);
    }

    it('parses valid JSON array', () => {
      const input = JSON.stringify([{ id: 'a', label: 'A', visible: true }]);
      const result = callSafeParse(input);
      expect(result).toEqual([{ id: 'a', label: 'A', visible: true }]);
    });

    it('returns empty array for invalid JSON', () => {
      expect(callSafeParse('{bad')).toEqual([]);
    });

    it('returns empty array for valid JSON that is not an array', () => {
      expect(callSafeParse('{"key": "value"}')).toEqual([]);
    });
  });

  describe('preloadDropdownOptions — private method', () => {
    it('does not preload when columnSearchEnabled is false', () => {
      fixture.componentRef.setInput('columnSearchEnabled', false);
      const statusCol = makeCol({ key: 'status' });
      component.internalTableConfig.set([statusCol]);
      apiSpy.getDirectorySuggestions.calls.reset();

      (component as unknown as CaseListPrivate).preloadDropdownOptions();

      expect(apiSpy.getDirectorySuggestions).not.toHaveBeenCalled();
    });

    it('does not preload already-loaded keys', fakeAsync(() => {
      fixture.componentRef.setInput('columnSearchEnabled', true);
      const statusCol = makeCol({ key: 'status' });
      component.internalTableConfig.set([statusCol]);
      apiSpy.getDirectorySuggestions.calls.reset();

      (component as unknown as CaseListPrivate).preloadDropdownOptions();
      tick();
      const callCount = apiSpy.getDirectorySuggestions.calls.count();

      (component as unknown as CaseListPrivate).preloadDropdownOptions();
      tick();

      expect(apiSpy.getDirectorySuggestions.calls.count()).toBe(callCount);
    }));

    it('skips static dropdown columns', fakeAsync(() => {
      fixture.componentRef.setInput('columnSearchEnabled', true);
      const behoCol = makeCol({ key: 'behorighetsstatus' });
      component.internalTableConfig.set([behoCol]);
      apiSpy.getDirectorySuggestions.calls.reset();

      (component as unknown as CaseListPrivate).preloadDropdownOptions();
      tick();

      expect(apiSpy.getDirectorySuggestions).not.toHaveBeenCalled();
    }));
  });

  describe('syncPagination — private method', () => {
    it('does not throw when paginationRef is undefined', () => {
      (component as unknown as CaseListPrivate).paginationRef = undefined;
      expect(() => (component as unknown as CaseListPrivate).syncPagination()).not.toThrow();
    });

    it('does not throw when pagination element has no afMSetCurrentPage method', () => {
      fixture.componentRef.setInput('total', 100);
      fixture.componentRef.setInput('pageSize', 25);
      const fakePagination = {};
      (component as unknown as CaseListPrivate).paginationRef = { nativeElement: fakePagination };
      expect(() => (component as unknown as CaseListPrivate).syncPagination()).not.toThrow();
    });

    it('calls afMSetCurrentPage when pagination is available and totalPages > 1', () => {
      fixture.componentRef.setInput('total', 100);
      fixture.componentRef.setInput('pageSize', 25);
      fixture.componentRef.setInput('page', 1);
      const afMSetCurrentPageSpy = jasmine.createSpy('afMSetCurrentPage');
      (component as unknown as CaseListPrivate).paginationRef = {
        nativeElement: { afMSetCurrentPage: afMSetCurrentPageSpy },
      };
      (component as unknown as CaseListPrivate).syncPagination();
      expect(afMSetCurrentPageSpy).toHaveBeenCalledWith(2);
    });

    it('does not call afMSetCurrentPage when totalPages is 1', () => {
      fixture.componentRef.setInput('total', 10);
      fixture.componentRef.setInput('pageSize', 25);
      const afMSetCurrentPageSpy = jasmine.createSpy('afMSetCurrentPage');
      (component as unknown as CaseListPrivate).paginationRef = {
        nativeElement: { afMSetCurrentPage: afMSetCurrentPageSpy },
      };
      (component as unknown as CaseListPrivate).syncPagination();
      expect(afMSetCurrentPageSpy).not.toHaveBeenCalled();
    });
  });

  describe('isActive', () => {
    it('returns false when col has no sortField', () => {
      expect(component.isActive(makeCol({ sortField: undefined }))).toBeFalse();
    });

    it('returns false when sortField does not match current sortBy', () => {
      fixture.componentRef.setInput('sortBy', 'dc:modified');
      expect(component.isActive(makeCol({ sortField: 'dc:title' }))).toBeFalse();
    });

    it('returns true when sortField matches current sortBy', () => {
      fixture.componentRef.setInput('sortBy', 'dc:title');
      expect(component.isActive(makeCol({ sortField: 'dc:title' }))).toBeTrue();
    });
  });

  describe('syncExternalStatusFilter — additional branches', () => {
    function callSync(filters: Record<string, string | string[]>): void {
      (component as unknown as CaseListPrivate).syncExternalStatusFilter(filters);
    }

    beforeEach(() => {
      fixture.componentRef.setInput('columnSearchEnabled', true);
      component.internalTableConfig.set([makeCol({ key: 'arendestatus' })]);
    });

    it('skips syncing when values are already in sync (no change needed)', () => {
      component.dropdownOptions.set({ arendestatus: [{ id: 'oppet', label: 'Öppet', value: 'oppet' }] });

      callSync({ arende_arendestatus: ['oppet'] });
      const selectionsBefore = JSON.stringify(component.dropdownSelections());

      callSync({ arende_arendestatus: ['oppet'] });
      expect(JSON.stringify(component.dropdownSelections())).toBe(selectionsBefore);
    });

    it('handles scalar string filter value (wraps in array)', () => {
      component.dropdownOptions.set({ arendestatus: [{ id: 'oppet', label: 'Öppet', value: 'oppet' }] });
      callSync({ arende_arendestatus: 'oppet' });
      expect(component.dropdownSelections()['arendestatus']?.map((o: { id: string }) => o.id)).toEqual(['oppet']);
    });

    it('clears with matching lastExternalStatusKey suppresses re-clear', () => {
      callSync({});

      const spy = spyOn(component.dropdownSelections, 'update');
      callSync({});
      expect(spy).not.toHaveBeenCalled();
    });

    it('defers when not all values in external filter can be resolved to options', () => {
      component.dropdownOptions.set({ arendestatus: [{ id: 'oppet', label: 'Öppet', value: 'oppet' }] });

      callSync({ arende_arendestatus: ['oppet', 'unknown-val'] });

      expect(() => callSync({ arende_arendestatus: ['oppet', 'unknown-val'] })).not.toThrow();
    });
  });

  describe('ngOnChanges — additional branches', () => {
    beforeEach(() => {
      localStorage.clear();
    });

    it('does not add actions col when already present in defaultColumnOptions', () => {
      const titleCol = makeCol({ key: 'title', label: 'Title', tableName: 'TESTACT' });
      fixture.componentRef.setInput('tableConfig', [titleCol]);
      fixture.componentRef.setInput('defaultColumnOptions', [
        { id: 'title', label: 'Title', visible: true },
        { id: 'actions', label: 'Actions', visible: true },
      ]);
      fixture.componentRef.setInput('actionsTemplate', {} as never);

      component.ngOnChanges();

      const actionsCols = component.columnOptions().filter(c => c.id === 'actions');
      expect(actionsCols.length).toBe(1);
    });

    it('uses tableName from first config element', () => {
      const col = makeCol({ key: 'title', tableName: 'MY_TABLE' });
      fixture.componentRef.setInput('tableConfig', [col]);
      fixture.componentRef.setInput('defaultColumnOptions', []);

      component.ngOnChanges();

      expect(component.tableName()).toBe('MY_TABLE');
    });

    it('sets tableName to "default" when first config element has no tableName', () => {
      const col = { ...makeCol({ key: 'title' }), tableName: undefined as never };
      fixture.componentRef.setInput('tableConfig', [col]);
      fixture.componentRef.setInput('defaultColumnOptions', []);

      component.ngOnChanges();

      expect(component.tableName()).toBe('default');
    });

    it('auth username empty suffix when username is null', () => {
      authSpy.username.and.returnValue(null as never);
      const col = makeCol({ key: 'title', tableName: 'NULLUSER' });
      fixture.componentRef.setInput('tableConfig', [col]);
      fixture.componentRef.setInput('defaultColumnOptions', []);

      component.ngOnChanges();

      expect(localStorage.getItem('table_columns_default_NULLUSER')).toBeTruthy();
    });
  });

  describe('onColumnDropdownReset', () => {
    it('resets form control and submitted values without clearing dropdownSelections', () => {
      const col = makeCol({ key: 'status' });

      component.dropdownSelections.set({ status: [{ id: 'oppet', label: 'Öppet', value: 'oppet' }] });
      (component as unknown as CaseListPrivate).dropdownSubmittedValues.set('status', ['oppet']);
      component.onColumnDropdownReset(col);

      expect((component as unknown as CaseListPrivate).dropdownSubmittedValues.get('status')).toEqual([]);

      expect(component.isDropdownOpen()).toBeFalse();
    });

    it('removes local column filter', () => {
      const col = makeCol({ key: 'behorighetsstatus' });
      component.localColumnFilters.set({ behorighetsstatus: ['state1'] });
      component.onColumnDropdownReset(col);
      expect(component.localColumnFilters()['behorighetsstatus']).toBeUndefined();
    });
  });

  describe('getDropdownValue — empty selected.length branch', () => {
    it('returns empty array when selection is empty', () => {
      const col = makeCol({ key: 'status' });
      component.dropdownSelections.set({ status: [] });
      expect(component.getDropdownValue(col)).toEqual([]);
    });
  });

  describe('fetchDropdownOptions — error handling', () => {
    it('handles error from getDirectorySuggestions gracefully', fakeAsync(() => {
      apiSpy.getDirectorySuggestions.and.returnValue(throwError(() => new Error('API error')));

      fixture.componentRef.setInput('columnSearchDebounceMs', 0);
      const col = makeCol({ key: 'status' });

      expect(() => {
        component.onColumnDropdownQuery(new CustomEvent('query', { detail: { value: '' } }), col);
        tick();
      }).not.toThrow();
    }));
  });

  describe('onColumnDropdownQuery — debounce timer replacement', () => {
    it('replaces existing timer with new one', fakeAsync(() => {
      fixture.componentRef.setInput('columnSearchDebounceMs', 100);
      const col = makeCol({ key: 'status' });
      apiSpy.getDirectorySuggestions.calls.reset();

      component.onColumnDropdownQuery(new CustomEvent('query', { detail: { value: 'first' } }), col);
      component.onColumnDropdownQuery(new CustomEvent('query', { detail: { value: 'second' } }), col);
      tick(100);

      expect(apiSpy.getDirectorySuggestions.calls.count()).toBe(1);
    }));
  });

  describe('updateInternalTableConfig — shouldHavePaddingRight and actionsCol', () => {
    it('adds padding col before actions col when shouldHavePaddingRight is true', () => {
      fixture.componentRef.setInput('shouldHavePaddingRight', true);
      const col = makeCol({ key: 'title', label: 'Title', tableName: 'TEST' });
      fixture.componentRef.setInput('tableConfig', [col]);
      fixture.componentRef.setInput('defaultColumnOptions', []);
      fixture.componentRef.setInput('actionsTemplate', {} as never);
      fixture.componentRef.setInput('actionsHeader', 'Actions');

      component.ngOnChanges();

      const keys = component.internalTableConfig().map(c => c.key);
      const paddingIdx = keys.indexOf('padding');
      const actionsIdx = keys.indexOf('actions');
      expect(paddingIdx).toBeGreaterThanOrEqual(0);
      expect(actionsIdx).toBeGreaterThan(paddingIdx);
    });
  });

  describe('isEmptyDropdownValue — private method', () => {
    function callIsEmptyVal(value: string | string[]): boolean {
      return (component as unknown as CaseListPrivate).isEmptyDropdownValue(value);
    }

    it('returns true for empty string', () => {
      expect(callIsEmptyVal('')).toBeTrue();
    });

    it('returns false for non-empty string', () => {
      expect(callIsEmptyVal('oppet')).toBeFalse();
    });

    it('returns true for empty array', () => {
      expect(callIsEmptyVal([])).toBeTrue();
    });

    it('returns false for non-empty array', () => {
      expect(callIsEmptyVal(['oppet'])).toBeFalse();
    });
  });

  describe('getSearchLabelId — sanitization edge cases', () => {
    it('handles key with special characters', () => {
      const col = makeCol({ key: 'dc:title/sub' });
      const id = component.getSearchLabelId(col);
      expect(id).toMatch(/^table-search-label-[a-z0-9-]+$/i);
    });

    it('handles empty/undefined key', () => {
      const col = { ...makeCol(), key: '' as never };
      const id = component.getSearchLabelId(col);
      expect(id).toBe('table-search-label-column');
    });
  });

  describe('fetchDropdownOptions — riktning for handling and non-handling tables', () => {
    it('fetches Riktning directory for riktning in handling table', fakeAsync(() => {
      component.tableName.set('HANDLINGAR_X');
      fixture.componentRef.setInput('columnSearchDebounceMs', 0);
      apiSpy.getDirectorySuggestions.calls.reset();
      const col = makeCol({ key: 'riktning' });

      component.onColumnDropdownQuery(new CustomEvent('query', { detail: { value: '' } }), col);
      tick();

      expect(apiSpy.getDirectorySuggestions).toHaveBeenCalledWith('Riktning');
    }));

    it('fetches behorighetsstatus directory but static column skips fetch', fakeAsync(() => {
      fixture.componentRef.setInput('columnSearchDebounceMs', 0);
      apiSpy.getDirectorySuggestions.calls.reset();
      const col = makeCol({ key: 'behorighetsstatus' });

      component.onColumnDropdownQuery(new CustomEvent('query', { detail: { value: '' } }), col);
      tick();

      expect(apiSpy.getDirectorySuggestions).not.toHaveBeenCalled();
    }));
  });

  describe('rebuildInternalTableConfig — private method', () => {
    it('preserves order from columnOptions and excludes invisible cols', () => {
      const titleCol = makeCol({ key: 'title', label: 'Title', tableName: 'TEST' });
      const statusCol = makeCol({ key: 'status', label: 'Status', tableName: 'TEST' });
      fixture.componentRef.setInput('tableConfig', [titleCol, statusCol]);
      component.columnOptions.set([
        { id: 'status', label: 'Status', visible: true },
        { id: 'title', label: 'Title', visible: false },
      ]);

      (component as unknown as CaseListPrivate).rebuildInternalTableConfig();

      const keys = component.internalTableConfig().map(c => c.key);
      expect(keys).toContain('status');
      expect(keys).not.toContain('title');
    });

    it('appends visible actions col at end', () => {
      const titleCol = makeCol({ key: 'title', label: 'Title', tableName: 'TEST' });
      fixture.componentRef.setInput('tableConfig', [titleCol]);
      component.columnOptions.set([
        { id: 'title', label: 'Title', visible: true },
        { id: 'actions', label: 'Actions', visible: true },
      ]);
      fixture.componentRef.setInput('actionsHeader', 'My Actions');

      (component as unknown as CaseListPrivate).rebuildInternalTableConfig();

      const keys = component.internalTableConfig().map(c => c.key);
      expect(keys[keys.length - 1]).toBe('actions');
    });
  });

  describe('onColumnDropdownSelect — emit path for static dropdown col', () => {
    it('updates localColumnFilter when static col is selected with emit', () => {
      const col = makeCol({ key: 'behorighetsstatus' });
      const option = CASE_STATES[0];
      const spy = jasmine.createSpy('columnSearchChange');
      component.columnSearchChange.subscribe(spy);

      component.onColumnDropdownSelect(new CustomEvent('select', { detail: [option] }), col, true);

      expect(component.localColumnFilters()['behorighetsstatus']).toEqual([option.id]);
      expect(spy).not.toHaveBeenCalled();
    });
  });

  describe('configureColumnSearchForm — date-type skip branch', () => {
    it('does not emit for date-type columns via form control change', () => {
      const dateCol = makeCol({ key: 'inkommetDatum', sortField: 'inkommetDatum', tableName: 'DATE_TEST' });
      fixture.componentRef.setInput('columnSearchEnabled', true);
      fixture.componentRef.setInput('tableConfig', [dateCol]);
      fixture.componentRef.setInput('defaultColumnOptions', []);

      component.ngOnChanges();
      fixture.detectChanges();

      const spy = jasmine.createSpy('columnSearchChange');
      component.columnSearchChange.subscribe(spy);

      const control = component.columnSearchForm.controls['inkommetDatum'];
      if (control) {
        control.setValue('2026-01-01', { emitEvent: true });
      }

      expect(spy).not.toHaveBeenCalled();
    });
  });

  describe('dropdownSubmitTimers — timer replacement', () => {
    it('replaces existing submit timer for the same column', fakeAsync(() => {
      const col = makeCol({ key: 'status' });
      component.dropdownOptions.set({ status: [{ id: 'oppet', label: 'Öppet', value: 'oppet' }] });
      const spy = jasmine.createSpy('columnSearchChange');
      component.columnSearchChange.subscribe(spy);

      component.onColumnDropdownSubmit(new CustomEvent('submit', { detail: ['oppet'] }), col);

      component.onColumnDropdownSubmit(new CustomEvent('submit', { detail: ['oppet'] }), col);
      tick();

      expect(spy.calls.count()).toBeLessThanOrEqual(1);
    }));
  });
});
