import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  input,
  OnDestroy,
  OnInit,
  output,
  signal,
} from '@angular/core';
import { CdkDragDrop, DragDropModule } from '@angular/cdk/drag-drop';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { DigiArbetsformedlingenAngularModule } from '@designsystem-se/af-angular';
import { NUXEO_SCHEMA_FIELDS } from '@app/shared/constants/nuxeo-schema-fields';
import { NUXEO_VOCAB_IDS } from '@app/shared/constants/nuxeo-vocabulary-ids';

import { AuthService } from '@app/core/services/auth.service';
import { FavoritesService } from '@app/core/services/favorites.service';
import { LockService } from '@app/core/services/lock-service.service';
import { BaseButton, GeneralStore } from '@app/core/services/general-store.service';
import { EditPermissionService } from '@app/core/services/edit-permission.service';
import { DraggableSectionOrderService } from '@app/core/services/draggable-section-order.service';
import { AccordionStateService } from '@app/core/services/accordion-state.service';

import { NuxeoApiService } from '@app/shared/api/nuxeo-api.service';
import { CaseLifecycleService } from './case-lifecycle.service';
import { SecretStampService } from '@app/shared/services/secret-stamp.service';
import { CustomMetadataService } from '@app/shared/services/custom-metadata.service';
import {
  NuxeoDocument,
  ArendeInternReferens,
  ArendeExternReferens,
  ArendeExtendedProperties,
  TemplateSourceProperties,
  WorkflowInfo,
  Motpart,
  NxUser,
  HandlingExtendedProperties,
} from '@app/shared/api/nuxeo-api.types';

import { AppRole } from '@app/shared/models/roles';
import { EditGroup, FieldConfig } from '@app/shared/components/general-form/general-form.types';
import {
  ArendeTypOption,
  ChecklistItem,
  EditCaseResult,
  EditFormProps,
  FilterResult,
  GeneralWorkflowAction,
  GeneralWorkflowStructure,
  GeneralWorkflowVocabulary,
  HandlingRow,
  InternalContact,
  LifecycleHistoryResponse,
  SimpleDocRow,
  Suggestions,
} from './case-types';
import { ArendeRefOption } from '@app/shared/components/edit-form-components/case-reference.component/case-reference.component';

import {
  buildEditConfig,
  getFormProperties,
  getHandlingTableItems,
  getInternalContacts,
  getMotpartContacts,
  getUtkastExtendedTableItems,
} from './utils';

import { AccordionComponent } from '@app/shared/components/accordion/accordion.component';
import { AssignUserModalComponent } from '@app/shared/components/assign-user-modal/assign-user-modal.component';
import { CardsDisplayComponent } from '@app/shared/components/cards-display/cards-display.component';
import { AddButtonComponent } from '@app/shared/components/add-button/add-button.component';
import { SelectCaseComponent } from '@app/shared/components/select-case-popup/select-case-popup.component';
import {
  catchError,
  combineLatest,
  EMPTY,
  filter,
  forkJoin,
  from,
  map,
  mergeMap,
  Observable,
  of,
  Subscription,
  switchMap,
  tap,
  timer,
  toArray,
} from 'rxjs';
import { NavigationBreadComponent } from '@app/shared/components/navigation-bread/navigation-bread.component';
import { EditFormComponent } from '@app/shared/components/edit-form/edit-form.component';
import { CaseOverviewComponent } from '@app/shared/components/case-overview/case-overview.component';
import { CaseDetailsComponent } from '@app/shared/components/case-details/case-details.component';
import { AssignCollectionModalComponent } from '@app/shared/components/assign-collection-modal.component/assign-collection-modal.component';
import { ActionButton, ButtonMenuComponent } from '@app/shared/components/button-menu.component/button-menu.component';
import { createButton } from '@app/shared/components/button-menu.component/button-presets';
import { StatusBarComponent } from '@app/shared/components/status-bar/status-bar.component';
import { ReferencesDetailsComponent } from '@app/shared/components/references-details/references-details.component';
import { ContactTableComponent } from '@app/shared/components/contact-table/contact-table.component';
import { CaseListTableComponent, TableColumn } from '@app/shared/components/case-list-table/case-list-table.component';
import { ToggleButtonComponent } from '@app/shared/components/toggle-button/toggle-button.component';
import { CommentsComponent } from '@app/shared/components/comments/comments.component';
import { ViewMode } from '@app/shared/models/view-mode.enum';
import { TableColOption } from '@app/shared/components/table-col-options/table-col-options.component';
import { NotificationService, NuxeoNotification } from '@app/core/services/notification-service.service';
import { SearchService } from '@app/core/services/search.service';
import { ShareLinkService } from '@app/core/services/share-link.service';
import { TableSortService } from '@app/core/services/table-sort.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { truncateForTitle } from '@app/shared/utils/text-utils';
import { getUserFullName as formatUserFullName } from '@app/shared/utils/display-label';
import { GLOBAL_PAGE_SIZE_KEY, loadPageSize, savePageSize } from '@app/shared/utils/page-size-storage';
import { ConstantProvider as CasePageConstantProvider } from '@app/pages/case-page/constants';
import { states, CASE_PAGE_ACCORDION_STATE_KEY, CASE_PAGE_ACCORDION_DEFAULTS } from './constants';
import { arbetsmaterialSortFieldMap, handlingarSortFieldMap } from './sort-maps';
import { CustomMetadataFieldComponent } from '@app/shared/components/custom-metadata-field/custom-metadata-field.component';
import { SendEmailFormComponent } from '@app/shared/components/forms/send-email-form/send-email-form.component';
import { RequestCompletionEmailFormComponent } from '@app/shared/components/forms/request-completion-email-form/request-completion-email-form.component';
import { ConsultColleagueFormComponent } from '@app/shared/components/forms/consult-colleague-form/consult-colleague-form.component';
import { ServiceNoteFormComponent } from '@app/shared/components/forms/service-note-form/service-note-form.component';
import {
  buildLoadOptionsErrorMessage,
  buildPrintLoadingMessage,
  CASE_ASSIGN_SUCCESS_MESSAGE,
  CASE_CHANGES_SAVED_ALT_MESSAGE,
  CASE_CHANGES_SAVED_MESSAGE,
  CASE_CLOSE_ERROR_MESSAGE,
  CASE_CLOSED_MESSAGE,
  CASE_DIARY_RENDER_ERROR_MESSAGE,
  CASE_DIARY_TEMPLATES_FETCH_ERROR_MESSAGE,
  CASE_DIARY_TEMPLATES_NOT_FOUND_MESSAGE,
  CASE_EXPORT_ALL_HANDLINGAR_STARTED_MESSAGE,
  CASE_EXPORT_START_ERROR_MESSAGE,
  CASE_FILE_DELETE_ERROR_MESSAGE,
  CASE_FILE_DELETED_MESSAGE,
  CASE_LOAD_ARENDETYPER_ERROR_MESSAGE,
  CASE_MISSING_MYNDIGHET_MESSAGE,
  CASE_PRINT_NONE_PRINTABLE_MESSAGE,
  CASE_PRINT_SOME_SKIPPED_MESSAGE,
  CASE_REVIEW_CONFIRM_ERROR_MESSAGE,
  CASE_REVIEW_REJECTED_MESSAGE,
  CASE_SELECT_ALL_HANDLINGAR_ERROR_MESSAGE,
  CASE_UPDATE_ERROR_MESSAGE,
  FAVORITE_ADDED_MESSAGE,
  FAVORITE_REMOVED_MESSAGE,
  FAVORITE_UPDATE_ERROR_MESSAGE,
} from '@app/shared/constants/notification-messages';
import {
  SUBSCRIPTION_DISABLED_MESSAGE,
  SUBSCRIPTION_ENABLED_MESSAGE,
  SUBSCRIPTION_ERROR_MESSAGE,
} from '@app/shared/constants/notification-messages';
import { AngularEditorModule } from '@kolkov/angular-editor';
import { CommonModule } from '@angular/common';
import { CalendarComponent } from '@app/shared/components/calendar/calendar.component';
import { SetDeadlineComponent } from '@app/shared/components/set-deadline-form/set-deadline-form.component';
import { CloseCaseWarningComponent } from '@app/shared/components/close-case-warning/close-case-warning.component';
import { ReadyToCloseWarningComponent } from '@app/shared/components/ready-to-close-warning/ready-to-close-warning.component';
import { WarningCardComponent } from '@app/shared/components/warning-card/warning-card.component';
import { TopButtonsPanelComponent } from '@app/shared/components/top-buttons-panel/top-buttons-panel.component';
import { ReminderNoteComponent } from '@app/shared/components/reminder-note/reminder-note.component';
import { DownloadAllFilesComponent } from '@app/shared/components/download-all-files/download-all-files.component';
import { WorkflowOverviewComponent } from '@app/shared/components/workflow-overview/workflow-overview.component';
import { MotpartTableComponent } from '@app/shared/components/motpart-table/motpart-table.component';
import { GeneralFormComponent } from '@app/shared/components/general-form/general-form.component';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ImageButtonComponent } from '@app/shared/components/image-button/image-button.component';
import { DeliverPublicDocsFormComponent } from '@app/shared/components/forms/deliver-public-docs-form/deliver-public-docs-form.component';
import { CaseEditOptionsService } from '@app/core/services/case-edit-options.service';
import { PrintService } from '@app/core/services/print.service';
import type { Option } from '@app/shared/commonTypes';
import { UtkastReviewComponent } from '@app/shared/components/utkast-review/utkast-review.component';
import { DragHandleComponent } from '@app/shared/components/drag-handle/drag-handle.component';
import { GridPaginationControlsComponent } from '@app/shared/components/grid-pagination-controls/grid-pagination-controls.component';
import { SvgIconComponent } from '@app/shared/components/svg-icon/svg-icon.component';
import { UiModeService } from '@app/core/services/ui-mode.service';

type CasePageSectionKey =
  | 'overview'
  | 'process'
  | 'details'
  | 'email'
  | 'customMetadata'
  | 'actors'
  | 'references'
  | 'arbetsmaterial'
  | 'handlingar';

type DraggableCasePageSectionKey = Exclude<CasePageSectionKey, 'overview'>;
type HandlingarTableMode = 'grouped' | 'all';

const CASE_PAGE_SECTION_ORDER_STORAGE_KEY = 'casePageSectionOrder';
const CASE_PAGE_DEFAULT_SECTION_ORDER: DraggableCasePageSectionKey[] = [
  'process',
  'details',
  'email',
  'customMetadata',
  'actors',
  'references',
  'arbetsmaterial',
  'handlingar',
];
const SIMPLIFIED_UI_HIDDEN_SECTIONS = new Set<DraggableCasePageSectionKey>(['details', 'email', 'actors']);

