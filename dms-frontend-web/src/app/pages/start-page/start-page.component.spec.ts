import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal, computed, Signal } from '@angular/core';
import { of, throwError } from 'rxjs';
import { ActivatedRoute } from '@angular/router';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { StartPageComponent } from './start-page.component';
import { AuthService } from '@app/core/services/auth.service';
import { NuxeoApiService } from '@app/shared/api/nuxeo-api.service';
import { GeneralStore } from '@app/core/services/general-store.service';
import { CasesService } from '@app/core/services/cases.service';
import { SearchService } from '@app/core/services/search.service';
import { GetOptionsService } from '@app/core/services/get-options.service';
import { ConstantProvider } from '../cases-list/constants';
import { UiModeService } from '@app/core/services/ui-mode.service';
import { ViewMode } from '@models/view-mode.enum';
import { AppRole } from '@app/shared/models/roles';
import {
  makeNuxeoDocument,
  makeSearchResult,
  makeStatistics,
  makeWorkflowInfo,
} from '@app/shared/testing/mock-factories';
import { NotificationType } from '@app/shared/components/notification/notification.component';
import { TableColumn } from '@app/shared/components/case-list-table/case-list-table.component';
import { Option } from '@app/shared/commonTypes';

function makeAuthMock() {
  const activeRole = signal<AppRole | null>(null);
  const adminViewEnabled = signal(false);
  return {
    loaded: signal(false),
    loadError: signal(null),
    username: signal<string | null>(null),
    activeRole,
    adminViewEnabled,
    isAdmin: computed(() => false),
    user: signal<unknown>(undefined),
    roles: signal<string[]>([]),
    loadMe: jasmine.createSpy('loadMe'),
    hasRole: jasmine.createSpy('hasRole').and.returnValue(false),
    setRole: jasmine.createSpy('setRole'),
  };
}

function makeStoreMock() {
  return {
    openPage: signal<string | null>(null),
    lastCreatedCase: signal<ReturnType<typeof makeNuxeoDocument> | null>(null),
    notification: signal<NotificationType>({ show: false }),
    baseButtons: signal<unknown[]>([]),
    navigationPanelContext: signal<unknown>(null),
    messagesInfo: signal<unknown>(null),
  };
}

