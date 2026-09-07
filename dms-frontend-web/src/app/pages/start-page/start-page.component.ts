import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  OnDestroy,
  OnInit,
  signal,
  untracked,
  ViewChild,
} from '@angular/core';

import { ActivatedRoute, RouterModule } from '@angular/router';
import { map, forkJoin, catchError, of, tap } from 'rxjs';

import { TabsComponent, Tab } from '@shared/components/tabs/tabs.component';
import { CasesListComponent } from '../cases-list/cases-list.component';
import { ToggleButtonComponent } from '@app/shared/components/toggle-button/toggle-button.component';
import { AddButtonComponent } from '@app/shared/components/add-button/add-button.component';
import { SelectCaseComponent } from '@app/shared/components/select-case-popup/select-case-popup.component';
import { TableColumn } from '@app/shared/components/case-list-table/case-list-table.component';
import { TableDateRangeFiltersComponent } from '@app/shared/components/table-date-range-filters/table-date-range-filters.component';
import { DigiArbetsformedlingenAngularModule } from '@designsystem-se/af-angular';
import { WeeklyTasksTableComponent } from './weekly-tasks-table/weekly-tasks-table.component';

import { AuthService } from '@app/core/services/auth.service';
import { CasesService, ListCasesOpts } from '@app/core/services/cases.service';
import { GeneralStore } from '@app/core/services/general-store.service';
import { NuxeoApiService } from '@app/shared/api/nuxeo-api.service';
import { Option } from '@app/shared/commonTypes';
import { AppRole } from '@app/shared/models/roles';
import { ViewMode } from '@models/view-mode.enum';

import { SearchService } from '@app/core/services/search.service';
import { formatDateOrMissing } from '@app/shared/utils/date-utils';
import { FilterResult, WeekDayTasks, WeekRange, WeeklyTaskColumn, WeeklyTaskItem } from './types';
import { AggBucket, Statistics } from '@app/shared/api/nuxeo-api.types';
import { ConstantProvider } from '@app/pages/cases-list/constants';
import { GetOptionsService } from '@app/core/services/get-options.service';
import { GLOBAL_PAGE_SIZE_KEY, loadPageSize, savePageSize } from '@app/shared/utils/page-size-storage';
import { WEEKLY_TASKS_LOAD_ERROR_MESSAGE } from '@app/shared/constants/notification-messages';
import { TableDateQuickFilterComponent } from '@app/shared/components/table-date-quick-filter/table-date-quick-filter.component';
import { UiModeService } from '@app/core/services/ui-mode.service';
import { ThemeService } from '@app/core/services/theme.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'nuxeo-start-page',
  standalone: true,
  imports: [
    RouterModule,
    TabsComponent,
    CasesListComponent,
    ToggleButtonComponent,
    AddButtonComponent,
    DigiArbetsformedlingenAngularModule,
    SelectCaseComponent,
    TableDateRangeFiltersComponent,
    WeeklyTasksTableComponent,
    TableDateQuickFilterComponent,
  ],
  templateUrl: './start-page.component.html',
})
export class StartPageComponent implements OnInit, OnDestroy {
  @ViewChild(CasesListComponent) private casesList?: CasesListComponent;
  @ViewChild(TableDateRangeFiltersComponent) private dateRangeFilter?: TableDateRangeFiltersComponent;

  private auth = inject(AuthService);
  private api = inject(NuxeoApiService);
  private store = inject(GeneralStore);
  private caseapi = inject(CasesService);
  private searchService = inject(SearchService);
  private route = inject(ActivatedRoute);
  private getOptionsService = inject(GetOptionsService);
  private constantProvider = inject(ConstantProvider);
  private uiModeService = inject(UiModeService);
  readonly themeService = inject(ThemeService);

