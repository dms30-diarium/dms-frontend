import { Router } from '@angular/router';
import { catchError, EMPTY, forkJoin, map, Observable, of, switchMap, tap } from 'rxjs';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  OnDestroy,
  OnInit,
  output,
  signal,
} from '@angular/core';
import { CdkDragDrop, DragDropModule } from '@angular/cdk/drag-drop';
import { NUXEO_SCHEMA_FIELDS } from '@app/shared/constants/nuxeo-schema-fields';
import { NUXEO_VOCAB_IDS } from '@app/shared/constants/nuxeo-vocabulary-ids';

import { AccordionComponent } from '@app/shared/components/accordion/accordion.component';
import { AssignUserModalComponent } from '@app/shared/components/assign-user-modal/assign-user-modal.component';
import { AddButtonComponent } from '@app/shared/components/add-button/add-button.component';
import { SelectCaseComponent } from '@app/shared/components/select-case-popup/select-case-popup.component';
import { NavigationBreadComponent } from '@app/shared/components/navigation-bread/navigation-bread.component';
import { HandlingDetailsComponent } from '@app/shared/components/handling-details/handling-details.component';
import { HandlingOverviewComponent } from '@app/shared/components/handling-overview/handling-overview.component';
import { HandlingEventLogComponent } from '@app/shared/components/handling-event-log/handling-event-log.component';
import { HandlingActorsComponent } from '@app/shared/components/handling-actors/handling-actors.component';
import { HandlingFilesComponent } from '@app/shared/components/handling-files/handling-files.component';
import { EditFormComponent } from '@app/shared/components/edit-form/edit-form.component';
import { AssignCollectionModalComponent } from '@app/shared/components/assign-collection-modal.component/assign-collection-modal.component';
import { ActionButton, ButtonMenuComponent } from '@app/shared/components/button-menu.component/button-menu.component';
import { createButton } from '@app/shared/components/button-menu.component/button-presets';
import { NotificationService, NuxeoNotification } from '@app/core/services/notification-service.service';
import { AuthService } from '@app/core/services/auth.service';
import { ShareLinkService } from '@app/core/services/share-link.service';

import { DigiIconFileDocument, DigiArbetsformedlingenAngularModule } from '@designsystem-se/af-angular';

import {
  HandlingExtendedProperties,
  NuxeoDocument,
  NuxeoFileDocument,
  NxUser,
  WorkflowInfo,
} from '@app/shared/api/nuxeo-api.types';
import { NuxeoApiService } from '@app/shared/api/nuxeo-api.service';
import { SecretStampService } from '@app/shared/services/secret-stamp.service';
import { CustomMetadataService } from '@app/shared/services/custom-metadata.service';
import { EditHandlingResult, GeneralWorkflowAction, GeneralWorkflowVocabulary } from './handling-types';
import { EditGroup, FieldConfig } from '@app/shared/components/general-form/general-form.types';
import { Option } from '@app/shared/commonTypes';
import { buildEditConfig } from './utils';
import { formatDateOrMissing } from '@app/shared/utils/date-utils';
import { truncateForTitle } from '@app/shared/utils/text-utils';
import { getUserFullName as formatUserFullName } from '@app/shared/utils/display-label';
import { EditSuggestionRequestType, loadEditSuggestions } from '@app/shared/utils/edit-suggestions-utils';

import { FavoritesService } from '@app/core/services/favorites.service';
import { BaseButton, GeneralStore } from '@app/core/services/general-store.service';
import { LockService } from '@app/core/services/lock-service.service';
import { PrintService } from '@app/core/services/print.service';
import { SelectedFilesToolbarService } from '@app/core/services/selected-files-toolbar.service';
import { DraggableSectionOrderService } from '@app/core/services/draggable-section-order.service';
import { AccordionStateService } from '@app/core/services/accordion-state.service';
import { HANDLING_PAGE_ACCORDION_STATE_KEY, HANDLING_PAGE_ACCORDION_DEFAULTS } from './constants';
import { ReferencesDetailsComponent } from '@app/shared/components/references-details/references-details.component';
import { TableColumn } from '@app/shared/components/case-list-table/case-list-table.component';
import { ArendeRefOption } from '@app/shared/components/edit-form-components/refs-button-with-dialog/refs-button-with-dialog.component';
import { PdfViewerComponent } from '@app/shared/components/pdf-viewer/pdf-viewer.component';
import {
  FAVORITE_ADDED_MESSAGE,
  FAVORITE_REMOVED_MESSAGE,
  FAVORITE_UPDATE_ERROR_MESSAGE,
  HANDLING_PRINT_LOADING_MESSAGE,
  HANDLING_PRINT_UNSUPPORTED_MESSAGE,
  HANDLING_REVIEW_CONFIRM_ERROR_MESSAGE,
  HANDLING_REVIEW_REJECTED_MESSAGE,
} from '@app/shared/constants/notification-messages';
import {
  SUBSCRIPTION_DISABLED_MESSAGE,
  SUBSCRIPTION_ENABLED_MESSAGE,
  SUBSCRIPTION_ERROR_MESSAGE,
} from '@app/shared/constants/notification-messages';
import { RequestCompletionEmailFormComponent } from '@app/shared/components/forms/request-completion-email-form/request-completion-email-form.component';
import { ConsultColleagueFormComponent } from '@app/shared/components/forms/consult-colleague-form/consult-colleague-form.component';
import { ImageButtonComponent } from '@app/shared/components/image-button/image-button.component';
import { GeneralFormComponent } from '@app/shared/components/general-form/general-form.component';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ExpeditHandlingComponent } from '@app/shared/components/forms/expedit-handling/expedit-handling.component';
import { TopButtonsPanelComponent } from '@app/shared/components/top-buttons-panel/top-buttons-panel.component';
import { DragHandleComponent } from '@app/shared/components/drag-handle/drag-handle.component';
import { UtkastReviewComponent } from '@app/shared/components/utkast-review/utkast-review.component';
import { CommonModule } from '@angular/common';
import { GeneralWorkflowStructure } from '../case-page/case-types';
import { CustomMetadataFieldComponent } from '@app/shared/components/custom-metadata-field/custom-metadata-field.component';
import { DmsMetadataDefinitionEntry } from '@app/shared/components/custom-metadata-field/custom-metadata-field.types';

