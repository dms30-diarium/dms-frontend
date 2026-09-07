import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  AfterViewInit,
  input,
  output,
  TemplateRef,
  inject,
  signal,
  effect,
  computed,
  OnChanges,
  ViewChild,
  ViewChildren,
  HostListener,
  OnDestroy,
  QueryList,
} from '@angular/core';
import { TableItem } from '@models/case-table';
import { RouterModule } from '@angular/router';
import { AppRole } from '@app/shared/models/roles';
import { CommonModule } from '@angular/common';
import { DigiArbetsformedlingenAngularModule, DigiBadgeStatus } from '@designsystem-se/af-angular';
import { CasesService } from '@app/core/services/cases.service';
import { Option } from '@app/shared/commonTypes';
import {
  buildOptionIndex,
  hasSelectedFlag,
  isOptionLike,
  resolveOptionFromInput,
} from '@app/shared/utils/option-utils';
import { TableColOption, TableColOptionsComponent } from '../table-col-options/table-col-options.component';
import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { MatFormFieldModule } from '@angular/material/form-field';
import { AuthService } from '@app/core/services/auth.service';
import { DocumentValueService } from '@app/core/services/document-value-service.service';
import { SearchService } from '@app/core/services/search.service';
import { NuxeoApiService } from '@app/shared/api/nuxeo-api.service';
import { CASE_STATES } from '@app/shared/constants/case-states';
import { FormControl, FormRecord, ReactiveFormsModule } from '@angular/forms';
import { EMPTY, Observable, Subscription, catchError, map, tap } from 'rxjs';
import { MatSelectChange, MatSelectModule } from '@angular/material/select';
import { DigiNavigationPaginationCustomEvent } from '@designsystem-se/af';
import { SearchResult } from '@app/shared/api/nuxeo-api.types';
import { CSVExportService } from '@app/shared/services/csv-export.service';
import { SvgIconComponent } from '../svg-icon/svg-icon.component';
import { NUXEO_SCHEMA_FIELDS } from '@app/shared/constants/nuxeo-schema-fields';

type SortOrder = 'asc' | 'desc';
type ColumnSearchControlValue = string | Option[];

export interface TableColumn extends TableColOption {
  tableName: string;
  key: keyof TableItem | string;
  sortField?: string;
  searchField?: string;
  searchInputType?: 'search' | 'date' | 'select';
  searchOptions?: Option[];
  description?: string;
  asLink?: boolean;
  class?: string;
  formatter?: (value: unknown, item: TableItem) => string;
  inputConfig?: {
    type:
      | 'input'
      | 'number'
      | 'dropdown'
      | 'multiselect'
      | 'checkbox'
      | 'datepicker'
      | 'textWithIcon'
      | ((row: TableItem) => 'input' | 'number' | 'dropdown' | 'multiselect' | 'checkbox' | 'datepicker');
    options?: Option[];
  };
}

@Component({
  selector: 'nuxeo-case-list-table',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterModule,
    CommonModule,
    DigiArbetsformedlingenAngularModule,
    DigiBadgeStatus,
    TableColOptionsComponent,
    DragDropModule,
    MatFormFieldModule,
    MatSelectModule,
    ReactiveFormsModule,
    SvgIconComponent,
  ],
  templateUrl: './case-list-table.component.html',
  styleUrls: ['./case-list-table.component.scss'],
})
export class CaseListTableComponent implements OnChanges, AfterViewInit, OnDestroy {
  @ViewChild('scrollTop') scrollTop!: ElementRef<HTMLDivElement>;
  @ViewChild('scrollMain') scrollMain!: ElementRef<HTMLDivElement>;
  @ViewChild('scrollTopContent') scrollTopContent!: ElementRef<HTMLDivElement>;
  @ViewChild('content') content!: ElementRef<HTMLDivElement>;
  @ViewChildren('columnFilter', { read: ElementRef })
  private columnFilterRefs!: QueryList<ElementRef<HTMLElement>>;

  readonly behorighetsStepOrder = [1, 2, 3, 4, 5];
  private readonly caseProgressStates = CASE_STATES;
  tableItems = input<TableItem[]>([]);
  showFalseTopScroll = input<boolean>(false);
  loading = input<boolean>(false);
  shouldShowResults = input<boolean>(true);
  total = input<number>(0);
  page = input<number>(0);
  pageSize = input<number>(25);
  restoreCheckboxSelection = input<boolean>(false);
  selectedItemIds = input<string[] | null>(null);
  shouldHavePaddingRight = input<boolean>(false);

  tableConfig = input<TableColumn[]>([]);
  checkboxes = input<boolean>(false);
  headerHeight = input<string>('h-[58px]');

  sortBy = input<string>(NUXEO_SCHEMA_FIELDS.dc.created);
  sortOrder = input<SortOrder>('desc');
  readonly role = input<AppRole>('REGISTRATOR');
  actionsHeader = input<string | null>(null);
  actionsTemplate = input<TemplateRef<{ $implicit: TableItem }> | null>(null);

  rowClickEnabled = input<boolean>(true);

  isSettingsEnabled = input<boolean>(true);
  showCsvExport = input<boolean>(false);
  localCsvExportEnabled = input<boolean>(false);
  localCsvExportFileName = input<string>('table-export');
  columnSearchEnabled = input<boolean>(false);
  columnSearchDebounceMs = input<number>(300);
  columnSearchContext = input<{ parentRef?: string } | null>(null);
  externalColumnFilters = input<Record<string, string | string[]>>({});
  pageSizeOptions = input<number[] | null>(null);
  shouldShowPageSizeOption = input<boolean>(false);
  highlightSecretStamps = input<boolean>(true);

  @ViewChild('pagination') private paginationRef?: ElementRef<HTMLDigiNavigationPaginationElement>;

  pageChange = output<number>();
  pageSizeChange = output<number>();
  sortChange = output<{ sortBy: string; sortOrder: SortOrder }>();
  columnSearchChange = output<{ field: string; value: string | string[]; column: TableColumn }>();
  rowSelected = output<string>();
  updatedTableItems = output<TableItem[]>();
  toggleCheckboxes = output<string[]>();
  toggleAllCheckboxes = output<boolean>();
  columnOptionsUpdated = output<TableColumn[]>();
  pageSizeSelect = output<string>();
  csvExportClick = output<TableColumn[]>();

  private casesService = inject(CasesService);
  private authService = inject(AuthService);
  private documentValueService = inject(DocumentValueService);
  private searchService = inject(SearchService);
  private nuxeoApi = inject(NuxeoApiService);
  private csvExportService = inject(CSVExportService);

  allColumns = signal<TableColumn[]>([]);
  internalTableConfig = signal<TableColumn[]>([]);
  isTableOptionsOpen = signal(false);
  columnOptions = signal<TableColOption[]>([]);
  selectedIds = new Set<string>();
  tableName = signal<string>('');

  originalTableData = signal<{ columns: TableColumn[]; rows: TableItem[] }>({
    columns: [],
    rows: [],
  });