@Component({
  selector: 'nuxeo-case-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    AccordionComponent,
    CardsDisplayComponent,
    AddButtonComponent,
    DigiArbetsformedlingenAngularModule,
    SelectCaseComponent,
    AssignUserModalComponent,
    NavigationBreadComponent,
    EditFormComponent,
    CaseOverviewComponent,
    CaseDetailsComponent,
    AssignCollectionModalComponent,
    ButtonMenuComponent,
    StatusBarComponent,
    ReferencesDetailsComponent,
    ContactTableComponent,
    CommentsComponent,
    ToggleButtonComponent,
    CaseListTableComponent,
    CustomMetadataFieldComponent,
    SendEmailFormComponent,
    RequestCompletionEmailFormComponent,
    ConsultColleagueFormComponent,
    CloseCaseWarningComponent,
    ReadyToCloseWarningComponent,
    WarningCardComponent,
    AngularEditorModule,
    CommonModule,
    CalendarComponent,
    SetDeadlineComponent,
    TopButtonsPanelComponent,
    ServiceNoteFormComponent,
    ReminderNoteComponent,
    DownloadAllFilesComponent,
    WorkflowOverviewComponent,
    RouterLink,
    MotpartTableComponent,
    GeneralFormComponent,
    ImageButtonComponent,
    DeliverPublicDocsFormComponent,
    UtkastReviewComponent,
    DragDropModule,
    DragHandleComponent,
    GridPaginationControlsComponent,
    ReactiveFormsModule,
    SvgIconComponent,
  ],
  templateUrl: './case-page.component.html',
})
export class CasePageComponent implements OnInit, OnDestroy {
  protected readonly schemaFields = NUXEO_SCHEMA_FIELDS;
  protected readonly VOCAB_IDS = NUXEO_VOCAB_IDS;
  private readonly casePageConstantProvider = inject(CasePageConstantProvider);
  private readonly caseEditOptions = inject(CaseEditOptionsService);
  readonly getUserFullName = formatUserFullName;
  readonly arendePdfTemplates = signal<NuxeoDocument<TemplateSourceProperties>[]>([]);
  readonly selectedArendePdfTemplateUid = signal<string>('');
  readonly states = states;
  readonly referencesColumnsConfig = this.casePageConstantProvider.referencesColumnsConfig;
  readonly handlingsColumnsConfig = this.casePageConstantProvider.handlingsColumnsConfig;
  readonly arbetsmaterialTableConfig = this.casePageConstantProvider.arbetsmaterialTableConfig;
  readonly handlingarTableConfig = this.casePageConstantProvider.handlingarTableConfig;
  readonly inkommandeHandlingarTableConfig = this.createHandlingarTableConfig('HANDLINGAR_INKOMMANDE');
  readonly utgaendeInternHandlingarTableConfig = this.createHandlingarTableConfig('HANDLINGAR_UTGAENDE_INTERN');
  readonly allHandlingarTableConfig = this.createHandlingarTableConfig('HANDLINGAR_ALLA');

  readonly viewModeEnum = ViewMode;
  readonly pageSizeOptions = [5, 10, 15, 25, 30, 50];

  internHandlings = signal<NuxeoDocument[]>([]);
  utgaendeInternHandlings = signal<NuxeoDocument[]>([]);
  allHandlings = signal<NuxeoDocument[]>([]);
  handlingsCards = signal<NuxeoDocument<HandlingExtendedProperties>[]>([]);
  utkasts = signal<NuxeoDocument<HandlingExtendedProperties>[]>([]);
  arbetsmaterialCards = signal<NuxeoDocument<HandlingExtendedProperties>[]>([]);
  utkastsUnderWorkflow = signal<NuxeoDocument<HandlingExtendedProperties>[]>([]);
  selectedFiles = signal<string[]>([]);
  selectedHandlings = signal<string[]>([]);
  isLockedByUser = signal<boolean>(false);
  isGeneralWorkflowFormOpen = signal<boolean>(false);
  isDialogOpened = signal(false);
  isAssignUserOpened = signal<string | null>(null);
  isAssignCollectionOpened = signal<string[] | null>(null);
  handlingTypeMap = signal<Record<string, string>>({});
  handlaggarePresent = signal(false);
  isWarningCardOpen = signal<boolean>(false);
  restoreCheckboxSelection = signal<boolean>(false);
  warningActionType = signal<'readyToClose' | 'closeCase' | null>(null);
  isUtkastCloseBlockedOpen = signal<boolean>(false);
  isAlreadyMarkedReadyToClose = signal<boolean>(false);
  readyToCloseDecision = signal<string>('');
  readyToCloseDecisionDate = signal<string>('');
  readyToCloseBeslutsfattare = signal<string>('');
  isReadyToCloseDecisionLocked = signal<boolean>(false);
  closeCaseComment = signal<string>('');
  closeCaseGallringsKommentar = signal<string>('');
  closeCaseGallringsDatum = signal<string>('');
  canMarkReadyToCloseButtonSig = signal(false);
  activeRole = signal<AppRole | null>(null);
  inFavorites = signal<boolean>(false);
  inCollection = signal<boolean>(false);
  isEditPageOpen = signal<boolean>(false);
  suggestions = signal<Suggestions>({});
  isSubscribed = signal<boolean>(false);
  isAddNoteObjectOpen = signal<boolean>(false);
  internArendereferens = signal<ArendeRefOption[]>([]);
  internalContactsData = signal<InternalContact[]>([]);
  motpartContactsData = signal<Motpart[]>([]);
  chosenCaseType = signal<ArendeTypOption | undefined>(undefined);
  isCopyLinkDialogOpen = signal<boolean>(false);
  linkWasCopied = signal<boolean>(false);
  isSendEmailDialogOpen = signal<boolean>(false);
  isSendBeslutDialogOpen = signal<boolean>(false);
  isDeliverPublicDocsOpen = signal<boolean>(false);
  isRequestCompletionDialogOpen = signal<boolean>(false);
  isConsultDialogOpen = signal<boolean>(false);
  isServiceNoteDialogOpen = signal<boolean>(false);
  isDeadlineDialogOpen = signal<boolean>(false);
  isArendePdfDialogOpen = signal<boolean>(false);
  currentCaseState = signal<Option | undefined>(undefined);
  lifecycleHistory = signal<LifecycleHistoryResponse | null>(null);

  private readonly destroyRef = inject(DestroyRef);
  private lifecycleHistoryPoll?: Subscription;
  private lifecycleReloadDelay = 0;

  arbetsmaterialViewMode = signal<ViewMode>(ViewMode.Grid);
  handlingarViewMode = signal<ViewMode>(ViewMode.Grid);
  handlingarTableMode = signal<HandlingarTableMode>('grouped');
  handlingarSearchTerm = signal<string>('');
  handlingarPathFilter = signal<string | null>(null);
  arbetsmaterialSortBy = signal<string>('');
  arbetsmaterialSortOrder = signal<'asc' | 'desc'>('desc');
  inkommandeHandlingarSortBy = signal<string>(NUXEO_SCHEMA_FIELDS.dc.title);
  inkommandeHandlingarSortOrder = signal<'asc' | 'desc'>('desc');
  utgaendeInternHandlingarSortBy = signal<string>(NUXEO_SCHEMA_FIELDS.dc.title);
  utgaendeInternHandlingarSortOrder = signal<'asc' | 'desc'>('desc');
  allHandlingarSortBy = signal<string>(NUXEO_SCHEMA_FIELDS.dc.title);
  allHandlingarSortOrder = signal<'asc' | 'desc'>('desc');
  baseButtons = signal<BaseButton[]>([]);
  externRefsData = signal<ArendeExternReferens[]>([]);
  deadlineWorkflows = signal<WorkflowInfo[] | null>(null);
  sendForReviewWorkflow = signal<WorkflowInfo[] | null>(null);
  sendForApprovalWorkflow = signal<WorkflowInfo[] | null>(null);
  worflows = signal<WorkflowInfo[] | null>(null);
  deadlines = signal<Date[] | undefined>(undefined);
  reminders = signal<Date[] | undefined>(undefined);
  deadlineCommentGroups = computed(() => {
    const deadlineWorkflows = this.deadlineWorkflows() ?? [];
    return deadlineWorkflows.map(workflow => ({
      date: workflow.variables?.deadline ?? workflow.variables?.forfalloDatum ?? null,
      description: workflow.variables?.beskrivning ?? null,
      comments: this.getWorkflowComments(workflow) ?? [],
    }));
  });
  isSendForReviewDialogOpen = signal<boolean>(false);
  isSendForApprovalOpened = signal<boolean>(false);

  pendingTasks = signal<WorkflowInfo[] | undefined>(undefined);
  private readonly secretStampService = inject(SecretStampService);
  readonly document = input.required<NuxeoDocument<ArendeExtendedProperties>>();
  props = computed(() => this.document().properties as ArendeExtendedProperties);
  readonly secretStampText = computed(() =>
    this.secretStampService.getSecretStampText(this.props()[NUXEO_SCHEMA_FIELDS.arende.sekretess]?.id)
  );
  documentDetailedProps = signal<ArendeExtendedProperties>({});
  readonly reloadDocument = output();
  pageInternHandlingsTable = signal(0);
  pageUtgaendeInternHandlingsTable = signal(0);
  pageAllHandlingsTable = signal(0);
  pageArbetsmaterialCards = signal(0);
  pageHandlingarCards = signal(0);
  arbetsmaterialPageSize = signal(5);
  handlingarPageSize = signal(5);
  inkommandeHandlingarPageSize = signal(5);
  utgaendeInternHandlingarPageSize = signal(5);
  allHandlingarPageSize = signal(5);
  isDownloadAllDialogOpen = signal(false);
  generalWorkflowMenu = signal<GeneralWorkflowVocabulary[]>([]);
  generalWorkflowVocabComputed = computed<GeneralWorkflowAction[]>(() => {
    return this.generalWorkflowMenu().flatMap(el => el.children ?? []);
  });

  hasCustomMetadata = signal<boolean>(false);

  readonly shouldShowActorsSection = computed(() => {
    const ansvHandl = this.document().properties[NUXEO_SCHEMA_FIELDS.arende.ansvarigHandlaggare];
    const extContacts = this.document().properties[NUXEO_SCHEMA_FIELDS.arende.kontakter]?.length;
    const medhandlaggare = this.document().properties[NUXEO_SCHEMA_FIELDS.arende.medhandlaggare]?.length;
    const beslutsfattare = this.document().properties[NUXEO_SCHEMA_FIELDS.arende.ansvarigBeslutsfattare];
    const granskare = this.document().properties[NUXEO_SCHEMA_FIELDS.arende.granskare]?.length;
    const motpart = this.document().properties[NUXEO_SCHEMA_FIELDS.arende.motpart];
    if (ansvHandl || extContacts || medhandlaggare || beslutsfattare || granskare || motpart) {
      return true;
    }
    return false;
  });

  generalWorkflowFormValue = signal<Record<string, string>>({});
  currentGeneralWorkflowAction = signal<{ button: GeneralWorkflowAction; parent: GeneralWorkflowVocabulary } | null>(
    null
  );

  generalWorkflowCommentForm = new FormGroup({
    workflowComment: new FormControl(''),
  });

