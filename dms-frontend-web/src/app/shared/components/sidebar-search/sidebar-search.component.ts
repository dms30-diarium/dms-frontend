import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  OnInit,
  output,
  Signal,
  signal,
  WritableSignal,
} from '@angular/core';
import { NUXEO_SCHEMA_FIELDS } from '@app/shared/constants/nuxeo-schema-fields';

import { HttpClient } from '@angular/common/http';
import {
  AdvancedSearchDocument,
  AggregationKey,
  ArendeExtendedProperties,
  NuxeoDocument,
  NxUser,
  SavedSearchParams,
  SavedSearchResult,
  SearchResult,
  UserSuggestion,
} from '@app/shared/api/nuxeo-api.types';
import { toISODateOnlyString } from '@app/shared/utils/date-utils';
import { ActivatedRoute, ChildActivationEnd, Router } from '@angular/router';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatSelectModule } from '@angular/material/select';
import {
  DigiButton,
  DigiCalendarDatepicker,
  DigiDialog,
  DigiFormInput,
  DigiFormInputSearch,
  DigiFormSelectFilter,
  DigiIconBookmarkOutline,
  DigiIconFilter,
  DigiIconListUl,
  DigiIconRedo,
  DigiIconSettings,
  DigiIconShareAlt,
  DigiIconTable,
  DigiIconTrash,
  DigiNavigationPagination,
  TextValueAccessor,
} from '@designsystem-se/af-angular';
import { NuxeoApiService } from '@app/shared/api/nuxeo-api.service';
import { Option } from '@app/shared/commonTypes';
import {
  ButtonVariation,
  DigiNavigationPaginationCustomEvent,
  FormSelectValidation,
  FormSelectVariation,
  IListItem,
} from '@designsystem-se/af';
import { TableItem } from '@app/shared/models/case-table';
import { FormTypes } from '@app/pages/document-search/document-search-types';
import { catchError, EMPTY, from, mergeMap, tap } from 'rxjs';
import { getPathByDocType } from '@app/shared/utils';
import { formatDateOrMissing } from '@app/shared/utils/date-utils';
import { SearchService } from '@app/core/services/search-service';
import { SearchSortService } from '@app/core/services/search-sort.service';
import { DocumentValueService } from '@app/core/services/document-value-service.service';
import { GetOptionsService } from '@app/core/services/get-options.service';
import { AccordionComponent } from '../accordion/accordion.component';
import { SearchFilterOptionsComponent } from '../search-filter-options/search-filter-options.component';
import { SearchFilterOption } from '../search-filter-options/search-filter-options.types';
import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { toSignal } from '@angular/core/rxjs-interop';
import { GeneralStore } from '@app/core/services/general-store.service';
import { getHandlingTableItems, getUtkastTableItems } from '@app/pages/case-page/utils';
import { buildAdvancedSearchQueryParams } from './advanced-search.utils';
import {
  SIDEBAR_SEARCH_SHARE_ERROR_MESSAGE,
  SIDEBAR_SEARCH_SHARED_MESSAGE,
} from '@app/shared/constants/notification-messages';
import { SvgIconComponent } from '../svg-icon/svg-icon.component';

interface SearchField {
  key: string;
  type: 'search' | 'select' | 'date';
  label?: string;
  options?: { id: string; label: string }[];
  multiple?: boolean;
  visible: boolean;
}

type Field = SearchField;
interface DropdownDefinition {
  key: string;
  label: string;
  options?: () => Option[];
  visibilityGroup?: 'arende' | 'handling';
}
@Component({
  selector: 'nuxeo-sidebar-search',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatSelectModule,
    DigiButton,
    DigiCalendarDatepicker,
    DigiDialog,
    DigiFormInput,
    DigiFormInputSearch,
    DigiFormSelectFilter,
    DigiIconBookmarkOutline,
    DigiIconFilter,
    DigiIconListUl,
    DigiIconRedo,
    DigiIconSettings,
    DigiIconShareAlt,
    DigiIconTable,
    DigiIconTrash,
    DigiNavigationPagination,
    AccordionComponent,
    SearchFilterOptionsComponent,
    DragDropModule,
    TextValueAccessor,
    SvgIconComponent,
  ],
  templateUrl: './sidebar-search.component.html',
  styleUrl: './sidebar-search.component.scss',
})
export class SidebarSearchComponent implements OnInit {
  private motpartDraft = '';
  readonly router = inject(Router);
  readonly searchService = inject(SearchService);
  readonly searchSortService = inject(SearchSortService);
  readonly route = inject(ActivatedRoute);
  readonly http: HttpClient = inject(HttpClient);
  readonly valueService = inject(DocumentValueService);
  readonly getOptionsService = inject(GetOptionsService);
  docTypeOptions = signal<Option[]>([]);
  private readonly baseDocTypeOptions: Option[] = [
    { id: 'Arende', label: 'Ärende' },
    { id: 'Handling', label: 'Handling' },
    { id: 'Utkast', label: 'Utkast' },
  ];
  skapaOptions = signal<Option[]>([]);
  arendeStatusOptions = signal<Option[]>([]);
  arendeTypOptions = signal<Option[]>([]);
  arendeHandlaggningsstatusOptions = signal<Option[]>([]);
  arendeRiktningOptions = signal<Option[]>([]);
  arendeSakerhetOptions = signal<Option[]>([]);
  arendeSekretessOptions = signal<Option[]>([]);
  arendePersonuppgifterOptions = signal<Option[]>([]);
  handlingsStatusOptions = signal<Option[]>([]);
  handlingsTypOptions = signal<Option[]>([]);
  handlingRiktningOptions = signal<Option[]>([]);
  handlingInkanalViaOptions = signal<Option[]>([]);
  handlingSigneradOptions = signal<Option[]>([]);
  handlingSakerhetOptions = signal<Option[]>([]);
  handlingSekretessOptions = signal<Option[]>([]);
  handlingBevarasGallrasOptions = signal<Option[]>([]);
  handlingForvaringsmediaOptions = signal<Option[]>([]);
  private handlaggningsStatusDirectoryOptions = signal<Option[]>([]);
  private handlingStatusDirectoryOptions = signal<Option[]>([]);
  readonly nuxeoApi = inject(NuxeoApiService);
  readonly fb = inject(FormBuilder);
  resultsCount = signal<number>(0);
  buttonVariation = ButtonVariation.PRIMARY;
  FormSelectVariation = FormSelectVariation;
  FormSelectValidation = FormSelectValidation;
  entries = signal<TableItem[] | null>([]);
  selectedDocument = signal<string | null>(null);
  isShareSearchDialogOpen = signal<boolean>(false);
  isFilterOptionsOpen = signal(false);
  searchToShareId = signal<string | null>(null);
  shareUserOptions = signal<IListItem[]>([]);
  shareGroupOptions = signal<IListItem[]>([]);
  shareGroupUserOptions = signal<IListItem[]>([]);
  shareGroupId = signal<string>('');
  isListOpen = output<boolean>();
  user = input<NxUser | undefined>();
  private store = inject(GeneralStore);
  shouldShowForm = signal(true);
  showSaveSeachDialog = signal(false);
  arendeIcon = '/nuxeo/app/assets/figmaIcons/arende.svg';
  handlingIcon = '/nuxeo/app/assets/figmaIcons/handling.svg';
  utkastIcon = '/nuxeo/app/assets/figmaIcons/utkast.svg';
  savedSearches = signal<SavedSearchResult | null>(null);
  form!: FormGroup;
  formSignal!: Signal<string[]>;
  fieldsOrder = signal<string[] | null>(null);
  readonly filterOptionsStorageKey = 'sidebar_search_filter_options';
  readonly defaultFilterOptions = this.createDefaultFilterOptions();
  filterOptions = signal<SearchFilterOption[]>(this.defaultFilterOptions);
  filterVisibility = computed(() => {
    const visibility = new Map<string, boolean>();
    this.filterOptions().forEach(option => visibility.set(option.id, option.visible));
    return visibility;
  });
  dialogFilterOptions = computed(() => {
    const { showArende, showHandling } = this.getDocTypeVisibility();
    const groupMap = this.getDropdownGroupMap();
    return this.filterOptions().filter(option =>
      this.isGroupVisible(groupMap.get(option.id), showArende, showHandling)
    );
  });
  dialogDefaultFilterOptions = computed(() => {
    const { showArende, showHandling } = this.getDocTypeVisibility();
    const groupMap = this.getDropdownGroupMap();
    return this.defaultFilterOptions.filter(option =>
      this.isGroupVisible(groupMap.get(option.id), showArende, showHandling)
    );
  });
  pageSize = 25;
  private skipQuickStatusSearch = false;
  private skipQuickOrgSearch = false;
  private skipQuickDateSearch = false;
  private readonly quickArendeDateFields = [
    'arende_arendet_registrerat_datum_min',
    'arende_arendet_registrerat_datum_max',
    'arende_beslutat_datum_min',
    'arende_beslutat_datum_max',
    'arende_arendet_avslutat_datum_min',
    'arende_arendet_avslutat_datum_max',
    'arende_arendet_arkiverat_datum_min',
    'arende_arendet_arkiverat_datum_max',
    'arende_arendet_gallrat_datum_min',
    'arende_arendet_gallrat_datum_max',
    'arende_arendet_makulerat_datum_min',
    'arende_arendet_makulerat_datum_max',
  ];
  private readonly quickHandlingDateFields = [
    'handling_inkommen_datum_min',
    'handling_inkommen_datum_max',
    'handling_upprattad_datum_min',
    'handling_upprattad_datum_max',
    'handling_beslutat_datum_min',
    'handling_beslutat_datum_max',
    'handling_expedierad_datum_min',
    'handling_expedierad_datum_max',
  ];

  private schemaLabel(schema: 'arende' | 'handling', field: string, fallback: string): string {
    return this.store.getValue(`label.ui.schema.${schema}.${field}`) ?? fallback;
  }

