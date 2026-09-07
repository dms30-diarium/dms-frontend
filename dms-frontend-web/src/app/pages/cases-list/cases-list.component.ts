import {
  Component,
  inject,
  signal,
  input,
  computed,
  OnInit,
  OnChanges,
  effect,
  untracked,
  ChangeDetectionStrategy,
  output,
  ViewChild,
} from '@angular/core';
import { analyzeError, getNotificationVariation } from '@app/shared/utils/nuxeo-error-handler';
import { CaseListTableComponent, TableColumn } from '@app/shared/components/case-list-table/case-list-table.component';
import { TableItem } from '@app/shared/models/case-table';
import { ViewMode } from '@models/view-mode.enum';
import { CasesService, ListByTabOpts, ListCasesOpts } from '@app/core/services/cases.service';
import {
  AggBucket,
  ArendeExtendedProperties,
  HandlingExtendedProperties,
  NuxeoProperties,
  NuxeoDocument,
  NxUser,
  WorkflowInfo,
} from '@app/shared/api/nuxeo-api.types';
import { CaseCardComponent } from '@app/shared/components/case-card/case-card.component';
import { AuthService } from '@app/core/services/auth.service';
import { DigiButton, DigiArbetsformedlingenAngularModule } from '@designsystem-se/af-angular';
import { AssignUserModalComponent } from '@app/shared/components/assign-user-modal/assign-user-modal.component';
import { NuxeoApiService } from '@app/shared/api/nuxeo-api.service';
import { Observable, EMPTY } from 'rxjs';
import { map, catchError, finalize, tap } from 'rxjs/operators';
import { NUXEO_SCHEMA_FIELDS } from '@app/shared/constants/nuxeo-schema-fields';
import { NUXEO_VOCAB_IDS } from '@app/shared/constants/nuxeo-vocabulary-ids';

import { formatDateOrMissing } from '@app/shared/utils/date-utils';
import { AppRole } from '@app/shared/models/roles';
import { TableColOption } from '@app/shared/components/table-col-options/table-col-options.component';
import { EditFormComponent } from '@app/shared/components/edit-form/edit-form.component';
import { EditGroup } from '@app/shared/components/general-form/general-form.types';
import { buildEditConfig, getFormProperties } from '@app/pages/case-page/utils';
import { Option } from '@app/shared/commonTypes';
import { EditCaseResult, InternalContact } from '@app/pages/case-page/case-types';
import { CreateHandlingFromMail } from '@app/shared/components/forms/create-handling-from-mail/create-handling-from-mail.component';
import { ConstantProvider } from './constants';
import { TooltipDirective } from '@app/shared/directives/tooltip.directive';
import { GeneralStore } from '@app/core/services/general-store.service';
import { CSVExportService } from '@app/shared/services/csv-export.service';
import { GridPaginationControlsComponent } from '@app/shared/components/grid-pagination-controls/grid-pagination-controls.component';
import { CaseEditOptionsService } from '@app/core/services/case-edit-options.service';
import { TableSortService } from '@app/core/services/table-sort.service';
import {
  CASES_LIST_CHANGES_SAVED_MESSAGE,
  CASES_LIST_SAVE_ERROR_MESSAGE,
  CASES_LIST_SAVING_CHANGES_MESSAGE,
  ORGANIZATION_LOAD_ERROR_MESSAGE,
  buildLoadOptionsErrorMessage,
} from '@app/shared/constants/notification-messages';
const CSV_EXPORT_EXCLUDED_FIELDS = ['isTrashed', 'isRecord', 'type', 'state', 'status', 'retainUntil'];

@Component({
  selector: 'nuxeo-cases-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [
    CaseListTableComponent,
    CaseCardComponent,
    DigiButton,
    DigiArbetsformedlingenAngularModule,
    AssignUserModalComponent,
    EditFormComponent,
    CreateHandlingFromMail,
    TooltipDirective,
    GridPaginationControlsComponent,
  ],
  templateUrl: './cases-list.component.html',
})
export class CasesListComponent implements OnInit, OnChanges {
  @ViewChild(CaseListTableComponent) private caseListTable?: CaseListTableComponent;

  //#region 🔹 Properties
  viewMode = input<ViewMode>(ViewMode.Table);
  filters = input<Partial<ListCasesOpts>>({});
  externalColumnFilters = input<Record<string, string | string[]>>({});
  tab = input<string>('');
  specifiedPageSize = input<number>();
  pageSizeSelect = output<string>();
  shouldShowPageSizeOption = input<boolean>(false);
  loadCreatedAggs = input<boolean>(false);
  createdAggBucketsChange = output<AggBucket[]>();
  statusFilterChange = output<string[]>();
  showCsvExport = input<boolean>(false);

  private casesService = inject(CasesService);
  private nuxeoApi = inject(NuxeoApiService);
  private csvExportService = inject(CSVExportService);
  private caseEditOptions = inject(CaseEditOptionsService);
  public auth = inject(AuthService);
  public store = inject(GeneralStore);
  private constantProvider = inject(ConstantProvider);
  private tableSortService = inject(TableSortService);

  loading = signal(true);
  casesSig = signal<TableItem[]>([]);
  total = signal(0);
  isAssignUserOpened = signal<string | null>(null);
  isDeleteDialogOpened = signal<TableItem | null>(null);
  tableButtonColName = signal<string | null>('Åtgärder');
  pageSizeOptions = [5, 10, 15, 25, 30, 50];
  tableConfig: TableColumn[] = [];