  defaultColumnOptions = input.required<TableColOption[]>();
  newDefaultColumnOptions = signal<TableColOption[]>([]);
  columnSearchValues = signal<Record<string, string>>({});
  columnSearchForm = new FormRecord<FormControl<ColumnSearchControlValue>>({});
  private columnSearchControlSubscriptions = new Map<string, Subscription>();
  private columnSearchTimers = new Map<string, ReturnType<typeof setTimeout>>();
  dropdownOptions = signal<Record<string, Option[]>>({});
  dropdownSelections = signal<Record<string, Option[]>>({});
  localColumnFilters = signal<Record<string, string | string[]>>({});
  private dropdownQueryTimers = new Map<string, ReturnType<typeof setTimeout>>();
  private dropdownResetIntents = new Set<string>();
  private dropdownCloseFlags = new Set<string>();
  private dropdownSubmitTimers = new Map<string, ReturnType<typeof setTimeout>>();
  private dropdownSubmittedValues = new Map<string, string | string[]>();
  private dropdownValueSyncKeys = new Set<string>();
  private preloadedDropdownKeys = new Set<string>();
  private lastTableName = '';
  private lastParentRef = '';
  private lastExternalStatusKey = '';
  private activeDropdownKey: string | null = null;
  private suppressDropdownEvents = new Set<string>();
  isDropdownOpen = signal(false);
  private dropdownCloseTimer?: ReturnType<typeof setTimeout>;

  hasActionsColumn = computed(() => this.internalTableConfig().some(col => col.key === 'actions'));
  hasDropdownFilters = computed(() => {
    if (!this.columnSearchEnabled()) return false;
    return this.internalTableConfig().some(col => this.getSearchInputType(col) === 'select');
  });

  displayItems = computed(() => {
    const filters = this.localColumnFilters();
    const entries = Object.entries(filters).filter(([, value]) => (Array.isArray(value) ? value.length > 0 : !!value));
    if (!entries.length) return this.tableItems();

    return this.tableItems().filter(item =>
      entries.every(([key, value]) => {
        const raw = key === 'behorighetsstatus' ? this.getBehorighetsStateValue(item) : item[key];
        const normalized = this.extractOptionValue(raw);
        if (Array.isArray(value)) {
          return value.includes(normalized);
        }
        return normalized === value;
      })
    );
  });

  constructor() {
    effect(() => {
      if (this.restoreCheckboxSelection()) {
        this.selectedIds.clear();
      }
    });
    effect(() => {
      const selectedItemIds = this.selectedItemIds();
      if (!selectedItemIds) return;

      this.selectedIds = new Set(selectedItemIds);
    });
    effect(() => {
      const config = this.tableConfig();
      if (!config?.length) return;

      if (this.columnOptions().length) {
        this.updateInternalTableConfig(this.columnOptions());
        return;
      }

      const baseCols: TableColOption[] = config.map(col => ({
        id: col.key.toString(),
        label: col.label,
        visible: col.visible ?? true,
      }));

      if (this.actionsTemplate()) {
        baseCols.push({
          id: 'actions',
          label: this.actionsHeader() ?? 'Åtgärder',
          visible: true,
        });
      }

      this.columnOptions.set(baseCols);
      this.updateInternalTableConfig(baseCols);
    });
    effect(() => {
      this.page();
      this.total();
      this.pageSize();
      this.syncPagination();
    });
    effect(() => {
      const parentRef = this.columnSearchContext()?.parentRef ?? '';
      if (parentRef === this.lastParentRef) return;
      this.lastParentRef = parentRef;
      if (!parentRef) return;
      this.dropdownOptions.set({});
      this.preloadedDropdownKeys.clear();
      this.preloadDropdownOptions();
    });
    effect(() => {
      this.internalTableConfig();
      this.dropdownOptions();
      this.syncExternalStatusFilter(this.externalColumnFilters());
    });
    effect(() => {
      this.configureColumnSearchForm(this.internalTableConfig());
    });
  }

  ngOnChanges(): void {
    const config = this.tableConfig();
    const items = this.tableItems();
    if (!config?.length) return;

    const tableName = config[0]?.tableName ?? 'default';
    if (this.lastTableName && this.lastTableName !== tableName) {
      this.resetColumnSearchState();
    }
    this.lastTableName = tableName;
    this.tableName.set(tableName);

    const defaultCols: TableColOption[] =
      this.defaultColumnOptions && this.defaultColumnOptions()?.length
        ? this.defaultColumnOptions()!.map(col => ({ ...col }))
        : config.map(col => ({
            id: col.key.toString(),
            label: col.label,
            visible: col.visible ?? true,
          }));

    if (this.actionsTemplate() && !defaultCols.some(c => c.id === 'actions')) {
      defaultCols.push({
        id: 'actions',
        label: this.actionsHeader() ?? 'Åtgärder',
        visible: true,
      });
    }

    const username = this.authService.username();
    const accountSuffix = username ? `_${username}` : '';

    const storageKeyCurrent = `table_columns_current_${tableName}${accountSuffix}`;
    const storageKeyDefault = `table_columns_default_${tableName}`;

    const savedDefaultRaw = localStorage.getItem(storageKeyDefault);
    if (!savedDefaultRaw) {
      localStorage.setItem(storageKeyDefault, JSON.stringify(defaultCols));
    } else {
      const savedDefault = this.safeParseOptions(savedDefaultRaw);
      if (!this.defaultsMatch(savedDefault, defaultCols)) {
        localStorage.removeItem(storageKeyCurrent);
        localStorage.setItem(storageKeyDefault, JSON.stringify(defaultCols));
      }
    }

    const savedCurrent = localStorage.getItem(storageKeyCurrent);
    const savedOptions = savedCurrent ? this.safeParseOptions(savedCurrent) : [];

    const initialCols: TableColOption[] = savedOptions.length
      ? this.mergeSavedOptions(defaultCols, savedOptions)
      : defaultCols;

    this.columnOptions.set(initialCols);
    this.newDefaultColumnOptions.set(defaultCols);
    this.updateInternalTableConfig(initialCols);

    this.originalTableData.set({ columns: [...config], rows: [...items] });
    this.preloadDropdownOptions();
    this.updateWidth();
  }

  private syncing = false;

  @HostListener('window:resize')
  onResize() {
    if (this.showFalseTopScroll()) {
      this.updateWidth();
    }
  }

  private updateWidth() {
    if (!this.content || !this.scrollTopContent || !this.scrollTop) return;
    const width = this.content.nativeElement.scrollWidth;

    this.scrollTopContent.nativeElement.style.width = width + 'px';
  }

  onTopScroll() {
    if (this.syncing || !this.scrollMain) return;
    this.syncing = true;
    this.scrollMain.nativeElement.scrollLeft = this.scrollTop.nativeElement.scrollLeft;
    this.syncing = false;
  }

  onMainScroll() {
    if (this.syncing || !this.showFalseTopScroll() || !this.scrollTop) return;
    this.syncing = true;
    this.scrollTop.nativeElement.scrollLeft = this.scrollMain.nativeElement.scrollLeft;
    this.syncing = false;
  }

  resetColumnSearchState(): void {
    this.columnSearchValues.set({});
    this.resetColumnSearchFormControls(false);
    this.dropdownSelections.set({});
    this.localColumnFilters.set({});
    this.dropdownOptions.set({});
    this.preloadedDropdownKeys.clear();
    this.dropdownValueSyncKeys.clear();
    this.isDropdownOpen.set(false);
    this.activeDropdownKey = null;

    this.columnSearchTimers.forEach(timer => clearTimeout(timer));
    this.columnSearchTimers.clear();
    this.dropdownQueryTimers.forEach(timer => clearTimeout(timer));
    this.dropdownQueryTimers.clear();
    this.dropdownResetIntents.clear();
    this.dropdownCloseFlags.clear();
    this.dropdownSubmitTimers.forEach(timer => clearTimeout(timer));
    this.dropdownSubmitTimers.clear();
    this.dropdownSubmittedValues.clear();
    if (this.dropdownCloseTimer) {
      clearTimeout(this.dropdownCloseTimer);
      this.dropdownCloseTimer = undefined;
    }

    this.syncPagination();
  }

