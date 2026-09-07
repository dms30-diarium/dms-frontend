import { ChangeDetectionStrategy, Component, OnInit, computed, effect, inject, signal } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CaseListTableComponent, TableColumn } from '@app/shared/components/case-list-table/case-list-table.component';
import { TableItem } from '@app/shared/models/case-table';
import { TableColOption } from '@app/shared/components/table-col-options/table-col-options.component';
import { SearchService } from '@app/core/services/search-service';
import { SearchSortService } from '@app/core/services/search-sort.service';
import { AuthService } from '@app/core/services/auth.service';
import { DigiArbetsformedlingenAngularModule, DigiDialog } from '@designsystem-se/af-angular';
import { AssignCollectionModalComponent } from '@app/shared/components/assign-collection-modal.component/assign-collection-modal.component';
import { NuxeoApiService } from '@app/shared/api/nuxeo-api.service';
import { TopButtonsPanelComponent } from '@app/shared/components/top-buttons-panel/top-buttons-panel.component';
import { Tab, TabsComponent } from '@app/shared/components/tabs/tabs.component';
import { catchError, EMPTY, first, from, map, mergeMap, switchMap, take, tap, timer, toArray } from 'rxjs';
import { FavoritesService } from '@app/core/services/favorites.service';
import { GeneralStore } from '@app/core/services/general-store.service';
import {
  CSV_EXPORT_FAILED_MESSAGE,
  DOCUMENT_SEARCH_CSV_EXPORT_COMPLETED_NO_LINK_MESSAGE,
  DOCUMENT_SEARCH_CSV_EXPORT_ERROR_MESSAGE,
  DOCUMENT_SEARCH_SELECT_ALL_RESULTS_ERROR_MESSAGE,
  FAVORITE_ADDED_MESSAGE,
  FAVORITE_UPDATE_ERROR_MESSAGE,
} from '@app/shared/constants/notification-messages';
import { ConstantProvider as CasePageConstantProvider } from '@app/pages/case-page/constants';
import { ConstantProvider } from '@app/pages/cases-list/constants';
import { GetOptionsService } from '@app/core/services/get-options.service';
import { Option } from '@app/shared/commonTypes';
import { FilterResult } from '@app/pages/case-page/case-types';
import { TableDateRangeFiltersComponent } from '@app/shared/components/table-date-range-filters/table-date-range-filters.component';
import type { AggBucket } from '@app/shared/api/nuxeo-api.types';
import { ImageButtonComponent } from '@app/shared/components/image-button/image-button.component';
import { TableDateQuickFilterComponent } from '@app/shared/components/table-date-quick-filter/table-date-quick-filter.component';
import { CSVExportService } from '@app/shared/services/csv-export.service';
import { TableSortService } from '@app/core/services/table-sort.service';
import { NUXEO_SCHEMA_FIELDS } from '@app/shared/constants/nuxeo-schema-fields';

const CSV_EXPORT_EXCLUDED_FIELDS = ['isTrashed', 'isRecord', 'type', 'state', 'status', 'retainUntil'];