type HandlingPageSectionKey = 'details' | 'actors' | 'eventLog' | 'references' | 'customMetadata' | 'files';

const HANDLING_PAGE_SECTION_ORDER_STORAGE_KEY = 'handlingPageSectionOrder';
const HANDLING_PAGE_DEFAULT_SECTION_ORDER: HandlingPageSectionKey[] = [
  'details',
  'actors',
  'eventLog',
  'references',
  'customMetadata',
  'files',
];

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'nuxeo-handling-page',
  imports: [
    AccordionComponent,
    AddButtonComponent,
    DigiIconFileDocument,
    SelectCaseComponent,
    DigiArbetsformedlingenAngularModule,
    AssignUserModalComponent,
    NavigationBreadComponent,
    HandlingDetailsComponent,
    HandlingEventLogComponent,
    HandlingActorsComponent,
    HandlingOverviewComponent,
    HandlingFilesComponent,
    EditFormComponent,
    AssignCollectionModalComponent,
    ButtonMenuComponent,
    ReferencesDetailsComponent,
    PdfViewerComponent,
    RequestCompletionEmailFormComponent,
    ConsultColleagueFormComponent,
    ImageButtonComponent,
    RequestCompletionEmailFormComponent,
    ConsultColleagueFormComponent,
    GeneralFormComponent,
    ExpeditHandlingComponent,
    TopButtonsPanelComponent,
    UtkastReviewComponent,
    DragDropModule,
    DragHandleComponent,
    ReactiveFormsModule,
    CommonModule,
    CustomMetadataFieldComponent,
  ],
  templateUrl: './handling-page.component.html',
})
export class HandlingPageComponent implements OnInit, OnDestroy {
  protected readonly schemaFields = NUXEO_SCHEMA_FIELDS;
  protected readonly VOCAB_IDS = NUXEO_VOCAB_IDS;
  readonly getUserFullName = formatUserFullName;
  files = signal<NuxeoFileDocument[]>([]);
  isEditPageOpen = signal<boolean>(false);
  isSelectCaseDialogOpened = signal(false);
  isAssignUserOpened = signal<string | null>(null);
  inFavorites = signal(false);
  inCollection = signal<boolean>(false);
  isAssignCollectionOpened = signal<string[] | null>(null);
  isLockedByUser = signal<boolean>(false);
  isSubscribed = signal<boolean>(false);
  isExportDialogOpen = signal<boolean>(false);
  sendForReviewWorkflow = signal<WorkflowInfo[] | null>(null);
  sendForApprovalWorkflow = signal<WorkflowInfo[] | null>(null);
  worflows = signal<WorkflowInfo[] | null>(null);
  pendingTasks = signal<WorkflowInfo[] | undefined>(undefined);

  suggestions = signal<Record<string, Option[]>>({});

  handlings: NuxeoDocument[] = [];
  utkasts: NuxeoDocument[] = [];

  readonly REFERENCES_TABLE_NAME = 'REFERENCES';
  readonly HANDLINGS_TABLE_NAME = 'HANDLINGS';

  private readonly secretStampService = inject(SecretStampService);
  document = input.required<NuxeoDocument<HandlingExtendedProperties>>();
  properties = computed(() => this.document().properties as HandlingExtendedProperties);
  readonly secretStampText = computed(() =>
    this.secretStampService.getSecretStampText(this.properties()[NUXEO_SCHEMA_FIELDS.handling.sekretess]?.id)
  );
  reloadDocument = output();

  private store = inject(GeneralStore);
  private router = inject(Router);
  private apiService = inject(NuxeoApiService);
  private customMetadataService = inject(CustomMetadataService);
  private favoritesService = inject(FavoritesService);
  private notificationService = inject(NotificationService);
  private lockService = inject(LockService);
  private auth = inject(AuthService);
  private shareLinkService = inject(ShareLinkService);
  private printService = inject(PrintService);
  baseButtons = signal<BaseButton[]>([]);
  isMakuleringAvHandlingOpen = signal<boolean>(false);
  isGeneralWorkflowFormOpen = signal<boolean>(false);
  selectedFile = signal<NuxeoDocument | null>(null);
  previewFile = signal<NuxeoDocument | null>(null);
  currentHandlingState = signal<Option | undefined>(undefined);
  selectedFileIds = signal<Set<string>>(new Set());
  selectedFileIdList = computed(() => Array.from(this.selectedFileIds()));
  private selectedFilesToolbarService = inject(SelectedFilesToolbarService);
  private readonly draggableSectionOrderService = inject(DraggableSectionOrderService);
  private readonly accordionStateService = inject(AccordionStateService);
  accordionState = signal<Record<string, boolean>>(
    this.accordionStateService.loadState(HANDLING_PAGE_ACCORDION_STATE_KEY, HANDLING_PAGE_ACCORDION_DEFAULTS)
  );
  readonly sectionOrder = signal<HandlingPageSectionKey[]>([...HANDLING_PAGE_DEFAULT_SECTION_ORDER]);
  readonly visibleSections = computed(() =>
    this.draggableSectionOrderService.visibleSections(this.sectionOrder(), section => this.isSectionVisible(section))
  );