describe('StartPageComponent', () => {
  let component: StartPageComponent;
  let fixture: ComponentFixture<StartPageComponent>;
  let authMock: ReturnType<typeof makeAuthMock>;
  let storeMock: ReturnType<typeof makeStoreMock>;
  let apiSpy: jasmine.SpyObj<NuxeoApiService>;
  let casesSpy: jasmine.SpyObj<CasesService>;
  let searchSpy: jasmine.SpyObj<SearchService>;
  let getOptionsSpy: jasmine.SpyObj<GetOptionsService>;
  let constantSpy: jasmine.SpyObj<ConstantProvider>;
  let uiModeMock: { isSimplified: ReturnType<typeof computed<boolean>>; uiMode: ReturnType<typeof signal<string>> };

  beforeEach(async () => {
    authMock = makeAuthMock();
    storeMock = makeStoreMock();

    apiSpy = jasmine.createSpyObj('NuxeoApiService', ['getMessagesJSON', 'getStatistics']);
    apiSpy.getMessagesJSON.and.returnValue(of({}));
    apiSpy.getStatistics.and.returnValue(of(makeStatistics()));

    casesSpy = jasmine.createSpyObj('CasesService', [
      'getAllTasks',
      'getCountByTab',
      'listByTab',
      'getCreatedAggBucketsByTab',
    ]);
    casesSpy.getAllTasks.and.returnValue(of(makeSearchResult({ entries: [], resultsCount: 0 })));
    casesSpy.getCountByTab.and.returnValue(of(0));

    searchSpy = jasmine.createSpyObj('SearchService', ['extractTerm', 'toContainsPattern']);
    searchSpy.extractTerm.and.callFake((v: unknown) =>
      typeof v === 'string' ? v : ((v as CustomEvent)?.detail ?? '')
    );

    getOptionsSpy = jasmine.createSpyObj('GetOptionsService', ['suggestEntries']);
    getOptionsSpy.suggestEntries.and.returnValue(of([]));

    constantSpy = jasmine.createSpyObj('ConstantProvider', ['resolveCasesTableConfig']);
    constantSpy.resolveCasesTableConfig.and.returnValue({ config: [], actionsHeader: null });

    uiModeMock = {
      isSimplified: computed(() => false),
      uiMode: signal('normal'),
    };

    await TestBed.configureTestingModule({
      imports: [StartPageComponent],
      providers: [
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: AuthService, useValue: authMock },
        { provide: NuxeoApiService, useValue: apiSpy },
        { provide: GeneralStore, useValue: storeMock },
        { provide: CasesService, useValue: casesSpy },
        { provide: SearchService, useValue: searchSpy },
        { provide: GetOptionsService, useValue: getOptionsSpy },
        { provide: ConstantProvider, useValue: constantSpy },
        { provide: UiModeService, useValue: uiModeMock },
        {
          provide: ActivatedRoute,
          useValue: { queryParamMap: of({ get: () => null }) },
        },
      ],
    })
      .overrideTemplate(StartPageComponent, '<div></div>')
      .compileComponents();

    fixture = TestBed.createComponent(StartPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('getHeading', () => {
    it('returns registrator heading when role is REGISTRATOR', () => {
      authMock.activeRole.set('REGISTRATOR');
      fixture.detectChanges();
      expect(component.getHeading()).toBe('Redo att registrera');
    });

    it('returns handler heading when role is HANDLAGGARE', () => {
      authMock.activeRole.set('HANDLAGGARE');
      fixture.detectChanges();
      expect(component.getHeading()).toBe('Gruppens inkomna ärenden');
    });

    it('returns chef heading when role is CHEF', () => {
      authMock.activeRole.set('CHEF');
      fixture.detectChanges();
      expect(component.getHeading()).toBe('Ärende att fördela');
    });

    it('returns empty string when no role', () => {
      expect(component.getHeading()).toBe('');
    });
  });

  describe('getPath', () => {
    it('returns empty string when no lastCreatedCase', () => {
      storeMock.lastCreatedCase.set(null);
      expect(component.getPath()).toBe('');
    });

    it('returns path from lastCreatedCase', () => {
      storeMock.lastCreatedCase.set(makeNuxeoDocument({ path: '/default-domain/workspaces/test', uid: 'uid-1' }));
      expect(component.getPath()).toBe('/default-domain/workspaces/test');
    });
  });

  describe('openDialog', () => {
    it('sets isDialogOpened to true', () => {
      expect(component.isDialogOpened()).toBeFalse();
      component.openDialog();
      expect(component.isDialogOpened()).toBeTrue();
    });
  });

  describe('retryLoadMe', () => {
    it('calls auth.loadMe', () => {
      component.retryLoadMe();
      expect(authMock.loadMe).toHaveBeenCalled();
    });
  });

  describe('onToggleButtonChange', () => {
    it('sets viewMode to Grid when button 1 is active', () => {
      component.onToggleButtonChange(1);
      expect(component.viewMode()).toBe(ViewMode.Grid);
    });

    it('sets viewMode to Table when button 0 is active', () => {
      component.onToggleButtonChange(0);
      expect(component.viewMode()).toBe(ViewMode.Table);
    });
  });

  describe('onPreviousWeek / onNextWeek', () => {
    it('decrements weekOffset', () => {
      expect(component.weekOffset()).toBe(0);
      component.onPreviousWeek();
      expect(component.weekOffset()).toBe(-1);
    });

    it('increments weekOffset', () => {
      expect(component.weekOffset()).toBe(0);
      component.onNextWeek();
      expect(component.weekOffset()).toBe(1);
    });
  });

  describe('onTabChanged', () => {
    it('sets activeTabId and resets all filters', () => {
      component.searchTerm.set('existing');
      component.statusQuickFilterChecked.set(['open']);
      component.onTabChanged('my-cases');
      expect(component.activeTabId()).toBe('my-cases');
      expect(component.searchTerm()).toBe('');
      expect(component.statusQuickFilterChecked()).toEqual([]);
      expect(component.caseFilters()).toEqual({});
      expect(component.dateRangeFilters()).toEqual({});
    });
  });

  describe('onSubTabChanged', () => {
    it('sets activeSubTabId and resets all filters', () => {
      component.searchTerm.set('test');
      component.onSubTabChanged('scans');
      expect(component.activeSubTabId()).toBe('scans');
      expect(component.searchTerm()).toBe('');
      expect(component.caseFilters()).toEqual({});
    });
  });

  describe('onSearch', () => {
    it('calls extractTerm and updates searchTerm and caseFilters', () => {
      searchSpy.extractTerm.and.returnValue('hello');
      component.onSearch('hello');
      expect(component.searchTerm()).toBe('hello');
      expect(component.caseFilters().search).toBe('hello');
    });

    it('clears search from caseFilters when term is empty', () => {
      searchSpy.extractTerm.and.returnValue('');
      component.onSearch('');
      expect(component.searchTerm()).toBe('');
      expect(component.caseFilters().search).toBeUndefined();
    });
  });

  describe('onSearchInput', () => {
    it('updates searchTerm only', () => {
      searchSpy.extractTerm.and.returnValue('partial');
      component.onSearchInput('partial');
      expect(component.searchTerm()).toBe('partial');
    });
  });

  describe('onFiltersChanged', () => {
    it('updates statusQuickFilterChecked with checked values', () => {
      component.onFiltersChanged({ checked: ['open', 'closed'] });
      expect(component.statusQuickFilterChecked()).toEqual(['open', 'closed']);
    });

    it('adds status filter to externalColumnFilters', () => {
      component.onFiltersChanged({ checked: ['open'] });
      expect(component.externalColumnFilters()['arende_arendestatus']).toEqual(['open']);
    });

    it('removes status filter when checked is empty', () => {
      component.externalColumnFilters.set({ arende_arendestatus: ['open'] });
      component.onFiltersChanged({ checked: [] });
      expect(component.externalColumnFilters()['arende_arendestatus']).toBeUndefined();
    });
  });

  describe('onTableStatusFilterChange', () => {
    it('updates statusQuickFilterChecked and externalColumnFilters', () => {
      component.onTableStatusFilterChange(['oppet']);
      expect(component.statusQuickFilterChecked()).toEqual(['oppet']);
      expect(component.externalColumnFilters()['arende_arendestatus']).toEqual(['oppet']);
    });

    it('removes filter when values are empty', () => {
      component.statusQuickFilterChecked.set(['oppet']);
      component.externalColumnFilters.set({ arende_arendestatus: ['oppet'] });
      component.onTableStatusFilterChange([]);
      expect(component.externalColumnFilters()['arende_arendestatus']).toBeUndefined();
    });

    it('skips update when values are unchanged', () => {
      component.statusQuickFilterChecked.set(['open']);
      component.externalColumnFilters.set({ arende_arendestatus: ['open'] });
      component.onTableStatusFilterChange(['open']);
      expect(component.statusQuickFilterChecked()).toEqual(['open']);
    });
  });

  describe('onDateRangeChange', () => {
    it('sets field in externalColumnFilters when value is truthy', () => {
      component.onDateRangeChange({ field: 'dc_created', value: '2024-01-01' });
      expect(component.externalColumnFilters()['dc_created']).toBe('2024-01-01');
    });

    it('removes field when value is falsy', () => {
      component.externalColumnFilters.set({ dc_created: '2024-01-01' });
      component.onDateRangeChange({ field: 'dc_created', value: '' });
      expect(component.externalColumnFilters()['dc_created']).toBeUndefined();
    });
  });

  describe('onDateFilterChange', () => {
    it('updates dateRangeFilters and externalColumnFilters', () => {
      component.onDateFilterChange({ field: 'arende_beslutat_datum', value: '2024-06-01' });
      expect(component.dateRangeFilters()['arende_beslutat_datum']).toBe('2024-06-01');
      expect(component.externalColumnFilters()['arende_beslutat_datum']).toBe('2024-06-01');
    });

    it('removes field when value is empty', () => {
      component.dateRangeFilters.set({ arende_beslutat_datum: '2024-06-01' });
      component.externalColumnFilters.set({ arende_beslutat_datum: '2024-06-01' });
      component.onDateFilterChange({ field: 'arende_beslutat_datum', value: '' });
      expect(component.dateRangeFilters()['arende_beslutat_datum']).toBeUndefined();
      expect(component.externalColumnFilters()['arende_beslutat_datum']).toBeUndefined();
    });
  });

  describe('onCaseCreatedAggBucketsChange', () => {
    it('sets buckets when tab shows quick range', () => {
      component.activeTabId.set('all-docs');
      fixture.detectChanges();
      const buckets = [{ key: 'week', docCount: 5 }];
      component.onCaseCreatedAggBucketsChange(buckets);
      expect(component.caseCreatedAggBuckets()).toEqual(buckets);
    });

    it('clears buckets when tab does not show quick range', () => {
      component.activeTabId.set('my-tasks');
      fixture.detectChanges();
      component.caseCreatedAggBuckets.set([{ key: 'week', docCount: 5 }]);
      component.onCaseCreatedAggBucketsChange([{ key: 'week', docCount: 5 }]);
      expect(component.caseCreatedAggBuckets()).toEqual([]);
    });
  });

  describe('onPageSizeSelect', () => {
    it('does nothing when username is null', () => {
      authMock.username.set(null);
      component.onPageSizeSelect(50);
      expect(component.pageSize()).toBe(25);
    });

    it('does nothing when value is not finite', () => {
      authMock.username.set('user1');
      component.onPageSizeSelect('abc');
      expect(component.pageSize()).toBe(25);
    });

    it('sets pageSize when valid value and username provided', () => {
      authMock.username.set('user1');
      component.onPageSizeSelect(50);
      expect(component.pageSize()).toBe(50);
    });
  });

  describe('resetFilters', () => {
    it('does nothing when no filters or search term are active', () => {
      component.resetFilters();
      expect(component.searchTerm()).toBe('');
      expect(component.caseFilters()).toEqual({});
    });

    it('clears search term only when only search is active', () => {
      component.searchTerm.set('hello');
      component.resetFilters();
      expect(component.searchTerm()).toBe('');
    });

    it('clears all filters when applied filters exist', () => {
      component.searchTerm.set('hello');
      component.statusQuickFilterChecked.set(['oppet']);
      component.resetFilters();
      expect(component.searchTerm()).toBe('');
      expect(component.statusQuickFilterChecked()).toEqual([]);
      expect(component.dateRangeFilters()).toEqual({});
      expect(component.externalColumnFilters()).toEqual({});
    });
  });

  describe('computed signals', () => {
    it('activeCasesTab returns activeSubTabId when activeTabId is incoming-docs', () => {
      component.activeTabId.set('incoming-docs');
      component.activeSubTabId.set('scans');
      fixture.detectChanges();
      expect(component.activeCasesTab()).toBe('scans');
    });

    it('activeCasesTab returns activeTabId for other tabs', () => {
      component.activeTabId.set('my-cases');
      fixture.detectChanges();
      expect(component.activeCasesTab()).toBe('my-cases');
    });

    it('showQuickRangeForTab is false for my-tasks', () => {
      component.activeTabId.set('my-tasks');
      fixture.detectChanges();
      expect(component.showQuickRangeForTab()).toBeFalse();
    });

    it('showQuickRangeForTab is true for all-docs', () => {
      component.activeTabId.set('all-docs');
      fixture.detectChanges();
      expect(component.showQuickRangeForTab()).toBeTrue();
    });

    it('showSearchForTab is false for e-post sub-tab', () => {
      component.activeTabId.set('incoming-docs');
      component.activeSubTabId.set('e-post');
      fixture.detectChanges();
      expect(component.showSearchForTab()).toBeFalse();
    });

    it('showSearchForTab is true for my-cases', () => {
      component.activeTabId.set('my-cases');
      fixture.detectChanges();
      expect(component.showSearchForTab()).toBeTrue();
    });

    it('showStatusFilterForTab is false for my-utkasts', () => {
      component.activeTabId.set('my-utkasts');
      fixture.detectChanges();
      expect(component.showStatusFilterForTab()).toBeFalse();
    });

    it('showResetFiltersForTab is false for my-monitoring', () => {
      component.activeTabId.set('my-monitoring');
      fixture.detectChanges();
      expect(component.showResetFiltersForTab()).toBeFalse();
    });

    it('showResetFiltersForTab is true for all-docs', () => {
      component.activeTabId.set('all-docs');
      fixture.detectChanges();
      expect(component.showResetFiltersForTab()).toBeTrue();
    });

    it('showQuickRangeForTab returns false for empty tab id', () => {
      component.activeTabId.set('');
      fixture.detectChanges();
      expect(component.showQuickRangeForTab()).toBeFalse();
    });

    it('showSearchForTab returns false for empty tab id', () => {
      component.activeTabId.set('');
      fixture.detectChanges();
      expect(component.showSearchForTab()).toBeFalse();
    });

    it('showStatusFilterForTab returns false for empty tab id', () => {
      component.activeTabId.set('');
      fixture.detectChanges();
      expect(component.showStatusFilterForTab()).toBeFalse();
    });

    it('showResetFiltersForTab returns false for empty tab id', () => {
      component.activeTabId.set('');
      fixture.detectChanges();
      expect(component.showResetFiltersForTab()).toBeFalse();
    });

    it('showStatusFilterForTab is true for all-docs', () => {
      component.activeTabId.set('all-docs');
      fixture.detectChanges();
      expect(component.showStatusFilterForTab()).toBeTrue();
    });

    it('showSearchForTab is false for my-monitoring', () => {
      component.activeTabId.set('my-monitoring');
      fixture.detectChanges();
      expect(component.showSearchForTab()).toBeFalse();
    });

    it('showSearchForTab uses subtab when incoming-docs is active', () => {
      component.activeTabId.set('incoming-docs');
      component.activeSubTabId.set('scans');
      fixture.detectChanges();

      expect(component.showSearchForTab()).toBeTrue();
    });

    it('showStatusFilterForTab uses subtab when incoming-docs is active', () => {
      component.activeTabId.set('incoming-docs');
      component.activeSubTabId.set('e-post');
      fixture.detectChanges();
      expect(component.showStatusFilterForTab()).toBeFalse();
    });

    it('showResetFiltersForTab uses subtab when incoming-docs is active', () => {
      component.activeTabId.set('incoming-docs');
      component.activeSubTabId.set('scans');
      fixture.detectChanges();
      expect(component.showResetFiltersForTab()).toBeTrue();
    });

    it('showQuickRangeForTab is false for my-monitoring', () => {
      component.activeTabId.set('my-monitoring');
      fixture.detectChanges();
      expect(component.showQuickRangeForTab()).toBeFalse();
    });

    it('showQuickRangeForTab is false for ready-to-close', () => {
      component.activeTabId.set('ready-to-close');
      fixture.detectChanges();
      expect(component.showQuickRangeForTab()).toBeFalse();
    });

    it('isSimplifiedHandler is true when isHandler and isSimplified', () => {
      authMock.activeRole.set('HANDLAGGARE');
      (uiModeMock as { isSimplified: Signal<boolean> }).isSimplified = computed(() => true);
      fixture.detectChanges();
      expect(component.isSimplifiedHandler()).toBeTrue();
    });

    it('isAdmin is true when adminViewEnabled', () => {
      authMock.adminViewEnabled.set(true);
      fixture.detectChanges();
      expect(component.isAdmin()).toBeTrue();
    });

    it('isAdmin is true when role is ADMIN', () => {
      authMock.activeRole.set('ADMIN');
      fixture.detectChanges();
      expect(component.isAdmin()).toBeTrue();
    });

    it('tabsJson is a valid JSON string', () => {
      authMock.loaded.set(true);
      authMock.activeRole.set('REGISTRATOR');
      fixture.detectChanges();
      const json = component.tabsJson();
      expect(() => JSON.parse(json)).not.toThrow();
    });
  });

  describe('tabs computed signal', () => {
    it('returns empty array when not loaded', () => {
      authMock.loaded.set(false);
      fixture.detectChanges();
      expect(component.tabs()).toEqual([]);
    });

    it('returns registrator tabs when role is REGISTRATOR', () => {
      authMock.loaded.set(true);
      authMock.activeRole.set('REGISTRATOR');
      fixture.detectChanges();
      const ids = component.tabs().map(t => t.id);
      expect(ids).toContain('all-docs');
      expect(ids).toContain('incoming-docs');
    });

    it('returns handlaggare tabs when role is HANDLAGGARE', () => {
      authMock.loaded.set(true);
      authMock.activeRole.set('HANDLAGGARE');
      fixture.detectChanges();
      const ids = component.tabs().map(t => t.id);
      expect(ids).toContain('my-cases');
      expect(ids).toContain('my-utkasts');
    });

    it('returns empty array for CHEF role', () => {
      authMock.loaded.set(true);
      authMock.activeRole.set('CHEF');
      fixture.detectChanges();
      expect(component.tabs()).toEqual([]);
    });

    it('returns empty array for unknown role', () => {
      authMock.loaded.set(true);
      authMock.activeRole.set('UNKNOWN_ROLE' as AppRole);
      fixture.detectChanges();
      expect(component.tabs()).toEqual([]);
    });

    it('returns admin tabs when adminViewEnabled', () => {
      authMock.loaded.set(true);
      authMock.adminViewEnabled.set(true);
      fixture.detectChanges();
      const ids = component.tabs().map(t => t.id);
      expect(ids).toContain('to-distribute');
      expect(ids).toContain('group-incoming');

      expect(ids).not.toContain('i-choose');
    });

    it('deduplicates tabs that appear in multiple role arrays', () => {
      authMock.loaded.set(true);
      authMock.adminViewEnabled.set(true);
      fixture.detectChanges();
      const ids = component.tabs().map(t => t.id);
      const unique = new Set(ids);
      expect(ids.length).toBe(unique.size);
    });

    it('tabs are sorted according to TAB_ORDER', () => {
      authMock.loaded.set(true);
      authMock.adminViewEnabled.set(true);
      fixture.detectChanges();
      const ids = component.tabs().map(t => t.id);
      expect(ids.indexOf('to-distribute')).toBeLessThan(ids.indexOf('all-docs'));
    });

    it('filters simplified handler tabs when uiMode is simplified', () => {
      authMock.loaded.set(true);
      authMock.activeRole.set('HANDLAGGARE');
      (uiModeMock as { isSimplified: Signal<boolean> }).isSimplified = computed(() => true);
      fixture.detectChanges();
      const ids = component.tabs().map(t => t.id);
      expect(ids).not.toContain('i-choose');
      expect(ids).not.toContain('my-co-handled-cases');
      expect(ids).not.toContain('my-monitoring');
    });

    it('shows badge values when tabCounts are non-zero', () => {
      authMock.loaded.set(true);
      authMock.activeRole.set('REGISTRATOR');
      component.tabCounts.set({ 'all-docs': 5, 'my-tasks': 3 });
      fixture.detectChanges();
      const allDocsTab = component.tabs().find(t => t.id === 'all-docs');
      expect(allDocsTab?.badgeValue).toBe('5');
    });

    it('does not show badge when count is zero', () => {
      authMock.loaded.set(true);
      authMock.activeRole.set('REGISTRATOR');
      component.tabCounts.set({ 'all-docs': 0 });
      fixture.detectChanges();
      const allDocsTab = component.tabs().find(t => t.id === 'all-docs');
      expect(allDocsTab?.badgeValue).toBeUndefined();
    });
  });

  describe('subtabs computed signal', () => {
    it('returns three subtabs', () => {
      expect(component.subtabs().length).toBe(3);
      expect(component.subtabs()[0].id).toBe('e-post');
    });

    it('shows badge when subtab count is non-zero', () => {
      component.tabCounts.set({ 'e-post': 7 });
      fixture.detectChanges();
      const epostTab = component.subtabs().find(t => t.id === 'e-post');
      expect(epostTab?.badgeValue).toBe('7');
    });

    it('no badge when subtab count is zero', () => {
      component.tabCounts.set({ 'e-post': 0 });
      fixture.detectChanges();
      const epostTab = component.subtabs().find(t => t.id === 'e-post');
      expect(epostTab?.badgeValue).toBeUndefined();
    });
  });

  describe('getHeading with ADMIN role', () => {
    it('returns admin heading when isAdmin', () => {
      authMock.adminViewEnabled.set(true);
      fixture.detectChanges();
      expect(component.getHeading()).toBe('Alla ärenden');
    });

    it('returns empty string when role is unknown', () => {
      authMock.activeRole.set(null);
      authMock.adminViewEnabled.set(false);
      fixture.detectChanges();
      expect(component.getHeading()).toBe('');
    });
  });

  describe('getPageSize', () => {
    it('does nothing when username is null', () => {
      authMock.username.set(null);
      component.pageSize.set(25);
      component.getPageSize();
      expect(component.pageSize()).toBe(25);
    });

    it('sets pageSize from saved storage when available', () => {
      authMock.username.set('testuser');

      component.onPageSizeSelect(50);
      component.pageSize.set(25);
      component.getPageSize();
      expect(component.pageSize()).toBe(50);
    });
  });

  describe('onTabChanged with requestedTab', () => {
    it('clears requestedTab when onTabChanged is called', () => {
      component['requestedTab'].set('my-cases');
      component.onTabChanged('all-docs');
      expect(component['requestedTab']()).toBe('');
    });

    it('does not clear requestedTab when it is empty', () => {
      component['requestedTab'].set('');
      component.onTabChanged('all-docs');
      expect(component['requestedTab']()).toBe('');
    });
  });

  describe('resetFilters additional branches', () => {
    it('clears when only externalColumnFilters are set', () => {
      component.externalColumnFilters.set({ someField: 'value' });
      component.resetFilters();
      expect(component.externalColumnFilters()).toEqual({});
    });

    it('clears when only dateRangeFilters are set', () => {
      component.dateRangeFilters.set({ someDateField: '2024-01-01' });
      component.resetFilters();
      expect(component.dateRangeFilters()).toEqual({});
    });

    it('clears when only statusQuickFilterChecked is set', () => {
      component.statusQuickFilterChecked.set(['open']);
      component.resetFilters();
      expect(component.statusQuickFilterChecked()).toEqual([]);
    });

    it('clears when only selectedQuikDates is set', () => {
      component.selectedQuikDates.set(['2024-01-01']);
      component.resetFilters();
      expect(component.selectedQuikDates()).toEqual([]);
    });

    it('clears all when both search and filters are active', () => {
      component.searchTerm.set('term');
      component.externalColumnFilters.set({ field: 'val' });
      component.resetFilters();
      expect(component.searchTerm()).toBe('');
      expect(component.externalColumnFilters()).toEqual({});
    });
  });

  describe('loadWeeklyTasks — success path', () => {
    it('processes regular workflow tasks', () => {
      const task = makeWorkflowInfo({
        id: 'task-1',
        workflowModelName: 'SomeOtherModel',
        workflowTitle: 'Regular Task',
        dueDate: new Date('2024-06-10T00:00:00Z'),
        targetDocumentIds: [{ uid: 'doc-1', title: 'Doc' }],
      });
      casesSpy.getAllTasks.and.returnValue(of(makeSearchResult({ entries: [task], resultsCount: 1 })));

      authMock.loaded.set(false);
      authMock.loaded.set(true);
      fixture.detectChanges();

      expect(component.weeklyTasksLoading()).toBeFalse();
      const tasks = component.weeklyTasks();
      expect(tasks.length).toBe(1);
      expect(tasks[0].title).toBe('Regular Task');
      expect(tasks[0].link).toEqual(['/doc', 'doc-1']);
    });

    it('generates two items for DeadlineOchPaminnelse workflow', () => {
      const task = makeWorkflowInfo({
        id: 'task-dl',
        workflowModelName: 'DeadlineOchPaminnelse',
        workflowTitle: 'Deadline Workflow',
        dueDate: new Date('2024-06-10T00:00:00Z'),
        targetDocumentIds: [],
        variables: {
          deadline: new Date('2024-06-15T00:00:00Z'),
          paminnelse: new Date('2024-06-12T00:00:00Z'),
        },
      });
      casesSpy.getAllTasks.and.returnValue(of(makeSearchResult({ entries: [task], resultsCount: 1 })));

      authMock.loaded.set(false);
      authMock.loaded.set(true);
      fixture.detectChanges();

      const tasks = component.weeklyTasks();
      expect(tasks.length).toBe(2);
      expect(tasks[0].title).toBe('Deadline');
      expect(tasks[1].title).toBe('Påminnelse');
      expect(tasks[0].link).toBeUndefined();
    });

    it('produces no link when targetDocumentIds is empty', () => {
      const task = makeWorkflowInfo({
        id: 'task-nolink',
        workflowModelName: 'OtherModel',
        workflowTitle: 'No Link Task',
        dueDate: new Date('2024-06-10T00:00:00Z'),
        targetDocumentIds: [],
      });
      casesSpy.getAllTasks.and.returnValue(of(makeSearchResult({ entries: [task], resultsCount: 1 })));

      authMock.loaded.set(false);
      authMock.loaded.set(true);
      fixture.detectChanges();

      const tasks = component.weeklyTasks();
      expect(tasks[0].link).toBeUndefined();
    });
  });

  describe('loadWeeklyTasks — error path', () => {
    it('shows error notification and clears tasks on failure', () => {
      casesSpy.getAllTasks.and.returnValue(throwError(() => new Error('network error')));

      authMock.loaded.set(false);
      authMock.loaded.set(true);
      fixture.detectChanges();

      expect(component.weeklyTasks()).toEqual([]);
      expect(component.weeklyTasksLoading()).toBeFalse();
      const notification = storeMock.notification();
      expect(notification.show).toBeTrue();
      expect(notification.variation).toBe('danger');
    });
  });

  describe('weeklyTaskColumns computed', () => {
    it('returns 5 columns', () => {
      authMock.loaded.set(true);
      authMock.activeRole.set('REGISTRATOR');
      fixture.detectChanges();
      expect(component.weeklyTaskColumns().length).toBe(5);
    });

    it('assigns registrator image sources', () => {
      authMock.loaded.set(true);
      authMock.activeRole.set('REGISTRATOR');
      fixture.detectChanges();
      const cols = component.weeklyTaskColumns();
      expect(cols[0].imageSrc).toContain('reg');
    });

    it('assigns admin image sources when adminViewEnabled', () => {
      authMock.loaded.set(true);
      authMock.adminViewEnabled.set(true);
      fixture.detectChanges();
      const cols = component.weeklyTaskColumns();
      expect(cols[0].imageSrc).toContain('admin');
    });

    it('assigns chef image sources when role is CHEF', () => {
      authMock.loaded.set(true);
      authMock.activeRole.set('CHEF');
      fixture.detectChanges();
      const cols = component.weeklyTaskColumns();
      expect(cols[0].imageSrc).toContain('chef');
    });

    it('assigns handler image sources when role is HANDLAGGARE', () => {
      authMock.loaded.set(true);
      authMock.activeRole.set('HANDLAGGARE');
      fixture.detectChanges();
      const cols = component.weeklyTaskColumns();
      expect(cols[1].imageSrc).toContain('hand');
    });

    it('returns empty image sources when no matching role', () => {
      authMock.loaded.set(true);
      authMock.activeRole.set(null);
      fixture.detectChanges();
      const cols = component.weeklyTaskColumns();
      expect(cols[0].imageSrc).toBe('');
    });

    it('marks today correctly in week day tasks', () => {
      authMock.loaded.set(true);
      authMock.activeRole.set('REGISTRATOR');
      fixture.detectChanges();
      const cols = component.weeklyTaskColumns();
      const todayCount = cols.filter(c => c.isToday).length;

      expect(todayCount).toBeLessThanOrEqual(1);
    });
  });

  describe('weeklyTaskWeekNumber and weeklyTaskWeekLabel', () => {
    it('weeklyTaskWeekLabel includes V prefix', () => {
      fixture.detectChanges();
      expect(component.weeklyTaskWeekLabel()).toMatch(/^V \d+$/);
    });

    it('weeklyTaskWeekNumber changes with weekOffset', () => {
      fixture.detectChanges();
      const initialWeek = component.weeklyTaskWeekNumber();
      component.onNextWeek();
      fixture.detectChanges();
      const nextWeek = component.weeklyTaskWeekNumber();

      expect(nextWeek).toBeGreaterThan(0);
      expect(initialWeek).toBeGreaterThan(0);
    });
  });

  describe('fetchTabCounts', () => {
    it('does nothing when username is missing', () => {
      authMock.loaded.set(true);
      authMock.activeRole.set('REGISTRATOR');
      authMock.user.set(undefined);
      authMock.username.set(null);
      fixture.detectChanges();

      expect(component.tabCounts()).toBeDefined();
    });

    it('handles my-monitoring tab counting (filter DeadlineOchPaminnelse)', () => {
      const dlTask = makeWorkflowInfo({ workflowModelName: 'DeadlineOchPaminnelse' });
      const otherTask = makeWorkflowInfo({ workflowModelName: 'OtherModel' });
      casesSpy.getAllTasks.and.returnValue(of(makeSearchResult({ entries: [dlTask, otherTask], resultsCount: 2 })));

      authMock.loaded.set(true);
      authMock.activeRole.set('HANDLAGGARE');
      authMock.user.set({ properties: { username: 'testuser' } });
      fixture.detectChanges();

      expect(component.tabCounts()['my-monitoring']).toBe(1);
    });

    it('handles my-tasks tab using resultsCount', () => {
      casesSpy.getAllTasks.and.returnValue(of(makeSearchResult({ entries: [], resultsCount: 42 })));

      authMock.loaded.set(true);
      authMock.activeRole.set('HANDLAGGARE');
      authMock.user.set({ properties: { username: 'testuser' } });
      fixture.detectChanges();

      expect(component.tabCounts()['my-tasks']).toBe(42);
    });

    it('handles incoming-docs tab using subtab subtotals', () => {
      casesSpy.getCountByTab.and.returnValue(of(10));

      authMock.loaded.set(true);
      authMock.activeRole.set('REGISTRATOR');
      authMock.user.set({ properties: { username: 'testuser' } });
      fixture.detectChanges();

      expect(component.tabCounts()['incoming-docs']).toBe(30);
    });

    it('handles catchError on my-monitoring tab', () => {
      casesSpy.getAllTasks.and.returnValue(throwError(() => new Error('fail')));
      casesSpy.getCountByTab.and.returnValue(of(0));

      authMock.loaded.set(true);
      authMock.activeRole.set('HANDLAGGARE');
      authMock.user.set({ properties: { username: 'testuser' } });
      fixture.detectChanges();

      expect(component.tabCounts()['my-monitoring']).toBe(0);
    });

    it('handles catchError on regular getCountByTab', () => {
      casesSpy.getCountByTab.and.returnValue(throwError(() => new Error('fail')));
      casesSpy.getAllTasks.and.returnValue(of(makeSearchResult({ entries: [], resultsCount: 0 })));

      authMock.loaded.set(true);
      authMock.activeRole.set('REGISTRATOR');
      authMock.user.set({ properties: { username: 'testuser' } });
      fixture.detectChanges();

      expect(component.tabCounts()['all-docs']).toBe(0);
    });
  });

  describe('effect: set viewMode to Grid when isSimplifiedHandler', () => {
    it('sets viewMode to Grid when role is HANDLAGGARE and simplified', () => {
      (uiModeMock as { isSimplified: Signal<boolean> }).isSimplified = computed(() => true);
      authMock.activeRole.set('HANDLAGGARE');
      fixture.detectChanges();
      expect(component.viewMode()).toBe(ViewMode.Grid);
    });
  });

  describe('ngOnInit', () => {
    it('sets openPage to start', () => {
      expect(storeMock.openPage()).toBe('start');
    });

    it('sets statistics from api', () => {
      expect(component.statistics()).not.toBeNull();
    });

    it('sets statusOptions from getOptionsService', () => {
      getOptionsSpy.suggestEntries.and.returnValue(of([{ id: 'opt1', label: 'Option 1' }] as Option[]));
      component.ngOnInit();
      expect(getOptionsSpy.suggestEntries).toHaveBeenCalledWith('Arendestatus');
    });

    it('sets requestedTab from query params', () => {
      expect(component['requestedTab']()).toBe('');
    });
  });

  describe('ngOnDestroy', () => {
    it('sets openPage to null', () => {
      storeMock.openPage.set('start');
      component.ngOnDestroy();
      expect(storeMock.openPage()).toBeNull();
    });
  });

  describe('casesDateColumns computed', () => {
    function makeTableColumn(
      overrides: Partial<{ key: string; label: string; sortField: string; searchField: string }>
    ): TableColumn {
      return {
        key: 'dc_created',
        label: 'Label',
        tableName: 'default',
        visible: true,
        ...overrides,
      };
    }

    it('returns empty array when config has no date columns', () => {
      constantSpy.resolveCasesTableConfig.and.returnValue({ config: [], actionsHeader: null });
      fixture.detectChanges();
      expect(component.casesDateColumns()).toEqual([]);
    });

    it('returns date column when config has an allowed date field', () => {
      constantSpy.resolveCasesTableConfig.and.returnValue({
        config: [makeTableColumn({ key: 'dc_created', label: 'Skapad', sortField: 'dc_created' })],
        actionsHeader: null,
      });
      fixture.detectChanges();
      expect(component.casesDateColumns().length).toBe(1);
      expect(component.casesDateColumns()[0].sortField).toBe('dc_created');
    });

    it('returns range mode for non-single date fields', () => {
      constantSpy.resolveCasesTableConfig.and.returnValue({
        config: [
          makeTableColumn({
            key: 'arende_arendet_registrerat_datum',
            label: 'Registrerat',
            sortField: 'arende_arendet_registrerat_datum',
          }),
        ],
        actionsHeader: null,
      });
      fixture.detectChanges();
      expect(component.casesDateColumns()[0].mode).toBe('range');
    });

    it('deduplicates columns with same field', () => {
      constantSpy.resolveCasesTableConfig.and.returnValue({
        config: [
          makeTableColumn({ key: 'dc_created', label: 'Col1', sortField: 'dc_created' }),
          makeTableColumn({ key: 'dc_created', label: 'Col2', sortField: 'dc_created' }),
        ],
        actionsHeader: null,
      });
      fixture.detectChanges();
      expect(component.casesDateColumns().length).toBe(1);
    });

    it('strips _min/_max suffix from field names', () => {
      constantSpy.resolveCasesTableConfig.and.returnValue({
        config: [makeTableColumn({ key: 'dc_created_min', label: 'From', sortField: 'dc_created_min' })],
        actionsHeader: null,
      });
      fixture.detectChanges();
      expect(component.casesDateColumns().length).toBe(1);
      expect(component.casesDateColumns()[0].sortField).toBe('dc_created');
    });

    it('ignores fields not in allowedDateFields', () => {
      constantSpy.resolveCasesTableConfig.and.returnValue({
        config: [makeTableColumn({ key: 'some_random_field', label: 'Random', sortField: 'some_random_field' })],
        actionsHeader: null,
      });
      fixture.detectChanges();
      expect(component.casesDateColumns()).toEqual([]);
    });

    it('uses searchField over sortField when present', () => {
      constantSpy.resolveCasesTableConfig.and.returnValue({
        config: [
          makeTableColumn({
            key: 'dc_created_col',
            label: 'Created',
            sortField: 'some_other_field',
            searchField: 'dc_created',
          }),
        ],
        actionsHeader: null,
      });
      fixture.detectChanges();
      expect(component.casesDateColumns().length).toBe(1);
      expect(component.casesDateColumns()[0].sortField).toBe('dc_created');
    });

    it('uses key as fallback when neither sortField nor searchField is set', () => {
      constantSpy.resolveCasesTableConfig.and.returnValue({
        config: [makeTableColumn({ key: 'dc_created', label: 'Created' })],
        actionsHeader: null,
      });
      fixture.detectChanges();
      expect(component.casesDateColumns().length).toBe(1);
    });
  });
});