@Component({
  selector: 'nuxeo-document-search',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterModule,
    CaseListTableComponent,
    DigiDialog,
    DigiArbetsformedlingenAngularModule,
    AssignCollectionModalComponent,
    TopButtonsPanelComponent,
    TabsComponent,
    TableDateRangeFiltersComponent,
    ImageButtonComponent,
    TableDateQuickFilterComponent,
  ],
  templateUrl: './document-search.component.html',
})
export class DocumentSearchComponent implements OnInit {
  private readonly constantProvider = inject(ConstantProvider);
  private readonly casePageConstantProvider = inject(CasePageConstantProvider);
  generalStore = inject(GeneralStore);
  private readonly arendeDateColumns: { label: string; sortField: string; mode: 'range' | 'single' }[] = [
    { label: 'Registrerat datum', sortField: 'arende_arendet_registrerat_datum', mode: 'range' },
    { label: 'Beslutat datum', sortField: 'arende_beslutat_datum', mode: 'range' },
    { label: 'Avslutat datum', sortField: 'arende_arendet_avslutat_datum', mode: 'range' },
    { label: 'Arkiverat datum', sortField: 'arende_arendet_arkiverat_datum', mode: 'range' },
    { label: 'Gallrat datum', sortField: 'arende_arendet_gallrat_datum', mode: 'range' },
    { label: 'Makulerat datum', sortField: 'arende_arendet_makulerat_datum', mode: 'range' },
  ];
  private readonly handlingDateColumns: { label: string; sortField: string; mode: 'range' | 'single' }[] = [
    { label: 'Inkommen datum', sortField: 'handling_inkommen_datum', mode: 'range' },
    { label: 'Upprättad datum', sortField: 'handling_upprattad_datum', mode: 'range' },
    { label: 'Beslutat datum', sortField: 'handling_beslutat_datum', mode: 'range' },
    { label: 'Expedierad datum', sortField: 'handling_expedierad_datum', mode: 'range' },
  ];
  private readonly csvBaseSchemas = ['dublincore', 'common', 'uid'];
  private readonly csvPollIntervalMs = 1500;
  private readonly csvMaxPollAttempts = 3;
  readonly searchService = inject(SearchService);
  readonly searchSortService = inject(SearchSortService);
  readonly apiService = inject(NuxeoApiService);
  readonly favoritesService = inject(FavoritesService);
  readonly store = inject(GeneralStore);
  readonly authService = inject(AuthService);
  readonly getOptionsService = inject(GetOptionsService);
  private readonly csvExportService = inject(CSVExportService);
  private readonly tableSortService = inject(TableSortService);
  resultsCount = signal<number>(0);
  entries = signal<TableItem[] | null>([]);
  total = this.searchService.total;
  page = this.searchService.page;
  selectedFiles = signal<string[]>([]);
  isAssignCollectionOpened = signal<string[] | null>(null);
  activeDocTypeTabId = signal<string>('');
  arendeStatusOptions = signal<Option[]>([]);
  handlingStatusOptions = signal<Option[]>([]);
  orgOptions = signal<Option[]>([]);
  orgParentRef = signal<string>('');
  selectedQuikDates = signal<string[]>([]);
  private lastOrgLoadKey = '';
  orgFilterItems = computed<Option[]>(() => this.orgOptions());
  activeOrgChecked = computed(() => this.searchService.quickArendeOrgFilter());
  activeCreatedRange = computed(() =>
    this.getQuickCreatedSelection(this.searchService.quickCreatedRangeByType(), this.activeDocType())
  );
  createdAggBuckets = computed(() =>
    this.getCreatedAggBuckets(this.searchService.createdAggBucketsByType(), this.activeDocType())
  );
  activeDateRangeSelection = computed(() => {
    const docType = this.activeDocType();
    if (docType === 'Arende') return this.searchService.quickArendeDateFilters();
    if (this.isHandlingDocType(docType)) return this.searchService.quickHandlingDateFilters();
    return {};
  });
  activeDocType = computed(() => {
    const selected = this.searchService.selectedDocTypes() ?? [];
    if (selected.length === 1) return selected[0] ?? '';
    return this.activeDocTypeTabId() || this.searchService.activeDocType();
  });
  activeStatusOptions = computed(() => {
    const docType = this.activeDocType();
    if (docType === 'Arende') return this.arendeStatusOptions();
    if (docType === 'Utkast') return this.searchService.utkastStatusOptions();
    if (docType === 'Handling') {
      const aggOptions = this.searchService.handlingStatusAggOptions();
      return aggOptions.length ? aggOptions : this.handlingStatusOptions();
    }
    return [];
  });
  activeStatusChecked = computed(() => {
    const docType = this.activeDocType();
    if (docType === 'Arende') return this.searchService.quickArendeStatusFilter();
    if (docType === 'Utkast') return this.searchService.quickUtkastStatusFilter();
    if (docType === 'Handling') return this.searchService.quickHandlingStatusFilter();
    return [];
  });
  showStatusFilter = computed(() => {
    const docType = this.activeDocType();
    return docType === 'Arende' || this.isHandlingDocType(docType);
  });
  showOrgFilter = computed(() => this.activeDocType() === 'Arende');
  showDateFilter = computed(() => {
    const docType = this.activeDocType();
    return docType === 'Arende' || this.isHandlingDocType(docType);
  });
  dateColumns = computed(() => {
    const docType = this.activeDocType();
    if (docType === 'Arende') return this.arendeDateColumns;
    if (this.isHandlingDocType(docType)) return this.handlingDateColumns;
    return [];
  });