  truncateTitle = (value: unknown) => truncateForTitle(value);

  editConfig = computed<EditGroup[]>(() => {
    const rawState = this.currentHandlingState();
    const resolvedState = rawState
      ? { id: rawState.id, label: this.store.getValue(rawState.label) ?? rawState.id }
      : undefined;
    const config = buildEditConfig(this.document(), this.suggestions(), resolvedState);
    return config.map(group => ({
      ...group,
      groupFields: group.groupFields.map(field => {
        if (field.type === 'dropdown-search') {
          const suggestionKey =
            field.name === 'handlingstyp'
              ? 'handlingType'
              : field.name === 'ansvarigOrg'
                ? 'ansvarigOrg'
                : field.name === 'lagrumsbeskrivning'
                  ? 'lagrum'
                  : field.name;
          return {
            ...field,
            props: {
              ...(field.props ?? {}),
              optionsSignal: () => this.suggestions()[suggestionKey],
            },
          };
        }
        return field;
      }),
    }));
  });

  documentLink = computed(() => {
    return this.shareLinkService.buildDocLink(this.document().uid);
  });

  isCopyLinkDialogOpen = signal<boolean>(false);
  linkWasCopied = signal<boolean>(false);
  isRequestCompletionDialogOpen = signal<boolean>(false);
  isConsultDialogOpen = signal<boolean>(false);
  expeditHandlingOpen = signal<boolean>(false);
  isSendForReviewDialogOpen = signal<boolean>(false);
  isSendForApprovalOpened = signal<boolean>(false);
  generalWorkflowMenu = signal<GeneralWorkflowVocabulary[]>([]);
  generalWorkflowFormValue = signal<Record<string, string>>({});
  currentGeneralWorkflowAction = signal<{ button: GeneralWorkflowAction; parent: GeneralWorkflowVocabulary } | null>(
    null
  );
  generalWorkflowVocabComputed = computed<GeneralWorkflowAction[]>(() => {
    return this.generalWorkflowMenu().flatMap(item => item.children ?? []);
  });
  workflowCommentForm = new FormGroup({
    workflowComment: new FormControl(''),
  });
  generalWorkflowIcons = ['FileText', 'Copy', 'Arende', 'Send', 'Trash2'];

  buttons = computed(() => {
    const isAdminUser = this.auth.isAdmin();
    const documentItem = this.document();
    const lockOwner = documentItem.lockOwner?.toLowerCase();
    const usernameLower = this.auth.username()?.toLowerCase();
    const isOwner = lockOwner === usernameLower;
    const isLocked = !!lockOwner;
    const lockPreset = this.isLockedByUser() ? 'unlock' : 'lock';
    const markFavoritePreset = this.inFavorites() ? 'markFavoriteActive' : 'markFavorite';
    const subscriptionPreset = this.isSubscribed() ? 'unsubscribe' : 'subscribeChanges';

    const baseButtons: ActionButton[] = [
      createButton('requestCompletion', () => this.isRequestCompletionDialogOpen.set(true)),
      createButton('consultColleague', () => this.isConsultDialogOpen.set(true)),
      createButton('expeditHandling', () => this.expeditHandlingOpen.set(true)),
      createButton('downloadHandlingZip', () => this.downloadSelectedFilesAsZip()),
      createButton('exportHandling', () => this.isExportDialogOpen.set(true)),
    ];

    if (isLocked && !isOwner && !isAdminUser) {
      return [
        createButton('share', () => this.isCopyLinkDialogOpen.set(true)),
        createButton(lockPreset, () => this.toggleLockState()),
        createButton(markFavoritePreset, () =>
          this.favoritesService
            .toggleFavorites(this.document().uid, this.inFavorites())
            .pipe(tap(() => this.inFavorites.set(!this.inFavorites())))
            .subscribe()
        ),
        createButton(subscriptionPreset, () => this.toggleSubscription()),
      ];
    }

    return [...baseButtons];
  });

  generalWorkflowFormConfig = computed<FieldConfig[]>(() => [
    {
      type: 'dropdown',
      name: 'handlaggare',
      label: this.store.getValue('label.ui.schema.handling.ansvarig_handlaggare') ?? 'Ansvarig handläggare',
      options: this.suggestions()['ansvarig'],
      defaultValue: this.document().properties[NUXEO_SCHEMA_FIELDS.handling.ansvarigHandlaggare]?.id,
      validators: [Validators.required],
    },
    {
      type: 'dropdown',
      name: 'registrator',
      label: 'Registrator', // missed in messages.json
      options: this.suggestions()['userOptions'],
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
      label: 'Kommentarer',
    },
  ]);