  fields = computed(() => {
    const visibility = this.filterVisibility();
    const isVisible = (key: string, baseVisible: boolean) => (visibility.get(key) ?? true) && baseVisible;
    const docTypes = this.formSignal?.() ?? [];
    const showArende = docTypes.includes('Arende');
    const showHandling = docTypes.includes('Handling') || docTypes.includes('Utkast');

    const fields = [
      { key: 'searchLine', type: 'search', label: 'Sök på webbplatsen', visible: isVisible('searchLine', true) },
      { key: 'motpart', type: 'search', label: 'Motpart', visible: isVisible('motpart', true) },
      {
        key: 'docOptions',
        type: 'select',
        label: 'Informationsobjekt',
        options: this.docTypeOptions(),
        visible: isVisible('docOptions', true),
      },
      {
        key: 'arende_arendet_registrerat_datum_min',
        type: 'date',
        label: 'Registrerat datum från',
        visible: isVisible('arende_arendet_registrerat_datum_min', showArende),
      },
      {
        key: 'arende_arendet_registrerat_datum_max',
        type: 'date',
        label: 'Registrerat datum till',
        visible: isVisible('arende_arendet_registrerat_datum_max', showArende),
      },
      {
        key: 'arende_beslutat_datum_min',
        type: 'date',
        label: 'Beslutat datum från',
        visible: isVisible('arende_beslutat_datum_min', showArende),
      },
      {
        key: 'arende_beslutat_datum_max',
        type: 'date',
        label: 'Beslutat datum till',
        visible: isVisible('arende_beslutat_datum_max', showArende),
      },
      {
        key: 'arende_arendet_avslutat_datum_min',
        type: 'date',
        label: 'Avslutat datum från',
        visible: isVisible('arende_arendet_avslutat_datum_min', showArende),
      },
      {
        key: 'arende_arendet_avslutat_datum_max',
        type: 'date',
        label: 'Avslutat datum till',
        visible: isVisible('arende_arendet_avslutat_datum_max', showArende),
      },
      {
        key: 'arende_arendet_arkiverat_datum_min',
        type: 'date',
        label: 'Arkiverat datum från',
        visible: isVisible('arende_arendet_arkiverat_datum_min', showArende),
      },
      {
        key: 'arende_arendet_arkiverat_datum_max',
        type: 'date',
        label: 'Arkiverat datum till',
        visible: isVisible('arende_arendet_arkiverat_datum_max', showArende),
      },
      {
        key: 'arende_arendet_gallrat_datum_min',
        type: 'date',
        label: 'Gallrat datum från',
        visible: isVisible('arende_arendet_gallrat_datum_min', showArende),
      },
      {
        key: 'arende_arendet_gallrat_datum_max',
        type: 'date',
        label: 'Gallrat datum till',
        visible: isVisible('arende_arendet_gallrat_datum_max', showArende),
      },
      {
        key: 'arende_arendet_makulerat_datum_min',
        type: 'date',
        label: 'Makulerat datum från',
        visible: isVisible('arende_arendet_makulerat_datum_min', showArende),
      },
      {
        key: 'arende_arendet_makulerat_datum_max',
        type: 'date',
        label: 'Makulerat datum till',
        visible: isVisible('arende_arendet_makulerat_datum_max', showArende),
      },
      {
        key: 'arendeStatus',
        type: 'select',
        label: this.schemaLabel('arende', 'arendestatus', 'Ärendestatus'),
        options: this.arendeStatusOptions(),
        visible: isVisible('arendeStatus', showArende),
      },
      {
        key: 'arendeTyp',
        type: 'select',
        label: this.schemaLabel('arende', 'arendetyp', 'Ärendetyp'),
        options: this.arendeTypOptions(),
        visible: isVisible('arendeTyp', showArende),
      },
      {
        key: 'arende_handlaggningsstatus',
        type: 'select',
        label: this.store?.getValue('label.ui.schema.arende.handlaggningsstatus') ?? 'Handläggningsstatus',
        options: this.arendeHandlaggningsstatusOptions(),
        visible: isVisible('arende_handlaggningsstatus', showArende),
      },
      {
        key: 'arende_riktning',
        type: 'select',
        label: this.schemaLabel('arende', 'riktning', 'Riktning'),
        options: this.arendeRiktningOptions(),
        visible: isVisible('arende_riktning', showArende),
      },
      {
        key: 'arende_sakerhetsskyddsklassificering',
        type: 'select',
        label: this.schemaLabel('arende', 'sakerhetsskyddsklassificering', 'Säkerhetsskyddsklassificering'),
        options: this.arendeSakerhetOptions(),
        visible: isVisible('arende_sakerhetsskyddsklassificering', showArende),
      },
      {
        key: 'arende_sekretess',
        type: 'select',
        label: this.schemaLabel('arende', 'sekretess', 'Sekretess'),
        options: this.arendeSekretessOptions(),
        visible: isVisible('arende_sekretess', showArende),
      },
      {
        key: 'arende_innehaller_personuppgifter_gdpr',
        type: 'select',
        label: this.schemaLabel('arende', 'innehaller_personuppgifter_gdpr', 'Innehåller personuppgifter GDPR'),
        options: this.arendePersonuppgifterOptions(),
        visible: isVisible('arende_innehaller_personuppgifter_gdpr', showArende),
      },
      {
        key: 'handling_inkommen_datum_min',
        type: 'date',
        label: 'Inkommen datum från',
        visible: isVisible('handling_inkommen_datum_min', showHandling),
      },
      {
        key: 'handling_inkommen_datum_max',
        type: 'date',
        label: 'Inkommen datum till',
        visible: isVisible('handling_inkommen_datum_max', showHandling),
      },
      {
        key: 'handling_upprattad_datum_min',
        type: 'date',
        label: 'Upprättad datum från',
        visible: isVisible('handling_upprattad_datum_min', showHandling),
      },
      {
        key: 'handling_upprattad_datum_max',
        type: 'date',
        label: 'Upprättad datum till',
        visible: isVisible('handling_upprattad_datum_max', showHandling),
      },
      {
        key: 'handling_beslutat_datum_min',
        type: 'date',
        label: 'Beslutat datum från',
        visible: isVisible('handling_beslutat_datum_min', showHandling),
      },
      {
        key: 'handling_beslutat_datum_max',
        type: 'date',
        label: 'Beslutat datum till',
        visible: isVisible('handling_beslutat_datum_max', showHandling),
      },
      {
        key: 'handling_expedierad_datum_min',
        type: 'date',
        label: 'Expedierad datum från',
        visible: isVisible('handling_expedierad_datum_min', showHandling),
      },
      {
        key: 'handling_expedierad_datum_max',
        type: 'date',
        label: 'Expedierad datum till',
        visible: isVisible('handling_expedierad_datum_max', showHandling),
      },
      {
        key: 'handlingsStatus',
        type: 'select',
        label: this.schemaLabel('handling', 'handlingsstatus', 'Handlingsstatus'),
        options: this.handlingsStatusOptions(),
        visible: isVisible('handlingsStatus', showHandling),
      },
      {
        key: 'handlingsTyp',
        type: 'select',
        label: this.schemaLabel('handling', 'handlingstyp', 'Handlingstyp'),
        options: this.handlingsTypOptions(),
        visible: isVisible('handlingsTyp', showHandling),
      },
      {
        key: 'handling_handlingsriktning',
        type: 'select',
        label: this.schemaLabel('handling', 'handlingsriktning', 'Handlingsriktning'),
        options: this.handlingRiktningOptions(),
        visible: isVisible('handling_handlingsriktning', showHandling),
      },
      {
        key: 'handling_inkanal_via',
        type: 'select',
        label: this.schemaLabel('handling', 'inkanal_via', 'Inkanal via'),
        options: this.handlingInkanalViaOptions(),
        visible: isVisible('handling_inkanal_via', showHandling),
      },
      {
        key: 'handling_signerad',
        type: 'select',
        label: this.schemaLabel('handling', 'signerad', 'Elektronisk signerad'),
        options: this.handlingSigneradOptions(),
        visible: isVisible('handling_signerad', showHandling),
      },
      {
        key: 'handling_sakerhetsskyddsklassificering',
        type: 'select',
        label: this.schemaLabel('handling', 'sakerhetsskyddsklassificering', 'Säkerhetsskyddsklassificering'),
        options: this.handlingSakerhetOptions(),
        visible: isVisible('handling_sakerhetsskyddsklassificering', showHandling),
      },
      {
        key: 'handling_sekretess',
        type: 'select',
        label: this.schemaLabel('handling', 'sekretess', 'Sekretess'),
        options: this.handlingSekretessOptions(),
        visible: isVisible('handling_sekretess', showHandling),
      },
      {
        key: 'handling_bevaras_gallras',
        type: 'select',
        label: this.schemaLabel('handling', 'bevaras_gallras', 'Bevaras / Gallras'),
        options: this.handlingBevarasGallrasOptions(),
        visible: isVisible('handling_bevaras_gallras', showHandling),
      },
      {
        key: 'handling_forvaringsmedia',
        type: 'select',
        label: this.schemaLabel('handling', 'forvaringsmedia', 'Förvaringsmedia'),
        options: this.handlingForvaringsmediaOptions(),
        multiple: true,
        visible: isVisible('handling_forvaringsmedia', showHandling),
      },
      {
        key: 'handling_fysisk_forvaringsplats',
        type: 'search',
        label: this.schemaLabel('handling', 'fysisk_forvaringsplats', 'Fysisk förvaringsplats'),
        visible: isVisible('handling_fysisk_forvaringsplats', showHandling),
      },
      {
        key: 'skapaOptions',
        type: 'select',
        label: 'Skapad',
        options: this.skapaOptions(),
        visible: isVisible('skapaOptions', true),
      },
    ];
    const fieldsOrder = this.fieldsOrder();
    if (fieldsOrder) {
      fields.sort((a, b) => {
        return fieldsOrder.indexOf(a.key) - fieldsOrder.indexOf(b.key);
      });
    }

    const searchFields = fields.filter(field => field.type === 'search');
    const dateFields = fields.filter(field => field.type === 'date');
    const nonDateFields = fields.filter(field => field.type !== 'date' && field.type !== 'search');

    return [...searchFields, ...nonDateFields, ...dateFields];
  });

  readonly DOCUMENT_SEARCH_TABLE_NAME = 'DOCUMENT_SEARCH';

  isDetailedDisplayed = false;
  constructor() {
    this.router.events.subscribe(event => {
      if (event instanceof ChildActivationEnd) {
        this.isDetailedDisplayed = this.route.children.length > 0;
      }
    });
    const group: Record<string, FormControl> = {};
    this.fields().forEach(field => {
      group[field.key] = new FormControl(null);
    });
    if (!group['arende_ansvarig_organisatorisk_enhet']) {
      group['arende_ansvarig_organisatorisk_enhet'] = new FormControl([]);
    }
    this.form = this.fb.group(group);
    this.formSignal = toSignal(this.form.get('docOptions')!.valueChanges);

    effect(() => {
      this.searchSortService.activeSortBy();
      this.searchSortService.activeSortOrder();
      const quickArendeStatus = this.searchService.quickArendeStatusFilter();
      const quickHandlingStatus = this.searchService.quickHandlingStatusFilter();
      const quickUtkastStatus = this.searchService.quickUtkastStatusFilter();
      const quickOrg = this.searchService.quickArendeOrgFilter();
      const quickArendeDates = this.searchService.quickArendeDateFilters();
      const quickHandlingDates = this.searchService.quickHandlingDateFilters();
      this.searchService.quickCreatedRangeByType();
      const docTypeKey = this.getCurrentDocTypeKey();
      const shouldSkipSearch = this.skipQuickStatusSearch || this.skipQuickOrgSearch || this.skipQuickDateSearch;
      if (shouldSkipSearch) {
        this.skipQuickStatusSearch = false;
        this.skipQuickOrgSearch = false;
        this.skipQuickDateSearch = false;
      }
      this.applyQuickStatusToForm(quickArendeStatus, quickHandlingStatus, quickUtkastStatus, docTypeKey);
      this.applyQuickOrgToForm(quickOrg);
      this.applyQuickDatesToForm(this.quickArendeDateFields, quickArendeDates);
      this.applyQuickDatesToForm(this.quickHandlingDateFields, quickHandlingDates);
      if (!shouldSkipSearch) {
        this.search(this.form.value, this.searchService.page());
      }
    });
  }

  sortPredicate = (index: number): boolean => {
    return index !== 0;
  };

  onInputDropped(event: CdkDragDrop<Field[]>) {
    const arr = this.fields();
    moveItemInArray(this.fields(), event.previousIndex, event.currentIndex);
    const order = arr.map(field => field.key);
    this.fieldsOrder.set(order);
    localStorage.setItem('fieldsOrder', JSON.stringify(order));
  }