  hasActiveColumnSearchState(): boolean {
    return (
      this.hasRecordValues(this.columnSearchValues()) ||
      this.hasRecordValues(this.localColumnFilters()) ||
      this.hasRecordValues(this.dropdownSelections())
    );
  }

  private hasRecordValues(record: Record<string, unknown>): boolean {
    return Object.values(record).some(value =>
      Array.isArray(value) ? value.length > 0 : value != null && value !== ''
    );
  }

  ngOnDestroy(): void {
    this.columnSearchControlSubscriptions.forEach(subscription => subscription.unsubscribe());
    this.columnSearchControlSubscriptions.clear();
  }

  private configureColumnSearchForm(columns: TableColumn[]): void {
    const activeKeys = new Set<string>();

    columns.forEach(col => {
      if (!this.isSearchableColumn(col)) return;

      const key = col.key.toString();
      activeKeys.add(key);

      const control = this.ensureColumnSearchControl(key);

      if (this.columnSearchControlSubscriptions.has(key)) return;

      const subscription = control.valueChanges.subscribe(value => {
        const searchInputType = this.getSearchInputType(col);
        if (searchInputType === 'select' && this.isFilterableDropdownColumn(col)) return;
        if (searchInputType === 'date') return;

        const normalized = this.normalizeColumnSearchControlValue(value);
        this.updateColumnSearchValue(key, normalized);
        this.columnSearchChange.emit({
          field: this.getSearchField(col),
          value: normalized,
          column: col,
        });
      });
      this.columnSearchControlSubscriptions.set(key, subscription);
    });

    Array.from(this.columnSearchControlSubscriptions.keys()).forEach(key => {
      if (activeKeys.has(key)) return;
      this.columnSearchControlSubscriptions.get(key)?.unsubscribe();
      this.columnSearchControlSubscriptions.delete(key);
      this.columnSearchForm.removeControl(key);
    });
  }

  private isSearchableColumn(col: TableColumn): boolean {
    return this.columnSearchEnabled() && !!(col.searchField || col.sortField);
  }

  private ensureColumnSearchControl(key: string): FormControl<ColumnSearchControlValue> {
    let control = this.columnSearchForm.controls[key];
    if (!control) {
      control = new FormControl<ColumnSearchControlValue>('', { nonNullable: true });
      this.columnSearchForm.addControl(key, control);
    }
    return control;
  }

  private resetColumnSearchFormControls(emitEvent: boolean): void {
    this.internalTableConfig().forEach(col => {
      const key = col.key.toString();
      const value = this.getSearchInputType(col) === 'select' && this.isFilterableDropdownColumn(col) ? [] : '';
      this.columnSearchForm.controls[key]?.setValue(value, { emitEvent });
    });
  }

  private setColumnSearchControlValue(col: TableColumn, value: ColumnSearchControlValue, emitEvent = false): void {
    this.ensureColumnSearchControl(col.key.toString()).setValue(value, { emitEvent });
  }

  private normalizeColumnSearchControlValue(value: ColumnSearchControlValue): string {
    return Array.isArray(value) ? (this.normalizeDropdownValues(value)[0] ?? '') : String(value ?? '');
  }

  private updateColumnSearchValue(key: string, value: string): void {
    this.columnSearchValues.update(current => {
      const next = { ...current };
      if (value) next[key] = value;
      else delete next[key];
      return next;
    });
  }

  ngAfterViewInit(): void {
    this.syncPagination();
    this.updateWidth();
  }

  private syncPagination(): void {
    const pagination = this.paginationRef?.nativeElement;
    if (!pagination) return;
    if (this.totalPages() <= 1) return;
    const nextPage = Math.max(1, this.page() + 1);
    if (typeof pagination.afMSetCurrentPage === 'function') {
      pagination.afMSetCurrentPage(nextPage);
    }
  }