  caseReferencesTableData = computed<ArendeRefOption[]>(() =>
    (this.document().properties[NUXEO_SCHEMA_FIELDS.handling.internArendereferens] ?? []).map(reference => ({
      comment: reference.referenskommentar,
      caseRef: reference.arende?.uid,
      type: reference.referenstyp?.id,
    }))
  );

  handlingReferencesTableData = computed<ArendeRefOption[]>(() =>
    (this.document().properties[NUXEO_SCHEMA_FIELDS.handling.internHandlingsreferens] ?? []).map(reference => ({
      comment: reference.referenskommentar,
      caseRef: reference.handling?.uid,
      type: reference.referenstyp?.id,
    }))
  );

  referencesColumnsConfig: TableColumn[] = [
    { label: 'Ärendenummer', key: 'caseNumber', asLink: true, visible: true },
    { label: 'Ärendemening', key: 'caseTitle', visible: true },
    { label: 'Referencetyp', key: 'displayType', visible: false },
    { label: 'Referenskommentar', key: 'comment', visible: false },
    { label: 'Motpart', key: 'counterparty', visible: true },
    { label: 'Status', key: 'status', visible: false },
    { label: 'Datum', key: 'date', visible: false },
    { label: 'Ansvarig handläggare', key: 'responsibleOfficer', visible: false },
  ].map(column => ({ ...column, tableName: this.REFERENCES_TABLE_NAME }));

  handlingsColumnsConfig: TableColumn[] = [
    { label: 'Handlingsnummer', key: 'handlingNumber', asLink: true, visible: true },
    { label: 'Handlingsnamn', key: 'handlingTitle', visible: true },
    { label: 'Referencetyp', key: 'displayType', visible: false },
    { label: 'Referenskommentar', key: 'comment', visible: false },
    { label: 'Avsandare/Mottagare', key: 'counterparty', visible: true },
    { label: 'Riktning', key: 'riktning', visible: false },
    { label: 'Datum', key: 'date', visible: false },
    { label: 'Ansvarig handläggare', key: 'responsibleOfficer', visible: false },
  ].map(column => ({ ...column, tableName: this.HANDLINGS_TABLE_NAME }));

  constructor() {
    effect(() => {
      const currentDocument = this.document();
      if (currentDocument) {
        this.loadCaseDetails();
        this.loadLagrumSuggestionsFromCase();
      }
    });

    effect(() => {
      const workflows = this.document()?.contextParameters?.runningWorkflows;
      this.pendingTasks.set(this.document()?.contextParameters?.pendingTasks);
      this.sendForReviewWorkflow.set(
        workflows?.filter(workflow => workflow.workflowModelName === NUXEO_VOCAB_IDS.arbetsflode.skickaForGranskning) ??
          null
      );
      this.sendForApprovalWorkflow.set(
        workflows?.filter(workflow => workflow.workflowModelName === 'StickaForGodkannande') ?? null
      );
      this.worflows.set(
        workflows?.filter(workflow => workflow.workflowModelName === NUXEO_VOCAB_IDS.arbetsflode.allmanArbetsflode) ??
          null
      );
    });

    effect(() => {
      this.setBaseButtons();
    });
    effect(() => {
      if (this.document()) {
        this.getLifecycleTransitions();
      }
    });
  }

  ngOnInit(): void {
    this.sectionOrder.set(
      this.draggableSectionOrderService.loadOrder(
        HANDLING_PAGE_SECTION_ORDER_STORAGE_KEY,
        HANDLING_PAGE_DEFAULT_SECTION_ORDER
      )
    );
    this.checkInCollection();
    this.setBaseButtons();
    this.store.baseButtons.set(this.baseButtons());
    this.store.openPage.set('handling');

    this.favoritesService
      .checkInFavorites(this.document().uid)
      .pipe(tap(result => this.inFavorites.set(result)))
      .subscribe();

    this.getSuggestions('handlingType', 'docSuggestion', '_', 'Handlingstyp', 'Handling');
    this.getSuggestions('ansvarigOrg', 'docSuggestion', '_', 'Organisationsdel', 'Handling');
    this.getSuggestions('riktning', 'suggestEntries', 'Riktning');
    this.getSuggestions('forvaringsmedia', 'suggestEntries', 'Forvaringsmedia');
    this.getSuggestions('secret', 'suggestEntries', 'Sekretess');
    this.getSuggestions('secretClass', 'suggestEntries', 'Sakerhetsskyddsklassificering');
    this.getSuggestions('handlingStatus', 'suggestEntries', 'Handlingstatus');
    this.getSuggestions('beslut', 'docSuggestion', 'Beslut', 'Beslut', 'Beslut');
    this.getBevarasSuggestions();
    this.getSuggestions('granskare', 'userSuggestion');
    this.getSuggestions('beslutsfattare', 'userSuggestion');
    this.getSuggestions('ansvarig', 'userSuggestion');
    this.getSuggestions('userOptions', 'userSuggestion');
    this.getGeneralWorkfows();

    const rawNotifications = this.document().properties?.[NUXEO_SCHEMA_FIELDS.notif.notifications];
    const notifications: NuxeoNotification[] = Array.isArray(rawNotifications) ? rawNotifications : [];

    this.isSubscribed.set(this.isUserSubscribed(notifications));

    this.lockService.initLockState(this.document(), this.isLockedByUser);
  }