  page = signal(0);
  pageSize = signal(25);
  sortBy = signal<string>('');
  sortOrder = signal<'asc' | 'desc'>('desc');
  columnFilters = signal<Record<string, string | string[]>>({});
  combinedColumnFilters = computed(() => {
    return {
      ...this.columnFilters(),
      ...this.externalColumnFilters(),
    };
  });
  columnSearchParentRef = signal<string>('');
  private columnSearchParentPath = signal<string>('');
  private lastTab = '';
  private lastExternalFilters = '';
  private lastAggKey = '';

  activeRole = signal<AppRole | null>(null);

  isEditDialogOpen = signal<boolean>(false);
  editDoc = signal<NuxeoDocument<ArendeExtendedProperties> | null>(null);
  internalContactsData = signal<InternalContact[]>([]);
  suggestions = signal<Record<string, Option[]>>({});
  editFormReady = computed(() => {
    const suggestionGroups = this.suggestions();
    const requiredSuggestionKeys = [
      'riktning',
      'secret',
      'secretClass',
      'lagrum',
      'arendestatus',
      'handlaggningsstatus',
      'beslutTyp',
      'beredningsbeslut',
      'organization',
      'bevaras',
    ];

    return (
      !!this.editDoc() &&
      requiredSuggestionKeys.every(key => Object.prototype.hasOwnProperty.call(suggestionGroups, key))
    );
  });
  editConfig = computed<EditGroup[]>(() => {
    return this.editDoc() ? buildEditConfig(this.editDoc()!, this.suggestions()) : [];
  });

  isCreateHandlingOpen = signal<boolean>(false);
  selectedMailDoc = signal<NuxeoDocument | null>(null);
  attachmentsOptions = signal<Option[]>([]);

  //#endregion

  //#region 🔹 Types
  private readonly emptyAggBuckets: AggBucket[] = [];
  //#endregion

  //#region 🔹 Computed Properties
  private params = computed<ListByTabOpts>(() => ({
    page: this.page(),
    pageSize: this.pageSize(),
    sortBy: this.sortBy(),
    sortOrder: this.sortOrder(),
    ...this.filters(),
    search: this.filters().search,
    searchField: this.filters().searchField,
    searchAllColumns: this.filters().searchAllColumns,
    columnFilters: this.combinedColumnFilters(),
    tab: this.tab(),
  }));

  private aggParams = computed<ListByTabOpts>(() => {
    return {
      ...this.params(),
      page: 0,
      pageSize: 1,
    };
  });

  //#endregion

  //#region 🔹 Lifecycle Hooks
  constructor() {
    effect(() => {
      const currentTab = this.tab();
      if (!currentTab) return;

      if (this.lastTab && this.lastTab !== currentTab) {
        this.resetColumnSearch();
        this.lastAggKey = '';
      }

      this.lastTab = currentTab;
    });
    effect(() => {
      const specifiedPageSize = this.specifiedPageSize();
      if (!specifiedPageSize) return;
      if (specifiedPageSize === this.pageSize()) return;
      this.page.set(0);
      this.pageSize.set(specifiedPageSize);
    });

    effect(() => {
      const serialized = JSON.stringify(this.externalColumnFilters());
      if (serialized === this.lastExternalFilters) return;
      this.lastExternalFilters = serialized;
      if (this.page() !== 0) {
        this.page.set(0);
      }
    });

    effect(() => {
      const p = {
        ...this.params(),
        username: untracked(() => this.auth.username()),
        activeRole: untracked(() => this.auth.activeRole()),
      };
      if (!p.username || !p.activeRole) return;
      untracked(() => this.fetch(p));
    });

    effect(() => {
      if (!this.loadCreatedAggs()) {
        this.lastAggKey = '';
        return;
      }
      const aggRequest = {
        ...this.aggParams(),
        username: untracked(() => this.auth.username()),
        activeRole: untracked(() => this.auth.activeRole()),
      };
      if (!aggRequest.username || !aggRequest.activeRole) return;
      const key = JSON.stringify(aggRequest);
      if (key === this.lastAggKey) return;
      this.lastAggKey = key;
      untracked(() => this.fetchCreatedAggBuckets(aggRequest));
    });

    effect(() => {
      const path = this.filters().pathStartsWith || '/default-domain';
      if (this.columnSearchParentPath() === path) return;
      this.columnSearchParentPath.set(path);

      this.nuxeoApi
        .getPathInfo(path)
        .pipe(
          map(doc => doc.uid),
          tap(uid => this.columnSearchParentRef.set(uid)),
          catchError(() => {
            this.columnSearchParentRef.set('');
            return EMPTY;
          })
        )
        .subscribe();
    });
  }

  ngOnInit(): void {
    this.activeRole.set(this.auth.activeRole());
    this.updateTableConfig();
  }

  ngOnChanges(): void {
    this.updateTableConfig();
  }
  //#endregion

  //#region 🔹 Public Methods
  updateDocument() {
    this.fetch(this.params());
  }

  updateTableConfig() {
    const resolved = this.constantProvider.resolveCasesTableConfig({
      role: this.auth.activeRole(),
      tab: this.tab(),
      isAdmin: this.auth.isAdmin(),
    });

    this.tableConfig = resolved.config;
    this.tableButtonColName.set(resolved.actionsHeader);
  }

  isGrid = () => this.viewMode() === ViewMode.Grid;
  isTable = () => this.viewMode() === ViewMode.Table;

  totalPages = computed(() => {
    const totalItems = Math.max(0, this.total());
    const size = Math.max(1, this.pageSize());
    return Math.max(1, Math.ceil(totalItems / size));
  });

  onPageChange(newPage: number) {
    this.page.set(newPage);
  }

  onGridPageChange(newPage: number): void {
    this.onPageChange(newPage);
  }

  onGridPageSizeSelect(value: string | number): void {
    const nextValue = Number(value);
    if (!Number.isFinite(nextValue) || nextValue <= 0 || nextValue === this.pageSize()) return;
    this.pageSize.set(nextValue);
    this.page.set(0);
    this.pageSizeSelect.emit(String(nextValue));
  }