  private safeParseOptions(raw: string): TableColOption[] {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  private defaultsMatch(saved: TableColOption[], incoming: TableColOption[]): boolean {
    if (saved.length !== incoming.length) return false;
    return saved.every((entry, idx) => {
      const next = incoming[idx];
      return entry.id === next.id && entry.label === next.label && entry.visible === next.visible;
    });
  }

  private rebuildInternalTableConfig() {
    const options = this.columnOptions();

    const config = this.tableConfig();

    const orderedCols: TableColumn[] = [];

    options.forEach(colOption => {
      if (colOption.id === 'actions') return;

      const col = config.find(c => c.key.toString() === colOption.id);
      if (!col) return;

      if (colOption.visible) {
        orderedCols.push(col);
      }
    });

    const actionsColOption = options.find(c => c.id === 'actions' && c.visible);
    if (actionsColOption) {
      orderedCols.push({
        key: 'actions',
        label: this.actionsHeader() ?? 'Åtgärder',
      } as TableColumn);
    }

    this.internalTableConfig.set([...orderedCols]);
  }

  private updateInternalTableConfig(options: TableColOption[]) {
    const config = this.tableConfig();

    const visibleCols: TableColumn[] = options
      .filter(c => c.visible && c.id !== 'actions')
      .map(c => config.find(col => col.key.toString() === c.id)!)
      .filter(Boolean);

    const actionsCol = options.find(c => c.id === 'actions' && c.visible);
    if (this.shouldHavePaddingRight()) {
      visibleCols.push({
        key: 'padding',
        class: 'w-[120px] min-w-[120px]',
      } as TableColumn);
    }
    if (actionsCol) {
      visibleCols.push({
        key: 'actions',
        label: this.actionsHeader() ?? 'Åtgärder',
      } as TableColumn);
    }
    this.internalTableConfig.set(visibleCols);
  }

  private mergeSavedOptions(defaults: TableColOption[], saved: TableColOption[]): TableColOption[] {
    const defaultsById = new Map<string, TableColOption>();
    defaults.forEach(option => {
      if (!option.id) return;
      defaultsById.set(option.id, option);
    });

    const ordered: TableColOption[] = [];
    const seen = new Set<string>();

    saved.forEach(option => {
      if (!option?.id) return;
      const base = defaultsById.get(option.id);
      if (!base) return;
      ordered.push({ ...base, visible: option.visible });
      seen.add(option.id);
    });

    defaults.forEach(option => {
      if (!option.id) return;
      if (seen.has(option.id)) return;
      ordered.push(option);
    });

    return ordered;
  }

  onColumnOptionsUpdated(updated: TableColOption[]) {
    this.columnOptions.set([...updated]);
    this.newDefaultColumnOptions.set(updated);
    this.rebuildInternalTableConfig();
  }

  onColumnDropped(event: CdkDragDrop<TableColumn[]>) {
    if (!event.isPointerOverContainer) return;
    if (event.previousIndex === event.currentIndex) return;

    const options = this.reorderVisibleOptions(this.columnOptions(), event.previousIndex, event.currentIndex);

    this.columnOptions.set([...options]);

    const username = this.authService.username();
    const accountSuffix = username ? `_${username}` : '';
    const storageKeyCurrent = `table_columns_current_${this.tableName()}${accountSuffix}`;
    localStorage.setItem(storageKeyCurrent, JSON.stringify(options));

    this.rebuildInternalTableConfig();
    this.columnOptionsUpdated.emit(this.internalTableConfig());
  }

  private reorderVisibleOptions(
    options: TableColOption[],
    previousIndex: number,
    currentIndex: number
  ): TableColOption[] {
    const visibleOptions = options.filter(option => option.visible && option.id !== 'actions');
    if (visibleOptions.length < 2) return options;

    const clampedPrevious = this.clampIndex(previousIndex, visibleOptions.length);
    const clampedCurrent = this.clampIndex(currentIndex, visibleOptions.length);
    if (clampedPrevious === clampedCurrent) return options;

    moveItemInArray(visibleOptions, clampedPrevious, clampedCurrent);

    let visibleIndex = 0;
    return options.map(option => {
      if (!option.visible || option.id === 'actions') return option;
      const next = visibleOptions[visibleIndex++];
      return next ?? option;
    });
  }

  private clampIndex(index: number, length: number): number {
    if (!Number.isFinite(index)) return 0;
    if (index < 0) return 0;
    if (index >= length) return length - 1;
    return index;
  }

  onHeaderClick(col: TableColumn) {
    if (!col.sortField) return;
    const next = this.sortBy() === col.sortField ? (this.sortOrder() === 'asc' ? 'desc' : 'asc') : 'asc';
    this.sortChange.emit({ sortBy: col.sortField, sortOrder: next });
  }

  onHeaderSort(col: TableColumn, event: Event) {
    event.stopPropagation();
    this.onHeaderClick(col);
  }

  getSearchInputType(col: TableColumn): 'search' | 'date' | 'select' {
    if (col.searchInputType) return col.searchInputType;

    const key = col.key?.toString?.().toLowerCase?.() ?? '';
    if (this.isSelectColumn(key)) return 'select';

    const label = col.label?.toString?.().toLowerCase?.() ?? '';
    const sortField = col.sortField?.toLowerCase?.() ?? '';

    if (
      /datum|date/.test(label) ||
      /datum|date/.test(key) ||
      /datum|date/.test(sortField) ||
      sortField.includes('created') ||
      sortField.includes('modified') ||
      key.includes('created') ||
      key.includes('modified') ||
      key.includes('inkommet') ||
      label.includes('inkommet') ||
      key.includes('received')
    ) {
      return 'date';
    }

    return 'search';
  }

  getSearchLabelId(col: TableColumn): string {
    const key = col.key?.toString?.() ?? 'column';
    const sanitized = key.replace(/[^a-z0-9_-]+/gi, '-').replace(/^-+|-+$/g, '');
    return `table-search-label-${sanitized || 'column'}`;
  }

  private isSelectColumn(key: string): boolean {
    return [
      'arendetyp',
      'status',
      'arendestatus',
      'handlaggningsstatus',
      'behorighetsstatus',
      'riktning',
      'sekretess',
      'handlingsekretess',
      'sakerhetsskyddsklassificering',
      'handlingsakerhetsskyddsklassificering',
      'ansvarigenhet',
      'ansvarigchef',
      'handlaggare',
      'ansvarighandlaggare',
      'beslutsfattare',
      'medhandlaggare',
      'granskare',
      'lastcontributor',
    ].includes(key);
  }

  private ensureSelectFilterValues(options: Option[]): Option[] {
    if (!options?.length) return [];

    const needsValue = options.some(option => !option.value);
    if (!needsValue) return options;

    options.forEach(option => {
      if (!option.value) {
        option.value = option.id;
      }
    });
    return options;
  }

  private getBaseDropdownOptions(col: TableColumn): Option[] {
    const options = col.searchOptions?.length
      ? col.searchOptions
      : this.isStaticDropdownColumn(col)
        ? this.getStaticDropdownOptions(col)
        : (this.dropdownOptions()[col.key.toString()] ?? []);

    return this.ensureSelectFilterValues(options);
  }

  getDropdownOptions(col: TableColumn): Option[] {
    return this.getBaseDropdownOptions(col);
  }

  getDropdownValue(col: TableColumn): Option[] {
    const key = col.key.toString();
    const selected = this.dropdownSelections()[key] ?? [];
    if (!selected.length) return [];

    const options = this.getBaseDropdownOptions(col);
    const optionIndex = buildOptionIndex(options);
    const resolved = selected
      .map(option => resolveOptionFromInput(option, optionIndex) ?? resolveOptionFromInput(option.id, optionIndex))
      .filter((option): option is Option => !!option);

    return this.ensureSelectFilterValues(resolved);
  }

  shouldBindDropdownValue(col: TableColumn): boolean {
    if (!this.isMultiSelectDropdownColumn(col)) return true;
    if (!this.dropdownValueSyncKeys.has(col.key.toString())) return false;
    const key = col.key.toString();
    const selected = this.dropdownSelections()[key] ?? [];
    if (!selected.length) return true;
    return this.getDropdownValue(col).length === selected.length;
  }

  private getStaticDropdownOptions(col: TableColumn): Option[] {
    const key = col.key?.toString?.().toLowerCase?.() ?? '';
    if (key === 'behorighetsstatus') {
      return this.caseProgressStates;
    }
    return this.buildOptionsFromItems(col);
  }

  private updateLocalColumnFilter(key: string, value: string | string[]): void {
    this.localColumnFilters.update(current => {
      const next = { ...current };
      const hasValue = Array.isArray(value) ? value.length > 0 : !!value;
      if (hasValue) next[key] = value;
      else delete next[key];
      return next;
    });
  }

  private getBehorighetsStateValue(item: TableItem): string {
    const candidate = item?.['caseState'] ?? item?.['state'] ?? item?.['workflowState'] ?? '';
    return String(candidate ?? '');
  }

  private syncExternalStatusFilter(filters: Record<string, string | string[]>): void {
    if (!this.columnSearchEnabled()) return;
    const config = this.internalTableConfig();
    if (!config?.length) return;

    const statusCols = config.filter(col => this.getSearchField(col) === 'arende_arendestatus');
    if (!statusCols.length) return;
    if (
      this.isDropdownOpen() &&
      this.activeDropdownKey &&
      statusCols.some(col => col.key.toString() === this.activeDropdownKey)
    ) {
      return;
    }

    const raw = filters?.['arende_arendestatus'];
    const values = Array.isArray(raw) ? raw : raw ? [raw] : [];
    const keySignature = JSON.stringify(values);

    if (!values.length) {
      if (this.lastExternalStatusKey === keySignature) {
        return;
      }
      statusCols.forEach(col => {
        if (!this.isFilterableDropdownColumn(col)) return;
        const key = col.key.toString();
        this.suppressDropdownEventsFor(key);
        this.resetSelectFilter(key);
        this.setColumnSearchControlValue(col, []);
        if ((this.dropdownSelections()[key] ?? []).length) {
          this.dropdownSelections.update(currentSelections => ({
            ...currentSelections,
            [key]: [],
          }));
        }
        this.dropdownSubmittedValues.set(key, []);
      });
      this.lastExternalStatusKey = keySignature;
      return;
    }

    const allInSync = statusCols.every(col => {
      const key = col.key.toString();
      const current = this.dropdownSelections()[key] ?? [];
      if (!current.length && !values.length) return true;
      if (current.length !== values.length) return false;
      const currentValues = this.normalizeDropdownValues(current);
      if (currentValues.length !== values.length) return false;
      const currentSet = new Set(currentValues);
      return values.every(value => currentSet.has(value));
    });

    if (allInSync) {
      this.lastExternalStatusKey = keySignature;
      return;
    }

    let deferred = false;

    statusCols.forEach(col => {
      if (!this.isFilterableDropdownColumn(col)) return;
      const key = col.key.toString();
      const options = this.getBaseDropdownOptions(col);
      if (!options.length) {
        deferred = true;
        return;
      }

      const optionIndex = buildOptionIndex(options);
      const nextSelected = values
        .map(value => resolveOptionFromInput(value, optionIndex))
        .filter((option): option is Option => !!option && options.includes(option));

      if (nextSelected.length !== values.length) {
        deferred = true;
        return;
      }

      const current = this.dropdownSelections()[key] ?? [];
      const same =
        current.length === nextSelected.length &&
        current.every(
          (option, idx) => option.id === nextSelected[idx]?.id && option.label === nextSelected[idx]?.label
        );

      if (!same) {
        this.suppressDropdownEventsFor(key);
        this.resetSelectFilter(key);
        this.dropdownSelections.update(currentSelections => ({
          ...currentSelections,
          [key]: this.ensureSelectFilterValues(nextSelected),
        }));
        this.setColumnSearchControlValue(col, this.ensureSelectFilterValues(nextSelected));
        this.dropdownSubmittedValues.set(key, values);
        if (this.isMultiSelectDropdownColumn(col)) {
          this.dropdownValueSyncKeys.add(key);
          setTimeout(() => this.dropdownValueSyncKeys.delete(key), 0);
        }
      }
    });

    if (!deferred) {
      this.lastExternalStatusKey = keySignature;
    }
  }

  private suppressDropdownEventsFor(key: string): void {
    this.suppressDropdownEvents.add(key);
    setTimeout(() => this.suppressDropdownEvents.delete(key), 0);
  }

  private resetSelectFilter(key: string): void {
    const element = this.getSelectFilterElement(key);
    if (!element) return;
    const resetFn = (element as { afMReset?: () => Promise<void> }).afMReset;
    if (typeof resetFn !== 'function') return;
    resetFn.call(element);
  }

  private getSelectFilterElement(key: string): HTMLElement | null {
    if (!this.columnFilterRefs) return null;
    const match = this.columnFilterRefs.toArray().find(ref => ref.nativeElement.getAttribute('data-col-key') === key);
    return match?.nativeElement ?? null;
  }

  getDropdownSelection(col: TableColumn): Option[] {
    const key = col.key.toString();
    return this.ensureSelectFilterValues(this.dropdownSelections()[key] ?? []);
  }

  getMultiselectValues(item: TableItem, col: TableColumn): string[] {
    const raw = item[col.key];
    if (Array.isArray(raw)) return raw.map(value => String(value));
    return raw ? [String(raw)] : [];
  }

  onColumnDropdownQuery(event: Event | CustomEvent, col: TableColumn) {
    if (this.isStaticDropdownColumn(col)) return;

    const term = this.searchService.extractTerm(event);
    const key = col.key.toString();

    const existing = this.dropdownQueryTimers.get(key);
    if (existing) clearTimeout(existing);

    const delay = Math.max(0, this.columnSearchDebounceMs());
    const timer = setTimeout(() => this.fetchDropdownOptions(col, term), delay);
    this.dropdownQueryTimers.set(key, timer);
  }

  onColumnDropdownSelect(event: CustomEvent, col: TableColumn, emit = true) {
    const detail = event?.detail;
    const key = col.key.toString();
    if (this.suppressDropdownEvents.has(key)) {
      return;
    }
    const field = this.getSearchField(col);
    const isStatic = this.isStaticDropdownColumn(col);
    const emitNow = emit || this.dropdownResetIntents.has(key);
    if (this.dropdownResetIntents.has(key)) {
      this.dropdownResetIntents.delete(key);
    }

    if (this.isEmptyDropdownSelection(detail)) {
      this.dropdownSelections.update(current => ({
        ...current,
        [key]: [],
      }));
      this.setColumnSearchControlValue(col, []);
      const value = this.isMultiSelectDropdownColumn(col) ? [] : '';
      if (emitNow && this.shouldEmitDropdownChange(key, value)) {
        this.dropdownSubmittedValues.set(key, value);
        if (isStatic) {
          this.updateLocalColumnFilter(key, value);
        } else {
          this.columnSearchChange.emit({ field, value, column: col });
        }
      }
      return;
    }

    const availableOptions = this.getDropdownOptions(col);
    const optionIndex = buildOptionIndex(availableOptions);

    const resolveOption = (input: unknown): Option | null => resolveOptionFromInput(input, optionIndex);

    let selected: Option[] = [];
    if (Array.isArray(detail)) {
      if (detail.length && detail.every(item => isOptionLike(item))) {
        const optionLikeItems = detail.filter(isOptionLike) as Option[];
        const hasSelected = optionLikeItems.some(item => hasSelectedFlag(item));
        selected = hasSelected
          ? optionLikeItems.filter(item => hasSelectedFlag(item) && item.selected === true)
          : optionLikeItems;
      } else {
        selected = detail.map(item => resolveOption(item)).filter((item): item is Option => !!item);
      }
    } else if (detail && typeof detail === 'object' && 'value' in detail) {
      const maybeValue = detail.value;
      if (Array.isArray(maybeValue)) {
        const optionLikeItems = maybeValue.filter(isOptionLike) as Option[];
        if (optionLikeItems.length === maybeValue.length && optionLikeItems.length) {
          const hasSelected = optionLikeItems.some(item => hasSelectedFlag(item));
          selected = hasSelected
            ? optionLikeItems.filter(item => hasSelectedFlag(item) && item.selected === true)
            : optionLikeItems;
        } else {
          selected = maybeValue.map(item => resolveOption(item)).filter((item): item is Option => !!item);
        }
      } else {
        const resolved = resolveOption(maybeValue);
        if (resolved) selected = [resolved];
      }
      if (!selected.length) {
        const resolved = resolveOption(detail);
        if (resolved) selected = [resolved];
      }
    } else {
      const resolved = resolveOption(detail);
      if (resolved) selected = [resolved];
    }
    selected = this.ensureSelectFilterValues(selected);
    this.dropdownSelections.update(current => ({
      ...current,
      [key]: selected,
    }));
    this.setColumnSearchControlValue(col, selected);

    if (!emitNow) return;

    const values = this.normalizeDropdownValues(selected);
    const value = this.isMultiSelectDropdownColumn(col) ? values : (values[0] ?? '');
    if (this.shouldEmitDropdownChange(key, value)) {
      this.dropdownSubmittedValues.set(key, value);
      if (isStatic) {
        this.updateLocalColumnFilter(key, value);
      } else {
        this.columnSearchChange.emit({ field, value, column: col });
      }
    }
    this.closeDropdownSpace();
  }

  private isEmptyDropdownSelection(detail: unknown): boolean {
    if (!detail) return true;
    if (Array.isArray(detail)) return detail.length === 0;
    if (typeof detail === 'object') {
      const candidate = detail as { value?: unknown };
      if ('value' in candidate) {
        const value = candidate.value;
        if (Array.isArray(value)) return value.length === 0;
        return value === '' || value === null || value === undefined;
      }
    }
    return false;
  }

  onDropdownClosed(col: TableColumn): void {
    const key = col.key.toString();
    this.dropdownResetIntents.delete(key);
    this.dropdownCloseFlags.add(key);
    setTimeout(() => this.dropdownCloseFlags.delete(key), 0);
    if (this.activeDropdownKey === key) {
      this.activeDropdownKey = null;
    }
    this.closeDropdownSpace();
  }

  onColumnDropdownSubmit(event: CustomEvent, col: TableColumn): void {
    const key = col.key.toString();
    const existing = this.dropdownSubmitTimers.get(key);
    if (existing) clearTimeout(existing);
    const timer = setTimeout(() => {
      this.dropdownSubmitTimers.delete(key);
      if (this.dropdownCloseFlags.has(key)) {
        this.dropdownCloseFlags.delete(key);
        return;
      }
      this.onColumnDropdownSelect(event, col, true);
    }, 0);
    this.dropdownSubmitTimers.set(key, timer);
  }

  onDropdownMouseDown(event: MouseEvent, col: TableColumn): void {
    if (!this.isDropdownOpen()) return;
    const path = typeof event.composedPath === 'function' ? event.composedPath() : [];
    const isReset = path.some(
      node => node instanceof HTMLElement && node.classList?.contains('digi-form-select-filter__reset-button')
    );
    const isSubmit = path.some(
      node => node instanceof HTMLElement && node.classList?.contains('digi-form-select-filter__submit-button')
    );
    if (!isReset && !isSubmit) return;
    const key = col.key.toString();
    if (isReset) {
      this.dropdownResetIntents.add(key);
      setTimeout(() => this.dropdownResetIntents.delete(key), 500);
    }
  }

  reset() {
    this.resetColumnSearchState();
    this.internalTableConfig().forEach(col => {
      if (!this.isSearchableColumn(col)) return;
      const key = col.key.toString();
      const value = this.getSearchInputType(col) === 'select' && this.isMultiSelectDropdownColumn(col) ? [] : '';

      if (this.getSearchInputType(col) === 'select' && this.isFilterableDropdownColumn(col)) {
        this.suppressDropdownEventsFor(key);
        this.resetSelectFilter(key);
      }

      this.dropdownSubmittedValues.set(key, value);
      if (this.isStaticDropdownColumn(col)) {
        this.updateLocalColumnFilter(key, value);
      } else {
        this.columnSearchChange.emit({
          field: this.getSearchField(col),
          value,
          column: col,
        });
      }
    });
    this.closeDropdownSpace();
  }
  onColumnDropdownReset(col: TableColumn): void {
    const key = col.key.toString();
    this.setColumnSearchControlValue(col, []);
    this.dropdownSubmittedValues.set(key, []);
    this.updateLocalColumnFilter(key, []);
    this.closeDropdownSpace();
  }

  onDropdownOpened(e: MouseEvent, col?: TableColumn): void {
    const dropdownWidth = 300;
    const actionsCol = 150;
    const padding = 15;
    const scrolledWidth = dropdownWidth + actionsCol + padding;

    const container = this.scrollMain.nativeElement;
    const targetRect = (e.target as HTMLElement).getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();

    const elementLeft = targetRect.left - containerRect.left + container.scrollLeft;

    if (container.scrollLeft < elementLeft + scrolledWidth - container.clientWidth) {
      container.scrollLeft = elementLeft + scrolledWidth - container.clientWidth;
    }

    if (col) {
      this.activeDropdownKey = col.key.toString();
    }
    this.isDropdownOpen.set(true);
  }

  shouldAddDropdownSpace(): boolean {
    return this.isDropdownOpen() && this.displayItems().length === 0;
  }

  private closeDropdownSpace(): void {
    if (this.dropdownCloseTimer) {
      clearTimeout(this.dropdownCloseTimer);
      this.dropdownCloseTimer = undefined;
    }
    this.isDropdownOpen.set(false);
  }

  private shouldEmitDropdownChange(key: string, value: string | string[]): boolean {
    const previous = this.dropdownSubmittedValues.get(key);
    return !this.isSameDropdownValue(previous, value);
  }

  private isSameDropdownValue(previous: string | string[] | undefined, next: string | string[]): boolean {
    if (previous === undefined) {
      return this.isEmptyDropdownValue(next);
    }
    if (typeof previous === 'string' && typeof next === 'string') return previous === next;
    if (Array.isArray(previous) && Array.isArray(next)) {
      if (previous.length !== next.length) return false;
      return previous.every((value, index) => value === next[index]);
    }
    return false;
  }

  private isEmptyDropdownValue(value: string | string[]): boolean {
    return Array.isArray(value) ? value.length === 0 : value === '';
  }

  onColumnDateSearchChange(event: Event | CustomEvent, col: TableColumn): void {
    const value = this.searchService.extractTerm(event);
    const key = col.key.toString();

    this.updateColumnSearchValue(key, value);
    this.setColumnSearchControlValue(col, value);
    this.columnSearchChange.emit({
      field: this.getSearchField(col),
      value,
      column: col,
    });
  }

  private getSearchField(col: TableColumn): string {
    if (col.searchField) return col.searchField;

    //TODO refactor
    const key = col.key?.toString?.().toLowerCase?.() ?? '';
    if (key === 'title') return 'dublincore_title';
    if (key === 'arendenummer') return 'arende_arendenummer';
    if (key === 'arendetyp') return 'arende_arendetyp';
    if (key === 'ansvarigenhet') {
      return this.isHandlingTable() ? 'handling_ansvarig_organisatorisk_enhet' : 'arende_ansvarig_organisatorisk_enhet';
    }
    if (key === 'handlaggare' || key === 'ansvarighandlaggare') {
      return this.isHandlingTable() ? 'handling_ansvarig_handlaggare' : 'arende_ansvarig_handlaggare';
    }
    if (key === 'ansvarigchef') {
      return this.isHandlingTable()
        ? 'handling_ansvarig_organisationsenhetschef'
        : 'arende_ansvarig_organisationsenhetschef';
    }
    if (key === 'beslutsfattare') {
      return this.isHandlingTable() ? 'handling_beslutsfattare' : 'arende_ansvarig_beslutsfattare';
    }
    if (key === 'medhandlaggare') {
      return this.isHandlingTable() ? 'handling_medhandlaggare' : 'arende_medhandlaggare';
    }
    if (key === 'granskare') {
      return this.isHandlingTable() ? 'handling_granskare' : 'arende_granskare';
    }
    if (key === 'status') {
      if (this.isReadyToCloseTable()) return 'handling_handlingsstatus';
      return this.isHandlingTable() ? 'handling_handlingsstatus' : 'arende_arendestatus';
    }
    if (key === 'arendestatus') return 'arende_arendestatus';
    if (key === 'handlaggningsstatus') return 'arende_handlaggningsstatus';
    if (key === 'behorighetsstatus') return 'arende_behorighetsstatus';
    if (key === 'riktning') return this.isHandlingTable() ? 'handling_handlingsriktning' : 'arende_riktning';
    if (key === 'sekretess' || key === 'handlingsekretess') {
      return this.isHandlingTable() || key.startsWith('handling') ? 'handling_sekretess' : 'arende_sekretess';
    }
    if (key === 'sakerhetsskyddsklassificering' || key === 'handlingsakerhetsskyddsklassificering') {
      return this.isHandlingTable() || key.startsWith('handling')
        ? 'handling_sakerhetsskyddsklassificering'
        : 'arende_sakerhetsskyddsklassificering';
    }

    return col.sortField ?? col.key.toString();
  }

  isFilterableDropdownColumn(col: TableColumn): boolean {
    const key = col.key?.toString?.().toLowerCase?.() ?? '';
    if (key === 'status') {
      return !this.isHandlingTable();
    }
    return [
      'arendetyp',
      'arendestatus',
      'ansvarigenhet',
      'ansvarigchef',
      'behorighetsstatus',
      'handlaggningsstatus',
      'handlaggare',
      'ansvarighandlaggare',
      'beslutsfattare',
      'medhandlaggare',
      'granskare',
      'lastcontributor',
      'riktning',
      'sakerhetsskyddsklassificering',
      'sekretess',
    ].includes(key);
  }

  isMultiSelectDropdownColumn(col: TableColumn): boolean {
    return this.isFilterableDropdownColumn(col);
  }

  isStaticDropdownColumn(col: TableColumn): boolean {
    const key = col.key?.toString?.().toLowerCase?.() ?? '';
    return key === 'behorighetsstatus';
  }

  private normalizeDropdownValues(selected: Option[]): string[] {
    return selected.map(option => String(option.id ?? option.value ?? option.label ?? ''));
  }

  private fetchDropdownOptions(col: TableColumn, searchTerm: string): void {
    const key = col.key?.toString?.().toLowerCase?.() ?? '';
    const updateOptions = (options: Option[]) => {
      const key = col.key.toString();
      const selected = this.dropdownSelections()[key] ?? [];
      let nextOptions = options;

      if (selected.length) {
        const optionById = new Map(options.map(option => [option.id, option]));
        const merged = [...options];

        selected.forEach(option => {
          if (!optionById.has(option.id)) {
            merged.unshift(option);
          }
        });

        nextOptions = merged;

        const nextSelected = selected.map(option => optionById.get(option.id) ?? option);
        const changed = nextSelected.some((option, idx) => option !== selected[idx]);
        if (changed) {
          this.dropdownSelections.update(current => ({
            ...current,
            [key]: nextSelected,
          }));
        }
      }

      this.dropdownOptions.update(current => ({
        ...current,
        [key]: nextOptions,
      }));
    };
    let request$: Observable<SearchResult> | null = null;

    const directoryName = this.getDirectoryNameForKey(key);
    if (directoryName) {
      this.nuxeoApi
        .getDirectorySuggestions(directoryName)
        .pipe(
          map(entries => entries.map(entry => ({ id: entry.id, label: entry.displayLabel }))),
          tap(updateOptions),
          catchError(error => {
            console.error(error);
            return EMPTY;
          })
        )
        .subscribe();
      return;
    } else if (key === 'arendetyp') {
      const parentRef = this.columnSearchContext()?.parentRef ?? '';
      request$ = this.nuxeoApi.DMSDocumentSuggestion(parentRef, 'Klass', 'Ar', searchTerm);
    } else if (key === 'ansvarigenhet') {
      const parentRef = this.columnSearchContext()?.parentRef ?? '';
      if (!parentRef) {
        updateOptions([]);
        return;
      }

      this.nuxeoApi
        .DMSDocumentSuggestion(parentRef, 'Organisationsdel', 'Organisationsdel', searchTerm)
        .pipe(
          map(result => result.entries.map(entry => ({ id: entry.uid, label: entry.title }))),
          tap(updateOptions),
          catchError(error => {
            console.error(error);
            return EMPTY;
          })
        )
        .subscribe();
      return;
    } else if (
      key === 'handlaggare' ||
      key === 'ansvarighandlaggare' ||
      key === 'ansvarigchef' ||
      key === 'beslutsfattare' ||
      key === 'medhandlaggare' ||
      key === 'granskare' ||
      key === 'lastcontributor'
    ) {
      this.nuxeoApi
        .getUserSuggestions(searchTerm)
        .pipe(
          map(users => users.map(user => ({ id: user.id, label: user.displayLabel }))),
          tap(updateOptions),
          catchError(error => {
            console.error(error);
            return EMPTY;
          })
        )
        .subscribe();
      return;
    } else {
      return;
    }

    if (!request$) return;

    request$
      .pipe(
        map(result => result.entries.map(entry => ({ id: entry.uid, label: entry.title }))),
        tap(updateOptions),
        catchError(error => {
          console.error(error);
          return EMPTY;
        })
      )
      .subscribe();
  }

  private buildOptionsFromItems(col: TableColumn): Option[] {
    const key = col.key.toString();
    const seen = new Set<string>();
    const options: Option[] = [];

    this.tableItems().forEach(item => {
      const raw = item[key];
      const value = this.extractOptionValue(raw);
      if (!value || value === '—') return;
      if (seen.has(value)) return;
      seen.add(value);
      const label = this.isStatusColumn(col) ? this.getStatusText(value) : value;
      options.push({ id: value, label, value });
    });

    return options;
  }

  private getDirectoryNameForKey(key: string): string | null {
    switch (key) {
      case 'status':
        if (this.isReadyToCloseTable()) return 'Handlingsstatus';
        return this.isHandlingTable() ? 'Handlingsstatus' : 'Arendestatus';
      case 'arendestatus':
        return 'Arendestatus';
      case 'handlaggningsstatus':
        return 'Handlaggningsstatus';
      case 'behorighetsstatus':
        return 'Behorighetsstatus';
      case 'riktning':
        return this.isHandlingTable() ? 'Riktning' : 'ArendeRiktning';
      case 'sekretess':
      case 'handlingsekretess':
        return 'Sekretess';
      case 'sakerhetsskyddsklassificering':
      case 'handlingsakerhetsskyddsklassificering':
        return 'Sakerhetsskyddsklassificering';
      default:
        return null;
    }
  }

  private extractOptionValue(value: unknown): string {
    if (value == null) return '';
    if (Array.isArray(value)) {
      const first = value[0];
      return typeof first === 'string' ? first : String(first ?? '');
    }
    if (typeof value === 'object') {
      const label = this.documentValueService.getDirectoryLabel(value);
      return label || '';
    }
    return String(value);
  }

  private preloadDropdownOptions(): void {
    if (!this.columnSearchEnabled()) return;

    this.internalTableConfig().forEach(col => {
      if (this.getSearchInputType(col) !== 'select') return;
      if (this.isStaticDropdownColumn(col)) return;
      const key = col.key.toString();
      if (this.preloadedDropdownKeys.has(key)) return;
      this.preloadedDropdownKeys.add(key);
      this.fetchDropdownOptions(col, '');
    });
  }

  isActive(col: TableColumn) {
    return !!col.sortField && this.sortBy() === col.sortField;
  }

  showSortingIcon(col: TableColumn) {
    if (!col.sortField) return '';
    if (!this.isActive(col)) return '↕';
    return this.sortOrder() === 'asc' ? '▲' : '▼';
  }

  isArray(value: unknown): value is unknown[] {
    return Array.isArray(value);
  }

  getValue(item: TableItem, col: TableColumn): string {
    const key = col.key;
    const raw = typeof col.formatter === 'function' ? col.formatter(item[key], item) : item[key];
    if (raw == null) return '';
    if (Array.isArray(raw)) return raw.length ? raw[0] : '';
    return String(raw);
  }

  onCsvExportClick(): void {
    if (!this.localCsvExportEnabled()) {
      this.csvExportClick.emit(this.internalTableConfig());
      return;
    }

    const exportColumns = this.internalTableConfig().filter(col => col.key !== 'actions');
    if (!exportColumns.length) return;

    this.csvExportService.exportRowsToCSV({
      headers: exportColumns.map(col => col.label),
      rows: this.displayItems().map(item => exportColumns.map(col => this.getValue(item, col))),
      filename: this.localCsvExportFileName(),
    });
  }

  getIconSrc(type: string): string {
    if (type === 'Arende') {
      return '/nuxeo/app/assets/figmaIcons/arende.svg';
    } else if (type === 'Handling') {
      return '/nuxeo/app/assets/figmaIcons/handling.svg';
    } else if (type === 'Utkast') {
      return '/nuxeo/app/assets/figmaIcons/utkast.svg';
    } else if (type === 'Fil') {
      return '/nuxeo/app/assets/figmaIcons/fil.svg';
    } else {
      return '/nuxeo/app/assets/figmaIcons/workspace.svg';
    }
  }

  totalPages() {
    const totalItems = Math.max(0, this.total());
    const pageSize = this.pageSize();
    if (pageSize <= 0) return 1;
    return Math.max(1, Math.ceil(totalItems / pageSize));
  }

  changePageNumber(page: DigiNavigationPaginationCustomEvent<number>) {
    this.pageChange.emit(page.detail - 1);
  }

  selectRow(item: TableItem, _event?: Event) {
    if (!this.rowClickEnabled()) return;
    if (typeof item['id'] !== 'string') return;
    this.rowSelected.emit(item['id']);
  }

  onToggle(row: TableItem, event: Event) {
    if (typeof row['id'] !== 'string') return;
    const checked = this.extractChecked(event);
    if (checked) this.selectedIds.add(row['id']);
    else this.selectedIds.delete(row['id']);
    this.toggleCheckboxes.emit(Array.from(this.selectedIds));
  }

  onToggleAll(event: Event) {
    const checked = this.extractChecked(event);
    this.selectedIds.clear();
    if (checked) this.displayItems().forEach(row => typeof row['id'] === 'string' && this.selectedIds.add(row['id']));
    this.toggleAllCheckboxes.emit(checked);
    this.toggleCheckboxes.emit(Array.from(this.selectedIds));
  }

  isChecked(item: TableItem) {
    if (typeof item['id'] !== 'string') return false;
    return this.selectedIds.has(item['id']);
  }

  areAllDisplayedRowsChecked(): boolean {
    const selectableIds = this.displayItems()
      .map(row => row['id'])
      .filter((id): id is string => typeof id === 'string');
    return selectableIds.length > 0 && selectableIds.every(id => this.selectedIds.has(id));
  }

  private isHandlingTable(): boolean {
    const tableName = this.tableName()?.toUpperCase?.() ?? '';
    return (
      tableName.startsWith('HANDLINGAR_') ||
      [
        'HANDLINGS',
        'ARBETSMATERIAL',
        'HANDLINGAR_GRID',
        'MINA_UPPGIFTER',
        'DOCUMENT_SEARCH_HANDLING',
        'DOCUMENT_SEARCH_UTKAST',
      ].includes(tableName)
    );
  }

  private isReadyToCloseTable(): boolean {
    return (this.tableName()?.toUpperCase?.() ?? '') === 'READY_TO_CLOSE';
  }

  private isMinaArendenTable(): boolean {
    return (this.tableName()?.toUpperCase?.() ?? '') === 'MINA_AREDEN';
  }

  getStatusColor(status: string) {
    return this.casesService.getStatusColor(status, {
      fallback: this.isHandlingTable() ? 'denied' : 'missing',
    });
  }

  getStatusVariation(status: string) {
    return this.casesService.getStatusVariation(status);
  }

  isStatusColumn(col: TableColumn): boolean {
    const key = col.key?.toString?.().toLowerCase?.() ?? '';
    return key.includes('status') || key.includes('state');
  }

  getStatusValue(item: TableItem, col: TableColumn): string {
    const raw = item[col.key];
    if (raw == null) return '';
    if (Array.isArray(raw)) return raw.length ? String(raw[0]) : '';
    return String(raw);
  }

  getStatusText(status: string): string {
    if (!status) return '—';

    const label = this.casesService.getStatusLabel(status);
    return label || '—';
  }

  getBehorighetsStatusLabel(item: TableItem, col: TableColumn): string {
    const stateLabel = this.resolveStatusLabel(item?.['caseState'] ?? item?.['state'] ?? item?.['workflowState']);
    if (this.getBehorighetsCompletedSteps(stateLabel) > 0) return stateLabel;

    const arendeLabel = this.resolveStatusLabel(
      item?.['handlaggningsstatus'] ?? item?.['arendestatus'] ?? item?.['status']
    );
    if (this.getBehorighetsCompletedSteps(arendeLabel) > 0) return arendeLabel;

    return this.resolveStatusLabel(item?.[col.key]);
  }

  getBehorighetsCompletedStepsForItem(item: TableItem, col: TableColumn): number {
    return this.getBehorighetsCompletedSteps(this.getBehorighetsStatusLabel(item, col));
  }

  hasBehorighetsProgress(item: TableItem, col: TableColumn): boolean {
    return this.getBehorighetsCompletedStepsForItem(item, col) > 0;
  }

  isBehorighetsClosed(status: string): boolean {
    const normalized = this.normalizeStatus(status);
    return normalized.includes('stang');
  }

  getBehorighetsCompletedSteps(status: string): number {
    const normalized = this.normalizeStatus(status);
    if (!normalized) return 0;

    if (normalized.includes('stang')) return this.caseProgressStates.length;
    const idx = this.caseProgressStates.findIndex(state => {
      const id = this.normalizeStatus(state.id);
      const label = this.normalizeStatus(state.label);
      return normalized === id || normalized === label || normalized.includes(id) || normalized.includes(label);
    });
    return idx >= 0 ? idx + 1 : 0;
  }

  private normalizeStatus(value: string): string {
    return value
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '');
  }