  ngOnInit(): void {
    const savedOrder = JSON.parse(localStorage.getItem('fieldsOrder') || '[]');
    if (savedOrder.length) {
      this.fieldsOrder.set(savedOrder);
    }
    this.loadFilterOptions();

    this.getOptionsService.directoryEntriesOptions('Handlaggningsstatus').subscribe(options => {
      this.handlaggningsStatusDirectoryOptions.set(options);
      if (this.arendeHandlaggningsstatusOptions().length === 0) {
        this.arendeHandlaggningsstatusOptions.set(options);
      }
    });
    this.getOptionsService.directoryEntriesOptions('Handlingstatus').subscribe(options => {
      this.handlingStatusDirectoryOptions.set(options);
      if (this.handlingsStatusOptions().length === 0) {
        this.handlingsStatusOptions.set(options);
      }
    });

    this.form.valueChanges.subscribe(() => {
      this.router.navigate(['/search/']);
      this.selectedDocument.set(null);
    });

    this.getSaveSearch();
  }

  onOptionChange() {
    this.syncQuickFiltersFromForm();
    this.runSearchFromFilters();
  }

  onDateChange(fieldKey: string, event: CustomEvent<unknown>) {
    const control = this.form.get(fieldKey);
    if (!control) return;

    const rawValue = event?.detail;
    const nextValue = this.extractDateValue(rawValue);
    if (nextValue === null) {
      control.setValue('', { emitEvent: true });
      this.runSearchFromFilters();
      return;
    }

    const currentValue = this.extractDateValue(control.value);
    if (currentValue !== nextValue) {
      control.setValue(rawValue, { emitEvent: true });
    }

    this.runSearchFromFilters();
  }

  onSearchSubmit(fieldKey: string, event: unknown) {
    const term = this.resolveSearchTerm(fieldKey, event);
    this.applySearchTerm(fieldKey, term);
  }

  onMotpartInput(event: unknown) {
    this.motpartDraft = this.extractSearchTerm(event);
  }

  onMotpartSubmit(event: unknown) {
    const term = this.resolveMotpartTerm(event);
    this.motpartDraft = '';
    this.applySearchTerm('motpart', term);
  }

  restoreFilters() {
    this.searchService.selectedItem.set(null);
    const nextValues: Record<string, unknown> = {};
    this.fields().forEach(field => {
      if (field.type === 'select') {
        nextValues[field.key] = field.multiple === false ? null : [];
      } else {
        nextValues[field.key] = '';
      }
    });
    this.form.reset(nextValues);
    const orgControl = this.form.get('arende_ansvarig_organisatorisk_enhet');
    if (orgControl) {
      orgControl.setValue([], { emitEvent: false });
    }
    this.searchService.quickArendeStatusFilter.set([]);
    this.searchService.quickHandlingStatusFilter.set([]);
    this.searchService.quickUtkastStatusFilter.set([]);
    this.searchService.quickArendeOrgFilter.set([]);
    this.searchService.quickArendeDateFilters.set({});
    this.searchService.quickHandlingDateFilters.set({});
    this.runSearchFromFilters();
  }

  private runSearchFromFilters() {
    this.syncQuickFiltersFromForm();
    this.search(this.form.value);
  }

  private syncQuickFiltersFromForm() {
    this.syncQuickStatusFromForm();
    this.syncQuickOrgFromForm();
    this.syncQuickDatesFromForm();
  }

  private syncQuickStatusFromForm() {
    const arendeNext = this.getControlValues('arendeStatus');
    const handlingNext = this.getControlValues('handlingsStatus');
    const currentArende = this.searchService.quickArendeStatusFilter();
    const docTypeKey = this.getCurrentDocTypeKey();
    const isUtkast = docTypeKey === 'Utkast';
    const currentHandling = isUtkast
      ? this.searchService.quickUtkastStatusFilter()
      : this.searchService.quickHandlingStatusFilter();
    const arendeChanged = !this.areStringArraysEqual(currentArende, arendeNext);
    const handlingChanged = !this.areStringArraysEqual(currentHandling, handlingNext);
    if (!arendeChanged && !handlingChanged) return;
    this.skipQuickStatusSearch = true;
    if (arendeChanged) {
      this.searchService.quickArendeStatusFilter.set(arendeNext);
    }
    if (handlingChanged) {
      if (isUtkast) {
        this.searchService.quickUtkastStatusFilter.set(handlingNext);
      } else {
        this.searchService.quickHandlingStatusFilter.set(handlingNext);
      }
    }
  }

  private applyQuickStatusToForm(
    arendeNext: string[],
    handlingNext: string[],
    utkastNext: string[],
    docTypeKey: string
  ) {
    const arendeControl = this.form.get('arendeStatus');
    if (arendeControl) {
      const currentArende = Array.isArray(arendeControl.value) ? arendeControl.value : [];
      if (!this.areStringArraysEqual(currentArende, arendeNext)) {
        arendeControl.setValue(arendeNext, { emitEvent: false });
      }
    }
    const handlingControl = this.form.get('handlingsStatus');
    if (handlingControl) {
      const currentHandling = Array.isArray(handlingControl.value) ? handlingControl.value : [];
      const next = docTypeKey === 'Utkast' ? utkastNext : handlingNext;
      if (!this.areStringArraysEqual(currentHandling, next)) {
        handlingControl.setValue(next, { emitEvent: false });
      }
    }
  }

  private syncQuickOrgFromForm() {
    const control = this.form.get('arende_ansvarig_organisatorisk_enhet');
    if (!control) return;
    const value = control.value;
    const next = Array.isArray(value) ? value : [];
    const current = this.searchService.quickArendeOrgFilter();
    if (this.areStringArraysEqual(current, next)) return;
    this.skipQuickOrgSearch = true;
    this.searchService.quickArendeOrgFilter.set(next);
  }

  private applyQuickOrgToForm(next: string[]) {
    const control = this.form.get('arende_ansvarig_organisatorisk_enhet');
    if (!control) return;
    const current = Array.isArray(control.value) ? control.value : [];
    if (this.areStringArraysEqual(current, next)) return;
    control.setValue(next, { emitEvent: false });
  }

  private getCurrentDocTypeKey(): string {
    const current = this.searchService.currentDocType();
    return current || '';
  }

  private syncQuickDatesFromForm() {
    const nextArende = this.buildQuickDateMapFromForm(this.quickArendeDateFields);
    const nextHandling = this.buildQuickDateMapFromForm(this.quickHandlingDateFields);
    const currentArende = this.searchService.quickArendeDateFilters();
    const currentHandling = this.searchService.quickHandlingDateFilters();
    const arendeChanged = !this.areDateMapsEqual(currentArende, nextArende);
    const handlingChanged = !this.areDateMapsEqual(currentHandling, nextHandling);
    if (!arendeChanged && !handlingChanged) return;
    this.skipQuickDateSearch = true;
    if (arendeChanged) {
      this.searchService.quickArendeDateFilters.set(nextArende);
    }
    if (handlingChanged) {
      this.searchService.quickHandlingDateFilters.set(nextHandling);
    }
  }

  private applyQuickDatesToForm(fields: readonly string[], next: Record<string, string>) {
    fields.forEach(field => {
      const control = this.form.get(field);
      if (!control) return;
      const rawValue = control.value;
      const nextValue = next[field] ?? '';
      const hasDateObject = Array.isArray(rawValue)
        ? rawValue.some(value => value instanceof Date)
        : rawValue instanceof Date;
      const currentValue = this.extractDateString(rawValue);
      if (currentValue === nextValue && (!nextValue || hasDateObject)) return;
      control.setValue(this.coerceDateControlValue(nextValue, rawValue), { emitEvent: false });
    });
  }

  private buildQuickDateMapFromForm(fields: readonly string[]): Record<string, string> {
    const next: Record<string, string> = {};
    fields.forEach(field => {
      const control = this.form.get(field);
      if (!control) return;
      const value = this.extractDateString(control.value);
      if (value) {
        next[field] = value;
      }
    });
    return next;
  }

  private coerceDateControlValue(nextValue: string, _currentValue: unknown): unknown {
    if (!nextValue) {
      return [];
    }
    const parsed = new Date(nextValue);
    const isValid = !Number.isNaN(parsed.getTime());
    return isValid ? [parsed] : [nextValue];
  }

  private getControlValues(key: string): string[] {
    const control = this.form.get(key);
    if (!control) return [];
    const value = control.value;
    if (Array.isArray(value)) {
      return value
        .map(item => (item == null ? '' : String(item)))
        .map(item => item.trim())
        .filter(item => item !== '');
    }
    if (value == null) return [];
    const text = String(value).trim();
    return text ? [text] : [];
  }

  private extractDateString(value: unknown): string {
    if (Array.isArray(value)) {
      const [first] = value;
      return this.extractDateString(first);
    }
    if (value instanceof Date) {
      if (Number.isNaN(value.getTime())) return '';
      return toISODateOnlyString(value);
    }
    if (value && typeof value === 'object') {
      const casted = value as { toISOString?: () => string };
      if (typeof casted.toISOString === 'function') {
        try {
          return toISODateOnlyString(casted.toISOString());
        } catch {
          return '';
        }
      }
    }
    if (typeof value === 'number') {
      const parsed = new Date(value);
      if (!Number.isNaN(parsed.getTime())) return toISODateOnlyString(parsed);
      return '';
    }
    const text = value ? String(value).trim() : '';
    if (this.isIsoDateString(text)) return text;
    const parsed = new Date(text);
    if (!Number.isNaN(parsed.getTime())) return toISODateOnlyString(parsed);
    return '';
  }

  private getDateFromControl(key: string): Date | null {
    const control = this.form.get(key);
    if (!control) return null;
    const iso = this.extractDateString(control.value);
    if (!iso) return null;
    const parsed = new Date(iso);
    if (Number.isNaN(parsed.getTime())) return null;
    return parsed;
  }

  getSelectedDates(key: string): Date[] {
    const control = this.form.get(key);
    if (!control) return [];
    const value = control.value;
    const items = Array.isArray(value) ? value : value != null ? [value] : [];
    const dates = items
      .map(item => (item instanceof Date ? item : new Date(String(item))))
      .filter(date => !Number.isNaN(date.getTime()));
    return dates;
  }

  getDateMin(key: string): Date | null {
    if (key.endsWith('_max')) {
      const base = key.slice(0, -4);
      return this.getDateFromControl(`${base}_min`);
    }
    return null;
  }

  getDateMax(key: string): Date | null {
    if (key.endsWith('_min')) {
      const base = key.slice(0, -4);
      return this.getDateFromControl(`${base}_max`);
    }
    return null;
  }

  private isIsoDateString(value: string): boolean {
    return /^\d{4}-\d{2}-\d{2}$/.test(value);
  }

  private areDateMapsEqual(left: Record<string, string>, right: Record<string, string>): boolean {
    const leftKeys = Object.keys(left);
    const rightKeys = Object.keys(right);
    if (leftKeys.length !== rightKeys.length) return false;
    return leftKeys.every(key => left[key] === right[key]);
  }

  private areStringArraysEqual(left: readonly string[], right: readonly string[]): boolean {
    if (left.length !== right.length) return false;
    return left.every((value, index) => value === right[index]);
  }

  private extractDateValue(value: unknown): unknown | null {
    if (!value) return null;
    if (Array.isArray(value)) {
      const first = value[0];
      if (typeof first === 'string') return first.trim() || null;
      return first ?? null;
    }
    if (typeof value === 'string') return value.trim() || null;
    return value;
  }