  onSort(e: { sortBy: string; sortOrder: 'asc' | 'desc' }) {
    this.tableSortService.applySortSignals(this.sortBy, this.sortOrder, e, {
      sortBy: '',
      sortOrder: 'desc',
    });

    this.page.set(0);
  }

  onColumnSearch(event: { field: string; value: string | string[]; column?: TableColumn }) {
    const normalized = Array.isArray(event.value) ? event.value : (event.value?.trim() ?? '');
    const isDateColumn = event.column?.searchInputType === 'date';

    this.columnFilters.update(current => {
      const next = { ...current };

      if (isDateColumn) {
        const baseField = this.toRangeFieldBase(event.field);
        const minField = `${baseField}_min`;
        const maxField = `${baseField}_max`;

        delete next[event.field];

        if (typeof normalized === 'string' && normalized) {
          const start = new Date(`${normalized}T00:00:00Z`);
          const end = new Date(`${normalized}T23:59:59.999Z`);

          next[minField] = Number.isNaN(start.getTime()) ? normalized : start.toISOString();
          next[maxField] = Number.isNaN(end.getTime()) ? normalized : end.toISOString();
        } else {
          delete next[minField];
          delete next[maxField];
        }

        return next;
      }

      if (Array.isArray(normalized) ? normalized.length : normalized) next[event.field] = normalized;
      else delete next[event.field];
      return next;
    });
    this.page.set(0);

    if (event.field === 'arende_arendestatus') {
      const nextValues = Array.isArray(normalized) ? normalized : normalized ? [normalized] : [];
      this.statusFilterChange.emit(nextValues);
    }
  }

  resetTableFilters(): void {
    if (!this.hasActiveTableState()) return;

    this.columnFilters.set({});
    this.page.set(0);
    this.sortBy.set(NUXEO_SCHEMA_FIELDS.dc.created);
    this.sortOrder.set('desc');
    this.caseListTable?.reset();
  }

  hasActiveTableState(): boolean {
    return (
      Object.keys(this.columnFilters()).length > 0 ||
      this.page() !== 0 ||
      this.sortBy() !== NUXEO_SCHEMA_FIELDS.dc.created ||
      this.sortOrder() !== 'desc' ||
      !!this.caseListTable?.hasActiveColumnSearchState()
    );
  }

  deleteItem() {
    const itemToDelete = this.isDeleteDialogOpened()?.['id'];
    if (!itemToDelete) return;
    this.isDeleteDialogOpened.set(null);
    this.nuxeoApi
      .deleteDocument(itemToDelete)
      .pipe(
        tap(() => {
          this.casesSig.update(items => items.filter(item => item['id'] !== itemToDelete));
          this.total.update(t => Math.max(0, t - 1));
        }),
        catchError(() => EMPTY)
      )
      .subscribe();
  }

  openAssignUserOrg(id: string) {
    this.isAssignUserOpened.set(id);
  }

  openEditDialog = (uid: string) => {
    this.isEditDialogOpen.set(true);
    this.suggestions.set({});
    this.editDoc.set(null);

    this.nuxeoApi.getDocumentById<ArendeExtendedProperties>(uid, true).subscribe(doc => {
      this.editDoc.set(doc);
      this.buildInternalContactsData(doc);

      const caseParentRef = doc.parentRef!;
      this.caseEditOptions
        .getDocumentSuggestions(caseParentRef, 'Beslut')
        .subscribe(decisionTypeOptions =>
          this.suggestions.update(currentSuggestions => ({ ...currentSuggestions, beslutTyp: decisionTypeOptions }))
        );

      this.caseEditOptions
        .getDocumentSuggestions(caseParentRef, 'Beredningsbeslut')
        .subscribe(preparationDecisionOptions =>
          this.suggestions.update(currentSuggestions => ({
            ...currentSuggestions,
            beredningsbeslut: preparationDecisionOptions,
          }))
        );

      this.caseEditOptions
        .getDocumentSuggestions(caseParentRef, 'Organisationsdel')
        .subscribe(organizationOptions =>
          this.suggestions.update(currentSuggestions => ({ ...currentSuggestions, organization: organizationOptions }))
        );
    });

    this.loadSuggestions('riktning', this.caseEditOptions.getDirectorySuggestions('ArendeRiktning'));
    this.loadSuggestions('secret', this.caseEditOptions.getDirectorySuggestions('Sekretess'));
    this.loadSuggestions('secretClass', this.caseEditOptions.getDirectorySuggestions('Sakerhetsskyddsklassificering'));
    this.loadSuggestions('userOptions', this.caseEditOptions.getUserSuggestions());
    this.loadSuggestions('arendestatus', this.caseEditOptions.getDirectorySuggestions('Arendestatus'));
    this.loadSuggestions('handlaggningsstatus', this.caseEditOptions.getDirectorySuggestions('Handlaggningsstatus'));
    this.loadSuggestions('lagrum', this.caseEditOptions.getLagrumSuggestions());
    this.loadSuggestions('bevaras', this.caseEditOptions.getBevarasSuggestions());
  };
  //#region 🔹 Private Methods
  private fetch(pageInfo: ListByTabOpts) {
    this.loading.set(true);
    const deadlinesTab = pageInfo.tab === 'my-monitoring';
    const requestTasks = deadlinesTab || pageInfo.tab === 'my-tasks';
    const shouldLoadAggs = this.loadCreatedAggs();

    const request$ = requestTasks
      ? this.casesService.getAllTasks(this.pageSize(), pageInfo.page).pipe(
          map(res => {
            const deadlineItems = res.entries.filter(entry => entry.workflowModelName === 'DeadlineOchPaminnelse');
            return {
              items: deadlinesTab
                ? deadlineItems.map(doc => this.mapTaskItem(doc))
                : res.entries.map(doc => this.mapTaskItem(doc)),
              total: res.resultsCount,
              createdAggBuckets: this.emptyAggBuckets,
              parentRef: '',
            };
          })
        )
      : this.casesService.listByTab(pageInfo).pipe(
          map(res => {
            return {
              items: res.entries.map(doc => this.toTableItem(doc, this.tab())),
              total: res.totalSize,
              createdAggBuckets: shouldLoadAggs
                ? undefined
                : this.pickCreatedAggBuckets(res.aggregations?.dublincore_created_agg),
              parentRef: res.entries?.[0]?.parentRef ?? '',
            };
          })
        );

    request$
      .pipe(
        finalize(() => this.loading.set(false)),
        catchError(() => {
          this.casesSig.set([]);
          this.total.set(0);
          this.loading.set(false);
          return EMPTY;
        })
      )
      .subscribe(({ items, total, createdAggBuckets, parentRef }) => {
        this.casesSig.set(items);
        this.total.set(total);
        if (createdAggBuckets) {
          this.createdAggBucketsChange.emit(createdAggBuckets);
        }
        if (parentRef && parentRef !== this.columnSearchParentRef()) {
          this.columnSearchParentRef.set(parentRef);
        }
      });
  }