  private resolveStatusLabel(value: unknown): string {
    if (value == null) return '';
    if (Array.isArray(value)) return this.resolveStatusLabel(value[0]);
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return String(value);
    if (typeof value !== 'object') return '';

    const obj = value as Record<string, unknown>;
    const props = obj['properties'] as Record<string, unknown> | undefined;

    if (obj['entity-type'] === 'directoryEntry') {
      const label = typeof props?.['label'] === 'string' ? props['label'] : undefined;
      const id = typeof props?.['id'] === 'string' ? props['id'] : undefined;
      const objId = typeof obj['id'] === 'string' ? obj['id'] : undefined;
      return label ?? id ?? objId ?? '';
    }

    const label = typeof obj['label'] === 'string' ? obj['label'] : undefined;
    const title = typeof obj['title'] === 'string' ? obj['title'] : undefined;
    const id = typeof obj['id'] === 'string' ? obj['id'] : undefined;

    return label ?? title ?? id ?? '';
  }

  updateEditedField(event: CustomEvent, item: TableItem, key: string) {
    const target = event.target as HTMLInputElement | null;
    const detail = event?.detail;

    let value = '';

    if (typeof detail === 'string' || typeof detail === 'number' || typeof detail === 'boolean') {
      value = String(detail);
    } else if (target && 'value' in target) {
      // For <input type="date"> this will be "YYYY-MM-DD"
      value = target.value ?? '';
    }

    const updatedItems = this.tableItems().map(el => {
      if (el['id'] === item['id']) {
        return { ...el, [key]: value };
      }
      return el;
    });
    this.updatedTableItems.emit(updatedItems);
  }