  readonly DOCUMENT_SEARCH_TABLE_NAME = 'DOCUMENT_SEARCH';
  readonly DOCUMENT_SEARCH_ARENDE_TABLE_NAME = 'DOCUMENT_SEARCH_ARENDE';
  readonly DOCUMENT_SEARCH_HANDLING_TABLE_NAME = 'DOCUMENT_SEARCH_HANDLING';
  readonly DOCUMENT_SEARCH_UTKAST_TABLE_NAME = 'DOCUMENT_SEARCH_UTKAST';
  private readonly docTypeOrder = ['Arende', 'Handling', 'Utkast'];

  private readonly baseColumnConfig: Omit<TableColumn, 'tableName'>[] = [
    {
      label: this.generalStore.getValue('label.dublincore.title') ?? '',
      key: 'title',
      sortField: NUXEO_SCHEMA_FIELDS.dc.title,
      class: 'max-w-[300px] min-w-[300px] truncate',
      asLink: true,
      visible: true,
    },
    {
      label: this.generalStore.getValue('label.dublincore.modified') ?? '',
      key: 'modified',
      sortField: NUXEO_SCHEMA_FIELDS.dc.modified,
      class: 'w-[30%]',
      visible: true,
    },
    {
      label: this.generalStore.getValue('label.dublincore.lastContributor') ?? '',
      key: 'lastContributor',
      sortField: NUXEO_SCHEMA_FIELDS.dc.lastContributor,
      class: 'w-[30%]',
      visible: true,
    },
    { label: this.generalStore.getValue('label.type') ?? '', key: 'type', class: 'w-[20%]', visible: false },
    { label: this.generalStore.getValue('label.state') ?? '', key: 'state', class: 'w-[20%]', visible: false },
  ];

  private readonly arendeExtraColumnsRegistrator = this.stripTableName(this.constantProvider.REGISTRATOR_COLS);
  private readonly arendeExtraColumnsHandlaggare = this.stripTableName(this.constantProvider.MINA_AREDEN_COLS);
  private readonly arendeExtraColumnsDefault = this.stripTableName(this.constantProvider.DEFAULT_COLS);
  private readonly handlingExtraColumns = this.stripTableName(this.casePageConstantProvider.handlingarTableConfig);
  private readonly utkastExtraColumns = this.stripTableName(this.casePageConstantProvider.arbetsmaterialTableConfig);

  private readonly arendeColumnConfigRegistrator = this.buildMergedColumns(
    this.DOCUMENT_SEARCH_ARENDE_TABLE_NAME,
    this.arendeExtraColumnsRegistrator
  );
  private readonly arendeColumnConfigHandlaggare = this.buildMergedColumns(
    this.DOCUMENT_SEARCH_ARENDE_TABLE_NAME,
    this.arendeExtraColumnsHandlaggare
  );
  private readonly arendeColumnConfigDefault = this.buildMergedColumns(
    this.DOCUMENT_SEARCH_ARENDE_TABLE_NAME,
    this.arendeExtraColumnsDefault
  );
  private readonly handlingColumnConfig = this.buildMergedColumns(
    this.DOCUMENT_SEARCH_HANDLING_TABLE_NAME,
    this.handlingExtraColumns
  );
  private readonly utkastColumnConfig = this.buildMergedColumns(
    this.DOCUMENT_SEARCH_UTKAST_TABLE_NAME,
    this.utkastExtraColumns
  );
  private readonly defaultColumnConfig = this.buildColumns(this.DOCUMENT_SEARCH_TABLE_NAME);

  activeTableConfig = computed<TableColumn[]>(() => {
    const docType = this.activeDocTypeTabId() || this.searchService.activeDocType();
    if (docType === 'Handling') return this.handlingColumnConfig;
    if (docType === 'Utkast') return this.utkastColumnConfig;
    if (docType === 'Arende') return this.resolveArendeColumns();
    return this.defaultColumnConfig;
  });