  updateDropdownValues(event: { fieldName: string; value: string }) {
    if (event.fieldName !== 'organization') return;
    const parentRef = this.editDoc()?.parentRef;
    if (!parentRef) return;

    this.caseEditOptions
      .getDocumentSuggestions(parentRef, 'Organisationsdel', event.value)
      .pipe(
        tap(organizationOptions => {
          this.suggestions.update(currentSuggestions => ({ ...currentSuggestions, organization: organizationOptions }));
        }),
        catchError(error => {
          const errorInfo = analyzeError(error, { fallbackMessage: ORGANIZATION_LOAD_ERROR_MESSAGE });
          this.store.notification.set({
            show: true,
            variation: getNotificationVariation(errorInfo.statusCode),
            text: errorInfo.message,
          });
          this.suggestions.update(currentSuggestions => ({ ...currentSuggestions, organization: [] }));
          return EMPTY;
        })
      )
      .subscribe();
  }

  private fetchCreatedAggBuckets(pageInfo: ListByTabOpts): void {
    this.casesService.getCreatedAggBucketsByTab(pageInfo).subscribe({
      next: buckets => this.createdAggBucketsChange.emit(buckets),
      error: () => this.createdAggBucketsChange.emit(this.emptyAggBuckets),
    });
  }

  private pickCreatedAggBuckets(agg: { buckets: AggBucket[]; extendedBuckets: AggBucket[] } | undefined): AggBucket[] {
    if (!agg) return this.emptyAggBuckets;
    if (agg.buckets?.length) return agg.buckets;
    if (agg.extendedBuckets?.length) return agg.extendedBuckets;
    return this.emptyAggBuckets;
  }

  private mapTaskItem(doc: WorkflowInfo): TableItem {
    return {
      title:
        doc.workflowModelName !== NUXEO_VOCAB_IDS.arbetsflode.allmanArbetsflode
          ? (this.store.getValue(`label.ui.workflow.${doc.workflowTitle}`) ?? doc.workflowTitle)
          : doc.variables.valdAtgard?.properties?.label + ' (' + doc.workflowTitle + ')',
      docTitel: doc.targetDocumentIds[0]?.title,
      created: new Date(doc.created).toLocaleDateString('sv-SE'),
      workflowInitiator: doc.workflowInitiator,
      status: doc.state ?? '—',
      state: this.store.getStatus(doc.state) ?? '',
      description: doc.variables?.beskrivning ?? '',
      deadline: doc.variables.deadline ? new Date(doc.variables.deadline).toLocaleDateString('sv-SE') : '',
      reminder: doc.variables.paminnelse ? new Date(doc.variables.paminnelse).toLocaleDateString('sv-SE') : '',
      link: ['/doc', doc.targetDocumentIds[0]?.uid],
      actors: doc.actors.map(el => this.getFullNames(el)).join(', '),
    };
  }