  generalWorkflowFormConfig = computed<FieldConfig[]>(() => [
    {
      type: 'dropdown',
      name: 'handlaggare',
      label: this.store.getValue('label.ui.schema.handling.ansvarig_handlaggare') ?? 'Ansvarig handläggare',

      options: this.suggestions()['ansvarig'],
      defaultValue: this.document().properties[NUXEO_SCHEMA_FIELDS.arende.ansvarigHandlaggare]?.id,
      validators: [Validators.required],
    },
    {
      type: 'dropdown',
      name: 'registrator',
      label: 'Registrator', // missed in messages.json
      options: this.suggestions()['ansvarig'],
      defaultValue: this.document().properties[NUXEO_SCHEMA_FIELDS.dc.creator]?.id,
      validators: [Validators.required],
    },
    {
      type: 'datepicker',
      name: 'forfalloDatum',
      label: this.store.getValue('documentTask.dueDate') ?? 'Förfallodatum',
    },
    {
      type: 'datepicker',
      name: 'paminnelseDatum',
      label: 'Påminnelsedatum', // missed in messages.json
      options: [],
    },
    {
      type: 'textarea',
      name: 'comment',
      label: this.store.getValue('documentPage.comments') ?? 'Kommentarer',
    },
  ]);

  readonly hasReferences = computed(() => {
    return (
      this.caseReferencesTableData().length > 0 ||
      this.handlingReferencesTableData().length > 0 ||
      this.document()?.properties?.[NUXEO_SCHEMA_FIELDS.arende.externReferens]?.length
    );
  });
  readonly router = inject(Router);
  readonly apiService = inject(NuxeoApiService);
  readonly customMetadataService = inject(CustomMetadataService);
  readonly caseLifecycle = inject(CaseLifecycleService);
  readonly favoritesService = inject(FavoritesService);
  readonly store = inject(GeneralStore);
  readonly uiModeService = inject(UiModeService);
  readonly lockService = inject(LockService);
  readonly editPermissionService = inject(EditPermissionService);
  readonly auth = inject(AuthService);
  readonly notificationService = inject(NotificationService);
  readonly searchService = inject(SearchService);
  readonly shareLinkService = inject(ShareLinkService);
  readonly tableSortService = inject(TableSortService);
  readonly printService = inject(PrintService);
  private isPrintingSelectedFiles = false;

  documentLink = computed(() => {
    return this.shareLinkService.buildDocLink(this.document().uid);
  });

  editConfig = computed<EditGroup[]>(() => {
    const canEditArendeDetails = this.auth.isAdmin() || this.auth.activeRole() === 'REGISTRATOR';
    return buildEditConfig(
      this.document(),
      this.suggestions(),
      this.chosenCaseType(),
      canEditArendeDetails,
      this.currentCaseState(),
      this.store
    );
  });
  ansvOrg = computed<string>(() => {
    const org = this.props()[NUXEO_SCHEMA_FIELDS.arende.ansvarigOrganisatoriskEnhet]?.uid;
    return typeof org === 'string' ? org : '';
  });

  caseReferencesTableData = computed(() => {
    const refs = (this.document().properties?.[NUXEO_SCHEMA_FIELDS.arende.internArendereferens] ??
      []) as ArendeInternReferens[];
    return refs.map(el => ({
      comment: el.referenskommentar ?? '',
      caseRef: el.arende?.uid ?? '',
      type: el.referenstyp?.id ?? '',
    }));
  });

  handlingReferencesTableData = computed(() => {
    const refs = this.document().properties?.[NUXEO_SCHEMA_FIELDS.arende.internHandlingsreferens] ?? [];

    return refs.map(el => ({
      comment: el.referenskommentar ?? '',
      caseRef: el.handling?.uid ?? '',
      type: el.referenstyp?.id ?? '',
    }));
  });

  buttons = computed(() => {
    const isAdmin = this.auth.adminViewEnabled();
    const activeRole = this.auth.activeRole()?.toLowerCase();
    const username = this.auth.username()?.toLowerCase();

    const doc = this.document();
    const lockOwner = doc.lockOwner?.toLowerCase();

    const isOwner = lockOwner === username;
    const isLocked = !!lockOwner;
    const docClosedByHandler = doc.state === NUXEO_VOCAB_IDS.arendestatus.avslutatAvHandlaggare;
    const docClosed = doc.state === NUXEO_VOCAB_IDS.arendestatus.stangt;
    const hasRegistratorRole = activeRole === 'registrator';
    const shouldShowCloseCaseButton = hasRegistratorRole && docClosedByHandler && !docClosed;
    const adminShouldShowCloseCaseButton = isAdmin && docClosedByHandler && !docClosed;
    const showReadyToCloseButton = !docClosed;
    const assignHandlerPreset = this.handlaggarePresent() ? 'changeHandler' : 'assignHandler';

    const registratorButtons: ActionButton[] = [];

    if (shouldShowCloseCaseButton) {
      registratorButtons.push(createButton('closeCase', () => this.onCloseCaseClicked()));
    } else if (showReadyToCloseButton) {
      registratorButtons.push(createButton('readyToClose', () => this.onReadyToCloseClicked()));
    }

    registratorButtons.push(
      createButton(assignHandlerPreset, () => this.isAssignUserOpened.set(this.document().uid)),
      createButton('deadlineReminder', () => this.isDeadlineDialogOpen.set(true)),
      createButton('printDiarySheet', () => this.openArendePdfDialog()),
      createButton('requestCompletion', () => this.isRequestCompletionDialogOpen.set(true)),
      createButton('deliverPublicDocs', () => this.isDeliverPublicDocsOpen.set(true)),
      createButton('sendEmail', () => this.isSendEmailDialogOpen.set(true)),
      createButton('sendBeslut', () => this.isSendBeslutDialogOpen.set(true)),
      createButton('createServiceNote', () => this.isServiceNoteDialogOpen.set(true)),
      createButton('downloadAllFiles', () => this.downloadAllFiles()),
      createButton('exportAllCaseHandlingar', () => this.exportAllCaseHandlingar())
    );

    const handlaggareButtons: ActionButton[] = [];

    if (showReadyToCloseButton) {
      handlaggareButtons.push(createButton('readyToClose', () => this.onReadyToCloseClicked()));
    }

    handlaggareButtons.push(
      createButton(assignHandlerPreset, () => this.isAssignUserOpened.set(this.document().uid)),
      createButton('requestCompletion', () => this.isRequestCompletionDialogOpen.set(true)),
      createButton('deadlineReminder', () => this.isDeadlineDialogOpen.set(true)),
      createButton('deliverPublicDocs', () => this.isDeliverPublicDocsOpen.set(true)),
      createButton('sendEmail', () => this.isSendEmailDialogOpen.set(true)),
      createButton('sendBeslut', () => this.isSendBeslutDialogOpen.set(true)),
      createButton('createServiceNote', () => this.isServiceNoteDialogOpen.set(true)),
      createButton('writeNote', () => this.isAddNoteObjectOpen.set(true)),
      createButton('consultColleague', () => this.isConsultDialogOpen.set(true)),
      createButton('downloadAllFiles', () => this.downloadAllFiles()),
      createButton('exportAllCaseHandlingar', () => this.exportAllCaseHandlingar())
    );

    const allRoleMenus: Record<string, ActionButton[]> = {
      registrator: registratorButtons,
      handlaggare: handlaggareButtons,
    };

    if (isAdmin) {
      const adminButtons: ActionButton[] = [];

      if (showReadyToCloseButton) {
        adminButtons.push(createButton('readyToClose', () => this.onReadyToCloseClicked()));
      }

      if (adminShouldShowCloseCaseButton) {
        adminButtons.push(createButton('closeCase', () => this.onCloseCaseClicked()));
      }

      adminButtons.push(
        createButton(assignHandlerPreset, () => this.isAssignUserOpened.set(this.document().uid)),
        createButton('requestCompletion', () => this.isRequestCompletionDialogOpen.set(true)),
        createButton('sendEmail', () => this.isSendEmailDialogOpen.set(true)),
        createButton('createServiceNote', () => this.isServiceNoteDialogOpen.set(true)),
        createButton('writeNote', () => this.isAddNoteObjectOpen.set(true)),
        createButton('consultColleague', () => this.isConsultDialogOpen.set(true)),
        createButton('deadlineReminder', () => this.isDeadlineDialogOpen.set(true)),
        createButton('printDiarySheet', () => this.openArendePdfDialog()),
        createButton('downloadAllFiles', () => this.downloadAllFiles()),
        createButton('exportAllCaseHandlingar', () => this.exportAllCaseHandlingar())
      );

      return adminButtons;
    }

    if (isLocked && !isOwner && !isAdmin) {
      if (activeRole === 'registrator') {
        return [
          createButton('printDiarySheet', () => this.openArendePdfDialog()),
          createButton('downloadAllFiles', () => this.downloadAllFiles()),
          createButton('exportAllCaseHandlingar', () => this.exportAllCaseHandlingar()),
        ];
      }

      if (activeRole === 'handlaggare') {
        return [
          createButton('requestCompletion', () => this.isRequestCompletionDialogOpen.set(true)),
          createButton('createServiceNote', () => undefined),
          createButton('writeNote', () => this.isAddNoteObjectOpen.set(true)),
          createButton('sendEmail', () => this.isSendEmailDialogOpen.set(true)),
          createButton('consultColleague', () => this.isConsultDialogOpen.set(true)),
          createButton('downloadAllFiles', () => this.downloadAllFiles()),
          createButton('exportAllCaseHandlingar', () => this.exportAllCaseHandlingar()),
        ];
      }
    }

    if (activeRole && allRoleMenus[activeRole]) {
      return allRoleMenus[activeRole];
    }

    return [];
  });

  arbetsmaterialTableItems = computed<SimpleDocRow[]>(() => {
    const rows = this.utkasts().map(doc => {
      return getUtkastExtendedTableItems(doc);
    });

    return rows;
  });

  internHandlingarTableItems = computed<HandlingRow[]>(() => {
    const rows = this.internHandlings().map(doc => {
      return getHandlingTableItems(doc);
    });
    return rows;
  });

  utgaendeInternHandlingarTableItems = computed<HandlingRow[]>(() => {
    const rows = this.utgaendeInternHandlings().map(doc => {
      return getHandlingTableItems(doc);
    });
    return rows;
  });

  allHandlingarTableItems = computed<HandlingRow[]>(() => {
    const rows = this.allHandlings().map(doc => {
      return getHandlingTableItems(doc);
    });
    return rows;
  });

  handlingarCardsTotal = signal(0);
  handlingarCardsTotalPages = computed(() => {
    const totalItems = Math.max(0, this.handlingarCardsTotal());
    const pageSize = Math.max(1, this.handlingarPageSize());
    return Math.max(1, Math.ceil(totalItems / pageSize));
  });
  pagedHandlingarCards = computed(() => this.handlingsCards());

  arbetsmaterialCardsTotal = signal(0);
  arbetsmaterialCardsTotalPages = computed(() => {
    const totalItems = Math.max(0, this.arbetsmaterialCardsTotal());
    const pageSize = Math.max(1, this.arbetsmaterialPageSize());
    return Math.max(1, Math.ceil(totalItems / pageSize));
  });
  pagedArbetsmaterialCards = computed(() => this.arbetsmaterialCards());