  isDialogOpened = signal(false);
  viewMode = signal<ViewMode>(ViewMode.Table);
  readonly viewModeEnum = ViewMode;
  caseFilters = signal<Partial<ListCasesOpts>>({});
  searchTerm = signal('');
  externalColumnFilters = signal<Record<string, string | string[]>>({});
  dateRangeFilters = signal<Record<string, string>>({});
  statusQuickFilterChecked = signal<string[]>([]);
  activeTabId = signal<string>('');
  activeSubTabId = signal<string>('e-post');
  tabCounts = signal<Record<string, number>>({});
  statistics = signal<Statistics | null>(null);
  private requestedTab = signal<string>('');
  pageSize = signal<number>(25);
  weeklyTasks = signal<WeeklyTaskItem[]>([]);
  weeklyTasksLoading = signal(false);
  weeklyTasksRequested = signal(false);
  weekRange = signal<WeekRange | null>(null);
  weekOffset = signal(0);
  selectedQuikDates = signal<string[]>([]);

  loaded = this.auth.loaded;
  loadError = this.auth.loadError;
  role = computed<AppRole | null>(() => this.auth.activeRole());
  isChef = computed(() => this.role() === 'CHEF');
  isHandler = computed(() => this.role() === 'HANDLAGGARE');
  isRegistrator = computed(() => this.role() === 'REGISTRATOR');
  isAdmin = computed(() => this.auth.adminViewEnabled() || this.role() === 'ADMIN');
  isSimplifiedHandler = computed(() => this.isHandler() && this.uiModeService.isSimplified());

  tabsJson = computed(() => JSON.stringify(this.tabs()));
  activeCasesTab = computed(() =>
    this.activeTabId() === 'incoming-docs' ? this.activeSubTabId() : this.activeTabId()
  );
  casesTableConfig = computed(() =>
    this.constantProvider.resolveCasesTableConfig({
      role: this.auth.activeRole(),
      tab: this.activeCasesTab(),
      isAdmin: this.auth.adminViewEnabled(),
    })
  );
  showQuickRangeForTab = computed(() => {
    const tab = this.activeTabId() === 'incoming-docs' ? this.activeSubTabId() : this.activeTabId();
    return this.shouldShowQuickRange(tab);
  });
  showSearchForTab = computed(() => {
    const tab = this.activeTabId() === 'incoming-docs' ? this.activeSubTabId() : this.activeTabId();
    return this.shouldShowSearch(tab);
  });
  showStatusFilterForTab = computed(() => {
    const tab = this.activeTabId() === 'incoming-docs' ? this.activeSubTabId() : this.activeTabId();
    return this.shouldShowStatusFilter(tab);
  });
  showResetFiltersForTab = computed(() => {
    const tab = this.activeTabId() === 'incoming-docs' ? this.activeSubTabId() : this.activeTabId();
    return this.shouldShowResetFilters(tab);
  });
  casesDateColumns = computed(() => this.getDateColumns(this.casesTableConfig().config));
  activeDateRangeSelection = computed(() => this.dateRangeFilters());
  weeklyTaskColumns = computed<WeeklyTaskColumn[]>(() => {
    const days = this.buildWeekDayTasks();
    const imageSources = this.getRoleImageSources();

    return days.map((day, index) => ({
      ...day,
      imageSrc: imageSources[index],
    }));
  });
  weeklyTaskWeekNumber = computed(() =>
    this.getIsoWeekNumber((this.weekRange() ?? this.getWeekRange(this.getWeekReferenceDate())).start)
  );
  weeklyTaskWeekLabel = computed(() => `V ${this.weeklyTaskWeekNumber()}`);

  statusOptions = signal<Option[]>([]);
  caseCreatedAggBuckets = signal<AggBucket[]>([]);