  activeDefaultColumnOptions = computed<TableColOption[]>(() =>
    this.activeTableConfig().map(col => ({
      id: col.key.toString(),
      label: col.label,
      visible: col.visible ?? true,
    }))
  );

  docTypeTabs = computed<Tab[]>(() => {
    const selected = this.searchService.selectedDocTypes() ?? [];
    if (!selected.length) return [];

    const counts = selected.length > 1 ? this.searchService.totalsByType() : this.searchService.docTypeCounts();
    const ordered = this.docTypeOrder.filter(type => selected.includes(type));
    const extras = selected.filter(type => !this.docTypeOrder.includes(type));
    return [...ordered, ...extras].map(type => ({
      id: type,
      title: this.store.getLabelByType(type),
      badgeValue: counts?.[type] && counts[type] > 0 ? counts[type] : undefined,
    }));
  });
  showDocTypeTabs = computed(() => this.searchService.isTabbed());

  constructor() {
    effect(() => {
      if (this.searchService.entries()) {
        const entries = this.searchService.entries();
        this.entries.set(entries);
        this.resultsCount.set(this.searchService.resultsCount());
      }
    });

    effect(() => {
      const tabs = this.docTypeTabs();
      const activeTabId = this.activeDocTypeTabId();
      if (!tabs.length) {
        if (activeTabId) {
          this.activeDocTypeTabId.set('');
          this.selectedFiles.set([]);
        }
        this.searchService.setActiveDocType('');
        return;
      }
      const nextTabId = !activeTabId || !tabs.some(tab => tab.id === activeTabId) ? tabs[0].id : activeTabId;
      if (nextTabId !== activeTabId) {
        this.activeDocTypeTabId.set(nextTabId);
        this.selectedFiles.set([]);
      }
      this.searchService.setActiveDocType(nextTabId);
    });

    effect(() => {
      if (!this.showOrgFilter()) return;
      const parentRef = this.resolveOrgParentRef();
      if (!parentRef) return;
      this.loadOrgOptions('');
    });
  }

  ngOnInit(): void {
    this.getOptionsService.suggestEntries('Arendestatus').subscribe(data => this.arendeStatusOptions.set(data));
    this.getOptionsService
      .directoryEntriesOptions('Handlingstatus')
      .subscribe(data => this.handlingStatusOptions.set(data));
    this.loadOrgOptions('');
  }

  onPageChange(newPage: number) {
    this.searchService.setActivePage(newPage);
  }

  onSortChange(event: { sortBy: string; sortOrder: 'asc' | 'desc' }) {
    this.searchSortService.applyActiveSort(event, { sortBy: '', sortOrder: 'desc' });

    this.searchService.setActivePage(0);
  }

  onStatusFiltersChanged(changedFilter: FilterResult) {
    const docType = this.activeDocType();
    if (docType === 'Arende') {
      this.searchService.quickArendeStatusFilter.set(changedFilter.checked);
    } else if (docType === 'Utkast') {
      this.searchService.quickUtkastStatusFilter.set(changedFilter.checked);
    } else if (docType === 'Handling') {
      this.searchService.quickHandlingStatusFilter.set(changedFilter.checked);
    }
    this.searchService.setActivePage(0);
  }

  onOrgFiltersChanged(changedFilter: FilterResult) {
    const checked = Array.isArray(changedFilter.checked) ? changedFilter.checked : [];
    this.searchService.quickArendeOrgFilter.set(checked);
    this.searchService.setActivePage(0);
  }

  onDateRangeChange(event: { field: string; value: string | string[] }) {
    if (event.field === 'dublincore_created_agg') {
      const docTypeKey = this.activeDocType() || '';
      const next = Array.isArray(event.value) ? event.value : event.value ? [event.value] : [];
      this.searchService.quickCreatedRangeByType.update(current => ({
        ...current,
        [docTypeKey]: next,
      }));
      this.searchService.setActivePage(0);
      return;
    }
    const value = Array.isArray(event.value) ? (event.value[0] ?? '') : event.value;
    const docType = this.activeDocType();
    if (docType === 'Arende') {
      this.searchService.quickArendeDateFilters.update(current =>
        this.updateDateFilterMap(current, { ...event, value })
      );
    } else if (this.isHandlingDocType(docType)) {
      this.searchService.quickHandlingDateFilters.update(current =>
        this.updateDateFilterMap(current, { ...event, value })
      );
    }
    this.searchService.setActivePage(0);
  }