  private extractSearchTerm(raw: unknown): string {
    if (typeof raw === 'string') {
      return raw.trim();
    }

    if (this.isCustomEvent(raw)) {
      const detail = raw.detail;
      if (typeof detail === 'string') {
        return detail.trim();
      }

      if (this.isObjectWithValue(detail) && typeof detail.value === 'string') {
        return detail.value.trim();
      }

      const detailValue = this.readValueProp(detail);
      if (detailValue) return detailValue;
    }

    if (this.isDomEvent(raw)) {
      const targetValue = this.readValueProp(raw.target);
      if (targetValue) return targetValue;
    }

    if (this.isObjectWithValue(raw) && typeof raw.value === 'string') {
      return raw.value.trim();
    }

    const rawValue = this.readValueProp(raw);
    if (rawValue) return rawValue;

    return '';
  }

  private isCustomEvent(input: unknown): input is CustomEvent<unknown> {
    return typeof input === 'object' && input !== null && 'detail' in input;
  }

  private isDomEvent(input: unknown): input is Event {
    return typeof input === 'object' && input !== null && 'target' in input && 'type' in input;
  }

  private isObjectWithValue(input: unknown): input is { value?: unknown } {
    return typeof input === 'object' && input !== null && 'value' in input;
  }

  private readValueProp(value: unknown): string {
    if (!value || typeof value !== 'object') return '';
    const record = value as { value?: unknown; afValue?: unknown };
    if (typeof record.value === 'string') return record.value.trim();
    if (typeof record.afValue === 'string') return record.afValue.trim();
    return '';
  }

  private resolveSearchTerm(fieldKey: string, event: unknown): string {
    const fromEvent = this.extractSearchTerm(event);
    if (fromEvent) return fromEvent;
    const fallback = this.form.get(fieldKey)?.value ?? '';
    return typeof fallback === 'string' ? fallback.trim() : String(fallback ?? '').trim();
  }

  private resolveMotpartTerm(event: unknown): string {
    const fromEvent = this.extractSearchTerm(event);
    if (fromEvent) return fromEvent;
    if (this.motpartDraft) return this.motpartDraft;
    const fallback = this.form.get('motpart')?.value ?? '';
    return `${fallback ?? ''}`.trim();
  }

  private applySearchTerm(fieldKey: string, term: string) {
    if (fieldKey === 'searchLine') {
      this.form.patchValue({ searchLine: term, motpart: '' }, { emitEvent: false });
    } else if (fieldKey === 'motpart') {
      this.form.patchValue({ motpart: term, searchLine: '' }, { emitEvent: false });
    } else {
      const control = this.form.get(fieldKey);
      if (!control) return;
      control.setValue(term, { emitEvent: false });
    }
    this.runSearchFromFilters();
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }

  totalPages() {
    const totalItems = Math.max(0, this.searchService.activeTotal());
    const pageSize = Math.max(1, this.pageSize);
    return Math.max(1, Math.ceil(totalItems / pageSize));
  }

  changePageNumber(page: DigiNavigationPaginationCustomEvent<number>) {
    this.searchService.setActivePage(page.detail - 1);
  }

  resetPage() {
    this.searchService.setActivePage(0);
  }

  private isArendeType(docType: string) {
    return docType === 'Arende';
  }

  private isHandlingType(docType: string) {
    return docType === 'Handling' || docType === 'Utkast';
  }

  private getSkapaOptionsForDocType(options: FormTypes | undefined, docType: string): FormTypes['skapaOptions'] {
    const quickMap = this.searchService.quickCreatedRangeByType();
    const quickValues = quickMap[docType] ?? [];
    if (Array.isArray(quickValues) && quickValues.length) {
      return quickValues;
    }
    return options?.skapaOptions;
  }

  private buildDocTypeOptions(options: FormTypes | undefined, docType: string): FormTypes {
    const base: FormTypes = {
      docOptions: [docType],
      searchLine: options?.searchLine,
      motpart: options?.motpart,
      skapaOptions: this.getSkapaOptionsForDocType(options, docType),
    };

    if (this.isArendeType(docType)) {
      base.arendeStatus = options?.arendeStatus;
      base.arendeTyp = options?.arendeTyp;
      base.arende_handlaggningsstatus = options?.arende_handlaggningsstatus;
      base.arende_riktning = options?.arende_riktning;
      base.arende_sakerhetsskyddsklassificering = options?.arende_sakerhetsskyddsklassificering;
      base.arende_sekretess = options?.arende_sekretess;
      base.arende_innehaller_personuppgifter_gdpr = options?.arende_innehaller_personuppgifter_gdpr;
      base.arende_arendenummer = options?.arende_arendenummer;
      base.arende_arendemening = options?.arende_arendemening;
      base.arende_extern_referens_referens = options?.arende_extern_referens_referens;
      base.arende_ansvarig_organisatorisk_enhet = options?.arende_ansvarig_organisatorisk_enhet;
      base.arende_ansvarig_handlaggare = options?.arende_ansvarig_handlaggare;
      base.arende_arendet_registrerat_datum_min = options?.arende_arendet_registrerat_datum_min;
      base.arende_arendet_registrerat_datum_max = options?.arende_arendet_registrerat_datum_max;
      base.arende_beslutat_datum_min = options?.arende_beslutat_datum_min;
      base.arende_beslutat_datum_max = options?.arende_beslutat_datum_max;
      base.arende_arendet_avslutat_datum_min = options?.arende_arendet_avslutat_datum_min;
      base.arende_arendet_avslutat_datum_max = options?.arende_arendet_avslutat_datum_max;
      base.arende_arendet_arkiverat_datum_min = options?.arende_arendet_arkiverat_datum_min;
      base.arende_arendet_arkiverat_datum_max = options?.arende_arendet_arkiverat_datum_max;
      base.arende_arendet_gallrat_datum_min = options?.arende_arendet_gallrat_datum_min;
      base.arende_arendet_gallrat_datum_max = options?.arende_arendet_gallrat_datum_max;
      base.arende_arendet_makulerat_datum_min = options?.arende_arendet_makulerat_datum_min;
      base.arende_arendet_makulerat_datum_max = options?.arende_arendet_makulerat_datum_max;
      base.arende_beslutstyp = options?.arende_beslutstyp;
      base.arende_lagrumsbeskrivning = options?.arende_lagrumsbeskrivning;
    }

    if (this.isHandlingType(docType)) {
      base.handlingsStatus = options?.handlingsStatus;
      base.handlingsTyp = options?.handlingsTyp;
      base.handling_handlingsriktning = options?.handling_handlingsriktning;
      base.handling_inkanal_via = options?.handling_inkanal_via;
      base.handling_signerad = options?.handling_signerad;
      base.handling_sakerhetsskyddsklassificering = options?.handling_sakerhetsskyddsklassificering;
      base.handling_sekretess = options?.handling_sekretess;
      base.handling_bevaras_gallras = options?.handling_bevaras_gallras;
      base.handling_handlingsnummer = options?.handling_handlingsnummer;
      base.handling_handlingsnamn = options?.handling_handlingsnamn;
      base.handling_avsandare_namn = options?.handling_avsandare_namn;
      base.handling_mottagare_namn = options?.handling_mottagare_namn;
      base.handling_extern_referens_referens = options?.handling_extern_referens_referens;
      base.handling_inkommen_datum_min = options?.handling_inkommen_datum_min;
      base.handling_inkommen_datum_max = options?.handling_inkommen_datum_max;
      base.handling_upprattad_datum_min = options?.handling_upprattad_datum_min;
      base.handling_upprattad_datum_max = options?.handling_upprattad_datum_max;
      base.handling_beslutat_datum_min = options?.handling_beslutat_datum_min;
      base.handling_beslutat_datum_max = options?.handling_beslutat_datum_max;
      base.handling_expedierad_datum_min = options?.handling_expedierad_datum_min;
      base.handling_expedierad_datum_max = options?.handling_expedierad_datum_max;
      base.handling_forvaringsmedia = options?.handling_forvaringsmedia;
      base.handling_fysisk_forvaringsplats = options?.handling_fysisk_forvaringsplats;
      base.handling_lagrumsbeskrivning = options?.handling_lagrumsbeskrivning;
    }

    return base;
  }

  private buildSummaryOptions(options: FormTypes, docTypes: string[]): FormTypes {
    return {
      docOptions: docTypes,
      searchLine: options.searchLine,
      motpart: options.motpart,
      skapaOptions: options.skapaOptions,
    };
  }

  private shouldUpdateHandlingOptions(docType: string, docTypes: string[]) {
    return docType === 'Handling' || (docType === 'Utkast' && !docTypes.includes('Handling'));
  }

  openList() {
    this.shouldShowForm.set(false);
    this.isListOpen.emit(true);
    const entries = this.searchService.activeEntries();
    if (entries?.[0]) {
      this.searchService.selectedItem.set(entries[0]);
    }
  }
  openFilters() {
    this.isListOpen.emit(false);
    this.shouldShowForm.set(true);
    this.router.navigate(['/search/']);
    this.searchService.selectedItem.set(null);
  }

  openFilterOptions() {
    this.isFilterOptionsOpen.set(true);
  }

  onFilterOptionsUpdated(updated: SearchFilterOption[]) {
    const currentVisibility = new Map(this.filterOptions().map(option => [option.id, option.visible]));
    updated.forEach(option => currentVisibility.set(option.id, option.visible));
    const merged = this.defaultFilterOptions.map(option => ({
      ...option,
      visible: currentVisibility.get(option.id) ?? option.visible,
    }));
    this.filterOptions.set(merged);
    this.saveFilterOptions(merged);
  }

  private loadFilterOptions(): void {
    const saved = this.loadFilterOptionsFromStorage();
    if (saved) {
      this.filterOptions.set(this.normalizeFilterOptions(saved));
      return;
    }
    const defaults = [...this.defaultFilterOptions];
    this.filterOptions.set(defaults);
    this.saveFilterOptions(defaults);
  }

  private normalizeFilterOptions(options: SearchFilterOption[]): SearchFilterOption[] {
    const visibility = new Map(options.map(option => [option.id, option.visible]));
    return this.defaultFilterOptions.map(option => ({
      ...option,
      visible: visibility.get(option.id) ?? option.visible,
    }));
  }

  private createDefaultFilterOptions(): SearchFilterOption[] {
    return this.getDropdownDefinitions().map(definition => ({
      id: definition.key,
      label: definition.label,
      visible: true,
    }));
  }