  subtabs = computed<Tab[]>(() => {
    const counts = this.tabCounts();
    const showBadge = (key: string) => (counts[key] && counts[key] > 0 ? String(counts[key]) : undefined);

    return [
      { id: 'e-post', title: 'Filer att registrera från e-post', badgeValue: showBadge('e-post') },
      { id: 'scans', title: 'Filer att registrera från skanning/OCR', badgeValue: showBadge('scans') },
      { id: 'folder', title: 'Filer att registrera från fil-yta/mapp', badgeValue: showBadge('folder') },
    ];
  });

  tabs = computed<Tab[]>(() => {
    if (!this.loaded()) return [];

    const counts = this.tabCounts();
    const showBadge = (key: string) => (counts[key] && counts[key] > 0 ? String(counts[key]) : undefined);

    const isAdmin = this.auth.adminViewEnabled();
    const activeRole = this.auth.activeRole()?.toLowerCase() ?? '';

    const registratorTabs: Tab[] = [
      { id: 'all-docs', title: 'Alla ärenden', badgeValue: showBadge('all-docs') },
      { id: 'incoming-docs', title: 'Inkommande filer att registrera', badgeValue: showBadge('incoming-docs') },
      { id: 'to-dispatch', title: 'Handlingar som ska expedieras', badgeValue: showBadge('to-dispatch') },
      { id: 'my-tasks', title: 'Uppgifter att utföra', badgeValue: showBadge('my-tasks') },
      { id: 'ready-to-close', title: 'Ärenden redo att stängas', badgeValue: showBadge('ready-to-close') },
    ];

    const handlaggareTabs: Tab[] = [
      { id: 'my-cases', title: 'Mina ärenden', badgeValue: showBadge('my-cases') },
      { id: 'my-utkasts', title: 'Mina utkast', badgeValue: showBadge('my-utkasts') },
      { id: 'i-choose', title: 'Gruppens ärenden', badgeValue: showBadge('i-choose') },
      {
        id: 'my-co-handled-cases',
        title: 'Mina medhandläggar ärenden',
        badgeValue: showBadge('my-co-handled-cases'),
      },
      { id: 'my-tasks', title: 'Uppgifter att utföra', badgeValue: showBadge('my-tasks') },
      { id: 'my-monitoring', title: 'Mina bevakningar', badgeValue: showBadge('my-monitoring') },
    ];
    const simplifiedUiHiddenTabs = new Set(['i-choose', 'my-co-handled-cases', 'my-monitoring']);
    const applyUiMode = (tabs: Tab[]): Tab[] => {
      if (!this.isHandler() || !this.uiModeService.isSimplified()) return tabs;
      return tabs.filter(tabItem => !simplifiedUiHiddenTabs.has(tabItem.id));
    };

    const adminExtras: Tab[] = [
      { id: 'to-distribute', title: 'Inkomna ärenden för fördelning', badgeValue: showBadge('to-distribute') },
      { id: 'group-incoming', title: 'Gruppens inkomna ärenden', badgeValue: showBadge('group-incoming') },
    ];

    const TAB_ORDER: readonly string[] = [
      'to-distribute',
      'group-incoming',
      'all-docs',
      'incoming-docs',
      'to-dispatch',
      'my-cases',
      'my-utkasts',
      'i-choose',
      'my-co-handled-cases',
      'my-tasks',
      'my-monitoring',
      'ready-to-close',
    ];

    const allRoleTabs: Record<string, Tab[]> = {
      registrator: registratorTabs,
      handlaggare: handlaggareTabs,
      administrator: [...adminExtras, ...registratorTabs, ...handlaggareTabs],
      admin: [...adminExtras, ...registratorTabs, ...handlaggareTabs],
      chef: [],
    };

    const dedupeAndSort = (input: Tab[]): Tab[] => {
      const encountered = new Set<string>();
      const result: Tab[] = [];
      for (const tabItem of input) {
        if (!encountered.has(tabItem.id)) {
          encountered.add(tabItem.id);
          result.push(tabItem);
        }
      }
      return result.sort((firstTab, secondTab) => TAB_ORDER.indexOf(firstTab.id) - TAB_ORDER.indexOf(secondTab.id));
    };

    if (isAdmin) {
      const merged = [...adminExtras, ...registratorTabs, ...handlaggareTabs].filter(
        tabItem => tabItem.id !== 'i-choose'
      );
      return applyUiMode(dedupeAndSort(merged));
    }

    if (activeRole && allRoleTabs[activeRole]) {
      return applyUiMode(dedupeAndSort(allRoleTabs[activeRole]));
    }

    return [];
  });