  arbetsmaterialTotal = computed(() => this.utkasts().length);
  internHandlingarTotal = signal(0);
  utgaendeInternHandlingarTotal = signal(0);
  allHandlingarTotal = signal(0);
  private readonly accordionStateService = inject(AccordionStateService);
  private readonly draggableSectionOrderService = inject(DraggableSectionOrderService);
  accordionState = signal<Record<string, boolean>>(
    this.accordionStateService.loadState(CASE_PAGE_ACCORDION_STATE_KEY, CASE_PAGE_ACCORDION_DEFAULTS)
  );
  allAccordionsExpanded = computed(() => Object.values(this.accordionState()).every(v => v));
  readonly hasWorkingMaterialSections = computed(() => this.handlingarCardsTotal() > 0 || this.utkasts().length > 0);
  readonly sectionOrder = signal<DraggableCasePageSectionKey[]>([...CASE_PAGE_DEFAULT_SECTION_ORDER]);
  readonly visibleSections = computed(() =>
    this.draggableSectionOrderService.visibleSections(this.sectionOrder(), section => this.isSectionVisible(section))
  );

  truncateTitle = (value: unknown) => truncateForTitle(value);

  readonly EXTERN_REFS_NAME = 'EXTERN_REFS';

  private readonly EXTERN_REFS_COLS_BASE: Omit<TableColumn, 'tableName'>[] = [
    {
      label: this.store.getValue('label.ui.schema.arende.extern_referens.referens') ?? 'Referens',
      key: 'referens',
      visible: true,
    },
    {
      label: this.store.getValue('label.ui.schema.arende.extern_referens.referenskommentar') ?? 'Referenskommentar',
      key: 'referenskommentar',
      visible: true,
    },
  ];

  readonly CUSTOM_COLS: TableColumn[] = this.EXTERN_REFS_COLS_BASE.map(c => ({
    ...c,
    tableName: this.EXTERN_REFS_NAME,
  }));

  getDefaultColumnOptions(): TableColOption[] {
    return this.CUSTOM_COLS.map(col => ({
      id: col.key,
      label: col.label,
      visible: true,
    }));
  }

  constructor() {
    this.auth.loadMe();

    this.router.events
      .pipe(
        filter(event => event instanceof NavigationEnd),
        takeUntilDestroyed()
      )
      .subscribe(() => {
        window.scrollTo({ top: 0, behavior: 'auto' });
      });

    effect(() => {
      this.activeRole.set(this.auth.activeRole());
    });

    effect(() => {
      this.loadCaseDetails(this.document());
    });

    effect(() => {
      this.loadUtkasts();
    });

    effect(() => {
      this.loadArbetsmaterialCards();
    });

    effect(() => {
      this.updateSubscriptionState(this.document(), this.auth.username());
    });

    effect(() => {
      this.setBaseButtons();
    });
    effect(() => {
      if (this.document()) {
        this.getLifecycleTransitions();
        this.loadLifecycleHistory();
      }
    });
    effect(() => {
      this.pendingTasks.set(this.document()?.contextParameters?.pendingTasks);

      this.documentDetailedProps.set(this.document().properties);
      const workflows = this.document()?.contextParameters?.runningWorkflows;
      const sendForApproveWorkflows = workflows?.filter(el => el.workflowModelName === 'StickaForGodkannande');
      const sendForReviewWorkflows = workflows?.filter(
        el => el.workflowModelName === NUXEO_VOCAB_IDS.arbetsflode.skickaForGranskning
      );
      const generalWorkflows = workflows?.filter(
        el => el.workflowModelName === NUXEO_VOCAB_IDS.arbetsflode.allmanArbetsflode
      );
      this.sendForReviewWorkflow.set(sendForReviewWorkflows ?? null);

      this.sendForApprovalWorkflow.set(sendForApproveWorkflows ?? null);
      this.worflows.set(generalWorkflows ?? null);

      this.deadlineWorkflows.set(workflows?.filter(el => el.workflowModelName === 'DeadlineOchPaminnelse') ?? null);
      this.deadlines.set(this.deadlineWorkflows()?.map(el => el.variables.deadline));
      this.reminders.set(
        this.deadlineWorkflows()
          ?.map(el => el.variables.paminnelse)
          .filter(v => v != null)
      );

      const caseType = this.document().properties[NUXEO_SCHEMA_FIELDS.arende.arendetyp];

      if (typeof caseType !== 'string') {
        this.chosenCaseType.set({
          label: caseType?.title ?? '',
          id: caseType?.uid ?? '',
          value: caseType?.uid ?? '',
        });
      }

      const props = this.document().properties;

      const intContacts = getInternalContacts(props);
      this.internalContactsData.set(intContacts);
      const motpartContacts = getMotpartContacts(props);
      this.motpartContactsData.set(motpartContacts);
    });
    effect(() => {
      const inkommandePageSize = this.inkommandeHandlingarPageSize();
      const utgaendeInternPageSize = this.utgaendeInternHandlingarPageSize();
      const allPageSize = this.allHandlingarPageSize();
      const internPageIndex = this.pageInternHandlingsTable();
      const utgaendeInternPageIndex = this.pageUtgaendeInternHandlingsTable();
      const allPageIndex = this.pageAllHandlingsTable();
      const tableMode = this.handlingarTableMode();
      const searchTerm = this.handlingarSearchTerm();

      if (tableMode === 'all') {
        this.getAllHandlings(
          allPageSize,
          allPageSize * allPageIndex,
          allPageIndex,
          this.resolveHandlingSortField(this.allHandlingarSortBy()),
          this.allHandlingarSortOrder(),
          searchTerm
        );
        return;
      }

      this.getInternHandlings(
        inkommandePageSize,
        inkommandePageSize * internPageIndex,
        internPageIndex,
        this.resolveHandlingSortField(this.inkommandeHandlingarSortBy()),
        this.inkommandeHandlingarSortOrder(),
        searchTerm
      );
      this.getUtgaendeInternHandlings(
        utgaendeInternPageSize,
        utgaendeInternPageSize * utgaendeInternPageIndex,
        utgaendeInternPageIndex,
        this.resolveHandlingSortField(this.utgaendeInternHandlingarSortBy()),
        this.utgaendeInternHandlingarSortOrder(),
        searchTerm
      );
    });

    effect(() => {
      const maxPage = this.handlingarCardsTotalPages() - 1;
      const currentPage = this.pageHandlingarCards();
      if (currentPage > maxPage) {
        this.pageHandlingarCards.set(Math.max(0, maxPage));
      }
    });

    effect(() => {
      const maxPage = this.arbetsmaterialCardsTotalPages() - 1;
      const currentPage = this.pageArbetsmaterialCards();
      if (currentPage > maxPage) {
        this.pageArbetsmaterialCards.set(Math.max(0, maxPage));
      }
    });
  }
  generalWorkflowIcons = ['FileText', 'Copy', 'Arende', 'Send', 'Trash2']; // icons we should receive from BE

  ngOnInit(): void {
    this.sectionOrder.set(
      this.draggableSectionOrderService.loadOrder(CASE_PAGE_SECTION_ORDER_STORAGE_KEY, CASE_PAGE_DEFAULT_SECTION_ORDER)
    );

    this.checkInCollection();
    this.getPageSize();

    this.setBaseButtons();
    this.store.baseButtons.set(this.baseButtons());
    this.store.openPage.set('case');

    this.favoritesService
      .checkInFavorites(this.document().uid)
      .pipe(tap(result => this.inFavorites.set(result)))
      .subscribe();

    this.getCaseTypes();
    this.getGeneralWorkfows();
    this.externRefsData.set(this.document().properties[NUXEO_SCHEMA_FIELDS.arende.externReferens] ?? []);
    this.loadSuggestions('riktning', this.caseEditOptions.getDirectorySuggestions('ArendeRiktning'));
    this.loadSuggestions('motpart_typ', this.caseEditOptions.getDirectorySuggestions('MotpartTyp'));
    this.loadSuggestions('secret', this.caseEditOptions.getDirectorySuggestions('Sekretess'));
    this.loadSuggestions('secretClass', this.caseEditOptions.getDirectorySuggestions('Sakerhetsskyddsklassificering'));

    this.loadSuggestions('handlaggningsstatus', this.caseEditOptions.getDirectorySuggestions('Handlaggningsstatus'));
    this.loadSuggestions('lagrum', this.caseEditOptions.getLagrumSuggestions(this.document().uid));
    this.loadSuggestions('bevaras', this.caseEditOptions.getBevarasSuggestions());
    this.loadSuggestions(
      'beslutTyp',
      this.caseEditOptions.getDocumentSuggestions(this.document().parentRef!, 'Beslut')
    );
    this.loadSuggestions(
      'beredningsbeslut',
      this.caseEditOptions.getDocumentSuggestions(this.document().parentRef!, 'Beredningsbeslut')
    );
    this.loadSuggestions('medhand', this.caseEditOptions.getUserSuggestions());
    this.loadSuggestions('ansvarig', this.caseEditOptions.getUserSuggestions());
    this.loadSuggestions('granskare', this.caseEditOptions.getUserSuggestions());
    this.loadSuggestions(
      'organization',
      this.caseEditOptions.getDocumentSuggestions(this.document().parentRef!, 'Organisationsdel')
    );

    this.lockService.initLockState(this.document(), this.isLockedByUser);
  }

  getGeneralWorkfows() {
    this.apiService
      .getDirectorySuggestions<GeneralWorkflowStructure[]>('AtgarderAllmannaArbetsflodet')
      .pipe(
        tap(result => {
          if (result) {
            const arende = result.filter(el => el.displayLabel === 'Arende');
            if (arende.length > 0) {
              this.generalWorkflowMenu.set(arende[0].children);
            }
          }
        })
      )
      .subscribe();
  }
  isUserAssignedForWorkflow(workflow: WorkflowInfo) {
    return !!this.pendingTasks()?.find(el => el.workflowInstanceId === workflow.id);
  }
  canUserCancelWorkflow(workflow: WorkflowInfo) {
    return workflow.initiator === this.auth.username();
  }

  getLifecycleTransitions() {
    this.apiService
      .getLifecycleTransitions(this.document().uid)
      .pipe(
        tap(data => {
          const transitionsOptions = data.transitions.map(el => ({
            id: el.name,
            label: this.store.getValue(el.destinationStateLabel) ?? el.name,
          }));
          transitionsOptions.push({
            id: data.currentState,
            label: this.store.getValue(data.currentStateLabel) ?? data.currentState,
          });
          this.suggestions.update(current => ({ ...current, arendesteg: transitionsOptions }));
          this.currentCaseState.set({ id: data.currentState, label: data.currentStateLabel });
        })
      )
      .subscribe();
  }