  private getDropdownDefinitions(): DropdownDefinition[] {
    return [
      { key: 'docOptions', label: 'Informationsobjekt', options: () => this.docTypeOptions() },
      { key: 'searchLine', label: 'Sök på webbplatsen' },
      { key: 'motpart', label: 'Motpart' },
      {
        key: 'arendeStatus',
        label: this.store?.getValue('label.ui.schema.arende.arendestatus') ?? 'Ärendestatus',
        options: () => this.arendeStatusOptions(),
        visibilityGroup: 'arende',
      },
      { key: 'arendeTyp', label: 'Ärendetyp', options: () => this.arendeTypOptions(), visibilityGroup: 'arende' },
      {
        key: 'arende_handlaggningsstatus',
        label: this.store?.getValue('label.ui.schema.arende.handlaggningsstatus') ?? 'Handläggningsstatus',
        options: () => this.arendeHandlaggningsstatusOptions(),
        visibilityGroup: 'arende',
      },
      {
        key: 'arende_riktning',
        label: 'Riktning (Ärende)',
        options: () => this.arendeRiktningOptions(),
        visibilityGroup: 'arende',
      },
      {
        key: 'arende_sakerhetsskyddsklassificering',
        label: 'Ärende - Säkerhetsskyddsklassificering',
        options: () => this.arendeSakerhetOptions(),
        visibilityGroup: 'arende',
      },
      {
        key: 'arende_sekretess',
        label: 'Ärende - Sekretess',
        options: () => this.arendeSekretessOptions(),
        visibilityGroup: 'arende',
      },
      {
        key: 'arende_innehaller_personuppgifter_gdpr',
        label: 'Innehåller personuppgifter GDPR',
        options: () => this.arendePersonuppgifterOptions(),
        visibilityGroup: 'arende',
      },
      {
        key: 'arende_arendet_registrerat_datum_min',
        label: 'Registrerat datum från',
        visibilityGroup: 'arende',
      },
      {
        key: 'arende_arendet_registrerat_datum_max',
        label: 'Registrerat datum till',
        visibilityGroup: 'arende',
      },
      {
        key: 'arende_beslutat_datum_min',
        label: 'Beslutat datum från',
        visibilityGroup: 'arende',
      },
      {
        key: 'arende_beslutat_datum_max',
        label: 'Beslutat datum till',
        visibilityGroup: 'arende',
      },
      {
        key: 'arende_arendet_avslutat_datum_min',
        label: 'Avslutat datum från',
        visibilityGroup: 'arende',
      },
      {
        key: 'arende_arendet_avslutat_datum_max',
        label: 'Avslutat datum till',
        visibilityGroup: 'arende',
      },
      {
        key: 'arende_arendet_arkiverat_datum_min',
        label: 'Arkiverat datum från',
        visibilityGroup: 'arende',
      },
      {
        key: 'arende_arendet_arkiverat_datum_max',
        label: 'Arkiverat datum till',
        visibilityGroup: 'arende',
      },
      {
        key: 'arende_arendet_gallrat_datum_min',
        label: 'Gallrat datum från',
        visibilityGroup: 'arende',
      },
      {
        key: 'arende_arendet_gallrat_datum_max',
        label: 'Gallrat datum till',
        visibilityGroup: 'arende',
      },
      {
        key: 'arende_arendet_makulerat_datum_min',
        label: 'Makulerat datum från',
        visibilityGroup: 'arende',
      },
      {
        key: 'arende_arendet_makulerat_datum_max',
        label: 'Makulerat datum till',
        visibilityGroup: 'arende',
      },
      {
        key: 'handlingsStatus',
        label: 'Handlingsstatus',
        options: () => this.handlingsStatusOptions(),
        visibilityGroup: 'handling',
      },
      {
        key: 'handlingsTyp',
        label: 'Handlingstyp',
        options: () => this.handlingsTypOptions(),
        visibilityGroup: 'handling',
      },
      {
        key: 'handling_handlingsriktning',
        label: 'Riktning (Handling/Utkast)',
        options: () => this.handlingRiktningOptions(),
        visibilityGroup: 'handling',
      },
      {
        key: 'handling_inkanal_via',
        label: 'Inkanal via',
        options: () => this.handlingInkanalViaOptions(),
        visibilityGroup: 'handling',
      },
      {
        key: 'handling_signerad',
        label: 'Elektronisk signerad',
        options: () => this.handlingSigneradOptions(),
        visibilityGroup: 'handling',
      },
      {
        key: 'handling_sakerhetsskyddsklassificering',
        label: 'Handling/Utkast - Säkerhetsskyddsklassificering',
        options: () => this.handlingSakerhetOptions(),
        visibilityGroup: 'handling',
      },
      {
        key: 'handling_sekretess',
        label: 'Handling/Utkast - Sekretess',
        options: () => this.handlingSekretessOptions(),
        visibilityGroup: 'handling',
      },
      {
        key: 'handling_bevaras_gallras',
        label: 'Bevaras/Gallras',
        options: () => this.handlingBevarasGallrasOptions(),
        visibilityGroup: 'handling',
      },
      {
        key: 'handling_forvaringsmedia',
        label: 'Förvaringsmedia',
        options: () => this.handlingForvaringsmediaOptions(),
        visibilityGroup: 'handling',
      },
      {
        key: 'handling_fysisk_forvaringsplats',
        label: 'Fysisk förvaringsplats',
        visibilityGroup: 'handling',
      },
      {
        key: 'handling_inkommen_datum_min',
        label: 'Inkommen datum från',
        visibilityGroup: 'handling',
      },
      {
        key: 'handling_inkommen_datum_max',
        label: 'Inkommen datum till',
        visibilityGroup: 'handling',
      },
      {
        key: 'handling_upprattad_datum_min',
        label: 'Upprättad datum från',
        visibilityGroup: 'handling',
      },
      {
        key: 'handling_upprattad_datum_max',
        label: 'Upprättad datum till',
        visibilityGroup: 'handling',
      },
      {
        key: 'handling_beslutat_datum_min',
        label: 'Beslutat datum från',
        visibilityGroup: 'handling',
      },
      {
        key: 'handling_beslutat_datum_max',
        label: 'Beslutat datum till',
        visibilityGroup: 'handling',
      },
      {
        key: 'handling_expedierad_datum_min',
        label: 'Expedierad datum från',
        visibilityGroup: 'handling',
      },
      {
        key: 'handling_expedierad_datum_max',
        label: 'Expedierad datum till',
        visibilityGroup: 'handling',
      },
      { key: 'skapaOptions', label: 'Skapad', options: () => this.skapaOptions() },
    ];
  }

  private getDropdownGroupMap(): Map<string, DropdownDefinition['visibilityGroup']> {
    return new Map(this.getDropdownDefinitions().map(definition => [definition.key, definition.visibilityGroup]));
  }

  private isGroupVisible(
    group: DropdownDefinition['visibilityGroup'],
    showArende: boolean,
    showHandling: boolean
  ): boolean {
    if (group === 'arende') return showArende;
    if (group === 'handling') return showHandling;
    return true;
  }

  private getDocTypeVisibility(): { showArende: boolean; showHandling: boolean } {
    const docTypes = this.formSignal?.() ?? [];
    return {
      showArende: docTypes.includes('Arende'),
      showHandling: docTypes.includes('Handling') || docTypes.includes('Utkast'),
    };
  }

  private saveFilterOptions(options: SearchFilterOption[]): void {
    localStorage.setItem(this.filterOptionsStorageKey, JSON.stringify(options));
  }

  private loadFilterOptionsFromStorage(): SearchFilterOption[] | null {
    const raw = localStorage.getItem(this.filterOptionsStorageKey);
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }

  selectDocument(doc: TableItem) {
    this.searchService.selectedItem.set(doc);
    this.selectedDocument.set(doc?.['id']);
  }

  search(options?: FormTypes, page?: number) {
    const selectedDocTypes = Array.isArray(options?.docOptions)
      ? options?.docOptions
      : typeof options?.docOptions === 'string'
        ? [options.docOptions]
        : [];
    this.searchService.selectedDocTypes.set(selectedDocTypes);

    if (selectedDocTypes.length > 1) {
      const activeDocType = this.searchService.activeDocType();
      const pagesByType = this.searchService.pagesByType();
      const hasAllDocTypePages = selectedDocTypes.every(type => type in pagesByType);
      if (page !== undefined && activeDocType && hasAllDocTypePages) {
        this.searchActiveDocType(options, activeDocType, page);
        return;
      }
      this.searchAllDocTypes(options ?? { docOptions: selectedDocTypes }, selectedDocTypes);
      return;
    }

    const nextPage = page ?? 0;
    const nextOptions =
      selectedDocTypes.length === 1 ? this.buildDocTypeOptions(options, selectedDocTypes[0]) : options;
    this.searchSingle(nextOptions, nextPage);
  }

  private searchSingle(options?: FormTypes, page = 0) {
    const queryParams = buildAdvancedSearchQueryParams(
      options,
      page,
      this.searchSortService.activeSortBy(),
      this.searchSortService.activeSortOrder()
    );
    this.searchService.activeAdvancedSearchQueryParams.set(queryParams);
    this.searchService.advancedSearchQueryParamsByType.set({});
    this.nuxeoApi
      .getAdvancedSearchResults(queryParams)
      .pipe(
        tap((response: SearchResult<AdvancedSearchDocument>) => {
          this.setSearchResults(response, response.entries, true);

          this.setDocTypeOptions(response);
          this.setSkapaOptions(response, 'dublincore_created_agg', this.skapaOptions, this.getCurrentDocTypeKey());
          this.setOptions(response, 'arende_arendestatus_agg', this.arendeStatusOptions, true);
          this.setOptions(response, 'arende_arendetyp_agg', this.arendeTypOptions, true);
          this.setOptions(response, 'arende_handlaggningsstatus_agg', this.arendeHandlaggningsstatusOptions);
          this.setOptions(response, 'arende_riktning_agg', this.arendeRiktningOptions);
          this.setOptions(response, 'arende_sakerhetsskyddsklassificering_agg', this.arendeSakerhetOptions);
          this.setOptions(response, 'arende_sekretess_agg', this.arendeSekretessOptions);
          this.setOptions(response, 'arende_innehaller_personuppgifter_gdpr_agg', this.arendePersonuppgifterOptions);
          this.setOptions(response, 'handling_handlingsstatus_agg', this.handlingsStatusOptions);
          this.setOptions(response, 'handling_handlingstyp_agg', this.handlingsTypOptions, true);
          this.setOptions(response, 'handling_handlingsriktning_agg', this.handlingRiktningOptions);
          this.setOptions(response, 'handling_inkanal_via_agg', this.handlingInkanalViaOptions);
          this.setOptions(response, 'handling_signerad_agg', this.handlingSigneradOptions);
          this.setOptions(response, 'handling_sakerhetsskyddsklassificering_agg', this.handlingSakerhetOptions);
          this.setOptions(response, 'handling_sekretess_agg', this.handlingSekretessOptions);
          this.setOptions(response, 'handling_bevaras_gallras_agg', this.handlingBevarasGallrasOptions);
          this.setOptions(response, 'handling_forvaringsmedia_agg', this.handlingForvaringsmediaOptions, true);
          this.setUtkastStatusOptions(response, options?.docOptions ?? []);
        })
      )
      .subscribe();
  }