  clearQuickFilters(): void {
    const docType = this.activeDocType();
    if (docType === 'Arende') {
      this.searchService.quickArendeStatusFilter.set([]);
      this.searchService.quickArendeDateFilters.set({});
      this.searchService.quickArendeOrgFilter.set([]);
      this.selectedQuikDates.set([]);
    } else if (docType === 'Utkast') {
      this.searchService.quickUtkastStatusFilter.set([]);
      this.searchService.quickHandlingDateFilters.set({});
    } else if (this.isHandlingDocType(docType)) {
      this.searchService.quickHandlingStatusFilter.set([]);
      this.searchService.quickHandlingDateFilters.set({});
    }

    const docTypeKey = docType || '';
    this.searchService.quickCreatedRangeByType.update(map => ({ ...map, [docTypeKey]: [] }));
    this.searchService.setActivePage(0);
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

  private getQuickCreatedSelection(map: Record<string, string[]>, docTypeKey: string): string[] {
    const key = docTypeKey || '';
    const value = map[key];
    if (Array.isArray(value)) return value;
    const fallback = map[''];
    return Array.isArray(fallback) ? fallback : [];
  }

  private getCreatedAggBuckets(map: Record<string, AggBucket[]>, docTypeKey: string): AggBucket[] {
    const key = docTypeKey || '';
    const value = map[key];
    if (Array.isArray(value)) return value;
    const fallback = map[''];
    return Array.isArray(fallback) ? fallback : [];
  }

  private loadOrgOptions(searchTerm = ''): void {
    const parentRef = this.resolveOrgParentRef();
    if (!parentRef) {
      this.orgOptions.set([]);
      return;
    }
    const loadKey = `${parentRef}::${searchTerm}`;
    if (this.lastOrgLoadKey === loadKey) return;
    this.lastOrgLoadKey = loadKey;

    this.apiService
      .DMSDocumentSuggestion(parentRef, 'Organisationsdel', 'Organisationsdel', searchTerm)
      .pipe(
        map(result => result.entries.map(entry => ({ id: entry.uid, label: entry.title ?? '' }))),
        tap(options => this.orgOptions.set(options)),
        catchError(() => {
          this.orgOptions.set([]);
          return EMPTY;
        })
      )
      .subscribe();
  }

  private resolveOrgParentRef(): string {
    const cached = this.orgParentRef();
    const parentRef = this.getFirstEntryParentRef();
    if (parentRef) {
      if (parentRef !== cached) {
        this.orgParentRef.set(parentRef);
      }
      return parentRef;
    }
    if (cached) return cached;
    this.apiService
      .getPathInfo('/default-domain/Organisation')
      .pipe(
        tap(doc => {
          const next = doc?.uid ? String(doc.uid) : '';
          if (!next) return;
          this.orgParentRef.set(next);
        }),
        catchError(() => EMPTY)
      )
      .subscribe();
    return '';
  }

  private getFirstEntryParentRef(): string {
    const activeEntries = this.searchService.activeEntries();
    const activeParent = this.getParentRefFromEntries(activeEntries);
    if (activeParent) return activeParent;
    const entries = this.searchService.entries();
    return this.getParentRefFromEntries(entries);
  }

  private getParentRefFromEntries(entries: TableItem[] | null): string {
    if (!Array.isArray(entries) || entries.length === 0) return '';
    const value = entries[0]?.['parentRef'];
    return value ? String(value) : '';
  }

  handleSelection(ids: string[]) {
    const relevantIds = this.searchService
      .activeEntries()
      .map(entry => entry['id'])
      .filter((id): id is string => typeof id === 'string');
    this.mergeTableSelection(ids, relevantIds);
  }

  downloadFiles() {
    this.apiService.downloadBulk(this.selectedFiles()).subscribe(blob => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'selection.zip';
      a.click();
    });
  }