  constructor() {
    effect(() => {
      if (this.loaded() && this.role()) this.fetchTabCounts();
    });
    effect(() => {
      const tabs = this.tabs();
      if (tabs.length && !this.activeTabId()) {
        const requestedTab = this.requestedTab();
        const requestedExists = requestedTab && tabs.some(tab => tab.id === requestedTab);
        const firstTabId = requestedExists ? requestedTab : tabs[0].id;
        this.activeTabId.set(firstTabId);
        this.onTabChanged(firstTabId);
      }
    });
    effect(() => {
      const requestedTab = this.requestedTab();
      const tabs = this.tabs();
      const currentTab = this.activeTabId();
      if (!requestedTab || !tabs.length) return;
      if (!tabs.some(tab => tab.id === requestedTab)) return;
      if (currentTab === requestedTab) return;
      this.activeTabId.set(requestedTab);
      this.onTabChanged(requestedTab);
    });
    effect(() => {
      const tabs = this.tabs();
      const currentTab = this.activeTabId();
      if (!tabs.length || !currentTab) return;
      if (tabs.some(tab => tab.id === currentTab)) return;
      this.activeTabId.set(tabs[0].id);
      this.onTabChanged(tabs[0].id);
    });

    effect(() => {
      if (!this.loaded()) return;
      if (this.weeklyTasksRequested()) return;
      this.weeklyTasksRequested.set(true);
      this.loadWeeklyTasks();
    });

    effect(() => {
      const referenceDate = this.getWeekReferenceDate();
      this.weekRange.set(this.getWeekRange(referenceDate));
    });

    effect(() => {
      if (this.isSimplifiedHandler()) {
        this.viewMode.set(ViewMode.Grid);
      }
    });
  }

  ngOnInit(): void {
    this.store.openPage.set('start');

    this.getPageSize();
    this.getOptionsService.suggestEntries('Arendestatus').subscribe(data => this.statusOptions.set(data));

    this.api
      .getStatistics()
      .pipe(
        tap(data => {
          this.statistics.set(data);
        })
      )
      .subscribe();

    this.route.queryParamMap.subscribe(params => {
      const tab = params.get('tab') ?? '';
      this.requestedTab.set(tab);
    });
  }

  getPageSize() {
    const username = this.auth.username();
    if (!username) return;

    const savedSize = loadPageSize(username, GLOBAL_PAGE_SIZE_KEY);
    if (savedSize != null) {
      this.pageSize.set(savedSize);
    }
  }

  getHeading() {
    if (this.isRegistrator()) return 'Redo att registrera';
    if (this.isHandler()) return 'Gruppens inkomna ärenden';
    if (this.isChef()) return 'Ärende att fördela';
    if (this.isAdmin()) return 'Alla ärenden';
    return '';
  }

  onPageSizeSelect(value: string | number) {
    const username = this.auth.username();
    if (!username) return;

    const nextValue = Number(value);
    if (!Number.isFinite(nextValue)) return;
    this.pageSize.set(nextValue);
    savePageSize(username, GLOBAL_PAGE_SIZE_KEY, nextValue);
  }

  onTabChanged(tabId: string) {
    if (this.requestedTab()) {
      this.requestedTab.set('');
    }
    this.activeTabId.set(tabId);
    this.caseFilters.set({});
    this.externalColumnFilters.set({});
    this.searchTerm.set('');
    this.dateRangeFilters.set({});
    this.statusQuickFilterChecked.set([]);
    this.selectedQuikDates.set([]);
    this.caseCreatedAggBuckets.set([]);
  }