  private searchAllDocTypes(options: FormTypes, docTypes: string[]) {
    const pages = docTypes.reduce<Record<string, number>>((acc, docType) => {
      acc[docType] = 0;
      return acc;
    }, {});
    this.searchService.pagesByType.set(pages);
    this.searchService.entriesByType.set({});
    this.searchService.totalsByType.set({});

    const summaryParams = buildAdvancedSearchQueryParams(this.buildSummaryOptions(options, docTypes), 0);
    this.searchService.activeAdvancedSearchQueryParams.set(summaryParams);
    this.searchService.advancedSearchQueryParamsByType.set({});
    this.nuxeoApi
      .getAdvancedSearchResults(summaryParams)
      .pipe(
        tap((response: SearchResult<AdvancedSearchDocument>) => {
          this.setSearchResults(response, response.entries);

          this.setDocTypeOptions(response);
          this.setSkapaOptions(response, 'dublincore_created_agg', this.skapaOptions, '');
        })
      )
      .subscribe();

    from(docTypes)
      .pipe(
        mergeMap(docType => {
          const { sortBy, sortOrder } = this.searchSortService.getSortForDocType(docType);
          const queryParams = buildAdvancedSearchQueryParams(
            this.buildDocTypeOptions(options, docType),
            pages[docType],
            sortBy,
            sortOrder
          );
          this.searchService.advancedSearchQueryParamsByType.update(current => ({
            ...current,
            [docType]: queryParams,
          }));
          return this.nuxeoApi.getAdvancedSearchResults(queryParams).pipe(
            tap((response: SearchResult<AdvancedSearchDocument>) => {
              const entriesMapped = this.mapEntries(response.entries);
              this.searchService.entriesByType.update(current => ({ ...current, [docType]: entriesMapped }));
              this.resolveDocRefTitles(entriesMapped, 'ansvarigEnhet', next => {
                this.searchService.entriesByType.update(current => ({ ...current, [docType]: next }));
                this.resolveDocRefTitles(next, 'arendetyp', updated => {
                  this.searchService.entriesByType.update(current => ({ ...current, [docType]: updated }));
                });
              });
              const nextTotal = response.totalSize;
              this.searchService.totalsByType.update(current => ({ ...current, [docType]: nextTotal }));
              this.searchService.docTypeCounts.update(current => ({ ...current, [docType]: nextTotal }));

              this.setSkapaOptions(response, 'dublincore_created_agg', this.skapaOptions, docType);
              if (this.isArendeType(docType)) {
                this.setOptions(response, 'arende_arendestatus_agg', this.arendeStatusOptions, true, true);
                this.setOptions(response, 'arende_arendetyp_agg', this.arendeTypOptions, true, true);
                this.setOptions(
                  response,
                  'arende_handlaggningsstatus_agg',
                  this.arendeHandlaggningsstatusOptions,
                  false,
                  true
                );
                this.setOptions(response, 'arende_riktning_agg', this.arendeRiktningOptions, false, true);
                this.setOptions(
                  response,
                  'arende_sakerhetsskyddsklassificering_agg',
                  this.arendeSakerhetOptions,
                  false,
                  true
                );
                this.setOptions(response, 'arende_sekretess_agg', this.arendeSekretessOptions, false, true);
                this.setOptions(
                  response,
                  'arende_innehaller_personuppgifter_gdpr_agg',
                  this.arendePersonuppgifterOptions,
                  false,
                  true
                );
              }
              if (this.shouldUpdateHandlingOptions(docType, docTypes)) {
                this.setOptions(response, 'handling_handlingsstatus_agg', this.handlingsStatusOptions, false, true);
                this.setOptions(response, 'handling_handlingstyp_agg', this.handlingsTypOptions, true, true);
                this.setOptions(response, 'handling_handlingsriktning_agg', this.handlingRiktningOptions, false, true);
                this.setOptions(response, 'handling_inkanal_via_agg', this.handlingInkanalViaOptions, false, true);
                this.setOptions(response, 'handling_signerad_agg', this.handlingSigneradOptions, false, true);
                this.setOptions(
                  response,
                  'handling_sakerhetsskyddsklassificering_agg',
                  this.handlingSakerhetOptions,
                  false,
                  true
                );
                this.setOptions(response, 'handling_sekretess_agg', this.handlingSekretessOptions, false, true);
                this.setOptions(
                  response,
                  'handling_bevaras_gallras_agg',
                  this.handlingBevarasGallrasOptions,
                  false,
                  true
                );
                this.setOptions(
                  response,
                  'handling_forvaringsmedia_agg',
                  this.handlingForvaringsmediaOptions,
                  true,
                  true
                );
              }
              this.setUtkastStatusOptions(response, [docType]);
            }),
            catchError(() => EMPTY)
          );
        })
      )
      .subscribe();
  }

  private searchActiveDocType(options: FormTypes | undefined, docType: string, page: number) {
    const { sortBy, sortOrder } = this.searchSortService.getSortForDocType(docType);
    const queryParams = buildAdvancedSearchQueryParams(
      this.buildDocTypeOptions(options, docType),
      page,
      sortBy,
      sortOrder
    );
    this.searchService.advancedSearchQueryParamsByType.update(current => ({
      ...current,
      [docType]: queryParams,
    }));
    this.nuxeoApi
      .getAdvancedSearchResults(queryParams)
      .pipe(
        tap((response: SearchResult<AdvancedSearchDocument>) => {
          const entriesMapped = this.mapEntries(response.entries);
          this.searchService.entriesByType.update(current => ({ ...current, [docType]: entriesMapped }));
          this.resolveDocRefTitles(entriesMapped, 'ansvarigEnhet', next => {
            this.searchService.entriesByType.update(current => ({ ...current, [docType]: next }));
            this.resolveDocRefTitles(next, 'arendetyp', updated => {
              this.searchService.entriesByType.update(current => ({ ...current, [docType]: updated }));
            });
          });
          const nextTotal = response.totalSize;
          this.searchService.totalsByType.update(current => ({ ...current, [docType]: nextTotal }));
          this.setSkapaOptions(response, 'dublincore_created_agg', this.skapaOptions, docType);
          this.setUtkastStatusOptions(response, [docType]);
        }),
        catchError(() => EMPTY)
      )
      .subscribe();
  }

  private mapEntries(entries: AdvancedSearchDocument[]): TableItem[] {
    return entries.map(entry => {
      if (entry.type === 'Handling') return this.mapHandlingEntry(entry);
      if (entry.type === 'Utkast') return this.mapUtkastEntry(entry);
      if (entry.type === 'Arende') return this.mapArendeEntry(entry);
      return this.mapBaseEntry(entry);
    });
  }

  private setSearchResults(
    response: SearchResult<AdvancedSearchDocument>,
    entries: AdvancedSearchDocument[],
    resetByType = false
  ): void {
    const entriesMapped = this.mapEntries(entries);
    const nextTotal = response.totalSize;
    const nextCount = response.resultsCount;

    this.searchService.total.set(nextTotal);
    this.searchService.resultsCount.set(nextCount);
    this.entries.set(entriesMapped);
    this.searchService.entries.set(entriesMapped);
    this.resolveDocRefTitles(entriesMapped, 'ansvarigEnhet', next => {
      this.entries.set(next);
      this.searchService.entries.set(next);
      this.resolveDocRefTitles(next, 'arendetyp', updated => {
        this.entries.set(updated);
        this.searchService.entries.set(updated);
      });
    });

    if (resetByType) {
      this.searchService.entriesByType.set({});
      this.searchService.totalsByType.set({});
      this.searchService.pagesByType.set({});
    }
  }

  private mapHandlingEntry(doc: AdvancedSearchDocument): TableItem {
    return { ...this.mapBaseEntry(doc), ...getHandlingTableItems(doc) };
  }

  private mapUtkastEntry(doc: AdvancedSearchDocument): TableItem {
    return { ...this.mapBaseEntry(doc), ...getUtkastTableItems(doc) };
  }

  private mapArendeEntry(doc: NuxeoDocument<ArendeExtendedProperties>): TableItem {
    const properties = doc.properties ?? {};
    const statusLabel = this.safeStr(properties[NUXEO_SCHEMA_FIELDS.arende.arendestatus]);
    const handlaggningsLabel = this.safeStr(properties[NUXEO_SCHEMA_FIELDS.arende.handlaggningsstatus]);
    const arendetypLabel = this.safeStr(properties[NUXEO_SCHEMA_FIELDS.arende.arendetyp]);
    const motpartValue = this.safeStr(properties[NUXEO_SCHEMA_FIELDS.arende.motpart]?.motpart);

    return {
      ...this.mapBaseEntry(doc),
      title: doc.title ?? '—',
      status: statusLabel,
      inkommet: this.getDate(properties[NUXEO_SCHEMA_FIELDS.dc.created]),
      kanal: this.safeStr(properties[NUXEO_SCHEMA_FIELDS.case.channel]),
      motpart: motpartValue,
      avdelning: this.safeStr(properties[NUXEO_SCHEMA_FIELDS.case.department]),
      rubrik: this.safeStr(properties[NUXEO_SCHEMA_FIELDS.dc.subjects]),
      arendetyp: arendetypLabel,
      arendenummer: properties[NUXEO_SCHEMA_FIELDS.arende.arendenummer] ?? '—',
      registreratDatum: this.getDate(properties[NUXEO_SCHEMA_FIELDS.arende.arendetRegistreratDatum]),
      datum: this.getDate(properties[NUXEO_SCHEMA_FIELDS.arende.arendetRegistreratDatum]),
      arendestatus: statusLabel,
      handlaggningsstatus: handlaggningsLabel,
      behorighetsstatus: this.safeStr(properties[NUXEO_SCHEMA_FIELDS.arende.behorighetsstatus]),
      arendepart: motpartValue,
      riktning: this.safeStr(properties[NUXEO_SCHEMA_FIELDS.arende.riktning]),
      sekretess: this.safeStr(properties[NUXEO_SCHEMA_FIELDS.arende.sekretess]),
      sakerhetsskyddsklassificering: this.safeStr(properties[NUXEO_SCHEMA_FIELDS.arende.sakerhetsskyddsklassificering]),
      ansvarigEnhet: this.safeStr(properties[NUXEO_SCHEMA_FIELDS.arende.ansvarigOrganisatoriskEnhet]),
      ansvarigChef: this.safeStr(properties[NUXEO_SCHEMA_FIELDS.arende.ansvarigOrganisationsenhetschef]),
      handlaggare: this.safeStr(properties[NUXEO_SCHEMA_FIELDS.arende.ansvarigHandlaggare]),
      beslutsfattare: this.safeStr(properties[NUXEO_SCHEMA_FIELDS.arende.ansvarigBeslutsfattare]),
      medhandlaggare: this.safeStr(properties[NUXEO_SCHEMA_FIELDS.arende.medhandlaggare]),
      granskare: this.safeStr(properties[NUXEO_SCHEMA_FIELDS.arende.granskare]),
      arendemening: this.safeStr(properties[NUXEO_SCHEMA_FIELDS.arende.arendemening]),
      internArendemening: this.safeStr(properties[NUXEO_SCHEMA_FIELDS.arende.internArendemening]),
      bevarasGallras: this.safeStr(properties[NUXEO_SCHEMA_FIELDS.arende.bevarasGallras]),
      innehallerPersonuppgifter: this.safeStr(properties[NUXEO_SCHEMA_FIELDS.arende.innehallerPersonuppgifterGdpr]),
      jkKommentar: this.safeStr(properties[NUXEO_SCHEMA_FIELDS.arende.jkKommentar]),
      allmanKommentar: this.safeStr(properties[NUXEO_SCHEMA_FIELDS.arende.allmanKommentar]),
      created: this.getDate(properties[NUXEO_SCHEMA_FIELDS.dc.created]),
      modified: this.getDate(properties[NUXEO_SCHEMA_FIELDS.dc.modified]),
      lastContributor: this.safeStr(properties[NUXEO_SCHEMA_FIELDS.dc.lastContributor]),
      arkiveratDatum: this.getDate(properties[NUXEO_SCHEMA_FIELDS.arende.arendetArkiveratDatum]),
      gallratDatum: this.getDate(properties[NUXEO_SCHEMA_FIELDS.arende.arendetGallratDatum]),
      makuleratDatum: this.getDate(properties[NUXEO_SCHEMA_FIELDS.arende.arendetMakuleratDatum]),
      handlaggningPaborjad: this.getDate(properties[NUXEO_SCHEMA_FIELDS.arende.handlaggningPaborjad]),
      handlaggningAvslutad: this.getDate(properties[NUXEO_SCHEMA_FIELDS.arende.handlaggningAvslutad]),
      beslutatDatum: this.getDate(properties[NUXEO_SCHEMA_FIELDS.arende.beslutatDatum]),
      beslutExpedieratDatum: this.getDate(properties[NUXEO_SCHEMA_FIELDS.arende.beslutExpedieratDatum]),
    };
  }