  downloadCsv() {
    const selectedIds = this.selectedFiles();
    if (!selectedIds.length) return;

    const nxql = `SELECT * FROM Document WHERE ecm:uuid IN (${selectedIds.map(id => `'${id}'`).join(',')})`;

    const activeDocType = this.activeDocType();
    const extraSchemas =
      activeDocType === 'Arende'
        ? ['arende']
        : activeDocType === 'Handling' || activeDocType === 'Utkast'
          ? ['handling']
          : [];
    const schemas = [...this.csvBaseSchemas, ...extraSchemas];

    const params = {
      action: 'csvExport',
      parameters: JSON.stringify({ schemas }),
      providerName: 'nxql_search',
      currentPageIndex: 0,
      offset: 0,
      pageSize: 20,
      namedParameters: {},
      queryParams: [nxql],
    };

    this.apiService
      .runBulkAction(params)
      .pipe(
        switchMap(asyncId =>
          timer(0, this.csvPollIntervalMs).pipe(
            take(this.csvMaxPollAttempts),
            switchMap(() => this.apiService.getBulkActionStatus(asyncId)),
            first(status => status.value.state === 'COMPLETED' || status.value.error),
            switchMap(status => {
              if (status.value.error || status.value.state !== 'COMPLETED') {
                this.csvExportService.notifyError(CSV_EXPORT_FAILED_MESSAGE);
                return EMPTY;
              }
              return this.apiService.downloadBulkActionResult(asyncId);
            }),
            tap(result => {
              if (result?.url) {
                this.openCsvUrl(result.url);
              } else {
                this.csvExportService.notifyError(DOCUMENT_SEARCH_CSV_EXPORT_COMPLETED_NO_LINK_MESSAGE);
              }
            })
          )
        ),
        catchError(() => {
          this.csvExportService.notifyError(DOCUMENT_SEARCH_CSV_EXPORT_ERROR_MESSAGE);
          return EMPTY;
        })
      )
      .subscribe();
  }

  private openCsvUrl(url: string) {
    const link = document.createElement('a');
    link.href = url;
    link.target = '_blank';
    link.rel = 'noopener';
    link.click();
  }

  exportToCSV(tableColumns: TableColumn[]): void {
    const exportColumns = this.csvExportService
      .getExportColumns(tableColumns, CSV_EXPORT_EXCLUDED_FIELDS)
      .filter(col => col.field !== 'checkboxes');

    if (!exportColumns.length) {
      this.csvExportService.notifyNoExportableColumns();
      return;
    }

    const headers = exportColumns.map(col => col.header);
    const fields = exportColumns.map(col => col.field);

    const activeDocType = this.activeDocType();
    const exportQueryParams = this.getCsvExportSearchParams(activeDocType);
    const providerName =
      activeDocType === 'Arende'
        ? 'arende_search'
        : activeDocType === 'Handling' || activeDocType === 'Utkast'
          ? 'handling_search'
          : 'dms_search';

    this.csvExportService.exportToCSV({
      headers,
      fields,
      providerName,
      currentPageIndex: this.searchService.activePage(),
      offset: this.searchService.activePage() * 25,
      pageSize: 25,
      namedParameters: exportQueryParams.namedParameters,
      queryParams: exportQueryParams.queryParams,
    });
  }

  private getCsvExportSearchParams(activeDocType: string): {
    namedParameters: Record<string, unknown>;
    queryParams: unknown[];
  } {
    const source = activeDocType
      ? (this.searchService.advancedSearchQueryParamsByType()[activeDocType] ??
        this.searchService.activeAdvancedSearchQueryParams())
      : this.searchService.activeAdvancedSearchQueryParams();

    const paginationKeys = new Set(['currentPageIndex', 'pageSize', 'offset', 'sortBy', 'sortOrder']);
    const namedParameters: Record<string, unknown> = {};
    const queryParams: unknown[] = [];

    Object.entries(source).forEach(([key, value]) => {
      if (paginationKeys.has(key)) return;
      if (key === 'queryParams') {
        queryParams.push(value);
        return;
      }
      namedParameters[key] = value;
    });

    return { namedParameters, queryParams };
  }

  private resolveArendeColumns(): TableColumn[] {
    const activeRole = this.authService.activeRole();
    if (this.authService.isAdmin() || activeRole === 'REGISTRATOR') {
      return this.arendeColumnConfigRegistrator;
    }
    if (activeRole === 'HANDLAGGARE') {
      return this.arendeColumnConfigHandlaggare;
    }
    return this.arendeColumnConfigDefault;
  }