  onSubTabChanged(tabId: string) {
    this.activeSubTabId.set(tabId);
    this.caseFilters.set({});
    this.externalColumnFilters.set({});
    this.searchTerm.set('');
    this.dateRangeFilters.set({});
    this.statusQuickFilterChecked.set([]);
    this.selectedQuikDates.set([]);
    this.caseCreatedAggBuckets.set([]);
  }

  onSearch(eventValue: unknown) {
    const term = this.searchService.extractTerm(eventValue);
    this.searchTerm.set(term);
    this.caseFilters.update(prev => ({
      ...prev,
      search: term || undefined,
      searchAllColumns: term ? true : undefined,
      page: 0,
    }));
  }

  onSearchInput(eventValue: unknown) {
    this.searchTerm.set(this.searchService.extractTerm(eventValue));
  }

  resetFilters(): void {
    const hasSearchInput = !!this.searchTerm();
    const hasAppliedFilters =
      this.hasRecordValues(this.caseFilters()) ||
      this.hasRecordValues(this.externalColumnFilters()) ||
      this.hasRecordValues(this.dateRangeFilters()) ||
      this.statusQuickFilterChecked().length > 0 ||
      this.selectedQuikDates().length > 0 ||
      (this.casesList?.hasActiveTableState() ?? false);

    if (!hasSearchInput && !hasAppliedFilters) {
      return;
    }

    if (hasSearchInput && !hasAppliedFilters) {
      this.searchTerm.set('');
      this.caseFilters.set({});
      return;
    }

    this.searchTerm.set('');
    this.statusQuickFilterChecked.set([]);
    this.selectedQuikDates.set([]);
    this.dateRangeFilters.set({});
    this.externalColumnFilters.set({});
    this.dateRangeFilter?.reset();
    this.caseFilters.set({});
    this.casesList?.resetTableFilters();
  }

  onFiltersChanged(changedFilter: FilterResult) {
    this.statusQuickFilterChecked.set(changedFilter.checked ?? []);
    this.externalColumnFilters.update(current => {
      const next = { ...current };
      if (changedFilter.checked.length) {
        next['arende_arendestatus'] = changedFilter.checked;
      } else {
        delete next['arende_arendestatus'];
      }
      return next;
    });
  }

  onTableStatusFilterChange(values: string[]) {
    const current = this.statusQuickFilterChecked();
    const next = values ?? [];
    if (current.length === next.length && current.every((value, idx) => value === next[idx])) {
      return;
    }
    this.statusQuickFilterChecked.set(next);
    this.externalColumnFilters.update(currentFilters => {
      const nextFilters = { ...currentFilters };
      if (next.length) {
        nextFilters['arende_arendestatus'] = next;
      } else {
        delete nextFilters['arende_arendestatus'];
      }
      return nextFilters;
    });
  }

  onDateRangeChange(event: { field: string; value: string | string[] }) {
    this.externalColumnFilters.update(current => {
      const next = { ...current };
      if (event.value) {
        next[event.field] = event.value;
      } else {
        delete next[event.field];
      }
      return next;
    });
  }

  onDateFilterChange(event: { field: string; value: string }) {
    const nextDateFilters = this.updateDateFilterMap(this.dateRangeFilters(), event);
    this.dateRangeFilters.set(nextDateFilters);
    this.externalColumnFilters.update(current => {
      const next = { ...current, ...nextDateFilters };
      if (!event.value) {
        delete next[event.field];
      }
      return next;
    });
  }

  private updateDateFilterMap(current: Record<string, string>, event: { field: string; value: string }) {
    const next = { ...current };
    if (event.value) {
      next[event.field] = event.value;
    } else {
      delete next[event.field];
    }
    return next;
  }