  private toTableItem(doc: NuxeoDocument<ArendeExtendedProperties>, tab: string): TableItem {
    switch (tab) {
      case 'my-cases': {
        const props = doc.properties as ArendeExtendedProperties;
        const status = props[NUXEO_SCHEMA_FIELDS.arende.arendestatus]?.properties?.id;
        const riktning = props[NUXEO_SCHEMA_FIELDS.arende.riktning]?.properties?.label;
        const sekretess = props[NUXEO_SCHEMA_FIELDS.arende.sekretess]?.properties?.label;
        const sakerhetsskyddsklassificering =
          props[NUXEO_SCHEMA_FIELDS.arende.sakerhetsskyddsklassificering]?.properties?.label;
        const handlaggningsstatus = props[NUXEO_SCHEMA_FIELDS.arende.handlaggningsstatus]?.properties?.id;
        const behorighetsstatus = props[NUXEO_SCHEMA_FIELDS.arende.behorighetsstatus]?.properties?.label;
        const arendetyp = props[NUXEO_SCHEMA_FIELDS.arende.arendetyp]?.title;
        const ansvarigEnhet = props[NUXEO_SCHEMA_FIELDS.arende.ansvarigOrganisatoriskEnhet]?.title;

        const ansvarigHandlaggareProps = props[NUXEO_SCHEMA_FIELDS.arende.ansvarigHandlaggare]?.properties;
        const ansvarigHandlaggare =
          `${ansvarigHandlaggareProps?.firstName ?? ''} ${ansvarigHandlaggareProps?.lastName ?? ''}`.trim() || '—';

        const ansvarigChefProps = props[NUXEO_SCHEMA_FIELDS.arende.ansvarigOrganisationsenhetschef]?.properties;
        const ansvarigChef = `${ansvarigChefProps?.firstName ?? ''} ${ansvarigChefProps?.lastName ?? ''}`.trim() || '—';

        const beslutsfattareProps = props[NUXEO_SCHEMA_FIELDS.arende.ansvarigBeslutsfattare]?.properties;
        const beslutsfattare =
          `${beslutsfattareProps?.firstName ?? ''} ${beslutsfattareProps?.lastName ?? ''}`.trim() || '—';

        const medhandlaggare = (props[NUXEO_SCHEMA_FIELDS.arende.medhandlaggare] ?? [])
          .map(user => `${user?.properties?.firstName ?? ''} ${user?.properties?.lastName ?? ''}`.trim())
          .filter(Boolean)
          .join(', ');
        const granskare = (props[NUXEO_SCHEMA_FIELDS.arende.granskare] ?? [])
          .map(user => `${user?.properties?.firstName ?? ''} ${user?.properties?.lastName ?? ''}`.trim())
          .filter(Boolean)
          .join(', ');

        const lastContributorProps = props[NUXEO_SCHEMA_FIELDS.dc.lastContributor]?.properties;
        const lastContributor =
          `${lastContributorProps?.firstName ?? ''} ${lastContributorProps?.lastName ?? ''}`.trim() || '—';

        const bevarasGallras = props[NUXEO_SCHEMA_FIELDS.arende.bevarasGallras]?.properties?.label ?? '—';

        return {
          id: doc.uid,
          title: doc.title ?? '—',
          state: doc.state ?? '',
          caseState: doc.state ?? '',

          status,
          arendenummer: props[NUXEO_SCHEMA_FIELDS.arende.arendenummer] ?? '—',
          datum: this.getDate(props[NUXEO_SCHEMA_FIELDS.arende.arendetRegistreratDatum]) ?? '—',
          handlaggare: ansvarigHandlaggare,

          avandare: ansvarigHandlaggare,

          arendetyp,
          riktning,
          sekretess,
          sakerhetsskyddsklassificering,
          handlaggningsstatus,
          behorighetsstatus,

          ansvarigEnhet,
          ansvarigChef,
          beslutsfattare,
          medhandlaggare,
          granskare,

          motpart: props[NUXEO_SCHEMA_FIELDS.arende.motpart]?.motpart ?? '—',
          arendemening: props[NUXEO_SCHEMA_FIELDS.arende.arendemening],
          internArendemening: props[NUXEO_SCHEMA_FIELDS.arende.internArendemening],
          bevarasGallras,

          arkiveratDatum: this.getDate(props[NUXEO_SCHEMA_FIELDS.arende.arendetArkiveratDatum]),
          gallratDatum: this.getDate(props[NUXEO_SCHEMA_FIELDS.arende.arendetGallratDatum]),
          makuleratDatum: this.getDate(props[NUXEO_SCHEMA_FIELDS.arende.arendetMakuleratDatum]),

          jkKommentar: props[NUXEO_SCHEMA_FIELDS.arende.jkKommentar],
          allmanKommentar: props[NUXEO_SCHEMA_FIELDS.arende.allmanKommentar],

          created: this.getDate(props[NUXEO_SCHEMA_FIELDS.dc.created]),
          modified: this.getDate(props[NUXEO_SCHEMA_FIELDS.dc.modified]),
          lastContributor,
          handlaggningPaborjad: this.getDate(props[NUXEO_SCHEMA_FIELDS.arende.handlaggningPaborjad]),
          handlaggningAvslutad: this.getDate(props[NUXEO_SCHEMA_FIELDS.arende.handlaggningAvslutad]),
          beslutatDatum: this.getDate(props[NUXEO_SCHEMA_FIELDS.arende.beslutatDatum]),
          beslutExpedieratDatum: this.getDate(props[NUXEO_SCHEMA_FIELDS.arende.beslutExpedieratDatum]),

          link: ['/doc', doc.uid],
        };
      }
      case 'my-utkasts': {
        const props = doc.properties as HandlingExtendedProperties;
        const creator = this.getFullNames(props[NUXEO_SCHEMA_FIELDS.dc.creator]);
        const lastContributor = this.getFullNames(props[NUXEO_SCHEMA_FIELDS.dc.lastContributor]);
        const contributors = props[NUXEO_SCHEMA_FIELDS.dc.contributors]?.map(el => this.getFullNames(el)).join(', ');

        return {
          id: doc.uid,
          title: doc.title ?? '—',
          state: doc.state ?? '',
          created: this.getDate(props[NUXEO_SCHEMA_FIELDS.dc.created]),
          modified: this.getDate(props[NUXEO_SCHEMA_FIELDS.dc.modified]),
          creator,
          lastContributor,
          contributors,

          link: ['/doc', doc.uid],
        };
      }

      case 'all-docs': {
        const props = doc.properties as ArendeExtendedProperties;
        const arendestatus = props[NUXEO_SCHEMA_FIELDS.arende.arendestatus]?.properties?.id;
        const riktning = props[NUXEO_SCHEMA_FIELDS.arende.riktning]?.properties?.label;
        const sekretess = props[NUXEO_SCHEMA_FIELDS.arende.sekretess]?.properties?.label;
        const sakerhetsskyddsklassificering =
          props[NUXEO_SCHEMA_FIELDS.arende.sakerhetsskyddsklassificering]?.properties?.label;
        const handlaggningsstatus = props[NUXEO_SCHEMA_FIELDS.arende.handlaggningsstatus]?.properties?.id;
        const behorighetsstatus = props[NUXEO_SCHEMA_FIELDS.arende.behorighetsstatus]?.properties?.label;
        const arendetyp = props[NUXEO_SCHEMA_FIELDS.arende.arendetyp]?.title;
        const ansvarigEnhet = props[NUXEO_SCHEMA_FIELDS.arende.ansvarigOrganisatoriskEnhet]?.title;
        const ansvarigHandlaggareProps = props[NUXEO_SCHEMA_FIELDS.arende.ansvarigHandlaggare]?.properties;
        const ansvarigHandlaggare =
          `${ansvarigHandlaggareProps?.firstName ?? ''} ${ansvarigHandlaggareProps?.lastName ?? ''}`.trim() || '—';

        const ansvarigChefProps = props[NUXEO_SCHEMA_FIELDS.arende.ansvarigOrganisationsenhetschef]?.properties;
        const ansvarigChef = `${ansvarigChefProps?.firstName ?? ''} ${ansvarigChefProps?.lastName ?? ''}`.trim() || '—';

        const beslutsfattareProps = props[NUXEO_SCHEMA_FIELDS.arende.ansvarigBeslutsfattare]?.properties;
        const beslutsfattare =
          `${beslutsfattareProps?.firstName ?? ''} ${beslutsfattareProps?.lastName ?? ''}`.trim() || '—';

        const medhandlaggare = (props[NUXEO_SCHEMA_FIELDS.arende.medhandlaggare] ?? [])
          .map(user => `${user?.properties?.firstName ?? ''} ${user?.properties?.lastName ?? ''}`.trim())
          .filter(Boolean)
          .join(', ');
        const granskare = (props[NUXEO_SCHEMA_FIELDS.arende.granskare] ?? [])
          .map(user => `${user?.properties?.firstName ?? ''} ${user?.properties?.lastName ?? ''}`.trim())
          .filter(Boolean)
          .join(', ');
        const bevarasGallras = props[NUXEO_SCHEMA_FIELDS.arende.bevarasGallras]?.properties?.label ?? '—';

        return {
          id: doc.uid,
          title: doc.title ?? '—',
          state: doc.state ?? '',
          caseState: doc.state ?? '',
          inkommet: this.getDate(props[NUXEO_SCHEMA_FIELDS.dc.created]),
          arendetyp,
          arendenummer: props[NUXEO_SCHEMA_FIELDS.arende.arendenummer] ?? '—',
          registreratDatum: this.getDate(props[NUXEO_SCHEMA_FIELDS.arende.arendetRegistreratDatum]),
          arendestatus,
          handlaggningsstatus,
          behorighetsstatus,
          motpart: props[NUXEO_SCHEMA_FIELDS.arende.motpart]?.motpart ?? '—',
          riktning,
          sekretess,
          sakerhetsskyddsklassificering,
          ansvarigEnhet,
          ansvarigChef,
          handlaggare: ansvarigHandlaggare,
          beslutsfattare,
          medhandlaggare,
          granskare,
          arendemening: props[NUXEO_SCHEMA_FIELDS.arende.arendemening],
          internArendemening: props[NUXEO_SCHEMA_FIELDS.arende.internArendemening],
          bevarasGallras,
          innehallerPersonuppgifter: props[NUXEO_SCHEMA_FIELDS.arende.innehallerPersonuppgifterGdpr],
          jkKommentar: props[NUXEO_SCHEMA_FIELDS.arende.jkKommentar],
          allmanKommentar: props[NUXEO_SCHEMA_FIELDS.arende.allmanKommentar],
          created: this.getDate(props[NUXEO_SCHEMA_FIELDS.dc.created]),
          modified: this.getDate(props[NUXEO_SCHEMA_FIELDS.dc.modified]),
          arkiveratDatum: this.getDate(props[NUXEO_SCHEMA_FIELDS.arende.arendetArkiveratDatum]),
          gallratDatum: this.getDate(props[NUXEO_SCHEMA_FIELDS.arende.arendetGallratDatum]),
          makuleratDatum: this.getDate(props[NUXEO_SCHEMA_FIELDS.arende.arendetMakuleratDatum]),
          handlaggningPaborjad: this.getDate(props[NUXEO_SCHEMA_FIELDS.arende.handlaggningPaborjad]),
          handlaggningAvslutad: this.getDate(props[NUXEO_SCHEMA_FIELDS.arende.handlaggningAvslutad]),
          beslutatDatum: this.getDate(props[NUXEO_SCHEMA_FIELDS.arende.beslutatDatum]),
          beslutExpedieratDatum: this.getDate(props[NUXEO_SCHEMA_FIELDS.arende.beslutExpedieratDatum]),
          link: ['/doc', doc.uid],
        };
      }

      case 'ready-to-close': {
        const props = doc.properties as ArendeExtendedProperties;
        const arendetyp = props[NUXEO_SCHEMA_FIELDS.arende.arendetyp]?.title ?? '';
        const ansvarigEnhet = props[NUXEO_SCHEMA_FIELDS.arende.ansvarigOrganisatoriskEnhet]?.title ?? '';
        const riktning = props[NUXEO_SCHEMA_FIELDS.arende.riktning]?.properties?.label ?? '';
        const arendestatus = props[NUXEO_SCHEMA_FIELDS.arende.arendestatus]?.properties?.id ?? '';
        const handlaggningsstatus = props[NUXEO_SCHEMA_FIELDS.arende.handlaggningsstatus]?.properties?.id ?? '';
        const behorighetsstatus = props[NUXEO_SCHEMA_FIELDS.arende.behorighetsstatus]?.properties?.label ?? '';
        const sekretess = props[NUXEO_SCHEMA_FIELDS.arende.sekretess]?.properties?.label ?? '';
        const sakerhetsskyddsklassificering =
          props[NUXEO_SCHEMA_FIELDS.arende.sakerhetsskyddsklassificering]?.properties?.label ?? '';
        const bevarasGallras = props[NUXEO_SCHEMA_FIELDS.arende.bevarasGallras]?.properties?.label ?? '';

        const handlaggare = this.getFullNames(props[NUXEO_SCHEMA_FIELDS.arende.ansvarigHandlaggare]);

        const ansvarigChef = this.getFullNames(props[NUXEO_SCHEMA_FIELDS.arende.ansvarigOrganisationsenhetschef]);
        const beslutsfattare = this.getFullNames(props[NUXEO_SCHEMA_FIELDS.arende.ansvarigBeslutsfattare]);
        const medhandlaggare =
          props[NUXEO_SCHEMA_FIELDS.arende.medhandlaggare]?.map(user => this.getFullNames(user)) ?? [];
        const granskare = props[NUXEO_SCHEMA_FIELDS.arende.granskare]?.map(user => this.getFullNames(user)) ?? [];
        const arendepart = props[NUXEO_SCHEMA_FIELDS.arende.motpart]?.motpart ?? '';

        return {
          id: doc.uid,
          title: doc.title ?? '—',
          arendenummer: props[NUXEO_SCHEMA_FIELDS.arende.arendenummer] ?? '—',
          registreratDatum: this.getDate(props[NUXEO_SCHEMA_FIELDS.arende.arendetRegistreratDatum]),
          status: doc.state ?? '',
          handlaggare,
          avdelning: ansvarigEnhet,
          rubrik: arendepart,
          arendetyp,
          arendepart,
          riktning,
          ansvarigEnhet,
          arendestatus,
          handlaggningsstatus,
          behorighetsstatus,
          sekretess,
          sakerhetsskyddsklassificering,
          ansvarigChef,
          beslutsfattare,
          medhandlaggare,
          granskare,
          bevarasGallras,
          arkiveratDatum: this.getDate(props[NUXEO_SCHEMA_FIELDS.arende.arendetArkiveratDatum]),
          gallratDatum: this.getDate(props[NUXEO_SCHEMA_FIELDS.arende.arendetGallratDatum]),
          makuleratDatum: this.getDate(props[NUXEO_SCHEMA_FIELDS.arende.arendetMakuleratDatum]),
          link: ['/doc', doc.uid],
        };
      }

      case 'e-post': {
        const props = doc.properties as NuxeoProperties;
        const lastContributorProps = props[NUXEO_SCHEMA_FIELDS.dc.lastContributor]?.properties;
        const lastContributor =
          `${lastContributorProps?.firstName ?? ''} ${lastContributorProps?.lastName ?? ''}`.trim() || '—';
        const extraheradeArendenummer = props[NUXEO_SCHEMA_FIELDS.import.extraheradeData]?.arendenummer?.varde;

        return {
          id: doc.uid,
          title: doc.title ?? '—',
          type: doc.type ?? '',
          state: doc.state ?? '',
          sender: props[NUXEO_SCHEMA_FIELDS.mail.sender],
          recipients: props[NUXEO_SCHEMA_FIELDS.mail.recipients],
          sendingDate: this.getDate(props[NUXEO_SCHEMA_FIELDS.mail.sendingDate]),
          ccRecipients: props[NUXEO_SCHEMA_FIELDS.mail.ccRecipients],
          messageId: props[NUXEO_SCHEMA_FIELDS.mail.messageId],
          text: props[NUXEO_SCHEMA_FIELDS.mail.text],
          created: this.getDate(props[NUXEO_SCHEMA_FIELDS.dc.created]),
          modified: this.getDate(props[NUXEO_SCHEMA_FIELDS.dc.modified]),
          lastContributor,
          arendenummer: extraheradeArendenummer,
          link: ['/doc', doc.uid],
        };
      }

      case 'scans': {
        const props = doc.properties as NuxeoProperties;
        const lastContributorProps = props[NUXEO_SCHEMA_FIELDS.dc.lastContributor]?.properties;
        const lastContributor =
          `${lastContributorProps?.firstName ?? ''} ${lastContributorProps?.lastName ?? ''}`.trim() || '—';

        return {
          id: doc.uid,
          title: doc.title ?? '—',
          type: doc.type ?? '',
          state: doc.state ?? '',
          created: this.getDate(props[NUXEO_SCHEMA_FIELDS.dc.created]),
          modified: this.getDate(props[NUXEO_SCHEMA_FIELDS.dc.modified]),
          lastContributor,
          description: props[NUXEO_SCHEMA_FIELDS.dc.description],
          dataExtracted: String(props[NUXEO_SCHEMA_FIELDS.import.arDataExtraherad] ?? ''),
          link: ['/doc', doc.uid],
        };
      }

      default: {
        const props = doc.properties as ArendeExtendedProperties;
        const ansvarigHandlaggareProps = props[NUXEO_SCHEMA_FIELDS.arende.ansvarigHandlaggare]?.properties;
        const ansvarigHandlaggare =
          `${ansvarigHandlaggareProps?.firstName ?? ''} ${ansvarigHandlaggareProps?.lastName ?? ''}`.trim() || '—';
        const status = props[NUXEO_SCHEMA_FIELDS.arende.arendestatus]?.properties?.id;

        return {
          id: doc.uid,
          title: doc.title ?? '—',
          status,
          handlingsnummer: props[NUXEO_SCHEMA_FIELDS.arende.arendenummer] ?? '—',
          datum: this.getDate(props[NUXEO_SCHEMA_FIELDS.arende.arendetRegistreratDatum]) ?? '—',
          avandare: ansvarigHandlaggare,
          link: ['/doc', doc.uid],
        };
      }
    }
  }
  private buildInternalContactsData(doc: NuxeoDocument<ArendeExtendedProperties>) {
    const pickUser = (value: NxUser | string | null | undefined): { id?: string; email?: string; company?: string } => {
      if (!value) return {};
      if (typeof value === 'string') return { id: value };
      const props = value.properties;
      const id = typeof value.id === 'string' ? value.id : undefined;
      const email = typeof props?.email === 'string' ? props.email : undefined;
      const company = typeof props?.company === 'string' ? props.company : undefined;
      return { id, email, company };
    };

    const ansv = pickUser(doc.properties?.[NUXEO_SCHEMA_FIELDS.arende.ansvarigHandlaggare]);
    const medh = pickUser(doc.properties?.[NUXEO_SCHEMA_FIELDS.arende.medhandlaggare]?.[0]);
    const besl = pickUser(doc.properties?.[NUXEO_SCHEMA_FIELDS.arende.ansvarigBeslutsfattare]);
    const gran = pickUser(doc.properties?.[NUXEO_SCHEMA_FIELDS.arende.granskare]?.[0]);

    this.internalContactsData.set([
      {
        type: 'Ansvarig handlaggare',
        name: ansv.id,
        id: crypto.randomUUID(),
        email: ansv.email ?? '',
        org: ansv.company ?? '',
      },
      {
        type: 'Medhandlaggare',
        name: medh.id,
        id: crypto.randomUUID(),
        email: medh.email ?? '',
        org: medh.company ?? '',
      },
      {
        type: 'Beslutsfattare',
        name: besl.id,
        id: crypto.randomUUID(),
        email: besl.email ?? '',
        org: besl.company ?? '',
      },
      {
        type: 'Granskare av arendet',
        name: gran.id,
        id: crypto.randomUUID(),
        email: gran.email ?? '',
        org: gran.company ?? '',
      },
    ]);
  }