  private isHandlingDocType(docType: string): boolean {
    return docType === 'Handling' || docType === 'Utkast';
  }

  private buildColumns(tableName: string): TableColumn[] {
    return this.baseColumnConfig.map(col => ({ ...col, tableName }));
  }

  private stripTableName(columns: TableColumn[]): Omit<TableColumn, 'tableName'>[] {
    return columns.map(({ tableName, ...rest }) => rest);
  }

  private buildMergedColumns(tableName: string, extraColumns: Omit<TableColumn, 'tableName'>[]): TableColumn[] {
    return this.mergeColumns(tableName, this.baseColumnConfig, extraColumns);
  }

  private mergeColumns(
    tableName: string,
    baseColumns: Omit<TableColumn, 'tableName'>[],
    extraColumns: Omit<TableColumn, 'tableName'>[]
  ): TableColumn[] {
    const merged: Omit<TableColumn, 'tableName'>[] = [];
    const seenKeys = new Set<string>();

    const addColumn = (col: Omit<TableColumn, 'tableName'>) => {
      const key = col.key?.toString?.() ?? '';
      if (!key || seenKeys.has(key)) return;
      seenKeys.add(key);
      merged.push(col);
    };

    baseColumns.forEach(addColumn);
    extraColumns.forEach(addColumn);

    return merged.map(col => ({ ...col, tableName }));
  }

  onSelectAll(checked: boolean) {
    this.fetchAllSearchIds()
      .pipe(tap(ids => this.mergeTableSelection(checked ? ids : [], ids)))
      .subscribe();
  }

  private fetchAllSearchIds() {
    const params = {
      ...this.getActiveSearchParams(),
      currentPageIndex: 0,
      offset: 0,
      pageSize: Math.max(this.searchService.activeTotal(), 25, 1),
    };

    return this.apiService.getAdvancedSearchResults(params).pipe(
      map(data => data.entries.map(doc => doc.uid).filter((uid): uid is string => typeof uid === 'string')),
      catchError(() => {
        this.store.notification.set({
          show: true,
          variation: 'danger',
          text: DOCUMENT_SEARCH_SELECT_ALL_RESULTS_ERROR_MESSAGE,
        });
        return EMPTY;
      })
    );
  }

  private getActiveSearchParams() {
    const activeDocType = this.activeDocType();
    if (this.searchService.isTabbed() && activeDocType) {
      return (
        this.searchService.advancedSearchQueryParamsByType()[activeDocType] ??
        this.searchService.activeAdvancedSearchQueryParams()
      );
    }
    return this.searchService.activeAdvancedSearchQueryParams();
  }

  private mergeTableSelection(newIds: string[], tableDocIds: string[]): void {
    this.selectedFiles.set(this.mergeSelection(this.selectedFiles(), newIds, tableDocIds));
  }

  private mergeSelection(currentIds: string[], newIds: string[], tableDocIds: string[]): string[] {
    const tableSet = new Set(tableDocIds);
    const preserved = currentIds.filter(id => !tableSet.has(id));
    const combined = [...preserved];
    for (const id of newIds) {
      if (!combined.includes(id)) combined.push(id);
    }
    return combined;
  }

  addToFavorites() {
    from(this.selectedFiles())
      .pipe(
        mergeMap(file => this.favoritesService.toggleFavorites(file, false)),
        toArray(),
        tap(() => {
          this.store.notification.set({
            show: true,
            variation: 'success',
            text: FAVORITE_ADDED_MESSAGE,
          });
        }),
        catchError(() => {
          this.store.notification.set({
            show: true,
            variation: 'danger',
            text: FAVORITE_UPDATE_ERROR_MESSAGE,
          });
          return EMPTY;
        })
      )
      .subscribe();
  }

  onDocTypeTabChanged(tabId: string) {
    if (this.activeDocTypeTabId() === tabId) return;
    this.activeDocTypeTabId.set(tabId);
    this.searchService.setActiveDocType(tabId);
    this.selectedFiles.set([]);
    this.selectedQuikDates.set([]);
    this.clearQuickFilters();
  }
}