  private hasRecordValues(record: Record<string, unknown>): boolean {
    return Object.values(record).some(value =>
      Array.isArray(value) ? value.length > 0 : value != null && value !== ''
    );
  }

  onCaseCreatedAggBucketsChange(buckets: AggBucket[]): void {
    if (!this.showQuickRangeForTab()) {
      this.caseCreatedAggBuckets.set([]);
      return;
    }
    this.caseCreatedAggBuckets.set(buckets);
  }

  onToggleButtonChange(activeButton: number) {
    this.viewMode.set(activeButton === 1 ? ViewMode.Grid : ViewMode.Table);
  }

  onPreviousWeek() {
    this.weekOffset.update(value => value - 1);
  }

  onNextWeek() {
    this.weekOffset.update(value => value + 1);
  }

  openDialog() {
    this.isDialogOpened.set(true);
  }

  retryLoadMe() {
    this.auth.loadMe();
  }

  getPath() {
    return this.store.lastCreatedCase()?.path || '';
  }

  private getDate(date: string | Date | undefined | null): string {
    return formatDateOrMissing(date);
  }

  private buildWeekDayTasks(): WeekDayTasks[] {
    const range = this.weekRange() ?? this.getWeekRange(this.getWeekReferenceDate());
    const tasks = this.weeklyTasks();
    const today = new Date();
    const labels = ['Måndag', 'Tisdag', 'Onsdag', 'Torsdag', 'Fredag'];

    return range.days.map((day, index) => {
      const dayTasks = tasks
        .filter(task => task.deadline && this.isSameDay(task.deadline, day))
        .sort((first, second) => first.deadline.getTime() - second.deadline.getTime());

      return {
        key: `weekday-${index}`,
        label: labels[index] ?? '',
        date: day,
        isToday: this.isSameDay(day, today),
        tasks: dayTasks,
      };
    });
  }

  private getRoleImageSources(): readonly [string, string, string, string, string] {
    if (this.isAdmin()) {
      return [
        '/nuxeo/app/assets/photos/admin/Rectangle179.webp',
        '/nuxeo/app/assets/photos/admin/Rectangle175.webp',
        '/nuxeo/app/assets/photos/admin/Rectangle177.webp',
        '/nuxeo/app/assets/photos/admin/Rectangle178.webp',
        '/nuxeo/app/assets/photos/chef/Rectangle177.webp',
      ];
    }

    if (this.isChef()) {
      return [
        '/nuxeo/app/assets/photos/chef/Rectangle175.webp',
        '/nuxeo/app/assets/photos/chef/Rectangle177.webp',
        '/nuxeo/app/assets/photos/chef/Rectangle178.webp',
        '/nuxeo/app/assets/photos/chef/Rectangle176.webp',
        '/nuxeo/app/assets/photos/admin/Rectangle175.webp',
      ];
    }

    if (this.isHandler()) {
      return [
        '/nuxeo/app/assets/photos/reg/Rectangle178.webp',
        '/nuxeo/app/assets/photos/hand/Rectangle175.webp',
        '/nuxeo/app/assets/photos/hand/Rectangle176.webp',
        '/nuxeo/app/assets/photos/hand/Rectangle177.webp',
        '/nuxeo/app/assets/photos/hand/Rectangle178.webp',
      ];
    }

    if (this.isRegistrator()) {
      return [
        '/nuxeo/app/assets/photos/reg/Rectangle177.webp',
        '/nuxeo/app/assets/photos/admin/Rectangle179.webp',
        '/nuxeo/app/assets/photos/reg/Rectangle175.webp',
        '/nuxeo/app/assets/photos/reg/Rectangle178.webp',
        '/nuxeo/app/assets/photos/reg/Rectangle176.webp',
      ];
    }

    return ['', '', '', '', ''];
  }