  updateCheckboxField(event: Event, item: TableItem, key: string) {
    const checked = this.extractChecked(event);

    const updatedItems = this.tableItems().map(el => {
      if (el['id'] === item['id']) {
        return { ...el, [key]: checked ? 'Ja' : 'Nej' };
      }
      return el;
    });
    this.updatedTableItems.emit(updatedItems);
  }
  updateMultiselect(event: MatSelectChange, item: TableItem, key: string) {
    const updatedItems = this.tableItems().map(el => {
      if (el['id'] === item['id']) {
        return { ...el, [key]: event.value };
      }
      return el;
    });
    this.updatedTableItems.emit(updatedItems);
  }

  openColumnSettings(event: Event): void {
    event.stopPropagation();
    this.isTableOptionsOpen.set(true);
  }

  getCellType(col: TableColumn, item: TableItem) {
    if (typeof col?.inputConfig?.type === 'function') {
      return col?.inputConfig?.type?.(item);
    }
    return col?.inputConfig?.type;
  }

  getDateSelection(item: TableItem, col: TableColumn): Date[] {
    const raw = item[col.key];
    if (!raw) return [];
    const date = new Date(String(raw));
    return Number.isNaN(date.getTime()) ? [] : [date];
  }

  private extractChecked(event: Event | CustomEvent): boolean {
    const target = event.target as { checked?: boolean } | null;
    if (typeof target?.checked === 'boolean') return target.checked;

    const detail = (event as CustomEvent).detail;
    if (typeof detail?.checked === 'boolean') return detail.checked;
    if (typeof detail?.target?.checked === 'boolean') return detail.target.checked;

    return false;
  }
}