  private mapBaseEntry(doc: AdvancedSearchDocument): TableItem {
    const creator = doc.properties?.[NUXEO_SCHEMA_FIELDS.dc.creator];
    const pathPart = getPathByDocType(doc.type);

    return {
      id: doc.uid,
      title: doc.title,
      parentRef: doc.parentRef,
      modified: formatDateOrMissing(doc.lastModified),
      lastContributor: creator?.properties?.firstName + ' ' + creator?.properties?.lastName,
      link: pathPart + doc.uid,
      type: doc.type,
      state: doc.state,
      isTrashed: doc.isTrashed,
      retainUntil: doc.retainUntil,
      isRecord: doc.isRecord,
    };
  }

  private getDate(date: string | Date | undefined | null | unknown): string {
    return formatDateOrMissing(date);
  }

  private resolveDocRefTitles(
    entries: TableItem[],
    key: 'ansvarigEnhet' | 'arendetyp',
    update: (next: TableItem[]) => void
  ): void {
    const ids = Array.from(
      new Set(
        entries
          .map(entry => entry[key])
          .filter((value): value is string => typeof value === 'string' && this.isUuid(value))
      )
    );

    if (!ids.length) return;

    this.valueService
      .resolveDocumentTitles(ids)
      .pipe(
        tap(map => {
          const next = entries.map(item => {
            const rawValue = item[key];
            if (typeof rawValue !== 'string') return item;
            const title = map[rawValue];
            return title ? { ...item, [key]: title } : item;
          });
          update(next);
        }),
        catchError(() => EMPTY)
      )
      .subscribe();
  }

  private isUuid(value: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
  }

  private safeStr(value: unknown, fallback = '—'): string {
    if (value == null) return fallback;

    if (typeof value === 'string') return value.trim();
    if (typeof value === 'number' || typeof value === 'boolean') return String(value);
    if (Array.isArray(value)) {
      const items = value
        .map(item => (typeof item === 'string' ? item.trim() : this.safeStr(item, '')))
        .filter(Boolean);
      return items.length ? items.join(', ') : fallback;
    }

    if (typeof value === 'object') {
      if (!this.isRecord(value)) return fallback;
      const obj = value;

      if (obj['entity-type'] === 'user') {
        const props = this.isRecord(obj['properties']) ? obj['properties'] : undefined;
        const firstName = typeof props?.['firstName'] === 'string' ? props['firstName'].trim() : undefined;
        const lastName = typeof props?.['lastName'] === 'string' ? props['lastName'].trim() : undefined;
        const username = typeof props?.['username'] === 'string' ? props['username'].trim() : undefined;
        if (firstName && lastName) return `${firstName} ${lastName}`.trim();
        return username ?? fallback;
      }

      if (obj['entity-type'] === 'directoryEntry') {
        const props = this.isRecord(obj['properties']) ? obj['properties'] : undefined;
        const label = typeof props?.['label'] === 'string' ? props['label'].trim() : undefined;
        return label ?? fallback;
      }

      const title = typeof obj['title'] === 'string' ? obj['title'].trim() : undefined;
      if (title) return title;

      const id = typeof obj['id'] === 'string' ? obj['id'].trim() : undefined;
      if (id) return id;

      return fallback;
    }

    return fallback;
  }

  private stripOptionCount(label: string): string {
    return label.replace(/\s*\(\d+\)\s*$/, '').trim();
  }

  private buildLabelMap(options: Option[] | undefined): Map<string, string> {
    const labelMap = new Map<string, string>();
    options?.forEach(optionEntry => {
      const cleanedLabel = this.stripOptionCount(optionEntry.label ?? '');
      labelMap.set(optionEntry.id, cleanedLabel || '');
    });
    return labelMap;
  }

  private getFetchedKeyLabel(fetchedKey: unknown, fallback: string): string {
    if (typeof fetchedKey === 'string') {
      return this.isUuid(fetchedKey) ? '' : fetchedKey;
    }
    if (!this.isRecord(fetchedKey)) return '';

    const props = this.isRecord(fetchedKey['properties']) ? fetchedKey['properties'] : undefined;
    const propLabel = typeof props?.['label'] === 'string' ? props['label'] : undefined;
    const title = typeof fetchedKey['title'] === 'string' ? fetchedKey['title'] : undefined;
    if (propLabel) return propLabel;
    if (title) return title;
    return this.isUuid(fallback) ? '' : fallback;
  }

  setOptions(
    response: SearchResult<AdvancedSearchDocument>,
    prop: AggregationKey,
    varName: WritableSignal<Option[]>,
    fetchedKey?: boolean,
    preserveOnEmpty?: boolean
  ) {
    const buckets = response?.aggregations?.[prop]?.buckets;
    if (preserveOnEmpty && (!buckets || buckets.length === 0)) return;

    const directoryLabelMap =
      prop === 'arende_handlaggningsstatus_agg'
        ? this.buildLabelMap(this.handlaggningsStatusDirectoryOptions())
        : prop === 'handling_handlingsstatus_agg'
          ? this.buildLabelMap(this.handlingStatusDirectoryOptions())
          : undefined;
    const optionsBucket = buckets?.map(bucket => {
      const label = fetchedKey
        ? this.getFetchedKeyLabel(bucket.fetchedKey, bucket.key)
        : directoryLabelMap
          ? (directoryLabelMap.get(bucket.key) ?? '')
          : bucket.key;
      return { label: `${label} (${bucket.docCount})`, id: bucket.key };
    });

    if (optionsBucket) {
      varName.set(optionsBucket);
      if (prop === 'handling_handlingsstatus_agg') {
        this.searchService.handlingStatusAggOptions.set(optionsBucket);
      }
      if (prop === 'arende_arendestatus_agg') {
        const labelMap = this.buildLabelMap(optionsBucket);
        this.applyOptionLabels('arendestatus', labelMap);
        this.applyOptionLabels('status', labelMap);
      }
      if (prop === 'arende_arendetyp_agg') {
        const labelMap = this.buildLabelMap(optionsBucket);
        this.applyOptionLabels('arendetyp', labelMap);
      }
      if (prop === 'arende_handlaggningsstatus_agg') {
        const labelMap = this.buildLabelMap(optionsBucket);
        this.applyOptionLabels('handlaggningsstatus', labelMap);
      }
    } else if (prop === 'handling_handlingsstatus_agg') {
      this.searchService.handlingStatusAggOptions.set([]);
    }
  }

  private applyOptionLabels(fieldKey: string, labelMap: Map<string, string>): void {
    if (labelMap.size === 0) return;
    const replace = (items: TableItem[] | null | undefined) =>
      items?.map(item => {
        const current = item[fieldKey];
        const label = labelMap.get(current);
        if (!label || typeof current !== 'string') return item;
        return label !== current ? { ...item, [fieldKey]: label } : item;
      }) ?? items;

    this.entries.update(items => replace(items) ?? []);
    this.searchService.entries.update(items => replace(items) ?? []);
    this.searchService.entriesByType.update(current => {
      const next: Record<string, TableItem[]> = {};
      Object.entries(current).forEach(([key, items]) => {
        const replaced = replace(items);
        next[key] = Array.isArray(replaced) ? replaced : [];
      });
      return next;
    });
  }

  private setDocTypeOptions(response: SearchResult<AdvancedSearchDocument>) {
    const buckets = response?.aggregations?.system_primaryType_agg?.buckets ?? [];
    const counts = new Map(buckets.map(bucket => [bucket.key, bucket.docCount]));
    const docTypeCounts: Record<string, number> = {};
    const baseOptions = this.baseDocTypeOptions.map(option => ({
      id: option.id,
      label: `${option.label} (${counts.get(option.id) ?? 0})`,
    }));
    this.baseDocTypeOptions.forEach(option => {
      docTypeCounts[option.id] = counts.get(option.id) ?? 0;
    });
    const extraOptions = buckets
      .filter(bucket => !this.baseDocTypeOptions.some(option => option.id === bucket.key))
      .map(bucket => {
        docTypeCounts[bucket.key] = bucket.docCount;
        return { id: bucket.key, label: `${bucket.key} (${bucket.docCount})` };
      });

    this.docTypeOptions.set([...baseOptions, ...extraOptions]);
    this.searchService.docTypeCounts.set(docTypeCounts);
  }

  setSkapaOptions(
    response: SearchResult<AdvancedSearchDocument>,
    prop: AggregationKey,
    varName: WritableSignal<Option[]>,
    docTypeKey = ''
  ) {
    const buckets = response?.aggregations?.[prop]?.buckets ?? [];
    const optionsBucket = buckets.map(el => {
      let optionLabel;
      if (el.key === 'from_now-1y_to_now-1M') {
        optionLabel = 'Förra året';
      } else if (el.key === 'from_now-1M_to_now-7d') {
        optionLabel = 'Förra månaden';
      } else if (el.key === 'from_now-7d_to_now-24H') {
        optionLabel = 'Förra veckan';
      } else if (el.key === 'from_now-24H_to_now') {
        optionLabel = 'Förra 24 timmarna';
      }
      return { label: `${optionLabel} (${el.docCount})`, id: el.key };
    });

    const shouldUpdateUi = docTypeKey === '' || !this.searchService.isTabbed();
    if (shouldUpdateUi) {
      varName.set(optionsBucket);
    }
    this.searchService.createdAggBucketsByType.update(current => ({
      ...current,
      [docTypeKey]: buckets,
    }));
  }

  private setUtkastStatusOptions(response: SearchResult<AdvancedSearchDocument>, docOptions: string[]): void {
    const isUtkast = docOptions.length === 1 && docOptions[0] === 'Utkast';
    if (!isUtkast) return;
    const buckets = response?.aggregations?.ecm_currentLifeCycleState_agg?.buckets ?? [];
    const options = buckets.map(bucket => ({
      id: bucket.key,
      label: `${bucket.key} (${bucket.docCount})`,
    }));
    this.searchService.utkastStatusOptions.set(options);
  }