  private loadSuggestions(key: string, observable: Observable<Option[]>): void {
    observable
      .pipe(
        tap(options => {
          this.suggestions.update(current => ({ ...current, [key]: options }));
        }),
        catchError(_err => {
          this.store.notification.set({
            show: true,
            variation: 'danger',
            text: buildLoadOptionsErrorMessage(key),
          });
          return EMPTY;
        })
      )
      .subscribe();
  }

  getDate(date: string | Date | undefined | null): string {
    return formatDateOrMissing(date);
  }

  private resetColumnSearch(): void {
    this.columnFilters.set({});
    this.page.set(0);
  }

  private toRangeFieldBase(value: string): string {
    const trimmed = value.trim();
    if (!trimmed) return '';

    const normalized = trimmed.replace(/:/g, '_').replace(/(_min|_max)$/i, '');
    switch (normalized) {
      case 'dc_created':
        return 'dublincore_created';
      case 'dc_modified':
        return 'dublincore_modified';
      default:
        return normalized;
    }
  }

  formatEditForm(formResult: EditCaseResult) {
    if (!this.editDoc()) return;

    const registeredDate = formResult?.arendeDetails?.registered?.[0];
    const formProperties: Record<string, unknown> = getFormProperties(formResult, registeredDate);

    this.store.notification.set({
      show: true,
      variation: 'info',
      text: CASES_LIST_SAVING_CHANGES_MESSAGE,
    });

    this.nuxeoApi
      .editDocument(this.editDoc()!.uid, formProperties)
      .pipe(
        tap(() => {
          this.store.notification.set({
            show: true,
            variation: 'success',
            text: CASES_LIST_CHANGES_SAVED_MESSAGE,
          });
          this.isEditDialogOpen.set(false);
          this.updateDocument();
        }),
        catchError(err => {
          this.store.notification.set({
            show: true,
            variation: 'danger',
            text: err?.error?.violations?.[0]?.message ?? CASES_LIST_SAVE_ERROR_MESSAGE,
          });
          return EMPTY;
        })
      )
      .subscribe();
  }
  //#endregion
  getDefaultColumnOptions(): TableColOption[] {
    return this.tableConfig.map(col => ({
      id: col.key.toString(),
      label: col.label,
      visible: col.visible ?? true,
    }));
  }