  private getDateColumns(config: TableColumn[]): {
    label: string;
    sortField: string;
    mode: 'range' | 'single';
  }[] {
    const seen = new Set<string>();
    return config
      .map(col => {
        const rawField = (col.searchField ?? col.sortField ?? col.key.toString()).toString();
        const field = this.normalizeDateField(rawField);
        if (!this.allowedDateFields.has(field)) return null;
        if (seen.has(field)) return null;
        const label = typeof col.label === 'string' ? col.label : String(col.label ?? '');
        seen.add(field);
        const mode: 'range' | 'single' = this.singleDateFields.has(field) ? 'single' : 'range';
        return {
          label,
          sortField: field,
          mode,
        };
      })
      .filter(
        (
          col
        ): col is {
          label: string;
          sortField: string;
          mode: 'range' | 'single';
        } => !!col
      );
  }

  private readonly allowedDateFields = new Set([
    'arende_arendet_registrerat_datum',
    'arende_beslutat_datum',
    'arende_arendet_avslutat_datum',
    'handling_inkommen_datum',
    'handling_upprattad_datum',
    'handling_arkiverad_datum',
    'handling_gallrad_datum',
    'handling_makulerad_datum',
    'handling_granskningsdatum',
    'handling_utgaende_datum',
    'arende_arendet_arkiverat_datum',
    'arende_arendet_gallrat_datum',
    'arende_arendet_makulerat_datum',
    'mail_sending_date',
    'dc_created',
    'dc_modified',
  ]);

  private readonly singleDateFields = new Set<string>([]);
  private readonly noQuickRangeTabs = new Set(['my-tasks', 'my-monitoring', 'e-post', 'scans', 'ready-to-close']);
  private readonly noSearchTabs = new Set(['my-tasks', 'my-monitoring', 'e-post']);
  private readonly noStatusFilterTabs = new Set(['my-tasks', 'my-monitoring', 'e-post', 'my-utkasts']);
  private readonly noResetFilterTabs = new Set(['my-tasks', 'my-monitoring']);

  private shouldShowQuickRange(tab: string): boolean {
    if (!tab) return false;
    return !this.noQuickRangeTabs.has(tab);
  }

  private shouldShowSearch(tab: string): boolean {
    if (!tab) return false;
    return !this.noSearchTabs.has(tab);
  }

  private shouldShowStatusFilter(tab: string): boolean {
    if (!tab) return false;
    return !this.noStatusFilterTabs.has(tab);
  }

  private shouldShowResetFilters(tab: string): boolean {
    if (!tab) return false;
    return !this.noResetFilterTabs.has(tab);
  }

  private normalizeDateField(value: string): string {
    const trimmed = value.trim();
    if (!trimmed) return '';
    const stripped = trimmed.endsWith('_min') || trimmed.endsWith('_max') ? trimmed.slice(0, -4) : trimmed;
    return stripped.replace(/:/g, '_');
  }

  private loadWeeklyTasks(): void {
    this.weeklyTasksLoading.set(true);

    this.caseapi.getAllTasks(200, 0).subscribe({
      next: response => {
        const taskDates: WeeklyTaskItem[] = response.entries.flatMap(task => {
          const linkId = task.targetDocumentIds?.[0]?.uid;
          const link = linkId ? ['/doc', linkId] : undefined;

          const base = {
            id: task.id,
            description: task.variables?.beskrivning,
            link,
          };

          if (task.workflowModelName === 'DeadlineOchPaminnelse') {
            return [
              {
                ...base,
                title: 'Deadline',
                deadline: new Date(task.variables?.deadline),
              },
              {
                ...base,
                title: 'Påminnelse',
                deadline: new Date(task.variables?.paminnelse),
              },
            ];
          }

          return [
            {
              ...base,
              title: task.workflowTitle,
              deadline: new Date(task.dueDate),
            },
          ];
        });

        this.weeklyTasks.set(taskDates);
        this.weeklyTasksLoading.set(false);
      },
      error: () => {
        this.store.notification.set({ show: true, variation: 'danger', text: WEEKLY_TASKS_LOAD_ERROR_MESSAGE });
        this.weeklyTasks.set([]);
        this.weeklyTasksLoading.set(false);
      },
    });
  }