  loadLifecycleHistory() {
    this.lifecycleHistoryPoll?.unsubscribe();
    const isJustCreated = this.router.lastSuccessfulNavigation?.extras?.state?.['justCreated'];
    const delay = isJustCreated ? 2000 : this.lifecycleReloadDelay;
    this.lifecycleReloadDelay = 0;
    this.lifecycleHistoryPoll = timer(delay)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        switchMap(() =>
          this.apiService.getDocumentLifecycleHistory(this.document().uid).pipe(catchError(() => of(null)))
        ),
        tap(data => this.lifecycleHistory.set(data as LifecycleHistoryResponse | null))
      )
      .subscribe();
  }

  getTaskActions(workflow: WorkflowInfo) {
    const task = this.pendingTasks()?.find(el => el.workflowInstanceId === workflow.id);
    return task?.taskInfo.taskActions;
  }

  abortWorkflow(workflow: WorkflowInfo) {
    this.apiService.deleteWorkflow(workflow.id).subscribe(() => this.reloadDocument.emit());
  }

  sendReviewDecision(action: string, workflow: WorkflowInfo) {
    const comment = this.generalWorkflowCommentForm.controls['workflowComment'].value
      ? this.generalWorkflowCommentForm.controls['workflowComment'].value
      : undefined;

    const decisionTask = this.pendingTasks()?.find(el => el.workflowInstanceId === workflow.id);

    const workflowId = decisionTask?.id;
    if (!workflowId) {
      return;
    }
    const payload = {
      id: workflowId,
      'entity-type': 'task',
      variables: {
        kommentar: comment,
      },
    };
    const notifications: Record<string, string> = {
      AllmantArbetsflode: 'Arbetsflöde avslutas uppgiften utförd  OK',
      StickaForGodkannande: 'Ärendet godkänt OK',
      SkickaForGranskning: 'Ärendet granskat OK',
    };
    this.apiService
      .editWorkflow(workflowId, action, payload)
      .pipe(
        tap(() => {
          const nowInFavorites = !this.inFavorites();
          this.inFavorites.set(nowInFavorites);
          this.generalWorkflowCommentForm.reset();

          this.store.notification.set({
            show: true,
            variation: 'success',
            text:
              action === NUXEO_VOCAB_IDS.arbetsflodeAtgard.avvisa
                ? CASE_REVIEW_REJECTED_MESSAGE
                : notifications[workflow.workflowModelName],
          });
        }),
        tap(() => this.reloadDocument.emit()),
        catchError(() => {
          this.store.notification.set({
            show: true,
            variation: 'danger',
            text: CASE_REVIEW_CONFIRM_ERROR_MESSAGE,
          });
          return EMPTY;
        })
      )
      .subscribe();
  }

  isAwaitingCompletion(): boolean {
    return (
      this.document().properties?.[NUXEO_SCHEMA_FIELDS.arende.handlaggningsstatus]?.id ===
      NUXEO_VOCAB_IDS.handlaggningsstatus.invantarKomplettering
    );
  }

  onCaseTypeChanged(_caseTypeId: string | null): void {
    this.loadSuggestions('lagrum', this.caseEditOptions.getLagrumSuggestions(this.document().uid));
  }
  getWorkflowComments(worflow: WorkflowInfo) {
    return this.document()
      .properties?.[NUXEO_SCHEMA_FIELDS.arbetsfloden.arbetsfloden]?.find(el => el.arbetsflodesid === worflow.id)
      ?.uppgifter?.slice()
      .filter(el => el.kommentar)
      .sort((a, b) => {
        const dateA = a.atgardDatum ? new Date(a.atgardDatum).getTime() : 0;
        const dateB = b.atgardDatum ? new Date(b.atgardDatum).getTime() : 0;
        return dateA - dateB;
      });
  }

  getUserName(actor: NxUser) {
    return (
      actor.properties?.[NUXEO_SCHEMA_FIELDS.user.firstName] +
      ' ' +
      actor.properties?.[NUXEO_SCHEMA_FIELDS.user.lastName]
    );
  }

  setBaseButtons() {
    const buttons: BaseButton[] = [];
    const lockPreset = this.isLockedByUser() ? 'unlock' : 'lock';
    const favoritePreset = this.inFavorites() ? 'favoriteActive' : 'favorite';
    const notifyPreset = this.isSubscribed() ? 'stopNotify' : 'notify';

    buttons.push(createButton('edit', () => this.isEditPageOpen.set(true)));

    buttons.push(
      createButton('share', () => this.isCopyLinkDialogOpen.set(true)),
      createButton(lockPreset, () => this.toggleLockState()),
      createButton(favoritePreset, () =>
        this.favoritesService
          .toggleFavorites(this.document().uid, this.inFavorites())
          .pipe(
            tap(() => {
              const nowInFavorites = !this.inFavorites();
              this.inFavorites.set(nowInFavorites);

              this.store.notification.set({
                show: true,
                variation: 'success',
                text: nowInFavorites ? FAVORITE_ADDED_MESSAGE : FAVORITE_REMOVED_MESSAGE,
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
          .subscribe()
      ),
      createButton('collection', () => this.isAssignCollectionOpened.set([this.document().uid])),
      createButton(notifyPreset, () => this.toggleSubscription())
    );

    this.baseButtons.set(buttons);
    this.store.baseButtons.set(buttons);
  }

  saveGeneralWorkflowForm(event: Record<string, string>) {
    this.generalWorkflowFormValue.set(event);
  }

  startWorkflow() {
    const payload = {
      attachedDocumentIds: [this.document().uid],
      'entity-type': 'workflow',
      workflowModelName: NUXEO_VOCAB_IDS.arbetsflode.allmanArbetsflode,
      variables: {
        registrator: this.generalWorkflowFormValue()['registrator']
          ? this.generalWorkflowFormValue()['registrator']
          : this.document().properties[NUXEO_SCHEMA_FIELDS.dc.creator]?.id,
        handlaggare: this.generalWorkflowFormValue()['handlaggare']
          ? this.generalWorkflowFormValue()['handlaggare']
          : this.document().properties[NUXEO_SCHEMA_FIELDS.arende.ansvarigHandlaggare]?.id,
        forfalloDatum: this.generalWorkflowFormValue()['forfalloDatum']?.[0],
        paminnelseDatum: this.generalWorkflowFormValue()['paminnelseDatum']?.[0],
        valdAtgard: this.currentGeneralWorkflowAction()?.button?.id,
        ursprungligKommentar: this.generalWorkflowFormValue()['comment'],
      },
    };
    this.apiService.createWorkflow(this.document().uid, payload).subscribe(() => this.reloadDocument.emit());
  }

  toggleAccordionBtn() {
    const next = !this.allAccordionsExpanded();
    const nextState = Object.fromEntries(Object.keys(CASE_PAGE_ACCORDION_DEFAULTS).map(k => [k, next]));
    this.accordionState.set(nextState);
    this.accordionStateService.saveState(CASE_PAGE_ACCORDION_STATE_KEY, nextState);
  }

  onSectionToggled(section: string, isExpanded: boolean) {
    const next = { ...this.accordionState(), [section]: isExpanded };
    this.accordionState.set(next);
    this.accordionStateService.saveState(CASE_PAGE_ACCORDION_STATE_KEY, next);
    if (section === 'process' && isExpanded && !this.lifecycleHistory()) {
      this.loadLifecycleHistory();
    }
  }

  onSectionDropped(event: CdkDragDrop<DraggableCasePageSectionKey[]>) {
    const nextSectionOrder = this.draggableSectionOrderService.reorderSections(
      this.sectionOrder(),
      section => this.isSectionVisible(section),
      event.previousIndex,
      event.currentIndex
    );
    this.sectionOrder.set(nextSectionOrder);
    this.draggableSectionOrderService.saveOrder(CASE_PAGE_SECTION_ORDER_STORAGE_KEY, nextSectionOrder);
  }

  canSortCaseSection(index: number): boolean {
    return index > 0;
  }

  private isSectionVisible(section: DraggableCasePageSectionKey): boolean {
    if (
      this.auth.activeRole() === 'HANDLAGGARE' &&
      this.uiModeService.isSimplified() &&
      SIMPLIFIED_UI_HIDDEN_SECTIONS.has(section)
    ) {
      return false;
    }

    switch (section) {
      case 'customMetadata':
        return this.hasCustomMetadata();
      case 'actors':
        return this.shouldShowActorsSection();
      case 'references':
        return Boolean(this.hasReferences());
      case 'arbetsmaterial':
        return this.hasWorkingMaterialSections();
      case 'handlingar':
        return this.hasWorkingMaterialSections() || Boolean(this.handlingarSearchTerm());
      default:
        return true;
    }
  }

  downloadAllFiles() {
    this.isDownloadAllDialogOpen.set(true);
  }

  exportAllCaseHandlingar(): void {
    const arendeUid = this.document().uid;

    this.apiService
      .getAncestorsById(arendeUid)
      .pipe(
        map(ancestors => ancestors.find(ancestor => ancestor.type === 'Myndighet')?.uid),
        switchMap(myndighetUid => {
          if (!myndighetUid) {
            this.store.notification.set({
              show: true,
              variation: 'danger',
              text: CASE_MISSING_MYNDIGHET_MESSAGE,
            });
            return EMPTY;
          }

          return this.apiService.startZipExport(myndighetUid, arendeUid);
        }),
        tap(() => {
          this.store.notification.set({
            show: true,
            variation: 'success',
            text: CASE_EXPORT_ALL_HANDLINGAR_STARTED_MESSAGE,
          });
        }),
        catchError(error => {
          this.store.notification.set({
            show: true,
            variation: 'danger',
            text: error?.error?.message ?? CASE_EXPORT_START_ERROR_MESSAGE,
          });
          return EMPTY;
        })
      )
      .subscribe();
  }

  updateChecklist(event: CustomEvent, item: ChecklistItem) {
    const props = {
      [NUXEO_SCHEMA_FIELDS.checklista.checklistesteg]: this.document().properties[
        NUXEO_SCHEMA_FIELDS.checklista.checklistesteg
      ]?.map(el => (el.namn === item.namn ? { ...el, klar: event?.detail?.target?.checked } : el)),
    };
    this.apiService
      .editDocument(this.document().uid, props)
      .pipe(tap(() => this.reloadDocument.emit()))
      .subscribe();
  }

  ngOnDestroy(): void {
    this.store.openPage.set(null);
  }

  onInternHandlingsPageChange(newPage: number) {
    this.pageInternHandlingsTable.set(newPage);
  }

  onUtgaendeInternHandlingsPageChange(newPage: number) {
    this.pageUtgaendeInternHandlingsTable.set(newPage);
  }

  onAllHandlingsPageChange(newPage: number) {
    this.pageAllHandlingsTable.set(newPage);
  }

  onHandlingarCardsPageChange(newPage: number): void {
    this.pageHandlingarCards.set(Math.max(0, newPage));
  }

  onHandlingarPageSizeSelect(value: string): void {
    const nextValue = Number(value);

    this.handlingarPageSize.set(nextValue);
    this.pageHandlingarCards.set(0);

    const username = this.auth.username();
    if (username) {
      savePageSize(username, GLOBAL_PAGE_SIZE_KEY, nextValue);
    }
  }

  onInkommandeHandlingarPageSizeSelect(value: string): void {
    const nextValue = Number(value);

    this.inkommandeHandlingarPageSize.set(nextValue);
    this.pageInternHandlingsTable.set(0);
  }

  onUtgaendeInternHandlingarPageSizeSelect(value: string): void {
    const nextValue = Number(value);

    this.utgaendeInternHandlingarPageSize.set(nextValue);
    this.pageUtgaendeInternHandlingsTable.set(0);
  }

  onAllHandlingarPageSizeSelect(value: string): void {
    const nextValue = Number(value);

    this.allHandlingarPageSize.set(nextValue);
    this.pageAllHandlingsTable.set(0);
  }

  getPageSize(): void {
    const username = this.auth.username();
    if (!username) return;

    const savedSize = loadPageSize(username, GLOBAL_PAGE_SIZE_KEY);
    if (savedSize != null) {
      this.handlingarPageSize.set(savedSize);
      this.inkommandeHandlingarPageSize.set(savedSize);
      this.utgaendeInternHandlingarPageSize.set(savedSize);
      this.allHandlingarPageSize.set(savedSize);
    }
  }

  openDocument(uid: string): void {
    this.router.navigate(['/doc/', uid]);
  }

  handleServiceNoteCreated(doc: NuxeoDocument): void {
    if (doc?.uid) {
      this.openDocument(doc.uid);
      return;
    }

    this.loadCaseDetails(this.document());
    this.reloadDocument.emit();
  }

  onItemSelect(doc: NuxeoDocument<HandlingExtendedProperties>, type?: string): void {
    const docId = doc.uid;
    if (!docId) return;
    if (type === 'handling') {
      const alreadySelectedHandling = this.selectedHandlings().includes(docId);
      if (alreadySelectedHandling) {
        this.selectedHandlings.set(this.selectedHandlings().filter(id => id !== docId));
      } else {
        this.selectedHandlings.set([...this.selectedHandlings(), docId]);
      }
    }

    const alreadySelected = this.selectedFiles().includes(docId);
    if (alreadySelected) {
      this.selectedFiles.set(this.selectedFiles().filter(id => id !== docId));
    } else {
      this.selectedFiles.set([...this.selectedFiles(), docId]);
    }
  }

  clearSelectedFiles(): void {
    this.selectedFiles.set([]);
    this.selectedHandlings.set([]);
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

  deleteSelectedItems(): void {
    this.apiService
      .deleteSeveralDocument(this.selectedFiles())
      .pipe(
        map(() => {
          this.clearSelectedFiles();
          return this.loadCaseDetails(this.document());
        })
      )
      .subscribe({
        next: () => {
          this.store.notification.set({
            show: true,
            variation: 'success',
            text: CASE_FILE_DELETED_MESSAGE,
          });

          this.loadCaseDetails(this.document());
        },
        error: () => {
          this.store.notification.set({
            show: true,
            variation: 'danger',
            text: CASE_FILE_DELETE_ERROR_MESSAGE,
          });
        },
      });
  }

  markReadyToClose(): void {
    const doc = this.document();
    const currentState = doc.state ?? null;

    this.caseLifecycle
      .transitionToReadyToClose(doc.uid, currentState, {
        decision: this.readyToCloseDecision().trim() || undefined,
        decisionDate: this.readyToCloseDecisionDate().trim() || undefined,
      })
      .subscribe({
        next: () => {
          this.store.notification.set({
            show: true,
            variation: 'success',
            text: CASE_ASSIGN_SUCCESS_MESSAGE,
          });

          this.loadCaseDetails(this.document());
          this.lifecycleReloadDelay = 2000;
          this.reloadDocument.emit();
        },
        error: err => {
          this.store.notification.set({
            show: true,
            variation: 'danger',
            text: err.message,
          });
        },
      });
  }

  closeCase(): void {
    const docId = this.document().uid;
    if (!docId) {
      return;
    }

    const updates: Record<string, unknown> = {};
    const comment = this.closeCaseComment().trim();

    if (comment) {
      updates[NUXEO_SCHEMA_FIELDS.arende.allmanKommentar] = comment;
    }

    const close$ = Object.keys(updates).length
      ? this.apiService.editDocument(docId, updates).pipe(switchMap(() => this.apiService.closeCase(docId)))
      : this.apiService.closeCase(docId);

    close$.subscribe({
      next: () => {
        this.store.notification.set({
          show: true,
          variation: 'success',
          text: CASE_CLOSED_MESSAGE,
        });

        this.loadCaseDetails(this.document());
        this.lifecycleReloadDelay = 2000;
        this.reloadDocument.emit();
      },
      error: err => {
        const errorMessage = err?.message ?? CASE_CLOSE_ERROR_MESSAGE;

        this.store.notification.set({
          show: true,
          variation: 'danger',
          text: errorMessage,
        });
      },
    });
  }

  handleWarningCardAction(event: 'cancel' | 'confirm'): void {
    if (event === 'cancel') {
      this.isWarningCardOpen.set(false);
      this.warningActionType.set(null);
      this.resetCloseCaseFields();
      return;
    }

    if (event === 'confirm') {
      const warningAction = this.warningActionType();

      if (warningAction === 'readyToClose') {
        this.isWarningCardOpen.set(false);
        this.markReadyToClose();
        this.readyToCloseDecision.set('');
        this.readyToCloseDecisionDate.set('');
        this.warningActionType.set(null);
        return;
      }

      if (warningAction === 'closeCase') {
        this.isWarningCardOpen.set(false);
        this.warningActionType.set(null);
        this.closeCase();
        this.resetCloseCaseFields();
      }
    }
  }

  onReadyToCloseClicked(): void {
    this.warningActionType.set('readyToClose');

    const doc = this.document();
    const currentState = doc.state ?? null;

    const alreadyMarked = currentState === NUXEO_VOCAB_IDS.arendestatus.avslutatAvHandlaggare;
    const existingDecisionValue = this.props()[NUXEO_SCHEMA_FIELDS.arende.beslutstyp]?.uid ?? '';
    const existingDecisionDate = this.props()[NUXEO_SCHEMA_FIELDS.arende.beslutatDatum] ?? '';

    this.isAlreadyMarkedReadyToClose.set(alreadyMarked);
    this.readyToCloseDecision.set(existingDecisionValue);
    this.readyToCloseDecisionDate.set(String(existingDecisionDate));
    this.isReadyToCloseDecisionLocked.set(!!existingDecisionValue);
    this.isWarningCardOpen.set(true);
  }

  onCloseCaseClicked(): void {
    this.warningActionType.set('closeCase');
    this.isAlreadyMarkedReadyToClose.set(false);
    this.resetCloseCaseFields();
    this.isWarningCardOpen.set(true);
  }

  private resetCloseCaseFields(): void {
    this.closeCaseComment.set('');
    this.closeCaseGallringsKommentar.set('');
    this.closeCaseGallringsDatum.set('');
    this.readyToCloseBeslutsfattare.set('');
  }

  toggleSubscription(): void {
    const documentId = this.document().uid;
    const isCurrentlySubscribed = this.isSubscribed();

    const action$ = isCurrentlySubscribed
      ? this.notificationService.unsubscribe(documentId)
      : this.notificationService.subscribe(documentId);

    action$
      .pipe(
        tap(() => {
          const nowSubscribed = !isCurrentlySubscribed;
          this.isSubscribed.set(nowSubscribed);
          this.reloadDocument.emit();

          this.store.notification.set({
            show: true,
            variation: 'success',
            text: nowSubscribed ? SUBSCRIPTION_ENABLED_MESSAGE : SUBSCRIPTION_DISABLED_MESSAGE,
          });
        }),
        catchError(() => {
          this.store.notification.set({
            show: true,
            variation: 'danger',
            text: SUBSCRIPTION_ERROR_MESSAGE,
          });
          return EMPTY;
        })
      )
      .subscribe();
  }

  toggleLockState(): void {
    this.lockService.toggleAndUpdate(this.document(), this.isLockedByUser, this.reloadDocument).subscribe();
  }

  copyLink(): void {
    this.shareLinkService.copyDocumentLink(this.document().uid, copied => this.linkWasCopied.set(copied));
  }

  onArbetsmaterialToggleButtonChange(activeButtonIndex: number): void {
    this.arbetsmaterialViewMode.set(activeButtonIndex === 1 ? ViewMode.Grid : ViewMode.Table);
  }

  onArbetsmaterialCardsPageChange(newPage: number): void {
    this.pageArbetsmaterialCards.set(Math.max(0, newPage));
  }

  onArbetsmaterialPageSizeSelect(value: string | number): void {
    const nextValue = Number(value);
    if (!Number.isFinite(nextValue) || nextValue <= 0 || nextValue === this.arbetsmaterialPageSize()) return;

    this.arbetsmaterialPageSize.set(nextValue);
    this.pageArbetsmaterialCards.set(0);
  }

  onHandlingarToggleButtonChange(activeButtonIndex: number): void {
    this.handlingarViewMode.set(activeButtonIndex === 1 ? ViewMode.Grid : ViewMode.Table);
  }

  onHandlingarTableModeChange(mode: HandlingarTableMode): void {
    this.handlingarTableMode.set(mode);
    if (mode === 'all') {
      this.pageAllHandlingsTable.set(0);
    } else {
      this.pageInternHandlingsTable.set(0);
      this.pageUtgaendeInternHandlingsTable.set(0);
    }
  }

  onHandlingarSearch(eventValue: unknown): void {
    const normalized = this.searchService.extractTerm(eventValue);
    this.handlingarSearchTerm.set(normalized);
    this.pageHandlingarCards.set(0);
    this.pageInternHandlingsTable.set(0);
    this.pageUtgaendeInternHandlingsTable.set(0);
    this.pageAllHandlingsTable.set(0);
  }

  onHandlingarFiltersChanged(raw: FilterResult): void {
    const firstChecked = raw.checked && raw.checked.length > 0 ? raw.checked[0] : '';
    this.handlingarPathFilter.set(firstChecked || null);
    this.pageHandlingarCards.set(0);
  }

  onArbetsmaterialTableSelect(ids: string[]): void {
    const relevantIds = this.utkasts().map(doc => doc.uid);
    this.mergeTableSelection(ids, relevantIds);
  }

  onInternHandlingarTableSelect(ids: string[]): void {
    const relevantIds = this.internHandlings().map(doc => doc.uid);
    this.mergeHandlingTableSelection(ids, relevantIds);
  }

  onInternHandlingarTableSelectAll(checked: boolean): void {
    this.fetchAllHandlingIds(
      this.internHandlingarTotal(),
      [NUXEO_VOCAB_IDS.arendeRiktning.inkommande],
      this.resolveHandlingSortField(this.inkommandeHandlingarSortBy()),
      this.inkommandeHandlingarSortOrder(),
      this.handlingarSearchTerm()
    )
      .pipe(tap(ids => this.mergeHandlingTableSelection(checked ? ids : [], ids)))
      .subscribe();
  }

  onUtgaendeInternHandlingarTableSelect(ids: string[]): void {
    const relevantIds = this.utgaendeInternHandlings().map(doc => doc.uid);
    this.mergeHandlingTableSelection(ids, relevantIds);
  }

  onUtgaendeInternHandlingarTableSelectAll(checked: boolean): void {
    this.fetchAllHandlingIds(
      this.utgaendeInternHandlingarTotal(),
      [NUXEO_VOCAB_IDS.arendeRiktning.utgaende, NUXEO_VOCAB_IDS.arendeRiktning.intern],
      this.resolveHandlingSortField(this.utgaendeInternHandlingarSortBy()),
      this.utgaendeInternHandlingarSortOrder(),
      this.handlingarSearchTerm()
    )
      .pipe(tap(ids => this.mergeHandlingTableSelection(checked ? ids : [], ids)))
      .subscribe();
  }

  onAllHandlingarTableSelect(ids: string[]): void {
    const relevantIds = this.allHandlings().map(doc => doc.uid);
    this.mergeHandlingTableSelection(ids, relevantIds);
  }

  onAllHandlingarTableSelectAll(checked: boolean): void {
    this.fetchAllHandlingIds(
      this.allHandlingarTotal(),
      undefined,
      this.resolveHandlingSortField(this.allHandlingarSortBy()),
      this.allHandlingarSortOrder(),
      this.handlingarSearchTerm()
    )
      .pipe(tap(ids => this.mergeHandlingTableSelection(checked ? ids : [], ids)))
      .subscribe();
  }

  onArbetsmaterialSortChange(event: { sortBy: string; sortOrder: 'asc' | 'desc' }): void {
    this.tableSortService.applySortSignals(this.arbetsmaterialSortBy, this.arbetsmaterialSortOrder, event, {
      sortBy: '',
      sortOrder: 'desc',
    });
    this.pageArbetsmaterialCards.set(0);
  }

  onInkommandeHandlingarSortChange(event: { sortBy: string; sortOrder: 'asc' | 'desc' }): void {
    this.tableSortService.applySortSignals(this.inkommandeHandlingarSortBy, this.inkommandeHandlingarSortOrder, event, {
      sortBy: '',
      sortOrder: 'desc',
    });

    this.pageInternHandlingsTable.set(0);
  }

  onUtgaendeInternHandlingarSortChange(event: { sortBy: string; sortOrder: 'asc' | 'desc' }): void {
    this.tableSortService.applySortSignals(
      this.utgaendeInternHandlingarSortBy,
      this.utgaendeInternHandlingarSortOrder,
      event,
      {
        sortBy: '',
        sortOrder: 'desc',
      }
    );

    this.pageUtgaendeInternHandlingsTable.set(0);
  }

  onAllHandlingarSortChange(event: { sortBy: string; sortOrder: 'asc' | 'desc' }): void {
    this.tableSortService.applySortSignals(this.allHandlingarSortBy, this.allHandlingarSortOrder, event, {
      sortBy: '',
      sortOrder: 'desc',
    });

    this.pageAllHandlingsTable.set(0);
  }

  getArbetsmaterialDefaultColumnOptions(): TableColOption[] {
    return this.arbetsmaterialTableConfig.map(column => ({
      id: column.key.toString(),
      label: column.label,
      visible: column.visible ?? true,
    }));
  }

  getHandlingarDefaultColumnOptions(tableConfig: TableColumn[] = this.handlingarTableConfig): TableColOption[] {
    return tableConfig.map(column => ({
      id: column.key.toString(),
      label: column.label,
      visible: column.visible ?? true,
    }));
  }

  private createHandlingarTableConfig(tableName: string): TableColumn[] {
    return this.casePageConstantProvider.handlingarTableConfig.map(column => ({
      ...column,
      tableName,
    }));
  }

  private mergeTableSelection(newIds: string[], tableDocIds: string[]): void {
    this.selectedFiles.set(this.mergeSelection(this.selectedFiles(), newIds, tableDocIds));
  }

  private mergeHandlingTableSelection(newIds: string[], tableDocIds: string[]): void {
    this.selectedFiles.set(this.mergeSelection(this.selectedFiles(), newIds, tableDocIds));
    this.selectedHandlings.set(this.mergeSelection(this.selectedHandlings(), newIds, tableDocIds));
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

  private fetchAllHandlingIds(
    total: number,
    handlingsriktning?: string[],
    sortBy?: string,
    sortOrder?: 'asc' | 'desc',
    searchTerm = ''
  ): Observable<string[]> {
    const pageSize = Math.max(total, this.handlingarPageSize(), 1);

    return this.apiService
      .getHandling(this.document().uid, pageSize, 0, 0, sortBy, sortOrder, handlingsriktning, searchTerm)
      .pipe(
        map(data => data.entries.map(doc => doc.uid).filter((uid): uid is string => typeof uid === 'string')),
        catchError(() => {
          this.store.notification.set({
            show: true,
            variation: 'danger',
            text: CASE_SELECT_ALL_HANDLINGAR_ERROR_MESSAGE,
          });
          return of([]);
        })
      );
  }

  getCaseTypes(): void {
    const parentRef = this.document().parentRef ?? '';
    this.apiService
      .DMSDocumentSuggestion(parentRef, 'Klass', 'Arende')
      .pipe(
        map(result => result.entries.map(el => ({ label: el.title, id: el.uid, value: el.uid, path: el.path }))),
        tap(options => {
          this.suggestions.update(result => ({ ...result, caseType: options }));
        }),
        catchError(_err => {
          this.store.notification.set({
            show: true,
            variation: 'danger',
            text: CASE_LOAD_ARENDETYPER_ERROR_MESSAGE,
          });
          return EMPTY;
        })
      )
      .subscribe();
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

  updateDropdownValues(event: { fieldName: string; value: string }) {
    if (event.fieldName === 'organization') {
      this.loadSuggestions(
        'organization',
        this.caseEditOptions.getDocumentSuggestions(this.document().parentRef!, 'Organisationsdel', event.value)
      );
    }
  }

  updateReferences(refs: ArendeRefOption[], prop: 'handlings' | 'arende', propVal: 'handling' | 'arende'): void {
    const formProperties = !refs
      ? { [`arende:intern_${prop}referens`]: [] }
      : {
          [`arende:intern_${prop}referens`]: refs.map(el => ({
            referenstyp: el.type,
            referenskommentar: el.comment,
            [propVal]: el.caseRef,
          })),
        };

    this.editForm(formProperties);
  }

  formatEditForm(formResult: EditCaseResult): void {
    const arendesteg = formResult?.overview?.arendesteg;
    const arendestegHasChanged = arendesteg && arendesteg !== this.currentCaseState()?.id;
    const registeredDate = formResult?.arendeDetails?.registered?.[0];
    const formProperties: Record<string, unknown> = getFormProperties(formResult, registeredDate);
    const selectedStatus = (formResult?.overview?.arendestatus ?? '').toString().trim().toLowerCase();
    const shouldCloseCase =
      selectedStatus === NUXEO_VOCAB_IDS.arendestatus.stangt &&
      this.document().state?.toLowerCase() !== NUXEO_VOCAB_IDS.arendestatus.stangt;
    const shouldCancelCase =
      selectedStatus === NUXEO_VOCAB_IDS.arendestatus.makulerat &&
      this.document().state?.toLowerCase() !== NUXEO_VOCAB_IDS.arendestatus.makulerad;
    const hasUtkasts = this.utkasts().length > 0;

    if (shouldCloseCase && hasUtkasts) {
      this.isUtkastCloseBlockedOpen.set(true);
      return;
    }

    const metadataValues = formResult.customMetadataValues;
    if (metadataValues) {
      formProperties[NUXEO_SCHEMA_FIELDS.dmsmetadataanpassad.falt] = metadataValues;
    }

    // Only call followLifecycleTransition for transitions not already handled by closeCase/markCaseCancelled below
    const shouldFollowTransition = arendestegHasChanged && !shouldCloseCase && !shouldCancelCase;

    combineLatest([
      this.customMetadataService.saveDefinitionsThenDocument(
        this.document().uid,
        formProperties,
        formResult.customMetadataDefinitionDocId,
        formResult.customMetadataDefinitions
      ),
      shouldFollowTransition ? this.apiService.followLifecycleTransition(this.document().uid, arendesteg) : of(null),
    ])
      .pipe(
        switchMap(() => {
          const org = formResult.actor.organization;
          const orgId = Array.isArray(org) ? (org[0]?.id ?? '') : (org ?? '');
          if (orgId !== this.ansvOrg()) {
            return this.apiService.updateAssignees(this.document().uid, orgId);
          }
          return of(null);
        }),
        switchMap(() => (shouldCloseCase ? this.apiService.closeCase(this.document().uid) : of(null))),
        switchMap(() => (shouldCancelCase ? this.apiService.markCaseCancelled(this.document().uid) : of(null))),
        tap(() => {
          this.lifecycleReloadDelay = 2000;
          this.reloadDocument.emit();
          this.isEditPageOpen.set(false);
          this.store.notification.set({
            show: true,
            variation: 'success',
            text: CASE_CHANGES_SAVED_MESSAGE,
          });
        }),
        catchError(error => {
          this.store.notification.set({
            show: true,
            variation: 'danger',
            text: error.error?.violations?.[0]?.message ?? CASE_UPDATE_ERROR_MESSAGE,
          });

          return EMPTY;
        })
      )
      .subscribe();
  }

  editForm(props: EditFormProps): void {
    const docId = this.document().uid;

    if (!docId) {
      return;
    }

    const shouldCloseCase =
      props[NUXEO_SCHEMA_FIELDS.arende.arendestatus]?.id === NUXEO_VOCAB_IDS.arendestatus.stangt &&
      this.document().state !== NUXEO_VOCAB_IDS.arendestatus.stangt;
    const shouldCancelCase =
      props[NUXEO_SCHEMA_FIELDS.arende.arendestatus]?.id === NUXEO_VOCAB_IDS.arendestatus.makulerat &&
      this.document().state !== NUXEO_VOCAB_IDS.arendestatus.makulerad;
    const hasUtkasts = this.utkasts().length > 0;

    if (shouldCloseCase && hasUtkasts) {
      this.isUtkastCloseBlockedOpen.set(true);
      return;
    }

    const edit$ = this.apiService.editDocument(docId, props).pipe(
      switchMap(() =>
        shouldCloseCase ? this.caseLifecycle.transitionToClosed(docId, this.document().state) : of(null)
      ),
      switchMap(() => (shouldCancelCase ? this.apiService.markCaseCancelled(docId) : of(null))),
      tap(() => {
        this.loadCaseDetails(this.document());
        this.lifecycleReloadDelay = 2000;
        this.reloadDocument.emit();
        this.isEditPageOpen.set(false);
        this.store.notification.set({
          show: true,
          variation: 'success',
          text: CASE_CHANGES_SAVED_ALT_MESSAGE,
        });
      })
    );

    edit$.subscribe({
      error: err => {
        const errorMessage = err?.error?.violations?.[0]?.message ?? err?.message ?? CASE_UPDATE_ERROR_MESSAGE;
        this.store.notification.set({
          show: true,
          variation: 'danger',
          text: errorMessage,
        });
      },
    });
  }

  deleteWorkflow(workflowId: string) {
    this.apiService.deleteWorkflow(workflowId).subscribe(() => this.reloadDocument.emit());
  }

  checkInCollection(): void {
    this.checkDocumentInCollections(this.document().uid)
      .pipe(tap(inCollection => this.inCollection.set(inCollection)))
      .subscribe();
  }

  checkDocumentInCollections(documentId: string): Observable<boolean> {
    return this.apiService.getCollections().pipe(
      switchMap(collections => {
        if (!collections.length) return of([]);

        return forkJoin(
          collections.map(col =>
            this.apiService
              .getCollectionDocuments(col.uid)
              .pipe(map(res => res.entries.some(entry => entry.uid === documentId)))
          )
        );
      }),
      map((results: boolean[]) => results.some(found => found))
    );
  }

  getInternHandlings(
    pageSize: number,
    offset: number,
    currentPageIndex: number,
    sortBy?: string,
    sortOrder?: 'asc' | 'desc',
    searchTerm = ''
  ) {
    this.apiService
      .getHandling(
        this.document().uid,
        pageSize,
        offset,
        currentPageIndex,
        sortBy,
        sortOrder,
        [NUXEO_VOCAB_IDS.arendeRiktning.inkommande],
        searchTerm
      )
      .pipe(
        tap(data => {
          this.internHandlingarTotal.set(data.totalSize);
          this.internHandlings.set(data.entries);
        })
      )
      .subscribe();
  }

  getUtgaendeInternHandlings(
    pageSize: number,
    offset: number,
    currentPageIndex: number,
    sortBy?: string,
    sortOrder?: 'asc' | 'desc',
    searchTerm = ''
  ) {
    this.apiService
      .getHandling(
        this.document().uid,
        pageSize,
        offset,
        currentPageIndex,
        sortBy,
        sortOrder,
        [NUXEO_VOCAB_IDS.arendeRiktning.utgaende, NUXEO_VOCAB_IDS.arendeRiktning.intern],
        searchTerm
      )
      .pipe(
        tap(data => {
          this.utgaendeInternHandlingarTotal.set(data.totalSize);
          this.utgaendeInternHandlings.set(data.entries);
        })
      )
      .subscribe();
  }

  getAllHandlings(
    pageSize: number,
    offset: number,
    currentPageIndex: number,
    sortBy?: string,
    sortOrder?: 'asc' | 'desc',
    searchTerm = ''
  ) {
    this.apiService
      .getHandling(this.document().uid, pageSize, offset, currentPageIndex, sortBy, sortOrder, undefined, searchTerm)
      .pipe(
        tap(data => {
          this.allHandlingarTotal.set(data.totalSize);
          this.allHandlings.set(data.entries);
        })
      )
      .subscribe();
  }

  loadCaseDetails(doc: NuxeoDocument<ArendeExtendedProperties>): void {
    this.updateHandlaggareFlag(doc);
    const pageSize = this.handlingarPageSize();
    const pageIndex = this.pageHandlingarCards();
    const searchTerm = this.handlingarSearchTerm();

    this.apiService
      .getHandling<HandlingExtendedProperties>(
        doc.uid,
        pageSize,
        pageSize * pageIndex,
        pageIndex,
        undefined,
        undefined,
        undefined,
        searchTerm
      )
      .pipe(
        tap(result => {
          const handlingDocs = result.entries;
          this.handlingarCardsTotal.set(result.totalSize);
          this.handlingsCards.set(handlingDocs);
          this.resolveHandlingTypes(handlingDocs);
        })
      )
      .subscribe();
  }

  private loadUtkasts(): void {
    const parentId = this.document().uid;
    if (!parentId) return;
    const sortBy = this.resolveArbetsmaterialSortField(this.arbetsmaterialSortBy());
    const sortOrder = this.arbetsmaterialSortOrder();

    this.apiService
      .getUtkastsByParent<HandlingExtendedProperties>(parentId, { sortBy, sortOrder }, true)
      .pipe(
        tap(result => {
          const utkastsUnderWorkflow = result.entries.filter(el =>
            el.properties?.[NUXEO_SCHEMA_FIELDS.arbetsfloden.arbetsfloden]?.find(workflow => !workflow.slutdatum)
          );

          this.utkastsUnderWorkflow.set(utkastsUnderWorkflow);
          this.utkasts.set(result.entries ?? []);
        })
      )
      .subscribe();
  }

  private loadArbetsmaterialCards(): void {
    const parentId = this.document().uid;
    const sortBy = this.resolveArbetsmaterialSortField(this.arbetsmaterialSortBy());
    const sortOrder = this.arbetsmaterialSortOrder();
    const pageSize = this.arbetsmaterialPageSize();
    const currentPageIndex = this.pageArbetsmaterialCards();

    this.apiService
      .getUtkastsByParent<HandlingExtendedProperties>(parentId, { sortBy, sortOrder, pageSize, currentPageIndex }, true)
      .pipe(
        tap(result => {
          this.arbetsmaterialCardsTotal.set(result.totalSize);
          this.arbetsmaterialCards.set(result.entries);
        })
      )
      .subscribe();
  }

  private resolveArbetsmaterialSortField(sortBy: string): string | undefined {
    return arbetsmaterialSortFieldMap[sortBy] ?? sortBy;
  }

  private resolveHandlingSortField(sortBy: string): string | undefined {
    return handlingarSortFieldMap[sortBy] ?? sortBy;
  }

  private resolveHandlingTypes(handlingDocs: NuxeoDocument<HandlingExtendedProperties>[]): void {
    const rawIds = handlingDocs
      .map(doc => doc.properties?.[NUXEO_SCHEMA_FIELDS.handling.handlingstyp])
      .filter(value => typeof value === 'string');

    const uniqueIds = Array.from(new Set(rawIds));

    if (uniqueIds.length === 0) {
      this.handlingTypeMap.set({});
      return;
    }

    this.apiService
      .getSeveralDocsByUids(uniqueIds)
      .pipe(
        map(result =>
          result.entries.reduce<Record<string, string>>((accumulator, entry) => {
            accumulator[entry.uid] = entry.title ?? entry.uid;
            return accumulator;
          }, {})
        ),
        tap(mapValue => this.handlingTypeMap.set(mapValue))
      )
      .subscribe();
  }

  private updateHandlaggareFlag(doc: NuxeoDocument<ArendeExtendedProperties>): void {
    const val = doc.properties?.[NUXEO_SCHEMA_FIELDS.arende.ansvarigHandlaggare];
    this.handlaggarePresent.set(!!val);
  }

  private updateSubscriptionState(
    documentItem: NuxeoDocument<ArendeExtendedProperties> | null | undefined,
    usernameValue: string | null
  ): void {
    if (!documentItem || !usernameValue) {
      this.isSubscribed.set(false);
      return;
    }

    const rawNotifications = documentItem.properties?.[NUXEO_SCHEMA_FIELDS.notif.notifications];
    const notifications: NuxeoNotification[] = Array.isArray(rawNotifications) ? rawNotifications : [];

    const currentUserRef = `user:${usernameValue}`.toLowerCase();
    const isSubscribedToNotifications = notifications.some(notification =>
      (notification.subscribers ?? []).some(subscriber => subscriber.toLowerCase() === currentUserRef)
    );

    this.isSubscribed.set(isSubscribedToNotifications);
  }

  downloadSelectedAsZip() {
    this.apiService.downloadBulk(this.selectedFiles()).subscribe(blob => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'selection.zip';
      a.click();
    });
  }

  printSelectedFiles(): void {
    if (this.isPrintingSelectedFiles) return;

    from(this.selectedFiles())
      .pipe(
        mergeMap(uid => this.apiService.getDocumentById(uid, true)),
        toArray(),
        tap(files => {
          const printableQueue = this.printService.getPrintableDocuments(files);

          if (!printableQueue.length) {
            this.store.notification.set({
              show: true,
              variation: 'warning',
              text: CASE_PRINT_NONE_PRINTABLE_MESSAGE,
            });
            return;
          }

          if (printableQueue.length !== this.selectedFiles().length) {
            this.store.notification.set({
              show: true,
              variation: 'info',
              text: CASE_PRINT_SOME_SKIPPED_MESSAGE,
            });
          }

          this.isPrintingSelectedFiles = true;
          this.printService.printDocuments(
            printableQueue,
            file => this.notifyPrintLoading(file),
            () => {
              this.isPrintingSelectedFiles = false;
            }
          );
        })
      )
      .subscribe();
  }

  private notifyPrintLoading(file: NuxeoDocument): void {
    this.store.notification.set({
      show: true,
      variation: 'info',
      text: buildPrintLoadingMessage(file.title),
      belowTopPanel: true,
    });
  }

  openArendePdfDialog(): void {
    this.apiService
      .filterTemplatesByType(this.document().uid)
      .pipe(
        tap(result => {
          const templates = result.entries.filter(
            template => template.properties[NUXEO_SCHEMA_FIELDS.tmpl.templateName].toLowerCase() === 'arendekort'
          );
          if (!templates.length) {
            this.store.notification.set({
              show: true,
              variation: 'warning',
              text: CASE_DIARY_TEMPLATES_NOT_FOUND_MESSAGE,
            });
            return;
          }
          this.arendePdfTemplates.set(templates);
          this.selectedArendePdfTemplateUid.set(templates[0].uid);
          this.isArendePdfDialogOpen.set(true);
        }),
        catchError(() => {
          this.store.notification.set({
            show: true,
            variation: 'danger',
            text: CASE_DIARY_TEMPLATES_FETCH_ERROR_MESSAGE,
          });
          return EMPTY;
        })
      )
      .subscribe();
  }

  closeArendePdfDialog(): void {
    this.isArendePdfDialogOpen.set(false);
    this.selectedArendePdfTemplateUid.set('');
  }

  downloadArendePdf(templateUid: string): void {
    const selectedTemplate = this.arendePdfTemplates().filter(template => template.uid === templateUid)[0];
    const templateName = selectedTemplate.properties[NUXEO_SCHEMA_FIELDS.tmpl.templateName];
    const templateData = selectedTemplate.properties[NUXEO_SCHEMA_FIELDS.tmpl.templateData];

    this.apiService
      .renderArendePdf(this.document().uid, templateName, templateData)
      .pipe(
        tap(blob => {
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${templateName}.pdf`;
          a.click();
          window.URL.revokeObjectURL(url);
          this.closeArendePdfDialog();
        }),
        catchError(() => {
          this.store.notification.set({
            show: true,
            variation: 'danger',
            text: CASE_DIARY_RENDER_ERROR_MESSAGE,
          });
          return EMPTY;
        })
      )
      .subscribe();
  }

  saveNoteObject(note: string | null) {
    this.editForm({ [NUXEO_SCHEMA_FIELDS.arende.anteckning]: note });
  }
}