  openCreateHandlingDialog(uid: string) {
    // 1️⃣ Fetch full document with files:files schema
    this.nuxeoApi.getDocumentById(uid, true).subscribe(fullDoc => {
      this.selectedMailDoc.set(fullDoc);

      // 2️⃣ Extract attachments from the real document
      const files = fullDoc.properties?.[NUXEO_SCHEMA_FIELDS.files.files] ?? [];
      const attachments = files.map((el, idx) => ({
        id: `attachment-${idx}`,
        label: el?.file?.name ?? `Bilaga ${idx + 1}`,
      }));

      this.attachmentsOptions.set(attachments);
      this.isCreateHandlingOpen.set(true);
    });
  }

  exportToCSV(columns: TableColumn[]): void {
    const exportColumns = this.csvExportService.getExportColumns(columns, CSV_EXPORT_EXCLUDED_FIELDS);
    if (!exportColumns.length) {
      this.csvExportService.notifyNoExportableColumns();
      return;
    }
    const headers = exportColumns.map(col => col.header);
    const fields = exportColumns.map(col => col.field);
    const params = this.params();
    const username = this.auth.username();

    const { providerName, namedParameters, queryParams } = this.casesService.getCsvExportParams({
      ...params,
      username,
    });

    this.csvExportService.exportToCSV({
      headers,
      fields,
      providerName,
      currentPageIndex: params.page!,
      offset: params.page! * params.pageSize!,
      pageSize: params.pageSize!,
      namedParameters,
      queryParams,
    });
  }

  getFullNames(props?: NxUser) {
    return props ? props?.properties?.firstName + ' ' + props?.properties?.lastName : '';
  }
}