  private getWeekReferenceDate(): Date {
    const reference = new Date();
    reference.setDate(reference.getDate() + this.weekOffset() * 7);
    return reference;
  }

  private getWeekRange(date: Date): WeekRange {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const dayOfWeek = start.getDay();
    const delta = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    start.setDate(start.getDate() + delta);

    const days = this.buildWeekDays(start);
    const end = new Date(days[days.length - 1] ?? start);
    end.setHours(23, 59, 59, 999);
    return { start, end, days };
  }

  private buildWeekDays(start: Date): Date[] {
    const days: Date[] = [];
    for (let index = 0; index < 5; index += 1) {
      const next = new Date(start);
      next.setDate(start.getDate() + index);
      days.push(next);
    }
    return days;
  }

  private isSameDay(left: Date, right: Date): boolean {
    return (
      left.getFullYear() === right.getFullYear() &&
      left.getMonth() === right.getMonth() &&
      left.getDate() === right.getDate()
    );
  }

  private getIsoWeekNumber(date: Date): number {
    const target = new Date(date);
    target.setHours(0, 0, 0, 0);
    const dayNumber = (target.getDay() + 6) % 7;
    target.setDate(target.getDate() - dayNumber + 3);

    const firstThursday = new Date(target.getFullYear(), 0, 4);
    const firstDayNumber = (firstThursday.getDay() + 6) % 7;
    firstThursday.setDate(firstThursday.getDate() - firstDayNumber + 3);

    const diff = target.getTime() - firstThursday.getTime();
    return 1 + Math.round(diff / 604800000);
  }

  private fetchTabCounts() {
    const username = this.auth.user()?.properties?.['username'];
    const activeRole = this.role();
    if (!username || !activeRole) return;

    const tabs = untracked(() => this.tabs());
    const subTabs = untracked(() => this.subtabs());
    const fullTabs = [...tabs, ...subTabs];
    if (!fullTabs.length) return;

    const requests = fullTabs.map(tab => {
      if (tab.id === 'incoming-docs') {
        return of({ tabId: tab.id, total: 0 });
      }
      if (tab.id === 'my-monitoring') {
        return this.caseapi.getAllTasks(this.pageSize()).pipe(
          map(res => ({
            tabId: tab.id,
            total: res.entries.filter(entry => entry.workflowModelName === 'DeadlineOchPaminnelse').length ?? 0,
          })),
          catchError(() => of({ tabId: tab.id, total: 0 }))
        );
      }
      if (tab.id === 'my-tasks') {
        return this.caseapi.getAllTasks(this.pageSize()).pipe(
          map(res => ({ tabId: tab.id, total: res.resultsCount ?? 0 })),
          catchError(() => of({ tabId: tab.id, total: 0 }))
        );
      }

      return this.caseapi.getCountByTab({ tab: tab.id, username, activeRole }).pipe(
        map(total => ({ tabId: tab.id, total })),
        catchError(() => of({ tabId: tab.id, total: 0 }))
      );
    });

    forkJoin(requests).subscribe(results => {
      const subTabsIds = subTabs.map(el => el.id);
      const subTabsResults = results.filter(el => subTabsIds.includes(el.tabId));
      const incomingDocs = subTabsResults.reduce((acc, el) => {
        return acc + el.total;
      }, 0);

      const newCounts = results
        .map(el => {
          if (el.tabId === 'incoming-docs') {
            return { ...el, total: incomingDocs };
          }
          return el;
        })
        .reduce((acc, tabSummary) => ({ ...acc, [tabSummary.tabId]: tabSummary.total }), {});
      this.tabCounts.set(newCounts);
    });
  }

  ngOnDestroy(): void {
    this.store.openPage.set(null);
  }
}