  saveSearch(searchName: string | number) {
    const allEmpty = Object.values(this.form.controls).every(control => {
      const value = control.value;
      if (Array.isArray(value)) {
        return value.length === 0;
      }
      return value === null || value === undefined || value === '';
    });

    if (!allEmpty && searchName) {
      const savedSearch = {
        searchName: String(searchName),
        system_fulltext: this.form.controls['searchLine']?.value,
        arende_arendepart: this.form.controls['motpart']?.value,
        system_primaryType_agg: this.form.controls['docOptions']?.value,
        dublincore_created_agg: this.form.controls['skapaOptions']?.value,
        arende_arendestatus_agg: this.form.controls['arendeStatus']?.value,
        arende_arendetyp_agg: this.form.controls['arendeTyp']?.value,
        arende_handlaggningsstatus_agg: this.form.controls['arende_handlaggningsstatus']?.value,
        arende_riktning_agg: this.form.controls['arende_riktning']?.value,
        arende_sakerhetsskyddsklassificering_agg: this.form.controls['arende_sakerhetsskyddsklassificering']?.value,
        arende_sekretess_agg: this.form.controls['arende_sekretess']?.value,
        arende_innehaller_personuppgifter_gdpr_agg: this.form.controls['arende_innehaller_personuppgifter_gdpr']?.value,
        handling_handlingsstatus_agg: this.form.controls['handlingsStatus']?.value,
        handling_handlingstyp_agg: this.form.controls['handlingsTyp']?.value,
        handling_handlingsriktning_agg: this.form.controls['handling_handlingsriktning']?.value,
        handling_inkanal_via_agg: this.form.controls['handling_inkanal_via']?.value,
        handling_signerad_agg: this.form.controls['handling_signerad']?.value,
        handling_sakerhetsskyddsklassificering_agg: this.form.controls['handling_sakerhetsskyddsklassificering']?.value,
        handling_sekretess_agg: this.form.controls['handling_sekretess']?.value,
        handling_bevaras_gallras_agg: this.form.controls['handling_bevaras_gallras']?.value,
        handling_forvaringsmedia_agg: this.form.controls['handling_forvaringsmedia']?.value,
        handling_fysisk_forvaringsplats: this.form.controls['handling_fysisk_forvaringsplats']?.value,
        arende_arendet_registrerat_datum_min: this.form.controls['arende_arendet_registrerat_datum_min']?.value,
        arende_arendet_registrerat_datum_max: this.form.controls['arende_arendet_registrerat_datum_max']?.value,
        arende_beslutat_datum_min: this.form.controls['arende_beslutat_datum_min']?.value,
        arende_beslutat_datum_max: this.form.controls['arende_beslutat_datum_max']?.value,
        arende_arendet_avslutat_datum_min: this.form.controls['arende_arendet_avslutat_datum_min']?.value,
        arende_arendet_avslutat_datum_max: this.form.controls['arende_arendet_avslutat_datum_max']?.value,
        arende_arendet_arkiverat_datum_min: this.form.controls['arende_arendet_arkiverat_datum_min']?.value,
        arende_arendet_arkiverat_datum_max: this.form.controls['arende_arendet_arkiverat_datum_max']?.value,
        arende_arendet_gallrat_datum_min: this.form.controls['arende_arendet_gallrat_datum_min']?.value,
        arende_arendet_gallrat_datum_max: this.form.controls['arende_arendet_gallrat_datum_max']?.value,
        arende_arendet_makulerat_datum_min: this.form.controls['arende_arendet_makulerat_datum_min']?.value,
        arende_arendet_makulerat_datum_max: this.form.controls['arende_arendet_makulerat_datum_max']?.value,
        handling_inkommen_datum_min: this.form.controls['handling_inkommen_datum_min']?.value,
        handling_inkommen_datum_max: this.form.controls['handling_inkommen_datum_max']?.value,
        handling_upprattad_datum_min: this.form.controls['handling_upprattad_datum_min']?.value,
        handling_upprattad_datum_max: this.form.controls['handling_upprattad_datum_max']?.value,
        handling_beslutat_datum_min: this.form.controls['handling_beslutat_datum_min']?.value,
        handling_beslutat_datum_max: this.form.controls['handling_beslutat_datum_max']?.value,
        handling_expedierad_datum_min: this.form.controls['handling_expedierad_datum_min']?.value,
        handling_expedierad_datum_max: this.form.controls['handling_expedierad_datum_max']?.value,
      };

      this.nuxeoApi.saveSearch(savedSearch).subscribe(() => this.getSaveSearch());
    }
  }
  shareSearch(
    users: IListItem[] | IListItem | undefined,
    groups: IListItem[] | IListItem | undefined,
    groupUsers: IListItem[] | IListItem | undefined
  ) {
    const searchId = this.searchToShareId();
    if (searchId) {
      const userItems = this.toListItems(users);
      const groupItems = this.toListItems(groups);
      const groupUserItems = this.toListItems(groupUsers);
      const values = [
        ...userItems.map(item => item.value),
        ...groupItems.map(item => item.value),
        ...groupUserItems.map(item => item.value),
      ].filter((value): value is string => Boolean(value));
      this.nuxeoApi
        .shareSearch(Array.from(new Set(values)), searchId, this.user()?.id)
        .pipe(
          tap(() => {
            this.store.notification.set({
              show: true,
              variation: 'success',
              text: SIDEBAR_SEARCH_SHARED_MESSAGE,
            });
          }),
          catchError(() => {
            this.store.notification.set({
              show: true,
              variation: 'danger',
              text: SIDEBAR_SEARCH_SHARE_ERROR_MESSAGE,
            });
            return EMPTY;
          })
        )
        .subscribe();
    }
  }

  getSaveSearch() {
    this.nuxeoApi.getSavedSearches().subscribe(data => {
      this.savedSearches.set(data);
    });
  }

  getUserOptions(searchId: string) {
    this.isShareSearchDialogOpen.set(true);
    this.searchToShareId.set(searchId);
    this.shareGroupId.set('');
    this.shareGroupUserOptions.set([]);
    this.loadShareUsers('');
    this.loadShareGroups('');
  }

  onShareUsersQuery(event: unknown) {
    const term = this.extractShareQuery(event);
    this.loadShareUsers(term);
  }

  onShareGroupsQuery(event: unknown) {
    const term = this.extractShareQuery(event);
    this.loadShareGroups(term);
  }

  onShareGroupPick(event: CustomEvent<IListItem[] | IListItem | undefined> | IListItem[] | IListItem | undefined) {
    const selection = event instanceof CustomEvent ? event.detail : event;
    const items = this.toListItems(selection);
    const groupId = items[0]?.value ?? '';
    this.shareGroupId.set(groupId);
    this.loadShareGroupUsers(groupId, '');
  }

  onShareGroupUsersQuery(event: unknown) {
    const term = this.extractShareQuery(event);
    const groupId = this.shareGroupId();
    this.loadShareGroupUsers(groupId, term);
  }

  private loadShareUsers(term: string) {
    this.nuxeoApi
      .getUserSuggestions(term)
      .pipe(tap(result => this.shareUserOptions.set(this.mapSuggestions(result))))
      .subscribe();
  }

  private loadShareGroups(term: string) {
    this.nuxeoApi
      .getUserGroupSuggestions(term, 'GROUP_TYPE')
      .pipe(tap(result => this.shareGroupOptions.set(this.mapSuggestions(result))))
      .subscribe();
  }

  private loadShareGroupUsers(groupId: string, term: string) {
    if (!groupId) {
      this.shareGroupUserOptions.set([]);
      return;
    }
    this.nuxeoApi
      .getGroupUsers(groupId, term)
      .pipe(tap(result => this.shareGroupUserOptions.set(this.mapUserEntries(result.entries))))
      .subscribe();
  }

  private extractShareQuery(event: unknown): string {
    if (event instanceof CustomEvent) {
      const detail = event.detail ?? '';
      return `${detail}`.trim();
    }
    if (event instanceof Event && event.target instanceof HTMLInputElement) {
      return event.target.value.trim();
    }
    return '';
  }

  private toListItems(items: IListItem[] | IListItem | undefined): IListItem[] {
    if (Array.isArray(items)) return items;
    return items ? [items] : [];
  }

  private mapUserEntries(entries: NxUser[] | undefined): IListItem[] {
    return (entries ?? []).map(entry => {
      const first = entry?.properties?.[NUXEO_SCHEMA_FIELDS.user.firstName] ?? entry?.properties?.firstName ?? '';
      const last = entry?.properties?.[NUXEO_SCHEMA_FIELDS.user.lastName] ?? entry?.properties?.lastName ?? '';
      const label = [first, last].filter(part => part).join(' ');
      return { label, value: entry.id };
    });
  }

  private mapSuggestions(suggestions: UserSuggestion[]): IListItem[] {
    return suggestions
      .map(suggestion => {
        const value = suggestion.id || suggestion.prefixed_id || '';
        const label = suggestion.displayLabel ?? '';
        return { label, value };
      })
      .filter(item => item.value);
  }

  deleteSavedSearch(id: string) {
    this.nuxeoApi.deleteSavedSearch(id).subscribe(() => this.getSaveSearch());
  }

  applySavedSearch(search: SavedSearchParams) {
    this.form.patchValue({
      docOptions: search?.['system_primaryType_agg'],
      skapaOptions: search?.['dublincore_created_agg'],
      arendeStatus: search?.['arende_arendestatus_agg'],
      arendeTyp: search?.['arende_arendetyp_agg'],
      arende_handlaggningsstatus: search?.['arende_handlaggningsstatus_agg'],
      arende_riktning: search?.['arende_riktning_agg'],
      arende_sakerhetsskyddsklassificering: search?.['arende_sakerhetsskyddsklassificering_agg'],
      arende_sekretess: search?.['arende_sekretess_agg'],
      arende_innehaller_personuppgifter_gdpr: search?.['arende_innehaller_personuppgifter_gdpr_agg'],
      handlingsStatus: search?.['handling_handlingsstatus_agg'],
      handlingsTyp: search?.['handling_handlingstyp_agg'],
      handling_handlingsriktning: search?.['handling_handlingsriktning_agg'],
      handling_inkanal_via: search?.['handling_inkanal_via_agg'],
      handling_signerad: search?.['handling_signerad_agg'],
      handling_sakerhetsskyddsklassificering: search?.['handling_sakerhetsskyddsklassificering_agg'],
      handling_sekretess: search?.['handling_sekretess_agg'],
      handling_bevaras_gallras: search?.['handling_bevaras_gallras_agg'],
      handling_forvaringsmedia: search?.['handling_forvaringsmedia_agg'],
      handling_fysisk_forvaringsplats: search?.['handling_fysisk_forvaringsplats'],
      searchLine: search?.['system_fulltext'],
      motpart:
        search?.['arende_arendepart'] ??
        search?.['handling_ansvarig_organisatorisk_enhet'] ??
        search?.['klass_ansvarig_organisationsenhet'] ??
        search?.['arende_ansvarig_organisatorisk_enhet'] ??
        '',
      arende_arendet_registrerat_datum_min: search?.['arende_arendet_registrerat_datum_min'],
      arende_arendet_registrerat_datum_max: search?.['arende_arendet_registrerat_datum_max'],
      arende_beslutat_datum_min: search?.['arende_beslutat_datum_min'],
      arende_beslutat_datum_max: search?.['arende_beslutat_datum_max'],
      arende_arendet_avslutat_datum_min: search?.['arende_arendet_avslutat_datum_min'],
      arende_arendet_avslutat_datum_max: search?.['arende_arendet_avslutat_datum_max'],
      arende_arendet_arkiverat_datum_min: search?.['arende_arendet_arkiverat_datum_min'],
      arende_arendet_arkiverat_datum_max: search?.['arende_arendet_arkiverat_datum_max'],
      arende_arendet_gallrat_datum_min: search?.['arende_arendet_gallrat_datum_min'],
      arende_arendet_gallrat_datum_max: search?.['arende_arendet_gallrat_datum_max'],
      arende_arendet_makulerat_datum_min: search?.['arende_arendet_makulerat_datum_min'],
      arende_arendet_makulerat_datum_max: search?.['arende_arendet_makulerat_datum_max'],
      handling_inkommen_datum_min: search?.['handling_inkommen_datum_min'],
      handling_inkommen_datum_max: search?.['handling_inkommen_datum_max'],
      handling_upprattad_datum_min: search?.['handling_upprattad_datum_min'],
      handling_upprattad_datum_max: search?.['handling_upprattad_datum_max'],
      handling_beslutat_datum_min: search?.['handling_beslutat_datum_min'],
      handling_beslutat_datum_max: search?.['handling_beslutat_datum_max'],
      handling_expedierad_datum_min: search?.['handling_expedierad_datum_min'],
      handling_expedierad_datum_max: search?.['handling_expedierad_datum_max'],
    });
    this.runSearchFromFilters();
  }
}