  onSectionToggled(section: string, isExpanded: boolean) {
    const next = { ...this.accordionState(), [section]: isExpanded };
    this.accordionState.set(next);
    this.accordionStateService.saveState(HANDLING_PAGE_ACCORDION_STATE_KEY, next);
  }

  onSectionDropped(event: CdkDragDrop<HandlingPageSectionKey[]>) {
    const nextSectionOrder = this.draggableSectionOrderService.reorderSections(
      this.sectionOrder(),
      section => this.isSectionVisible(section),
      event.previousIndex,
      event.currentIndex
    );
    this.sectionOrder.set(nextSectionOrder);
    this.draggableSectionOrderService.saveOrder(HANDLING_PAGE_SECTION_ORDER_STORAGE_KEY, nextSectionOrder);
  }

  private isSectionVisible(section: HandlingPageSectionKey): boolean {
    switch (section) {
      case 'files':
        return this.files().length > 0;
      default:
        return true;
    }
  }

  private loadLagrumSuggestionsFromCase(): void {
    this.apiService
      .getLagrumOptions(this.document().uid)
      .pipe(
        tap(options => {
          this.suggestions.update(current => ({ ...current, lagrum: options }));
        }),
        catchError(() => {
          this.suggestions.update(current => ({ ...current, lagrum: [] }));
          return EMPTY;
        })
      )
      .subscribe();
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
          this.suggestions.update(current => ({ ...current, handlingssteg: transitionsOptions }));
          this.currentHandlingState.set({ id: data.currentState, label: data.currentStateLabel });
        })
      )
      .subscribe();
  }

  updateReferences(
    references: ArendeRefOption[],
    propertyKey: 'handlings' | 'arende',
    propertyValueKey: 'handling' | 'arende'
  ) {
    const referencePropertyKey =
      propertyKey === 'arende'
        ? NUXEO_SCHEMA_FIELDS.handling.internArendereferens
        : NUXEO_SCHEMA_FIELDS.handling.internHandlingsreferens;
    const formProperties =
      !references || references.length === 0
        ? { [referencePropertyKey]: [] }
        : {
            [referencePropertyKey]: references.map(reference => ({
              referenstyp: reference.type,
              referenskommentar: reference.comment,
              [propertyValueKey]: reference.caseRef,
            })),
          };

    this.editForm(formProperties);
  }

  saveGeneralWorkflowForm(event: Record<string, string>) {
    this.generalWorkflowFormValue.set(event);
  }

  getGeneralWorkfows() {
    this.apiService
      .getDirectorySuggestions<GeneralWorkflowStructure[]>('AtgarderAllmannaArbetsflodet')
      .pipe(
        tap(result => {
          if (result) {
            const handling = result.filter(el => el.displayLabel === 'Handling');
            this.generalWorkflowMenu.set(handling[0].children);
          }
        })
      )
      .subscribe();
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
          : this.document().properties[NUXEO_SCHEMA_FIELDS.handling.ansvarigHandlaggare]?.id,
        forfalloDatum: this.generalWorkflowFormValue()['forfalloDatum']?.[0],
        paminnelseDatum: this.generalWorkflowFormValue()['paminnelseDatum']?.[0],
        valdAtgard: this.currentGeneralWorkflowAction()?.button?.id,
        ursprungligKommentar: this.generalWorkflowFormValue()['comment'],
      },
    };

    this.apiService.createWorkflow(this.document().uid, payload).subscribe(() => this.reloadDocument.emit());
  }

  isUserAssignedForWorkflow(workflow: WorkflowInfo) {
    return !!this.pendingTasks()?.find(task => task.workflowInstanceId === workflow.id);
  }

  canUserCancelWorkflow(workflow: WorkflowInfo) {
    return workflow.initiator === this.auth.username();
  }

  getTaskActions(workflow: WorkflowInfo) {
    const task = this.pendingTasks()?.find(item => item.workflowInstanceId === workflow.id);
    return task?.taskInfo.taskActions;
  }

  abortWorkflow(workflow: WorkflowInfo) {
    this.apiService.deleteWorkflow(workflow.id).subscribe(() => this.reloadDocument.emit());
  }

  findActionName(id: string | undefined) {
    return this.generalWorkflowVocabComputed().find(item => item.id === id)?.displayLabel ?? '';
  }

  sendReviewDecision(action: string, workflow: WorkflowInfo) {
    const comment = this.workflowCommentForm.controls['workflowComment'].value || undefined;
    const decisionTask = this.pendingTasks()?.find(task => task.workflowInstanceId === workflow.id);
    const workflowTaskId = decisionTask?.id;

    if (!workflowTaskId) {
      return;
    }

    const payload = {
      id: workflowTaskId,
      'entity-type': 'task',
      variables: {
        kommentar: comment,
      },
    };
    const notifications: Record<string, string> = {
      AllmantArbetsflode: 'Arbetsflöde avslutas uppgiften utförd  OK',
      StickaForGodkannande: 'Handlingen godkänd OK',
      SkickaForGranskning: 'Handlingen granskad OK',
    };

    this.apiService
      .editWorkflow(workflowTaskId, action, payload)
      .pipe(
        tap(() => {
          this.workflowCommentForm.reset();
          this.store.notification.set({
            show: true,
            variation: 'success',
            text:
              action === NUXEO_VOCAB_IDS.arbetsflodeAtgard.avvisa
                ? HANDLING_REVIEW_REJECTED_MESSAGE
                : notifications[workflow.workflowModelName],
          });
          this.reloadDocument.emit();
        }),
        catchError(() => {
          this.store.notification.set({
            show: true,
            variation: 'danger',
            text: HANDLING_REVIEW_CONFIRM_ERROR_MESSAGE,
          });
          return EMPTY;
        })
      )
      .subscribe();
  }

  getWorkflowComments(workflow: WorkflowInfo) {
    return this.document()
      .properties?.[NUXEO_SCHEMA_FIELDS.arbetsfloden.arbetsfloden]?.find(item => item.arbetsflodesid === workflow.id)
      ?.uppgifter?.slice()
      .filter(item => item.kommentar)
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
    const lockPreset = this.isLockedByUser() ? 'unlock' : 'lock';
    const favoritePreset = this.inFavorites() ? 'favoriteActive' : 'favorite';
    const notifyPreset = this.isSubscribed() ? 'stopNotify' : 'notify';

    const editButton = createButton('edit', () => this.isEditPageOpen.set(true));
    this.baseButtons.set([
      editButton,
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
      createButton('collection', () => {
        this.isAssignCollectionOpened.set([this.document().uid]);
      }),
      createButton(notifyPreset, () => this.toggleSubscription()),
    ]);
    this.store.baseButtons.set(this.baseButtons());
  }

  loadCaseDetails(): void {
    const handlingId = this.document().uid;

    this.apiService
      .getHandlingWithFile(handlingId)
      .pipe(
        tap(result => {
          const fileEntries = result.entries.filter(entry => entry.type === 'Fil');
          this.files.set(fileEntries);
          const mainFile =
            fileEntries.find(
              file => file.properties?.[NUXEO_SCHEMA_FIELDS.fil.typ] === NUXEO_VOCAB_IDS.filTyp.huvudfil
            ) ?? null;
          this.selectedFile.set(mainFile);
          this.selectedFileIds.set(new Set());
        })
      )
      .subscribe();
  }

  getSuggestions(
    name: string,
    requestType: EditSuggestionRequestType,
    label?: string,
    targetType?: string,
    docType?: string,
    searchTerm = ''
  ) {
    loadEditSuggestions({
      name,
      requestType,
      label,
      targetType,
      docType,
      searchTerm,
      apiService: this.apiService,
      parentRef: this.document().parentRef ?? '',
      suggestions: this.suggestions,
    });
  }

  getDate(date: string | Date | undefined | null): string {
    return formatDateOrMissing(date);
  }

  checkInCollection() {
    this.checkDocumentInCollections(this.document().uid)
      .pipe(tap(inCollection => this.inCollection.set(inCollection)))
      .subscribe();
  }

  checkDocumentInCollections(documentId: string): Observable<boolean> {
    return this.apiService.getCollections().pipe(
      switchMap(collections => {
        if (!collections.length) return of([]);

        return forkJoin(
          collections.map(collection =>
            this.apiService
              .getCollectionDocuments(collection.uid)
              .pipe(map(res => res.entries.some(entry => entry.uid === documentId)))
          )
        );
      }),
      map((results: boolean[]) => results.some(found => found))
    );
  }

  onPrint(): void {
    this.selectedFilesToolbarService.printSelectedFiles(this.files(), this.selectedFileIds());
  }

  onFileSelectionChange(event: { file: NuxeoDocument; selected: boolean }) {
    this.selectedFilesToolbarService.updateFileSelection(this.selectedFileIds, event);
  }

  onAttachmentSelectionChange(event: { files: NuxeoDocument[]; selected: boolean }) {
    this.selectedFilesToolbarService.updateAttachmentSelection(this.selectedFileIds, event);
  }

  clearSelectedFiles(): void {
    this.selectedFilesToolbarService.clearSelection(this.selectedFileIds);
  }

  openDocument(uid: string) {
    this.router.navigate(['/doc/', uid]);
  }

  printFile(file: NuxeoDocument) {
    const target = this.printService.getPrintableTarget(file);
    if (!target) {
      this.store.notification.set({
        show: true,
        variation: 'warning',
        text: HANDLING_PRINT_UNSUPPORTED_MESSAGE,
      });
      return;
    }

    this.store.notification.set({
      show: true,
      variation: 'info',
      text: HANDLING_PRINT_LOADING_MESSAGE,
    });

    this.printService.printUrl(target.url, target.delayMs ?? 1000);
  }

  mergeSelectedFilesAsPdf() {
    this.selectedFilesToolbarService.mergeSelectedFilesAsPdf(this.document().parentRef!, this.selectedFileIds());
  }

  downloadSelectedFilesAsZip() {
    this.selectedFilesToolbarService.downloadSelectedFilesAsZip(this.selectedFileIds());
  }

  getBevarasSuggestions() {
    this.apiService
      .getDirectorySuggestions('BevarasGallras')
      .pipe(
        map(result =>
          result.flatMap(entry => {
            if (entry.children?.length) {
              return entry.children.map(child => ({
                label: child.absoluteLabel ?? '',
                id: child.computedId,
              }));
            }
            return [
              {
                label: entry.label ?? '',
                id: entry.id,
              },
            ];
          })
        ),
        tap(options => {
          this.suggestions.update(current => ({ ...current, bevaras: options }));
        })
      )
      .subscribe();
  }

  formatEditForm(formResult: EditHandlingResult) {
    const lagrumsbeskrivning = formResult?.secret?.lagrumsbeskrivning?.[0]?.id ?? null;
    const rawAnsvarigOrg = formResult?.actor?.ansvarigOrg;
    const ansvarigOrg = Array.isArray(rawAnsvarigOrg) ? (rawAnsvarigOrg[0]?.id ?? null) : rawAnsvarigOrg;
    const handlingstyp = Array.isArray(formResult?.handlingDetails?.handlingstyp)
      ? (formResult.handlingDetails.handlingstyp[0]?.id ?? formResult.handlingDetails.handlingstyp[0])
      : formResult?.handlingDetails?.handlingstyp;

    const formProperties: Record<string, unknown> = {
      [NUXEO_SCHEMA_FIELDS.handling.handlingsnamn]: formResult?.handlingDetails?.handlingsnamn,
      [NUXEO_SCHEMA_FIELDS.handling.inkommenDatum]:
        formResult?.handlingDetails?.handlingsriktning === NUXEO_VOCAB_IDS.arendeRiktning.inkommande
          ? formResult?.handlingDetails?.inkommen_datum?.[0]?.toISOString()
          : null,
      [NUXEO_SCHEMA_FIELDS.handling.upprattadDatum]:
        formResult?.handlingDetails?.handlingsriktning !== NUXEO_VOCAB_IDS.arendeRiktning.inkommande
          ? formResult?.handlingDetails?.upprattad_datum?.[0]?.toISOString()
          : null,
      [NUXEO_SCHEMA_FIELDS.handling.handlingstyp]: handlingstyp,
      [NUXEO_SCHEMA_FIELDS.handling.intern]: formResult?.handlingDetails?.intern,
      [NUXEO_SCHEMA_FIELDS.handling.handlingsriktning]: formResult?.handlingDetails?.handlingsriktning,
      [NUXEO_SCHEMA_FIELDS.handling.forvaringsmedia]: formResult?.handlingDetails?.forvaringsmedia,
      [NUXEO_SCHEMA_FIELDS.handling.fysiskForvaringsplats]: formResult?.handlingDetails?.fysisk_forvaringsplats || null,
      [NUXEO_SCHEMA_FIELDS.handling.digitaltOriginal]: formResult?.handlingDetails?.digitalt_original || null,
      [NUXEO_SCHEMA_FIELDS.handling.signerad]: formResult?.handlingDetails?.signerad,
      [NUXEO_SCHEMA_FIELDS.handling.beslut]: formResult?.overview?.beslut,
      [NUXEO_SCHEMA_FIELDS.handling.beslutatDatum]: formResult?.overview?.beslutDate?.[0]?.toISOString(),
      [NUXEO_SCHEMA_FIELDS.handling.internArendereferens]: formResult?.internArendereferens?.map(reference => ({
        referenstyp: reference.type,
        referenskommentar: reference.comment,
        arende: reference.caseRef,
      })),
      [NUXEO_SCHEMA_FIELDS.handling.internHandlingsreferens]: formResult?.internHandlingsreferens?.map(reference => ({
        referenstyp: reference.type,
        referenskommentar: reference.comment,
        handling: reference.caseRef,
      })),
      [NUXEO_SCHEMA_FIELDS.handling.externReferens]: formResult?.externReferens?.map(reference => ({
        referens: reference.referens,
        referenskommentar: reference.comment,
      })),

      [NUXEO_SCHEMA_FIELDS.handling.sakerhetsskyddsklassificering]: formResult?.secret?.secretClass,
      [NUXEO_SCHEMA_FIELDS.handling.sekretess]: formResult?.secret?.secret,
      [NUXEO_SCHEMA_FIELDS.handling.lagrumsbeskrivning]: lagrumsbeskrivning,
      [NUXEO_SCHEMA_FIELDS.handling.innehallerPersonuppgifterGdpr]: formResult?.secret?.gdpr,

      [NUXEO_SCHEMA_FIELDS.handling.kommentarer]: formResult?.comment?.kommentarer,

      [NUXEO_SCHEMA_FIELDS.handling.bevarasGallras]: formResult?.bevaras?.bevaras,
      [NUXEO_SCHEMA_FIELDS.handling.arkiveradDatum]: formResult?.bevaras?.arkiverad_datum,
      [NUXEO_SCHEMA_FIELDS.handling.gallradDatum]: formResult?.bevaras?.gallrad_datum,
      [NUXEO_SCHEMA_FIELDS.handling.makuleradDatum]: formResult?.bevaras?.makulerad_datum,
      [NUXEO_SCHEMA_FIELDS.handling.makuleringskommentar]: formResult?.comment?.makuleringskommentar,

      [NUXEO_SCHEMA_FIELDS.handling.avsandare]: formResult?.avsandare?.map(sender => ({
        namn: (sender as { namn?: string }).namn ?? sender.title,
        epost: sender.email,
        telefon: (sender as { telefon?: string }).telefon,
        adress: (sender as { adress?: string }).adress,
        organisation: (sender as { org?: string | null }).org ?? null,
      })),
      [NUXEO_SCHEMA_FIELDS.handling.mottagare]: formResult?.mottagare?.map(receiver => ({
        namn: (receiver as { namn?: string }).namn ?? receiver.title,
        epost: receiver.email,
        telefon: (receiver as { telefon?: string }).telefon,
        adress: (receiver as { adress?: string }).adress,
        organisation: (receiver as { org?: string | null }).org ?? null,
      })),
      [NUXEO_SCHEMA_FIELDS.handling.beslutsfattare]: formResult?.overview?.beslutsfattare,
      [NUXEO_SCHEMA_FIELDS.handling.granskare]: formResult?.actor?.granskare,
      [NUXEO_SCHEMA_FIELDS.handling.medhandlaggare]: formResult?.actor?.medhandlaggare,
      [NUXEO_SCHEMA_FIELDS.handling.ansvarigOrganisatoriskEnhet]: ansvarigOrg,
    };

    const metadataValues = formResult.customMetadataValues;
    if (metadataValues) {
      formProperties[NUXEO_SCHEMA_FIELDS.dmsmetadataanpassad.falt] = metadataValues;
    }

    const filteredProps = Object.fromEntries(
      Object.entries(formProperties).filter(
        ([, value]) => value !== '' && value !== undefined && (!Array.isArray(value) || value.length > 0)
      )
    );

    const handlingssteg = formResult?.overview?.handlingssteg;
    const handlingsstegHasChanged = handlingssteg && handlingssteg !== this.currentHandlingState()?.id;

    if (handlingsstegHasChanged) {
      this.apiService.followLifecycleTransition(this.document().uid, handlingssteg).subscribe();
    }
    this.editForm(filteredProps, formResult.customMetadataDefinitionDocId, formResult.customMetadataDefinitions);
  }

  updateDropdownValues(event: { fieldName: string; value: string }) {
    if (event.fieldName === 'handlingstyp') {
      this.getSuggestions('handlingType', 'docSuggestion', '_', 'Handlingstyp', 'Handling', event.value);
    } else if (event.fieldName === 'ansvarigOrg') {
      this.getSuggestions('ansvarigOrg', 'docSuggestion', '_', 'Organisationsdel', 'Handling', event.value);
    }
  }

  editForm(
    props: Record<string, unknown>,
    metadataDefinitionDocId?: string | null,
    metadataDefinitions?: DmsMetadataDefinitionEntry[]
  ) {
    this.customMetadataService
      .saveDefinitionsThenDocument(this.document().uid, props, metadataDefinitionDocId, metadataDefinitions)
      .pipe(
        tap(() => {
          this.reloadDocument.emit();
          this.isEditPageOpen.set(false);
        }),
        catchError(error => {
          this.store.notification.set({
            show: true,
            variation: 'danger',
            text: error.error.violations[0].message,
          });

          return EMPTY;
        })
      )
      .subscribe();
  }

  toggleSubscription(): void {
    const currentDocument = this.document();
    const documentId = currentDocument.uid;
    const isCurrentlySubscribed = this.isSubscribed();

    const operation$ = isCurrentlySubscribed
      ? this.notificationService.unsubscribe(documentId)
      : this.notificationService.subscribe(documentId);

    operation$
      .pipe(
        tap(updatedDocument => {
          const rawNotifications = updatedDocument.properties?.[NUXEO_SCHEMA_FIELDS.notif.notifications];
          const notifications: NuxeoNotification[] = Array.isArray(rawNotifications) ? rawNotifications : [];

          const stillSubscribed = this.isUserSubscribed(notifications);

          this.isSubscribed.set(stillSubscribed);
          this.reloadDocument.emit();

          this.store.notification.set({
            show: true,
            variation: 'success',
            text: stillSubscribed ? SUBSCRIPTION_ENABLED_MESSAGE : SUBSCRIPTION_DISABLED_MESSAGE,
          });
        })
      )
      .subscribe({
        error: () => {
          this.store.notification.set({
            show: true,
            variation: 'danger',
            text: SUBSCRIPTION_ERROR_MESSAGE,
          });
        },
      });
  }

  toggleLockState() {
    this.lockService.toggleAndUpdate(this.document(), this.isLockedByUser, this.reloadDocument).subscribe();
  }

  copyLink() {
    this.shareLinkService.copyDocumentLink(this.document().uid, copied => this.linkWasCopied.set(copied));
  }

  private isUserSubscribed(notifications: NuxeoNotification[]): boolean {
    const username = this.auth.username();
    if (!username) return false;

    const currentUserRef = `user:${username}`.toLowerCase();

    return notifications.some(n => (n.subscribers ?? []).some(sub => sub.toLowerCase() === currentUserRef));
  }

  ngOnDestroy(): void {
    this.store.openPage.set(null);
  }

  downloadThumbnail() {
    return `/nuxeo/api/v1/repo/default/id/${this.document().uid}/@rendition/thumbnail`;
  }
  downloadXML() {
    return `/nuxeo/api/v1/repo/default/id/${this.document().uid}/@rendition/xmlExport`;
  }
  downloadZip() {
    return `/nuxeo/api/v1/repo/default/id/${this.document().uid}/@rendition/zipTreeExport`;
  }

  onToBeAdded() {
    console.log('To be added clicked');
  }
}
